import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './board.entity';
import { BoardMember } from './board-member.entity';
import { User } from '../users/user.entity';
import { ColumnEntity } from '../columns/column.entity';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { BoardRolesGuard } from '../../common/guards/board-roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardMember, User, ColumnEntity])],
  controllers: [BoardsController],
  providers: [BoardsService, BoardRolesGuard],
  exports: [BoardsService, BoardRolesGuard, TypeOrmModule],
})
export class BoardsModule {}