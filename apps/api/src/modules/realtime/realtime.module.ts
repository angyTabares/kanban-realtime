import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { RealtimeGateway } from './realtime.gateway';
import { REDIS } from './tokens';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const redis = new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          username: config.get<string>('redis.username'),
          password: config.get<string>('redis.password'),
          tls: config.get<any>('redis.tls'),
          lazyConnect: false,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: () => null,
        });
        redis.on('error', (err) => {
          // No tumba la API; el realtime queda en memoria para 1 instancia
          // eslint-disable-next-line no-console
          console.warn('[Redis] no disponible, modo memoria:', err.message);
        });
        return redis;
      },
    },
    RealtimeGateway,
  ],
  exports: [REDIS, RealtimeGateway],
})
export class RealtimeModule {}