import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/user.entity';
import { Board } from '../modules/boards/board.entity';
import { BoardMember } from '../modules/boards/board-member.entity';
import { ColumnEntity } from '../modules/columns/column.entity';
import { Task } from '../modules/tasks/task.entity';
import { Comment } from '../modules/tasks/comment.entity';
import { RefreshToken } from '../modules/auth/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [User, Board, BoardMember, ColumnEntity, Task, Comment, RefreshToken],
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<string>('env') === 'development' ? ['query', 'error'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}