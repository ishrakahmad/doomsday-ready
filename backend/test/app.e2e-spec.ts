/**
 * End-to-end tests against a real PostgreSQL database.
 * Uses TEST_DATABASE_URL (default: postgres://doomsday:doomsday@localhost:5432/doomsday_test).
 * The database is wiped before the run.
 */
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

describe('Doomsday Ready API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const ids: Record<string, number> = {};
  const cinemaIds: Record<string, number> = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleRef.createNestApplication());
    await app.init();

    const ds = app.get(DataSource);
    await ds.dropDatabase();
    await ds.runMigrations();
    await seedSampleData(ds);

    http = request(app.getHttpServer());
    const movies = (await http.get('/api/movies').expect(200)).body as Array<{ id: number; title: string }>;
    for (const m of movies) ids[m.title] = m.id;
    const cinemas = (await http.get('/api/cinemas').expect(200)).body as Array<{ id: number; name: string }>;
    for (const c of cinemas) cinemaIds[c.name] = c.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const titlesOf = (body: { movies: Array<{ title: string }> }) => body.movies.map((m) => m.title);

  describe('Feature 1 — rewatch order (PDF examples)', () => {
    it('Avengers: Doomsday -> the 7 other movies', async () => {
      const res = await http.get(`/api/movies/${ids['Avengers: Doomsday']}/rewatch-order`).expect(200);
      expect(titlesOf(res.body)).toEqual([
        'Iron Man',
        'Captain America: The First Avenger',
        'The Avengers',
        'Captain America: Civil War',
        'Thor: Ragnarok',
        'Avengers: Infinity War',
        'Avengers: Endgame',
      ]);
      expect(res.body).toMatchObject({ totalCount: 7, watchedCount: 0, unwatchedRuntime: 1000 });
    });

    it('Captain America: Civil War -> Iron Man, First Avenger, then The Avengers', async () => {
      const res = await http.get(`/api/movies/${ids['Captain America: Civil War']}/rewatch-order`).expect(200);
      const titles = titlesOf(res.body);
      expect(titles).toHaveLength(3);
      expect(new Set(titles.slice(0, 2))).toEqual(new Set(['Iron Man', 'Captain America: The First Avenger']));
      expect(titles[2]).toBe('The Avengers');
    });

    it('Thor: Ragnarok -> empty list', async () => {
      const res = await http.get(`/api/movies/${ids['Thor: Ragnarok']}/rewatch-order`).expect(200);
      expect(res.body.movies).toEqual([]);
      expect(res.body.unwatchedRuntime).toBe(0);
    });

    it('making Avengers: Endgame a prerequisite of Iron Man -> 409 CIRCULAR_DEPENDENCY', async () => {
      const res = await http
        .patch(`/api/movies/${ids['Iron Man']}`)
        .send({ prerequisiteIds: [ids['Avengers: Endgame']] })
        .expect(409);
      expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
      // ...and nothing was changed
      const ironMan = await http.get(`/api/movies/${ids['Iron Man']}`).expect(200);
      expect(ironMan.body.prerequisites).toEqual([]);
    });

    it('a movie cannot list itself -> 409', async () => {
      const id = ids['Thor: Ragnarok'];
      const res = await http.patch(`/api/movies/${id}`).send({ prerequisiteIds: [id] }).expect(409);
      expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
    });

    it('counts watched movies and unwatched runtime', async () => {
      await http.patch(`/api/movies/${ids['Iron Man']}`).send({ watched: true }).expect(200);
      await http.patch(`/api/movies/${ids['Thor: Ragnarok']}`).send({ watched: true }).expect(200);
      const res = await http.get(`/api/movies/${ids['Avengers: Doomsday']}/rewatch-order`).expect(200);
      expect(res.body).toMatchObject({
        totalCount: 7,
        watchedCount: 2,
        unwatchedCount: 5,
        unwatchedRuntime: 1000 - 126 - 130,
      });
    });
  });

  describe('Feature 1 — movie CRUD and validation', () => {
    it('creates a movie with prerequisites; watched defaults to false', async () => {
      const res = await http
        .post('/api/movies')
        .send({ title: '  Black Panther ', releaseYear: 2018, runtime: 134, prerequisiteIds: [ids['Captain America: Civil War']] })
        .expect(201);
      expect(res.body).toMatchObject({
        title: 'Black Panther',
        watched: false,
        prerequisites: [{ id: ids['Captain America: Civil War'], title: 'Captain America: Civil War' }],
      });
      ids['Black Panther'] = res.body.id;
    });

    it('rejects a duplicate title, case-insensitively -> 409', async () => {
      const res = await http.post('/api/movies').send({ title: 'iron man', releaseYear: 2008, runtime: 126 }).expect(409);
      expect(res.body.error).toBe('DUPLICATE_TITLE');
    });

    it('rejects renaming onto an existing title -> 409', async () => {
      const res = await http.patch(`/api/movies/${ids['Black Panther']}`).send({ title: 'Thor: Ragnarok' }).expect(409);
      expect(res.body.error).toBe('DUPLICATE_TITLE');
    });

    it.each([
      [{ title: 'X', releaseYear: 2020, runtime: 0 }],
      [{ title: 'X', releaseYear: 2020, runtime: 301 }],
      [{ title: 'X', releaseYear: 2020, runtime: 90.5 }],
      [{ title: '   ', releaseYear: 2020, runtime: 90 }],
      [{ title: 'X', runtime: 90 }],
      [{ title: 'X', releaseYear: 2020, runtime: 90, prerequisiteIds: ['a'] }],
      [{ title: 'X', releaseYear: 2020, runtime: 90, unknownField: true }],
    ])('rejects invalid body %j -> 400', async (body) => {
      const res = await http.post('/api/movies').send(body).expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('rejects unknown prerequisite ids -> 400', async () => {
      const res = await http
        .post('/api/movies')
        .send({ title: 'Ghost', releaseYear: 2020, runtime: 90, prerequisiteIds: [99999] })
        .expect(400);
      expect(res.body.error).toBe('UNKNOWN_PREREQUISITE');
    });

    it('PATCH replaces the prerequisite list and ignores duplicates', async () => {
      const res = await http
        .patch(`/api/movies/${ids['Black Panther']}`)
        .send({ prerequisiteIds: [ids['Iron Man'], ids['Iron Man']] })
        .expect(200);
      expect(res.body.prerequisites).toEqual([{ id: ids['Iron Man'], title: 'Iron Man' }]);
    });

    it('unknown movie -> 404, non-numeric id -> 400', async () => {
      expect((await http.get('/api/movies/99999/rewatch-order').expect(404)).body.error).toBe('MOVIE_NOT_FOUND');
      await http.patch('/api/movies/99999').send({ watched: true }).expect(404);
      await http.get('/api/movies/abc').expect(400);
    });

    it('deleting a movie removes it from other movies\' prerequisites', async () => {
      await http.delete(`/api/movies/${ids['Black Panther']}`).expect(204);
      const all = (await http.get('/api/movies').expect(200)).body as Array<{ title: string }>;
      expect(all.map((m) => m.title)).not.toContain('Black Panther');
    });
  });

  describe('Feature 2 — booking quote (PDF examples)', () => {
    it.each([
      ['Aurora Cinema', 6, 2, [{ size: 3, count: 2 }]],
      ['Meridian Screens', 11, 4, [{ size: 5, count: 1 }, { size: 2, count: 3 }]],
      ['Helix Theatre', 44, 4, [{ size: 20, count: 1 }, { size: 9, count: 2 }, { size: 6, count: 1 }]],
    ])('%s, group of %i -> %i bundles', async (name, groupSize, total, bundles) => {
      const res = await http.get(`/api/cinemas/${cinemaIds[name]}/booking?groupSize=${groupSize}`).expect(200);
      expect(res.body).toMatchObject({ possible: true, totalBundles: total, bundles });
    });

    it('4, 6 / 7 -> not possible', async () => {
      const res = await http.get(`/api/cinemas/${cinemaIds['Pinnacle Cineplex']}/booking?groupSize=7`).expect(200);
      expect(res.body).toMatchObject({ possible: false, totalBundles: null, bundles: [] });
    });
  });

  describe('Feature 2 — cinema validation', () => {
    it('creates a cinema and stores sizes in ascending order', async () => {
      const res = await http.post('/api/cinemas').send({ name: 'Test Hall', bundleSizes: [10, 2] }).expect(201);
      expect(res.body).toMatchObject({ name: 'Test Hall', bundleSizes: [2, 10] });
    });

    it('rejects a duplicate name -> 409', async () => {
      const res = await http.post('/api/cinemas').send({ name: 'test hall', bundleSizes: [2] }).expect(409);
      expect(res.body.error).toBe('DUPLICATE_NAME');
    });

    it.each([
      [{ name: 'A', bundleSizes: [] }],
      [{ name: 'A', bundleSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
      [{ name: 'A', bundleSizes: [0] }],
      [{ name: 'A', bundleSizes: [501] }],
      [{ name: 'A', bundleSizes: [2, 2] }],
      [{ name: 'A', bundleSizes: [2.5] }],
      [{ name: '', bundleSizes: [2] }],
    ])('rejects invalid cinema %j -> 400', async (body) => {
      expect((await http.post('/api/cinemas').send(body).expect(400)).body.error).toBe('VALIDATION_ERROR');
    });

    it.each(['0', '10001', '2.5', 'abc', ''])('rejects groupSize=%s -> 400', async (g) => {
      await http.get(`/api/cinemas/${cinemaIds['Aurora Cinema']}/booking?groupSize=${g}`).expect(400);
    });

    it('accepts the boundaries 1 and 10,000', async () => {
      await http.get(`/api/cinemas/${cinemaIds['Aurora Cinema']}/booking?groupSize=1`).expect(200);
      const res = await http.get(`/api/cinemas/${cinemaIds['Aurora Cinema']}/booking?groupSize=10000`).expect(200);
      expect(res.body.totalBundles).toBe(2500);
    });

    it('unknown cinema -> 404', async () => {
      const res = await http.get('/api/cinemas/99999/booking?groupSize=5').expect(404);
      expect(res.body.error).toBe('CINEMA_NOT_FOUND');
    });
  });
});
