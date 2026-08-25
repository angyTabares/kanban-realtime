export enum BoardMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum BoardEvent {
  TASK_CREATED = 'board:task:created',
  TASK_UPDATED = 'board:task:updated',
  TASK_MOVED = 'board:task:moved',
  TASK_DELETED = 'board:task:deleted',
  COLUMN_CREATED = 'board:column:created',
  COLUMN_UPDATED = 'board:column:updated',
  COLUMN_DELETED = 'board:column:deleted',
  COLUMN_MOVED = 'board:column:moved',
  BOARD_UPDATED = 'board:updated',
  MEMBER_ADDED = 'board:member:added',
  MEMBER_REMOVED = 'board:member:removed',
  PRESENCE = 'board:presence',
}

export interface TaskDraft {
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface ColumnDraft {
  title: string;
  color?: string;
}

export interface BoardDraft {
  name: string;
  description?: string;
  icon?: string;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}

export interface PresencePayload {
  userId: string;
  boardId: string;
  online: boolean;
}