import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Board } from '../boards/board.entity';
import { BoardMember } from '../boards/board-member.entity';
import { Task } from '../tasks/task.entity';
import { Comment } from '../tasks/comment.entity';
import { RefreshToken } from '../auth/refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Board, (b) => b.owner)
  ownedBoards: Board[];

  @OneToMany(() => BoardMember, (bm) => bm.user)
  boardMemberships: BoardMember[];

  @OneToMany(() => Task, (t) => t.assignee)
  assignedTasks: Task[];

  @OneToMany(() => Comment, (c) => c.author)
  comments: Comment[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}