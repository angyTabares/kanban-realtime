/**
 * Configuración centralizada de la API.
 * Todas las variables de entorno quedan tipadas y validadas aquí,
 * en lugar de leer process.env disperso por el código.
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim()),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'kanban',
    password: process.env.DB_PASSWORD ?? 'kanban',
    name: process.env.DB_NAME ?? 'kanban_dev',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: process.env.REDIS_HOST?.includes('upstash.io') ? {} : undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});