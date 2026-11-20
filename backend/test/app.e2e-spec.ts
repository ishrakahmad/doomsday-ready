
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://doomsday:doomsday@localhost:5432/doomsday_test';
process.env.SEED_ON_START = 'false';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedSampleData } from '../src/database/seed';
import { setupApp } from '../src/setup-app';

describe('Doomsday Ready API', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const movieId: Record<string, number> = {};
  const cinemaId: Record<string, number> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleRef.createNestApplication());
    await app.init();

    const ds = app.get(DataSource);
    await ds.dropDatabase();
    await ds.runMigrations();
    await seedSampleData(ds);

    http = request(app.getHttpServer());
    for (const m of (await http.get('/api/movies')).body) movieId[m.title] = m.id;
    for (const c of (await http.get('/api/cinemas')).body) cinemaId[c.name] = c.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const rewatchTitles = async (title: string): Promise<string[]> => {
    const res = await http.get(`/api/movies/${movieId[title]}/rewatch-order`).expect(200);
    return res.body.movies.map((m: { title: string }) => m.title);
  };

  describe('Feature 1', () => {
    it('Avengers: Doomsday -> the 7 other movies', async () => {
      expect(await rewatchTitles('Avengers: Doomsday')).toEqual([
        'Iron Man',
        'Captain America: The First Avenger',
        'The Avengers',
        'Captain America: Civil War',
        'Thor: Ragnarok',
        'Avengers: Infinity War',
        'Avengers: Endgame',
      ]);
    });

    it('Captain America: Civil War -> Iron Man and The First Avenger, then The Avengers', async () => {
      expect(await rewatchTitles('Captain America: Civil War')).toEqual([
        'Iron Man',
        'Captain America: The First Avenger',
        'The Avengers',
      ]);
    });

    it('Thor: Ragnarok -> empty list', async () => {
      expect(await rewatchTitles('Thor: Ragnarok')).toEqual([]);
    });

    it('Endgame as a prerequisite of Iron Man -> 409 CIRCULAR_DEPENDENCY', async () => {
      const res = await http
        .patch(`/api/movies/${movieId['Iron Man']}`)
        .send({ prerequisiteIds: [movieId['Avengers: Endgame']] })
        .expect(409);
      expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
    });
  });

  describe('Feature 2', () => {
    const quote = (cinema: string, groupSize: number) =>
      http.get(`/api/cinemas/${cinemaId[cinema]}/booking?groupSize=${groupSize}`).expect(200);

    it('1, 3, 4 / 6 -> 2 bundles: 3 x 2', async () => {
      const res = await quote('Aurora Cinema', 6);
      expect(res.body).toMatchObject({ possible: true, totalBundles: 2, bundles: [{ size: 3, count: 2 }] });
    });

    it('2, 5 / 11 -> 4 bundles: 5 x 1, 2 x 3', async () => {
      const res = await quote('Meridian Screens', 11);
      expect(res.body).toMatchObject({
        possible: true,
        totalBundles: 4,
        bundles: [
          { size: 5, count: 1 },
          { size: 2, count: 3 },
        ],
      });
    });

    it('6, 9, 20 / 44 -> 4 bundles: 20 x 1, 9 x 2, 6 x 1', async () => {
      const res = await quote('Helix Theatre', 44);
      expect(res.body).toMatchObject({
        possible: true,
        totalBundles: 4,
        bundles: [
          { size: 20, count: 1 },
          { size: 9, count: 2 },
          { size: 6, count: 1 },
        ],
      });
    });

    it('4, 6 / 7 -> not possible', async () => {
      const res = await quote('Pinnacle Cineplex', 7);
      expect(res.body).toMatchObject({ possible: false });
    });
  });
});