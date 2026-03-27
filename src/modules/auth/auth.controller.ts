import { Controller, Post, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { UAParser } from 'ua-parser-js';
import { GetAgent } from 'src/common/decorators/get-ua.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @GetAgent() agent: string) {
    return this.authService.login(loginDto, agent);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refreshTokens(@Req() req: Request, @GetAgent() agent: string) {
    const userId = req.user?.['sub'];
    const refreshToken = req.user?.['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken, agent);
  }
}