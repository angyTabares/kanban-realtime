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
      useFactory: (config: ConfigService): Redis =>
        new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          username: config.get<string>('redis.username'),
          password: config.get<string>('redis.password'),
          tls: config.get<any>('redis.tls'),
          lazyConnect: false,
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        }),
    },
    RealtimeGateway,
  ],
  exports: [REDIS, RealtimeGateway],
})
export class RealtimeModule {}