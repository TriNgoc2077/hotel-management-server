import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessTokenStrategy } from './strategies/access.strategy';
import { RefreshTokenStrategy } from './strategies/refresh.strategy';
import { UsersModule } from '../users/users.module';
import { HashService } from '../security/hash.service';

@Module({
  imports: [
    JwtModule.register({}),
    forwardRef(() => UsersModule)
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy, HashService],
  exports: [AuthService],
})
export class AuthModule {}