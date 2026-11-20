import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200, unique: true })
  title: string;

  @Column({ name: 'release_year', type: 'int' })
  releaseYear: number;

  // minutes
  @Column({ type: 'int' })
  runtime: number;

  @Column({ type: 'boolean', default: false })
  watched: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}


@Entity('movie_prerequisites')
export class MoviePrerequisite {
  @PrimaryColumn({ name: 'movie_id', type: 'int' })
  movieId: number;

  @PrimaryColumn({ name: 'prerequisite_id', type: 'int' })
  prerequisiteId: number;
}