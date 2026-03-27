import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthProvider,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { RequestMeta, SafeUser, TokenPayload } from './auth.types';

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true;
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new ConflictException('Já existe uma conta com esse e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        provider: AuthProvider.LOCAL,
        subscription: {
          create: {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.INACTIVE,
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    await this.workspacesService.createStarterWorkspaceForUser(
      user.id,
      user.name,
    );
    await this.workspacesService.acceptPendingInvitesForUser(
      user.id,
      user.email,
    );

    return this.issueTokens(user, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email.toLowerCase(),
      },
      include: {
        subscription: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.workspacesService.acceptPendingInvitesForUser(
      user.id,
      user.email,
    );

    return this.issueTokens(user, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (!payload.sessionId) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const session = await this.prisma.session.findUnique({
      where: {
        id: payload.sessionId,
      },
      include: {
        user: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Sessão expirada.');
    }

    const isValidToken = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isValidToken) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    return this.rotateSession(session.id, session.user, meta);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      if (!payload.sessionId) {
        return { success: true };
      }

      await this.prisma.session.updateMany({
        where: {
          id: payload.sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return { success: true };
    } catch {
      return { success: true };
    }
  }

  async upsertGoogleUser(input: {
    email: string;
    googleId: string;
    name: string;
    avatarUrl?: string;
  }) {
    const email = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        subscription: true,
      },
    });

    if (existingUser) {
      return this.prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          googleId: input.googleId,
          avatarUrl: input.avatarUrl,
          name: input.name || existingUser.name,
          provider: AuthProvider.GOOGLE,
          subscription: existingUser.subscription
            ? undefined
            : {
                create: {
                  plan: SubscriptionPlan.FREE,
                  status: SubscriptionStatus.INACTIVE,
                },
              },
        },
        include: {
          subscription: true,
        },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        googleId: input.googleId,
        name: input.name,
        avatarUrl: input.avatarUrl,
        provider: AuthProvider.GOOGLE,
        subscription: {
          create: {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.INACTIVE,
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    await this.workspacesService.createStarterWorkspaceForUser(
      user.id,
      user.name,
    );
    await this.workspacesService.acceptPendingInvitesForUser(
      user.id,
      user.email,
    );

    return user;
  }

  async finishGoogleLogin(user: UserWithSubscription, meta: RequestMeta) {
    return this.issueTokens(user, meta);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return this.toSafeUser(user);
  }

  async validateAccessTokenUser(userId: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        subscription: true,
      },
    });

    return user ? this.toSafeUser(user) : null;
  }

  private async issueTokens(user: UserWithSubscription, meta: RequestMeta) {
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      } satisfies TokenPayload,
      {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ??
          'super-secret-access-key-change-me',
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.id,
      } satisfies TokenPayload,
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'super-secret-refresh-key-change-me',
        expiresIn: '30d',
      },
    );

    await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async rotateSession(
    sessionId: string,
    user: UserWithSubscription,
    meta: RequestMeta,
  ) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      } satisfies TokenPayload,
      {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ??
          'super-secret-access-key-change-me',
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        sessionId,
      } satisfies TokenPayload,
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'super-secret-refresh-key-change-me',
        expiresIn: '30d',
      },
    );

    await this.prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ??
          'super-secret-refresh-key-change-me',
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido.');
    }
  }

  private toSafeUser(user: UserWithSubscription): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      plan: user.subscription?.plan ?? SubscriptionPlan.FREE,
      subscriptionStatus:
        user.subscription?.status ?? SubscriptionStatus.INACTIVE,
      stripeCustomerId: user.stripeCustomerId,
    };
  }
}
