import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cinema } from '../cinemas/cinema.entity';
import { Movie, MoviePrerequisite } from '../movies/movie.entity';

/**
 * Sample data from the assessment, so the app is usable straight away.
 * Runtimes are the theatrical runtimes; Avengers: Doomsday is unreleased,
 * so its runtime is a placeholder.
 */
const SAMPLE_MOVIES: Array<{ title: string; releaseYear: number; runtime: number; after: string[] }> = [
  { title: 'Iron Man', releaseYear: 2008, runtime: 126, after: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtime: 124, after: [] },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    runtime: 143,
    after: ['Iron Man', 'Captain America: The First Avenger'],
  },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtime: 147, after: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtime: 130, after: [] },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtime: 149,
    after: ['Captain America: Civil War', 'Thor: Ragnarok'],
  },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtime: 181, after: ['Avengers: Infinity War'] },
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtime: 150, after: ['Avengers: Endgame'] },
];

/** One cinema per booking example in the assessment. */
const SAMPLE_CINEMAS: Array<{ name: string; bundleSizes: number[] }> = [
  { name: 'Aurora Cinema', bundleSizes: [1, 3, 4] },
  { name: 'Meridian Screens', bundleSizes: [2, 5] },
  { name: 'Helix Theatre', bundleSizes: [6, 9, 20] },
  { name: 'Pinnacle Cineplex', bundleSizes: [4, 6] },
];

export async function seedSampleData(dataSource: DataSource, logger?: Logger): Promise<void> {
  await dataSource.transaction(async (em) => {
    if ((await em.getRepository(Movie).count()) === 0) {
      const ids = new Map<string, number>();
      for (const m of SAMPLE_MOVIES) {
        const saved = await em.getRepository(Movie).save(
          em.getRepository(Movie).create({ title: m.title, releaseYear: m.releaseYear, runtime: m.runtime }),
        );
        ids.set(m.title, saved.id);
      }
      const links = SAMPLE_MOVIES.flatMap((m) =>
        m.after.map((title) => ({ movieId: ids.get(m.title)!, prerequisiteId: ids.get(title)! })),
      );
      await em.getRepository(MoviePrerequisite).insert(links);
      logger?.log(`Seeded ${SAMPLE_MOVIES.length} movies`);
    }

    if ((await em.getRepository(Cinema).count()) === 0) {
      await em.getRepository(Cinema).insert(SAMPLE_CINEMAS);
      logger?.log(`Seeded ${SAMPLE_CINEMAS.length} cinemas`);
    }
  });
}

/** Seeds an empty database on startup when SEED_ON_START=true. */
@Injectable()
export class SeedOnStart implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_START === 'true') {
      await seedSampleData(this.dataSource, this.logger);
    }
  }
}
