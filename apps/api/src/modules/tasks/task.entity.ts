import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Board } from '../boards/board.entity';
import { ColumnEntity } from '../columns/column.entity';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  labels: string[];

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date | null;  @Column({ name: 'position', type: 'double precision', default: 0 })
  position: number;

  @Index()
  @Column({ name: 'board_id' })
  boardId: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @Index()
  @Column({ name: 'column_id' })
  columnId: string;

  @ManyToOne(() => ColumnEntity, (c) => c.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'column_id' })
  column: ColumnEntity;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, (u) => u.assignedTasks, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => Comment, (c) => c.task, { cascade: true })
  comments: Comment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}