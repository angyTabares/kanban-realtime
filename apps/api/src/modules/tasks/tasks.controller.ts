import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoardMemberRole } from '@kanban/shared';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto, ReorderTasksDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BoardRolesGuard } from '../../common/guards/board-roles.guard';
import { BoardRoles } from '../../common/decorators/board-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BoardRolesGuard)
@Controller('boards/:boardId')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('columns/:columnId/tasks')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Crear tarea en una columna' })
  create(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(boardId, columnId, user.id, dto);
  }

  @Put('columns/:columnId/tasks/reorder')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Reordenar tareas de una columna' })
  reorder(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @CurrentUser() user: User,
    @Body() dto: ReorderTasksDto,
  ) {
    return this.tasks.reorderColumn(boardId, columnId, user.id, dto.orderedTaskIds);
  }

  @Post('tasks/:taskId/move')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Mover tarea entre columnas o reordenar' })
  move(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: User,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(boardId, taskId, user.id, dto);
  }

  @Patch('tasks/:taskId')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Actualizar tarea' })
  update(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(boardId, taskId, user.id, dto);
  }

  @Delete('tasks/:taskId')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tarea' })
  async remove(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: User,
  ) {
    await this.tasks.remove(boardId, taskId, user.id);
  }

  // ---------- Comentarios ----------

  @Post('tasks/:taskId/comments')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER, BoardMemberRole.VIEWER)
  @ApiOperation({ summary: 'Agregar comentario a una tarea' })
  addComment(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasks.addComment(boardId, taskId, user.id, dto);
  }

  @Delete('comments/:commentId')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER, BoardMemberRole.VIEWER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar comentario (autor, owner o admin)' })
  async removeComment(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUser() user: User,
  ) {
    await this.tasks.removeComment(boardId, commentId, user.id);
  }
}