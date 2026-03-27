import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { SafeUser } from './auth.types';

type GoogleUser = Prisma.UserGetPayload<{
  include: {
    subscription: true;
  };
}>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getRequestMeta(request));
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getRequestMeta(request));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(
      dto.refreshToken,
      this.getRequestMeta(request),
    );
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: SafeUser) {
    return user;
  }

  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {
    return;
  }

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(
    @Req() request: Request & { user: GoogleUser },
    @Res() response: Response,
  ) {
    const authResponse = await this.authService.finishGoogleLogin(
      request.user,
      this.getRequestMeta(request),
    );
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const callbackUrl = new URL('/auth/callback', frontendUrl);

    callbackUrl.searchParams.set('accessToken', authResponse.accessToken);
    callbackUrl.searchParams.set('refreshToken', authResponse.refreshToken);

    return response.redirect(callbackUrl.toString());
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
