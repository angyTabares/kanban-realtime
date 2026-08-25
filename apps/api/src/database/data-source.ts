import { DataSource } from 'typeorm';
import { User } from '../modules/users/user.entity';
import { Board } from '../modules/boards/board.entity';
import { BoardMember } from '../modules/boards/board-member.entity';
import { ColumnEntity } from '../modules/columns/column.entity';
import { Task } from '../modules/tasks/task.entity';
import { Comment } from '../modules/tasks/comment.entity';
import { RefreshToken } from '../modules/auth/refresh-token.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'kanban',
  password: process.env.DB_PASSWORD ?? 'kanban',
  database: process.env.DB_NAME ?? 'kanban_dev',
  entities: [User, Board, BoardMember, ColumnEntity, Task, Comment, RefreshToken],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
});