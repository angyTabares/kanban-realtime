import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BOARD_ROLES_KEY } from '../decorators/board-roles.decorator';
import { BoardMemberRole } from '@kanban/shared';
import { BoardsService } from '../../modules/boards/boards.service';

/**
 * Guard de RBAC a nivel de board.
 * Requiere que la request exponga `boardId` en params (URL) o body.
 * Verifica la membresía del usuario y su rol dentro del board.
 */
@Injectable()
export class BoardRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => BoardsService))
    private readonly boardsService: BoardsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<BoardMemberRole[]>(
      BOARD_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || roles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<any>();
    const boardId = req.params?.boardId ?? req.body?.boardId;
    const user = req.user;

    if (!boardId || !user) {
      throw new ForbiddenException('No se pudo resolver la membresía del board');
    }

    const role = await this.boardsService.getRoleForUser(boardId, user.id);
    if (!role || !roles.includes(role)) {
      throw new ForbiddenException(`Se requiere rol: ${roles.join(' o ')}`);
    }

    return true;
  }
}