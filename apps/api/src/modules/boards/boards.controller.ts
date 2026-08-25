import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoardMemberRole } from '@kanban/shared';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BoardRolesGuard } from '../../common/guards/board-roles.guard';
import { BoardRoles } from '../../common/decorators/board-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('boards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio' })
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get()
  @ApiOperation({ summary: 'Boards del usuario autenticado' })
  findAll(@CurrentUser() user: User) {
    return this.boards.findForUser(user.id);
  }

  @Post(':boardId/members')
  @UseGuards(BoardRolesGuard)
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @ApiOperation({ summary: 'Invitar miembro por email' })
  addMember(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
    @Body() dto: AddMemberDto,
  ) {
    return this.boards.addMember(boardId, user.id, dto);
  }

  @Delete(':boardId/members/:memberId')
  @UseGuards(BoardRolesGuard)
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar miembro del board' })
  removeMember(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
  ) {
    return this.boards.removeMember(boardId, user.id, memberId);
  }

  @Get(':boardId')
  @UseGuards(BoardRolesGuard)
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER, BoardMemberRole.VIEWER)
  @ApiOperation({ summary: 'Board completo: columnas, tareas y miembros' })
  findOne(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
  ) {
    return this.boards.findOneForUser(boardId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear board con columnas por defecto' })
  create(@CurrentUser() user: User, @Body() dto: CreateBoardDto) {
    return this.boards.create(user.id, dto);
  }

  @Patch(':boardId')
  @UseGuards(BoardRolesGuard)
  @BoardRoles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar board' })
  update(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.update(boardId, user.id, dto);
  }

  @Delete(':boardId')
  @UseGuards(BoardRolesGuard)
  @BoardRoles(BoardMemberRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar board (solo owner)' })
  async remove(
    @Param('boardId', new ParseUUIDPipe()) boardId: string,
    @CurrentUser() user: User,
  ) {
    await this.boards.remove(boardId, user.id);
  }
}