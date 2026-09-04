import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './board.entity';
import { BoardMember, BoardMemberRole } from './board-member.entity';
import { User } from '../users/user.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BoardEvent } from '@kanban/shared';

import { ColumnEntity } from '../columns/column.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly memberRepo: Repository<BoardMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ColumnEntity)
    private readonly columnRepo: Repository<ColumnEntity>,
    @Inject(RealtimeGateway)
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Boards del usuario con su rol y nº de miembros. */
  async findForUser(userId: string): Promise<
    Array<Board & { role: BoardMemberRole; memberCount: number }>
  > {
    interface BoardWithCount extends Board {
      memberCount?: number;
    }

    const boards = (await this.boardRepo
      .createQueryBuilder('b')
      .select('b')
      .innerJoin('b.members', 'bm', 'bm.userId = :userId', { userId })
      .loadRelationCountAndMap('b.memberCount', 'b.members')
      .orderBy('b.updated_at', 'DESC')
      .getMany()) as BoardWithCount[];

    const roles = await this.memberRepo.find({
      where: { userId },
      select: { boardId: true, role: true },
    });
    const roleMap = new Map(roles.map((r) => [r.boardId, r.role]));

    return boards.map((b) => ({
      ...b,
      role: roleMap.get(b.id)!,
      memberCount: (b as unknown as { memberCount?: number }).memberCount ?? 0,
    }));
  }

  /** Board completo con columnas y tareas, validando membresía. */
  async findOneForUser(
    boardId: string,
    userId: string,
  ): Promise<Board & { role: BoardMemberRole | null }> {
    const role = await this.getRoleForUser(boardId, userId);
    if (!role) {
      throw new ForbiddenException('No eres miembro de este board');
    }

    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      relations: {
        columns: {
          tasks: {
            assignee: true,
            comments: { author: true },
          },
        },
        members: { user: true },
        owner: true,
      },
    });

    if (!board) {
      throw new NotFoundException('Board no encontrado');
    }

    // Ordenar columnas y tareas dentro de ellas
    board.columns.sort((a, b) => a.position - b.position);
    board.columns.forEach((c) => {
      c.tasks.sort((a, b) => a.position - b.position);
    });

    const member = board.members.find((m) => m.userId === userId);
    return { ...board, role: member?.role ?? null };
  }

  async create(userId: string, dto: CreateBoardDto): Promise<Board> {
    const board = await this.boardRepo.save(
      this.boardRepo.create({ ...dto, ownerId: userId }),
    );

    // El creador se agrega como OWNER
    await this.memberRepo.save(
      this.memberRepo.create({
        boardId: board.id,
        userId,
        role: BoardMemberRole.OWNER,
      }),
    );

    // Columnas por defecto
    const defaults = [
      { title: 'Pendiente', color: '#94a3b8' },
      { title: 'En progreso', color: '#f59e0b' },
      { title: 'Hecho', color: '#10b981' },
    ];
    await this.columnRepo.save(
      defaults.map((c, i) =>
        this.columnRepo.create({
          boardId: board.id,
          title: c.title,
          color: c.color,
          position: i,
        }),
      ),
    );

    return this.findOneForUser(board.id, userId);
  }

  async update(
    boardId: string,
    userId: string,
    dto: UpdateBoardDto,
  ): Promise<Board> {
    await this.assertRole(boardId, userId, [BoardMemberRole.OWNER, BoardMemberRole.ADMIN]);
    await this.boardRepo.update(boardId, dto);
    this.realtime.emitToBoard(boardId, BoardEvent.BOARD_UPDATED, { boardId, ...dto });
    return this.findOneForUser(boardId, userId);
  }

  async remove(boardId: string, userId: string): Promise<void> {
    await this.assertRole(boardId, userId, [BoardMemberRole.OWNER]);
    await this.boardRepo.delete(boardId);
    this.serverlessBroadcast(boardId, BoardEvent.BOARD_UPDATED, { boardId, deleted: true });
  }

  /** Agrega un miembro por email. Solo OWNER/ADMIN. */
  async addMember(
    boardId: string,
    actorId: string,
    dto: AddMemberDto,
  ): Promise<Board> {
    await this.assertRole(boardId, actorId, [BoardMemberRole.OWNER, BoardMemberRole.ADMIN]);

    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user) {
      throw new NotFoundException('No existe un usuario con ese email');
    }

    const existing = await this.memberRepo.findOneBy({
      boardId,
      userId: user.id,
    });
    if (existing) {
      throw new BadRequestException('El usuario ya es miembro del board');
    }

    const saved = await this.memberRepo.save(
      this.memberRepo.create({
        boardId,
        userId: user.id,
        role: dto.role ?? BoardMemberRole.MEMBER,
      }),
    );

    const fullMember = await this.memberRepo.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    if (fullMember) {
      this.realtime.emitToBoard(boardId, BoardEvent.MEMBER_ADDED, fullMember);
    }

    return this.findOneForUser(boardId, actorId);
  }

  async removeMember(
    boardId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<Board> {
    await this.assertRole(boardId, actorId, [BoardMemberRole.OWNER, BoardMemberRole.ADMIN]);

    if (targetUserId === actorId) {
      throw new BadRequestException('No puedes eliminarte a ti mismo');
    }

    const targetRole = await this.getRoleForUser(boardId, targetUserId);
    if (!targetRole) {
      throw new NotFoundException('El usuario no es miembro del board');
    }
    if (targetRole === BoardMemberRole.OWNER) {
      throw new BadRequestException('No puedes eliminar al propietario del board');
    }

    await this.memberRepo.delete({ boardId, userId: targetUserId });

    this.realtime.emitToBoard(boardId, BoardEvent.MEMBER_REMOVED, {
      boardId,
      userId: targetUserId,
    });

    return this.findOneForUser(boardId, actorId);
  }

  /** Rol del usuario en el board, o null si no es miembro. Usado por el guard RBAC. */
  async getRoleForUser(boardId: string, userId: string): Promise<BoardMemberRole | null> {
    const member = await this.memberRepo.findOneBy({ boardId, userId });
    return member?.role ?? null;
  }

  private async assertRole(
    boardId: string,
    userId: string,
    allowed: BoardMemberRole[],
  ): Promise<void> {
    const role = await this.getRoleForUser(boardId, userId);
    if (!role) {
      throw new ForbiddenException('No eres miembro de este board');
    }
    if (!allowed.includes(role)) {
      throw new ForbiddenException(`Se requiere rol: ${allowed.join(' o ')}`);
    }
  }

  private serverlessBroadcast(boardId: string, event: string, payload: unknown) {
    this.realtime.emitToBoard(boardId, event, payload);
  }
}