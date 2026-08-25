import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ColumnEntity } from './column.entity';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { BoardsService } from '../boards/boards.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BoardEvent, BoardMemberRole } from '@kanban/shared';

@Injectable()
export class ColumnsService {
  constructor(
    @InjectRepository(ColumnEntity)
    private readonly columnRepo: Repository<ColumnEntity>,
    private readonly boards: BoardsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(boardId: string, userId: string, dto: CreateColumnDto): Promise<ColumnEntity> {
    await this.assertCanEdit(boardId, userId);

    const maxPosition = await this.nextPosition(boardId);
    const position = dto.position !== undefined ? parseFloat(dto.position) : maxPosition;

    const column = await this.columnRepo.save(
      this.columnRepo.create({
        boardId,
        title: dto.title,
        color: dto.color ?? null,
        position,
      }),
    );

    this.realtime.emitToBoard(boardId, BoardEvent.COLUMN_CREATED, column);
    return column;
  }

  async update(
    boardId: string,
    columnId: string,
    userId: string,
    dto: UpdateColumnDto,
  ): Promise<ColumnEntity> {
    await this.assertCanEdit(boardId, userId);

    const column = await this.columnRepo.findOneBy({ id: columnId, boardId });
    if (!column) {
      throw new NotFoundException('Columna no encontrada');
    }

    Object.assign(column, {
      title: dto.title ?? column.title,
      color: dto.color ?? column.color,
      position: dto.position !== undefined ? parseFloat(dto.position) : column.position,
    });
    const saved = await this.columnRepo.save(column);

    this.realtime.emitToBoard(boardId, BoardEvent.COLUMN_UPDATED, saved);
    return saved;
  }

  /** Reordena columnas. Recibe el array ordenado de ids y asigna posiciones 1..n. */
  async reorder(
    boardId: string,
    userId: string,
    orderedIds: string[],
  ): Promise<ColumnEntity[]> {
    await this.assertCanEdit(boardId, userId);

    const columns = await this.columnRepo.find({ where: { boardId } });
    const byId = new Map(columns.map((c) => [c.id, c]));
    const toSave: ColumnEntity[] = [];

    orderedIds.forEach((id, index) => {
      const col = byId.get(id);
      if (col) {
        col.position = index;
        toSave.push(col);
      }
    });

    const saved = await this.columnRepo.save(toSave);
    this.realtime.emitToBoard(boardId, BoardEvent.COLUMN_MOVED, {
      boardId,
      orderedIds: saved.map((c) => c.id),
    });
    return saved;
  }

  async remove(boardId: string, columnId: string, userId: string): Promise<void> {
    await this.assertCanEdit(boardId, userId);

    const column = await this.columnRepo.findOneBy({ id: columnId, boardId });
    if (!column) {
      throw new NotFoundException('Columna no encontrada');
    }

    await this.columnRepo.remove(column);
    this.realtime.emitToBoard(boardId, BoardEvent.COLUMN_DELETED, { boardId, columnId });
  }

  async validateColumn(boardId: string, columnId: string): Promise<ColumnEntity | null> {
    return this.columnRepo.findOneBy({ id: columnId, boardId });
  }

  private async assertCanEdit(boardId: string, userId: string): Promise<void> {
    const role = await this.boards.getRoleForUser(boardId, userId);
    if (!role) {
      throw new ForbiddenException('No eres miembro de este board');
    }
    if (![BoardMemberRole.OWNER, BoardMemberRole.ADMIN, BoardMemberRole.MEMBER].includes(role)) {
      throw new ForbiddenException('No tienes permisos de edición en este board');
    }
  }

  private async nextPosition(boardId: string): Promise<number> {
    const row = await this.columnRepo
      .createQueryBuilder('c')
      .select('MAX(c.position)', 'max')
      .where('c.boardId = :boardId', { boardId })
      .getRawOne<{ max: number | null }>();
    return (row?.max ?? -1) + 1;
  }
}