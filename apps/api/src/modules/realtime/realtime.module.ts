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
        const password = config.get<string>('redis.password');
        const host = config.get<string>('redis.host') ?? '';
        const isUpstash = host.includes('upstash.io');
        const redis = new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          username: password ? config.get<string>('redis.username') : undefined,
          password,
          tls: config.get<any>('redis.tls'),
          // Upstash con clave errónea no debe tumbar la API
          lazyConnect: isUpstash,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: isUpstash ? () => null : undefined,
          enableOfflineQueue: !isUpstash,
        });
        redis.on('error', (err) => {
          // eslint-disable-next-line no-console
          console.warn('[Redis] no disponible, modo memoria:', err.message);
        });
        if (isUpstash) redis.connect().catch(() => {});
        return redis;
      },
    },
    RealtimeGateway,
  ],
  exports: [REDIS, RealtimeGateway],
})
export class RealtimeModule {}