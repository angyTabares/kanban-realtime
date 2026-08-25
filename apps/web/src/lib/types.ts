import { BoardMemberRole } from '@kanban/shared';
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  ownerId: string;
  role: BoardMemberRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardMemberRole;
  user: User;
  createdAt: string;
}

export interface ColumnDto {
  id: string;
  title: string;
  color: string | null;
  position: number;
  boardId: string;
  tasks: TaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  labels: string[];
  dueDate: string | null;
  position: number;
  boardId: string;
  columnId: string;
  assigneeId: string | null;
  assignee: User | null;
  createdById: string;
  comments?: CommentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  author: User;
  createdAt: string;
}

export interface BoardFull {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  ownerId: string;
  role: BoardMemberRole | null;
  owner: User;
  members: BoardMember[];
  columns: ColumnDto[];
  createdAt: string;
  updatedAt: string;
}