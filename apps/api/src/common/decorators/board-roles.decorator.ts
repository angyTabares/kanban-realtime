import { SetMetadata } from '@nestjs/common';
import { BoardMemberRole } from '@kanban/shared';

/** Roles permitidos sobre el recurso board. Se comparan con el rol del usuario en el board. */
export const BOARD_ROLES_KEY = 'boardRoles';
export const BoardRoles = (...roles: BoardMemberRole[]) =>
  SetMetadata(BOARD_ROLES_KEY, roles);