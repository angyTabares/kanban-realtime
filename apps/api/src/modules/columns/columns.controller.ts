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
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BoardRolesGuard } from '../../common/guards/board-roles.guard';
import { BoardRoles } from '../../common/decorators/board-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BoardRolesGuard)
@Controller('boards/:boardId/columns')
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post()
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Crear columna' })
  create(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columns.create(boardId, user.id, dto);
  }

  @Put('reorder')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Reordenar columnas del board' })
  reorder(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
    @Body() orderedIds: string[],
  ) {
    return this.columns.reorder(boardId, user.id, orderedIds);
  }

  @Patch(':columnId')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @ApiOperation({ summary: 'Actualizar columna' })
  update(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columns.update(boardId, columnId, user.id, dto);
  }

  @Delete(':columnId')
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar columna y sus tareas' })
  async remove(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @Param('columnId', new ParseUUIDPipe()) columnId: string,
    @CurrentUser() user: User,
  ) {
    await this.columns.remove(boardId, columnId, user.id);
  }
}