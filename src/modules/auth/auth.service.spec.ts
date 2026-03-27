import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'JwtService',
          useValue: { signAsync: jest.fn(), decode: jest.fn() },
        },
        {
          provide: 'UsersService',
          useValue: { findByEmail: jest.fn(), removeToken: jest.fn(), blacklistToken: jest.fn() },
        },
        {
          provide: 'HashService',
          useValue: { comparePassword: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
