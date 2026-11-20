import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;


  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'bundle_sizes', type: 'int', array: true })
  bundleSizes: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
