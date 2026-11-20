import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200, unique: true })
  name: string;

  // stored smallest first [2, 5]
  @Column({ name: 'bundle_sizes', type: 'int', array: true })
  bundleSizes: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}