import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BoardsModule } from '../src/modules/boards/boards.module';
import { ColumnsModule } from '../src/modules/columns/columns.module';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { RealtimeModule } from '../src/modules/realtime/realtime.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

/**
 * Pruebas e2e sobre infraestructura real (PostgreSQL + Redis).
 * Requiere las variables DB_HOST/DB_PORT/DB_NAME seteadas por CI o localmente.
 */
describe('Kanban API (e2e)', () => {
  let app: INestApplication;
  let server: any;

  const register = async (email: string) => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email, name: 'E2E', password: 'password123' })
      .expect(201);
    return res.body.data;
  };

  beforeAll(async () => {
    process.env.DB_NAME = process.env.DB_NAME ?? 'kanban_test';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.JWT_SECRET = 'e2e-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        DatabaseModule,
        RealtimeModule,
        AuthModule,
        BoardsModule,
        ColumnsModule,
        TasksModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    server = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('registra, autentica y devuelve el perfil', async () => {
    const { accessToken } = await register('alice@example.com');

    const me = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(me.body.data.email).toBe('alice@example.com');
  });

  it('rechaza el acceso sin token', async () => {
    await request(server).get('/api/boards').expect(401);
  });

  it('crea un board con columnas por defecto', async () => {
    const { accessToken } = await register('bob@example.com');

    const created = await request(server)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Sprint 12', icon: '🚀' })
      .expect(201);

    const board = created.body.data;
    expect(board.name).toBe('Sprint 12');
    expect(board.role).toBe('OWNER');
    expect(board.columns).toHaveLength(3); // Pendiente, En progreso, Hecho
  });

  it('crea, edita y mueve tareas en tiempo lógico de board', async () => {
    const { accessToken } = await register('carol@example.com');

    const boardRes = await request(server)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Testing' })
      .expect(201);

    const board = boardRes.body.data;
    const [col0, col1] = board.columns;

    // Crear tarea
    const taskRes = await request(server)
      .post(`/api/boards/${board.id}/columns/${col0.id}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Escribir tests', labels: ['green', 'sky'] })
      .expect(201);

    const task = taskRes.body.data;
    expect(task.title).toBe('Escribir tests');
    expect(task.labels).toHaveLength(2);

    // Actualizar
    const upd = await request(server)
      .patch(`/api/boards/${board.id}/tasks/${task.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Escribir más tests' })
      .expect(200);
    expect(upd.body.data.title).toBe('Escribir más tests');

    // Mover a otra columna
    await request(server)
      .post(`/api/boards/${board.id}/tasks/${task.id}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ targetColumnId: col1.id, position: 0 })
      .expect(201);

    const full = await request(server)
      .get(`/api/boards/${board.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const moved = full.body.data.columns.find((c: any) => c.id === col1.id);
    expect(moved.tasks.some((t: any) => t.id === task.id)).toBe(true);
  });

  it('aplica RBAC: un VIEWER no puede crear columnas', async () => {
    const owner = await register('owner@example.com');
    const viewer = await register('viewer@example.com');

    const boardRes = await request(server)
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Board RBAC' })
      .expect(201);
    const board = boardRes.body.data;

    // Owner invita al viewer
    await request(server)
      .post(`/api/boards/${board.id}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: 'viewer@example.com', role: 'VIEWER' })
      .expect(201);

    // Viewer intenta crear una columna -> 403
    await request(server)
      .post(`/api/boards/${board.id}/columns`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ title: 'Hack' })
      .expect(403);
  });

  it('rota refresh tokens y rechaza un token reutilizado', async () => {
    const initial = await register('refresh@example.com');

    const rotated = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: initial.refreshToken })
      .expect(200);

    expect(rotated.body.data.accessToken).toBeDefined();

    // Reutilizar el token viejo (ya rotado) debe fallar
    await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken: initial.refreshToken })
      .expect(401);
  });

  it('valida DTOs con whitelist y rechaza campos desconocidos', async () => {
    const { accessToken } = await register('dto@example.com');

    await request(server)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'X', hackyField: true })
      .expect(400);
  });
});