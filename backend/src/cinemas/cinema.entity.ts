import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unique, case-insensitive (enforced by the `cinemas_name_unique` index on lower(name)). */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** 1–10 distinct sizes, each 1–500 seats, stored in ascending order. */
  @Column({ name: 'bundle_sizes', type: 'int', array: true })
  bundleSizes: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
