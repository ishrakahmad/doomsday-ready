import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. The database repeats the most important rules as
 * constraints, so bad data cannot get in even if a bug slips past the API.
 */
export class InitialSchema1732100000000 implements MigrationInterface {
  name = 'InitialSchema1732100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE movies (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0),
        release_year  INTEGER      NOT NULL CHECK (release_year BETWEEN 1888 AND 2100),
        runtime       INTEGER      NOT NULL CHECK (runtime BETWEEN 1 AND 300),
        watched       BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX movies_title_unique ON movies (lower(title))`);

    await queryRunner.query(`
      CREATE TABLE movie_prerequisites (
        movie_id         INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        prerequisite_id  INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, prerequisite_id),
        CHECK (movie_id <> prerequisite_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX movie_prerequisites_prerequisite_idx ON movie_prerequisites (prerequisite_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE cinemas (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(200) NOT NULL CHECK (length(btrim(name)) > 0),
        bundle_sizes  INTEGER[]    NOT NULL CHECK (cardinality(bundle_sizes) BETWEEN 1 AND 10),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX cinemas_name_unique ON cinemas (lower(name))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE cinemas`);
    await queryRunner.query(`DROP TABLE movie_prerequisites`);
    await queryRunner.query(`DROP TABLE movies`);
  }
}
