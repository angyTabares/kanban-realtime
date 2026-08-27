import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BoardEvent, PresencePayload } from '@kanban/shared';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { REDIS } from './tokens';

interface SubscribedBoard {
  boardId: string;
}

const PRESENCE_KEY = (boardId: string) => `presence:${boardId}`;

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  path: '/ws',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    @Inject(REDIS)
    private readonly redis: Redis,
  ) {}

  afterInit() {
    if (this.redis.status !== 'ready') {
      this.logger.warn('Redis no disponible, realtime en memoria (sin adapter)');
      return;
    }
    try {
      const pubClient = this.redis.duplicate();
      const subClient = this.redis.duplicate();
      pubClient.on('error', () => {});
      subClient.on('error', () => {});
      this.server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('WebSocket gateway inicializado en /ws (Redis adapter activo)');
    } catch {
      this.logger.warn('Redis no disponible, realtime en memoria (sin adapter)');
    }
  }

  async handleConnection(socket: Socket) {
    try {
      const token = (socket.handshake.auth?.token as string) ?? '';
      const payload = await this.jwt.verifyAsync(token);
      socket.data.userId = payload.sub;
      socket.data.boards = new Map<string, SubscribedBoard>();
      this.logger.log(`Socket conectado userId=${payload.sub} socket=${socket.id}`);
    } catch {
      this.logger.warn(`Conexión rechazada (socket ${socket.id})`);
      socket.emit('error:auth', { code: 'UNAUTHORIZED', message: 'Token inválido' });
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    const boards = socket.data.boards as Map<string, SubscribedBoard> | undefined;
    if (!userId || !boards) return;
    for (const boardId of boards.keys()) {
      await this.removePresence(boardId, userId, socket);
    }
  }

  @SubscribeMessage('board:subscribe')
  async onSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId: string },
  ) {
    this.logger.log(`Suscrito board=${body.boardId} socket=${socket.id}`);
    socket.data.boards?.set(body.boardId, { boardId: body.boardId });
    await socket.join(this.room(body.boardId));
    await this.addPresence(body.boardId, socket.data.userId as string, socket);
  }

  @SubscribeMessage('board:unsubscribe')
  async onUnsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { boardId: string },
  ) {
    socket.data.boards?.delete(body.boardId);
    await socket.leave(this.room(body.boardId));
    await this.removePresence(body.boardId, socket.data.userId as string, socket);
  }

  /** Emite un evento a todos los miembros conectados de un board. */
  emitToBoard(boardId: string, event: BoardEvent | string, payload: unknown) {
    this.server.to(this.room(boardId)).emit(event, payload);
  }

  room(boardId: string): string {
    return `board:${boardId}`;
  }

  private async addPresence(boardId: string, userId: string, socket: Socket) {
    await this.redis.sadd(PRESENCE_KEY(boardId), userId);
    const online = await this.redis.smembers(PRESENCE_KEY(boardId));
    const payload: PresencePayload = { userId, boardId, online: true };
    this.server.to(this.room(boardId)).emit(BoardEvent.PRESENCE, payload);
    // Envío la lista completa a la persona que acaba de entrar
    socket.emit(BoardEvent.PRESENCE, { boardId, online: true, userId, activeUsers: online });
  }

  private async removePresence(boardId: string, userId: string, socket: Socket) {
    if (!userId || !boardId) return;
    await this.redis.srem(PRESENCE_KEY(boardId), userId);
    const online = await this.redis.smembers(PRESENCE_KEY(boardId));
    if (online.length === 0) {
      await this.redis.del(PRESENCE_KEY(boardId));
    }
    const payload: PresencePayload = { userId, boardId, online: false };
    this.server.to(this.room(boardId)).emit(BoardEvent.PRESENCE, payload);
  }
}