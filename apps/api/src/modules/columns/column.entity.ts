import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Board } from '../boards/board.entity';
import { Task } from '../tasks/task.entity';

@Entity('columns')
export class ColumnEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 9, nullable: true })
  color: string | null;

  @Column({ type: 'double precision', default: 0 })
  position: number;

  @Index()
  @Column({ name: 'board_id' })
  boardId: string;

  @ManyToOne(() => Board, (b) => b.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @OneToMany(() => Task, (t) => t.column, { cascade: true })
  tasks: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}