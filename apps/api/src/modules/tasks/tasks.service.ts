import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { Comment } from './comment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { BoardsService } from '../boards/boards.service';
import { ColumnsService } from '../columns/columns.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { BoardEvent, BoardMemberRole } from '@kanban/shared';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly boards: BoardsService,
    private readonly columns: ColumnsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(boardId: string, columnId: string, userId: string, dto: CreateTaskDto): Promise<Task> {
    await this.assertCanEdit(boardId, userId);

    const column = await this.columns.validateColumn(boardId, columnId);
    if (!column) {
      throw new BadRequestException('La columna no pertenece al board');
    }

    if (dto.assigneeId) {
      await this.assertMemberOfBoard(boardId, dto.assigneeId);
    }

    const position = await this.nextPosition(columnId);
    const task = await this.taskRepo.save(
      this.taskRepo.create({
        boardId,
        columnId,
        createdById: userId,
        title: dto.title,
        description: dto.description ?? null,
        labels: dto.labels ?? [],
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId ?? null,
        position,
      }),
    );

    const full = await this.findFull(task.id);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_CREATED, full);
    return full;
  }

  async update(boardId: string, taskId: string, userId: string, dto: UpdateTaskDto): Promise<Task> {
    await this.assertCanEdit(boardId, userId);

    const task = await this.findOwnedTask(boardId, taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.assertMemberOfBoard(boardId, dto.assigneeId);
    }

    Object.assign(task, {
      title: dto.title ?? task.title,
      description: dto.description ?? task.description,
      labels: dto.labels ?? task.labels,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : task.dueDate,
      assigneeId: dto.assigneeId ?? task.assigneeId,
      position: dto.position ?? task.position,
    });

    const saved = await this.taskRepo.save(task);
    const full = await this.findFull(saved.id);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_UPDATED, full);
    return full;
  }

  /** Mueve la tarea a otra columna y, opcionalmente, la reordena. */
  async move(boardId: string, taskId: string, userId: string, dto: MoveTaskDto): Promise<Task> {
    await this.assertCanEdit(boardId, userId);

    const task = await this.findOwnedTask(boardId, taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    if (!(await this.columns.validateColumn(boardId, dto.targetColumnId))) {
      throw new BadRequestException('La columna destino no pertenece al board');
    }

    await this.taskRepo.update(taskId, {
      columnId: dto.targetColumnId,
      position: dto.position,
    });

    // Re-normalizar posiciones de ambas columnas para evitar colisiones
    await this.normalizeColumn(dto.targetColumnId);
    if (task.columnId !== dto.targetColumnId) {
      await this.normalizeColumn(task.columnId);
    }

    const full = await this.findFull(taskId);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_MOVED, {
      boardId,
      task: full,
      previousColumnId: task.columnId,
      targetColumnId: dto.targetColumnId,
    });
    return full;
  }

  /** Reordena las tareas de una columna según los ids enviados. */
  async reorderColumn(
    boardId: string,
    columnId: string,
    userId: string,
    orderedTaskIds: string[],
  ): Promise<Task[]> {
    await this.assertCanEdit(boardId, userId);

    const tasks = await this.taskRepo.find({
      where: { columnId },
      order: { position: 'ASC' },
    });
    const byId = new Map(tasks.map((t) => [t.id, t]));

    if (orderedTaskIds.length !== tasks.length) {
      throw new BadRequestException(
        'La lista debe contener exactamente todas las tareas de la columna',
      );
    }

    const toSave: Task[] = [];
    orderedTaskIds.forEach((id, index) => {
      const task = byId.get(id);
      if (!task) {
        throw new BadRequestException('Existe una tarea fuera del board');
      }
      task.position = index;
      toSave.push(task);
    });

    const saved = await this.taskRepo.save(toSave);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_MOVED, {
      boardId,
      columnId,
      orderedTaskIds,
    });
    return saved;
  }

  async remove(boardId: string, taskId: string, userId: string): Promise<void> {
    await this.assertCanEdit(boardId, userId);

    const task = await this.findOwnedTask(boardId, taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    await this.taskRepo.remove(task);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_DELETED, {
      boardId,
      taskId,
      columnId: task.columnId,
    });
  }

  // ---------- Comentarios ----------

  async addComment(
    boardId: string,
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.assertCanView(boardId, userId);

    const task = await this.findOwnedTask(boardId, taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({
        taskId,
        authorId: userId,
        body: dto.body,
      }),
    );

    const full = await this.commentRepo.findOne({
      where: { id: comment.id },
      relations: { author: true },
    });

    if (!full) {
      throw new NotFoundException('Comentario no encontrado');
    }

    this.realtime.emitToBoard(boardId, BoardEvent.TASK_UPDATED + ':comment', {
      boardId,
      taskId,
      comment: full,
    });
    return full;
  }

  async removeComment(
    boardId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const comment = await this.commentRepo.findOneBy({ id: commentId });
    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }
    const task = await this.findOwnedTask(boardId, comment.taskId);
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const role = await this.boards.getRoleForUser(boardId, userId);
    if (comment.authorId !== userId && role !== BoardMemberRole.OWNER && role !== BoardMemberRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para eliminar este comentario');
    }

    await this.commentRepo.remove(comment);
    this.realtime.emitToBoard(boardId, BoardEvent.TASK_UPDATED + ':comment', {
      boardId,
      taskId: comment.taskId,
      deletedCommentId: comment.id,
    });
  }

  // ---------- Helpers ----------

  private async findFull(taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { assignee: true },
    });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }

  private async findOwnedTask(boardId: string, taskId: string): Promise<Task | null> {
    return this.taskRepo.findOneBy({ id: taskId, boardId });
  }

  private async nextPosition(columnId: string): Promise<number> {
    const row = await this.taskRepo
      .createQueryBuilder('t')
      .select('MAX(t.position)', 'max')
      .where('t.columnId = :columnId', { columnId })
      .getRawOne<{ max: number | null }>();
    return (row?.max ?? -1) + 1;
  }

  private async normalizeColumn(columnId: string): Promise<void> {
    const tasks = await this.taskRepo.find({
      where: { columnId },
      order: { position: 'ASC' },
    });
    if (tasks.length === 0) return;
    tasks.forEach((t, index) => (t.position = index));
    await this.taskRepo.save(tasks);
  }

  private async assertMemberOfBoard(boardId: string, userId: string): Promise<void> {
    const role = await this.boards.getRoleForUser(boardId, userId);
    if (!role) {
      throw new BadRequestException('El asignado debe ser miembro del board');
    }
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

  private async assertCanView(boardId: string, userId: string): Promise<void> {
    const role = await this.boards.getRoleForUser(boardId, userId);
    if (!role) {
      throw new ForbiddenException('No eres miembro de este board');
    }
  }
}