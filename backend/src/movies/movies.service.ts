import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { getRewatchOrder, wouldCreateCycle } from '../algorithms/dependency-graph';
import { ApiError, isUniqueViolation } from '../common/api-error';
import { Movie, MoviePrerequisite } from './movie.entity';
import { CreateMovieDto, MovieView, RewatchOrderView, UpdateMovieDto } from './movie.dto';

/**
 * Any write that changes the dependency graph takes this transaction-scoped
 * Postgres advisory lock, so two concurrent updates cannot each pass the
 * cycle check and together create a cycle.
 */
const GRAPH_LOCK_KEY = 4_200_001;

@Injectable()
export class MoviesService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(): Promise<MovieView[]> {
    const { movies, links } = await this.loadAll(this.dataSource.manager);
    const byId = new Map(movies.map((m) => [m.id, m]));
    return movies.map((m) => this.toView(m, links, byId));
  }

  async findOne(id: number): Promise<MovieView> {
    const { movies, links } = await this.loadAll(this.dataSource.manager);
    const byId = new Map(movies.map((m) => [m.id, m]));
    const movie = byId.get(id);
    if (!movie) throw this.notFound(id);
    return this.toView(movie, links, byId);
  }

  async create(dto: CreateMovieDto): Promise<MovieView> {
    const prerequisiteIds = unique(dto.prerequisiteIds ?? []);

    const id = await this.write(async (em) => {
      await this.assertTitleFree(em, dto.title);
      await this.assertMoviesExist(em, prerequisiteIds);
      // A brand-new movie has no dependents yet, so its prerequisites can
      // never form a cycle — no cycle check is needed on create.
      const movie = await em.getRepository(Movie).save(
        em.getRepository(Movie).create({
          title: dto.title,
          releaseYear: dto.releaseYear,
          runtime: dto.runtime,
          watched: dto.watched ?? false,
        }),
      );
      await this.insertLinks(em, movie.id, prerequisiteIds);
      return movie.id;
    });

    return this.findOne(id);
  }

  async update(id: number, dto: UpdateMovieDto): Promise<MovieView> {
    await this.write(async (em) => {
      const repo = em.getRepository(Movie);
      const movie = await repo.findOneBy({ id });
      if (!movie) throw this.notFound(id);

      if (dto.title !== undefined && dto.title.toLowerCase() !== movie.title.toLowerCase()) {
        await this.assertTitleFree(em, dto.title);
      }

      if (dto.prerequisiteIds !== undefined) {
        const prerequisiteIds = unique(dto.prerequisiteIds);
        if (prerequisiteIds.includes(id)) throw this.circular();
        await this.assertMoviesExist(em, prerequisiteIds);

        const links = await em.getRepository(MoviePrerequisite).find();
        if (wouldCreateCycle(buildGraph(links), id, prerequisiteIds)) throw this.circular();

        await em.getRepository(MoviePrerequisite).delete({ movieId: id });
        await this.insertLinks(em, id, prerequisiteIds);
      }

      const changes: Partial<Movie> = {};
      if (dto.title !== undefined) changes.title = dto.title;
      if (dto.releaseYear !== undefined) changes.releaseYear = dto.releaseYear;
      if (dto.runtime !== undefined) changes.runtime = dto.runtime;
      if (dto.watched !== undefined) changes.watched = dto.watched;
      if (Object.keys(changes).length > 0) await repo.update({ id }, changes);
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.write(async (em) => {
      const result = await em.getRepository(Movie).delete({ id });
      if (!result.affected) throw this.notFound(id);
    });
  }

  async rewatchOrder(id: number): Promise<RewatchOrderView> {
    const { movies, links } = await this.loadAll(this.dataSource.manager);
    const byId = new Map(movies.map((m) => [m.id, m]));
    const target = byId.get(id);
    if (!target) throw this.notFound(id);

    // Explore prerequisites oldest-first, so among valid orders we return the
    // one closest to release order (stable, predictable output).
    const graph = buildGraph(links, (a, b) => compareByRelease(byId.get(a)!, byId.get(b)!));
    const ordered = getRewatchOrder(graph, id).map((movieId) => byId.get(movieId)!);

    const unwatched = ordered.filter((m) => !m.watched);
    return {
      target: { id: target.id, title: target.title },
      movies: ordered.map(({ id, title, releaseYear, runtime, watched }) => ({
        id,
        title,
        releaseYear,
        runtime,
        watched,
      })),
      totalCount: ordered.length,
      watchedCount: ordered.length - unwatched.length,
      unwatchedCount: unwatched.length,
      unwatchedRuntime: unwatched.reduce((sum, m) => sum + m.runtime, 0),
    };
  }

  // ---------------------------------------------------------------- helpers

  /** Runs a graph-changing write in a transaction holding the graph lock. */
  private async write<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (em) => {
        await em.query('SELECT pg_advisory_xact_lock($1)', [GRAPH_LOCK_KEY]);
        return work(em);
      });
    } catch (err) {
      // Backstop for the unique index (e.g. a race between two creates).
      if (isUniqueViolation(err)) {
        throw new ApiError(HttpStatus.CONFLICT, 'DUPLICATE_TITLE', 'A movie with this title already exists');
      }
      throw err;
    }
  }

  private async loadAll(em: EntityManager) {
    const [movies, links] = await Promise.all([
      em.getRepository(Movie).find({ order: { releaseYear: 'ASC', id: 'ASC' } }),
      em.getRepository(MoviePrerequisite).find(),
    ]);
    return { movies, links };
  }

  private toView(movie: Movie, links: MoviePrerequisite[], byId: Map<number, Movie>): MovieView {
    const prerequisites = links
      .filter((l) => l.movieId === movie.id)
      .map((l) => byId.get(l.prerequisiteId)!)
      .sort(compareByRelease)
      .map((m) => ({ id: m.id, title: m.title }));
    const { id, title, releaseYear, runtime, watched } = movie;
    return { id, title, releaseYear, runtime, watched, prerequisites };
  }

  private async assertTitleFree(em: EntityManager, title: string) {
    const clash = await em
      .getRepository(Movie)
      .createQueryBuilder('m')
      .where('lower(m.title) = lower(:title)', { title })
      .getExists();
    if (clash) {
      throw new ApiError(HttpStatus.CONFLICT, 'DUPLICATE_TITLE', `A movie titled "${title}" already exists`);
    }
  }

  private async assertMoviesExist(em: EntityManager, ids: number[]) {
    if (ids.length === 0) return;
    const found = await em.getRepository(Movie).find({ select: { id: true }, where: { id: In(ids) } });
    const foundIds = new Set(found.map((m) => m.id));
    const missing = ids.filter((i) => !foundIds.has(i));
    if (missing.length > 0) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'UNKNOWN_PREREQUISITE',
        `Unknown prerequisite movie id(s): ${missing.join(', ')}`,
      );
    }
  }

  private async insertLinks(em: EntityManager, movieId: number, prerequisiteIds: number[]) {
    if (prerequisiteIds.length === 0) return;
    await em
      .getRepository(MoviePrerequisite)
      .insert(prerequisiteIds.map((prerequisiteId) => ({ movieId, prerequisiteId })));
  }

  private notFound(id: number) {
    return new ApiError(HttpStatus.NOT_FOUND, 'MOVIE_NOT_FOUND', `Movie ${id} not found`);
  }

  private circular() {
    return new ApiError(
      HttpStatus.CONFLICT,
      'CIRCULAR_DEPENDENCY',
      'This change would make the movie depend on itself, directly or through other movies',
    );
  }
}

function unique(ids: number[]): number[] {
  return [...new Set(ids)];
}

function compareByRelease(a: Movie, b: Movie): number {
  return a.releaseYear - b.releaseYear || a.id - b.id;
}

function buildGraph(
  links: MoviePrerequisite[],
  order?: (a: number, b: number) => number,
): Map<number, number[]> {
  const graph = new Map<number, number[]>();
  for (const { movieId, prerequisiteId } of links) {
    const list = graph.get(movieId) ?? [];
    list.push(prerequisiteId);
    graph.set(movieId, list);
  }
  if (order) for (const list of graph.values()) list.sort(order);
  return graph;
}
