import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColumnEntity } from './column.entity';
import { ColumnsService } from './columns.service';
import { ColumnsController } from './columns.controller';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [TypeOrmModule.forFeature([ColumnEntity]), BoardsModule],
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService, TypeOrmModule],
})
export class ColumnsModule {}