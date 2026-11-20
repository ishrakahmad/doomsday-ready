import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732100000000 implements MigrationInterface {
  name = 'InitialSchema1732100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE movies (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(200) NOT NULL UNIQUE,
        release_year  INTEGER      NOT NULL,
        runtime       INTEGER      NOT NULL,
        watched       BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE movie_prerequisites (
        movie_id         INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        prerequisite_id  INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, prerequisite_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE cinemas (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(200) NOT NULL UNIQUE,
        bundle_sizes  INTEGER[]    NOT NULL,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE cinemas`);
    await queryRunner.query(`DROP TABLE movie_prerequisites`);
    await queryRunner.query(`DROP TABLE movies`);
  }
}