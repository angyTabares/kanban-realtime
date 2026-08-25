import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test',
    passwordHash: '$2a$12$hash',
  };

  const userRepo = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn((e) => e),
  };

  const refreshRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((e) => e),
    update: jest.fn(),
    create: jest.fn((e) => e),
  };

  const jwt = {
    signAsync: jest.fn(async () => 'access-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                'jwt.secret': 'secret',
                'jwt.accessExpiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('registra un usuario y devuelve el par de tokens', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      refreshRepo.save.mockResolvedValue({});

      const res = await service.register({
        email: 'TEST@example.com',
        name: 'Test',
        password: 'password',
      });

      expect(res.accessToken).toBe('access-token');
      expect(res.refreshToken).toBeDefined();
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('lanza conflicto si el email ya existe', async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          name: 'Test',
          password: 'password',
        }),
      ).rejects.toThrow('El email ya está registrado');
    });
  });

  describe('login', () => {
    it('rechaza credenciales inválidas', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('logout', () => {
    it('revoca el refresh token', async () => {
      refreshRepo.findOneBy.mockResolvedValue({ id: 'rt1', revoked: false });
      await service.logout('some-token');
      expect(refreshRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rt1', revoked: true }),
      );
    });
  });
});