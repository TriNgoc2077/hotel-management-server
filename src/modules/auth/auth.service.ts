import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { HashService } from '../security/hash.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessExpiration: string;
  private refreshExpiration: string;

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private hashService: HashService,
  ) {
    this.accessSecret = process.env.JWT_ACCESS_SECRET as string;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    this.accessExpiration = process.env.JWT_ACCESS_EXPIRATION as any;
    this.refreshExpiration = process.env.JWT_REFRESH_EXPIRATION as any;
  }

  async getTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiration as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiration as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async login(loginDto: LoginDto, agent: string) {
    const user = await this.usersService.findByEmail(loginDto.email);
    const isPasswordMatch = await this.hashService.comparePassword(loginDto.password, user.passwordHash);
    if (!user || !isPasswordMatch) throw new UnauthorizedException('Username or password is incorrect!');

    const tokens = await this.getTokens(user.id, loginDto.email, user.role);

    await this.updateRefreshToken(user.id, tokens.refreshToken, agent);

    return tokens;
  }

  async updateRefreshToken(userId: string, refreshToken: string, agent: string) {
    // Decode the token to get the exact expiration timestamp (exp is in seconds)
    const decodedToken = this.jwtService.decode(refreshToken) as any;
    const expiredAt = new Date(decodedToken.exp * 1000);

    await this.usersService.updateRefreshToken(userId, refreshToken, expiredAt, agent);
  }

  async refreshTokens(userId: string, rt: string, agent: string) {
    const user = await this.usersService.findByRefreshToken(rt, agent);

    if (!user) throw new UnauthorizedException('Access Denied');

    const tokens = await this.getTokens(userId, user.email, user.role);
    await this.updateRefreshToken(userId, tokens.refreshToken, agent);
    
    return tokens;
  }

  async getMe(userId: string) {
    return this.usersService.findOne(userId);
  }

  async logout(userId: string, agent: string, accessToken?: string) {
    await this.usersService.removeToken(userId, agent);
    
    if (accessToken) {
      const decodedToken = this.jwtService.decode(accessToken) as any;
      if (decodedToken && decodedToken.exp) {
        // decodedToken.exp is in seconds, UsersService exp is in milliseconds (Date.now())
        await this.usersService.blacklistToken(accessToken, decodedToken.exp * 1000);
      }
    }

    return true;
  }
}