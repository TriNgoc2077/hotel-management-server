import { Controller, Post, Body, UseGuards, Req, Headers, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { UAParser } from 'ua-parser-js';
import { GetAgent } from 'src/common/decorators/get-ua.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { RegisterUserDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @GetAgent() agent: string) {
    return this.authService.login(loginDto, agent);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refreshTokens(@Req() req: Request, @GetAgent() agent: string) {
    const userId = req.user?.['sub'];
    const refreshToken = req.user?.['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken, agent);
  }

  @Post('logout')
  async logout(@Req() req: Request, @GetAgent() agent: string) {
    const userId = req.user?.['sub'];
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1];
    return this.authService.logout(userId, agent, accessToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: Request) {
    return this.authService.getMe(req.user?.['sub']);
  }

  @Public()
  @Post('register')
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }
}