import { DataSource } from 'typeorm';
import { Cinema } from '../cinemas/cinema.entity';
import { Movie, MoviePrerequisite } from '../movies/movie.entity';

const SAMPLE_MOVIES = [
  { title: 'Iron Man', releaseYear: 2008, runtime: 126, watchFirst: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtime: 124, watchFirst: [] },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    runtime: 143,
    watchFirst: ['Iron Man', 'Captain America: The First Avenger'],
  },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtime: 147, watchFirst: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtime: 130, watchFirst: [] },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtime: 149,
    watchFirst: ['Captain America: Civil War', 'Thor: Ragnarok'],
  },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtime: 181, watchFirst: ['Avengers: Infinity War'] },
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtime: 150, watchFirst: ['Avengers: Endgame'] },
];

// One cinema example in the assessment.
const SAMPLE_CINEMAS = [
  { name: 'Aurora Cinema', bundleSizes: [1, 3, 4] },
  { name: 'Meridian Screens', bundleSizes: [2, 5] },
  { name: 'Helix Theatre', bundleSizes: [6, 9, 20] },
  { name: 'Pinnacle Cineplex', bundleSizes: [4, 6] },
];


export async function seedSampleData(dataSource: DataSource): Promise<void> {
  const movieRepo = dataSource.getRepository(Movie);
  const linkRepo = dataSource.getRepository(MoviePrerequisite);
  const cinemaRepo = dataSource.getRepository(Cinema);

  if ((await movieRepo.count()) === 0) {
    const idByTitle = new Map<string, number>();
    for (const movie of SAMPLE_MOVIES) {
      const saved = await movieRepo.save({
        title: movie.title,
        releaseYear: movie.releaseYear,
        runtime: movie.runtime,
      });
      idByTitle.set(movie.title, saved.id);
    }

    for (const movie of SAMPLE_MOVIES) {
      for (const title of movie.watchFirst) {
        await linkRepo.save({ movieId: idByTitle.get(movie.title)!, prerequisiteId: idByTitle.get(title)! });
      }
    }
  }

  if ((await cinemaRepo.count()) === 0) {
    for (const cinema of SAMPLE_CINEMAS) {
      await cinemaRepo.save(cinema);
    }
  }
}