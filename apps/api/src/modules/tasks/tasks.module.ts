import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { Comment } from './comment.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { BoardsModule } from '../boards/boards.module';
import { ColumnsModule } from '../columns/columns.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Comment]), BoardsModule, ColumnsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService, TypeOrmModule],
})
export class TasksModule {}