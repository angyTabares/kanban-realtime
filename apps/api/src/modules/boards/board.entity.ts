import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { BoardMember } from './board-member.entity';
import { ColumnEntity } from '../columns/column.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  icon: string | null;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, (u) => u.ownedBoards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => BoardMember, (bm) => bm.board, { cascade: true })
  members: BoardMember[];

  @OneToMany(() => ColumnEntity, (c) => c.board, { cascade: true })
  columns: ColumnEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}