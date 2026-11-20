import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { getRewatchOrder, wouldCreateCycle } from '../algorithms/dependency-graph';
import { CreateMovieDto, MovieView, RewatchOrderView, UpdateMovieDto } from './movie.dto';
import { Movie, MoviePrerequisite } from './movie.entity';

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie) private readonly movies: Repository<Movie>,
    @InjectRepository(MoviePrerequisite) private readonly links: Repository<MoviePrerequisite>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<MovieView[]> {
    const movies = await this.movies.find({ order: { releaseYear: 'ASC', id: 'ASC' } });
    const links = await this.links.find();
    return movies.map((movie) => this.toView(movie, movies, links));
  }

  async findOne(id: number): Promise<MovieView> {
    const movies = await this.findAll();
    const movie = movies.find((m) => m.id === id);
    if (!movie) {
      throw new NotFoundException(`Movie ${id} not found`);
    }
    return movie;
  }

  async create(dto: CreateMovieDto): Promise<MovieView> {
    const title = this.cleanTitle(dto.title);
    await this.checkTitleIsFree(title);

    const prerequisiteIds = this.removeDuplicates(dto.prerequisiteIds ?? []);
    await this.checkMoviesExist(prerequisiteIds);

    const movieId = await this.dataSource.transaction(async (manager) => {
      const movie = await manager.save(Movie, {
        title,
        releaseYear: dto.releaseYear,
        runtime: dto.runtime,
        watched: dto.watched ?? false,
      });
      for (const prerequisiteId of prerequisiteIds) {
        await manager.save(MoviePrerequisite, { movieId: movie.id, prerequisiteId });
      }
      return movie.id;
    });

    return this.findOne(movieId);
  }

  async update(id: number, dto: UpdateMovieDto): Promise<MovieView> {
    const movie = await this.movies.findOneBy({ id });
    if (!movie) {
      throw new NotFoundException(`Movie ${id} not found`);
    }

    if (dto.title !== undefined) {
      const title = this.cleanTitle(dto.title);
      if (title.toLowerCase() !== movie.title.toLowerCase()) {
        await this.checkTitleIsFree(title);
      }
      movie.title = title;
    }
    if (dto.releaseYear !== undefined) movie.releaseYear = dto.releaseYear;
    if (dto.runtime !== undefined) movie.runtime = dto.runtime;
    if (dto.watched !== undefined) movie.watched = dto.watched;

    let prerequisiteIds: number[] | undefined;
    if (dto.prerequisiteIds !== undefined) {
      prerequisiteIds = this.removeDuplicates(dto.prerequisiteIds);
      await this.checkMoviesExist(prerequisiteIds);

      const graph = this.buildGraph(await this.links.find());
      if (wouldCreateCycle(graph, id, prerequisiteIds)) {
        throw new ConflictException({
          statusCode: 409,
          error: 'CIRCULAR_DEPENDENCY',
          message:
            'This would make the movie depend on itself through its prerequisites. Remove the movie that leads back to it.',
        });
      }
    }


    await this.dataSource.transaction(async (manager) => {
      await manager.save(movie);
      if (prerequisiteIds !== undefined) {
        await manager.delete(MoviePrerequisite, { movieId: id });
        for (const prerequisiteId of prerequisiteIds) {
          await manager.save(MoviePrerequisite, { movieId: id, prerequisiteId });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.movies.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Movie ${id} not found`);
    }
  }

  async rewatchOrder(id: number): Promise<RewatchOrderView> {
    const target = await this.movies.findOneBy({ id });
    if (!target) {
      throw new NotFoundException(`Movie ${id} not found`);
    }

    const movies = await this.movies.find();
    const links = await this.links.find({ order: { prerequisiteId: 'ASC' } });
    const orderedIds = getRewatchOrder(this.buildGraph(links), id);

    const list = orderedIds.map((movieId) => movies.find((m) => m.id === movieId)!);

    let watchedCount = 0;
    let unwatchedRuntime = 0;
    for (const movie of list) {
      if (movie.watched) {
        watchedCount++;
      } else {
        unwatchedRuntime += movie.runtime;
      }
    }

    return {
      target: { id: target.id, title: target.title },
      movies: list.map((m) => ({
        id: m.id,
        title: m.title,
        releaseYear: m.releaseYear,
        runtime: m.runtime,
        watched: m.watched,
      })),
      totalCount: list.length,
      watchedCount,
      unwatchedCount: list.length - watchedCount,
      unwatchedRuntime,
    };
  }


  private buildGraph(links: MoviePrerequisite[]): Map<number, number[]> {
    const graph = new Map<number, number[]>();
    for (const link of links) {
      if (!graph.has(link.movieId)) {
        graph.set(link.movieId, []);
      }
      graph.get(link.movieId)!.push(link.prerequisiteId);
    }
    return graph;
  }

  private toView(movie: Movie, allMovies: Movie[], links: MoviePrerequisite[]): MovieView {
    const prerequisites = links
      .filter((link) => link.movieId === movie.id)
      .map((link) => allMovies.find((m) => m.id === link.prerequisiteId)!)
      .sort((a, b) => a.releaseYear - b.releaseYear)
      .map((m) => ({ id: m.id, title: m.title }));

    return {
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      watched: movie.watched,
      prerequisites,
    };
  }

  private cleanTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('title should not be empty');
    }
    return trimmed;
  }

  private async checkTitleIsFree(title: string) {
    const existing = await this.movies
      .createQueryBuilder('movie')
      .where('LOWER(movie.title) = LOWER(:title)', { title })
      .getOne();
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'DUPLICATE_TITLE',
        message: `A movie titled "${title}" already exists`,
      });
    }
  }

  private async checkMoviesExist(ids: number[]) {
    if (ids.length === 0) return;
    const found = await this.movies.findBy({ id: In(ids) });
    if (found.length !== ids.length) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'UNKNOWN_PREREQUISITE',
        message: 'One or more prerequisite movies do not exist',
      });
    }
  }

  private removeDuplicates(ids: number[]): number[] {
    const result: number[] = [];
    for (const id of ids) {
      if (!result.includes(id)) result.push(id);
    }
    return result;
  }
}