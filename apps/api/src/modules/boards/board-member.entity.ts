import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Unique, Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Board } from './board.entity';

export enum BoardMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

@Entity('board_members')
@Unique(['boardId', 'userId'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'board_id' })
  boardId: string;

  @ManyToOne(() => Board, (b) => b.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (u) => u.boardMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: BoardMemberRole,
    default: BoardMemberRole.MEMBER,
  })
  role: BoardMemberRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}