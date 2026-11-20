import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unique, case-insensitive (enforced by the `movies_title_unique` index on lower(title)). */
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'release_year', type: 'int' })
  releaseYear: number;

  /** Minutes, 1–300. */
  @Column({ type: 'int' })
  runtime: number;

  @Column({ type: 'boolean', default: false })
  watched: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/**
 * Edge of the dependency graph: watch `prerequisiteId` before `movieId`.
 * Self-referencing many-to-many join table between movies.
 */
@Entity('movie_prerequisites')
export class MoviePrerequisite {
  @PrimaryColumn({ name: 'movie_id', type: 'int' })
  movieId: number;

  @PrimaryColumn({ name: 'prerequisite_id', type: 'int' })
  prerequisiteId: number;
}
