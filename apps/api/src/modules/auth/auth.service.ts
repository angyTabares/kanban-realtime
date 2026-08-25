import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: Omit<User, 'passwordHash'>;
}

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepo.findOneBy({
      email: dto.email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
      }),
    );

    return this.issueTokens(user, dto.userAgent, dto.ip);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOneBy({ email: dto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user, dto.userAgent, dto.ip);
  }

  /**
   * Refresh token rotation: cada refresh revoca el token usado y emite
   * uno nuevo. Mitiga replay attacks si un token se filtra.
   */
  async refresh(rawToken: string, userAgent?: string, ip?: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (
      !stored ||
      stored.revoked ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      await this.revokeTokenFamily(stored?.id);
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Rotación: revocar el token actual y emitir uno nuevo
    stored.revoked = true;
    stored.replacedBy = null;
    await this.refreshRepo.save(stored);

    return this.issueTokens(stored.user, userAgent, ip);
  }

  async logout(rawToken: string): Promise<void> {
    const stored = await this.refreshRepo.findOneBy({
      tokenHash: this.hashToken(rawToken),
    });
    if (stored) {
      stored.revoked = true;
      await this.refreshRepo.save(stored);
    }
  }

  private async issueTokens(
    user: User,
    userAgent?: string,
    ip?: string,
  ): Promise<AuthResponse> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user.id, userAgent, ip),
    ]);

    const { passwordHash: _ignored, ...safeUser } = user;

    return { accessToken, refreshToken, user: safeUser };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.secret')!,
      expiresIn: this.config.get<string>('jwt.accessExpiresIn')! as never,
    });
  }

  private async signRefreshToken(
    userId: string,
    userAgent?: string,
    ip?: string,
  ): Promise<string> {
    const raw = randomUUID();
    const plain = `${raw}.${randomUUID()}`;
    const expiresAt = new Date(
      Date.now() + this.parseDuration(this.config.get('jwt.refreshExpiresIn') as string),
    );

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash: this.hashToken(plain),
        expiresAt,
        userAgent,
        ip,
      }),
    );

    return plain;
  }

  private async revokeTokenFamily(id?: string): Promise<void> {
    if (!id) return;
    await this.refreshRepo.update({ id }, { revoked: true });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * ms[unit as keyof typeof ms];
  }
}