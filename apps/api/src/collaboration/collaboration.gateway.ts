import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { SafeUser, TokenPayload } from '../auth/auth.types';
import type { BlockInputDto } from '../documents/dto/sync-document.dto';
import { DocumentsService } from '../documents/documents.service';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly presence = new Map<string, Map<string, SafeUser>>();
  private readonly socketUsers = new Map<string, SafeUser>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly documentsService: DocumentsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Token ausente.');
      }

      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret:
          this.configService.get<string>('JWT_ACCESS_SECRET') ??
          'super-secret-access-key-change-me',
      });
      const user = await this.authService.getProfile(payload.sub);

      this.socketUsers.set(client.id, user);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUsers.delete(client.id);

    for (const [documentId, members] of this.presence.entries()) {
      if (members.delete(client.id)) {
        this.emitPresence(documentId);
      }

      if (members.size === 0) {
        this.presence.delete(documentId);
      }
    }
  }

  @SubscribeMessage('document:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { documentId: string },
  ) {
    const user = this.getSocketUser(client);
    const document = await this.documentsService.getDocument(
      body.documentId,
      user.id,
    );

    await client.join(body.documentId);

    if (!this.presence.has(body.documentId)) {
      this.presence.set(body.documentId, new Map());
    }

    this.presence.get(body.documentId)?.set(client.id, user);
    this.emitPresence(body.documentId);

    client.emit('document:snapshot', document);

    return {
      joined: true,
      documentId: body.documentId,
    };
  }

  @SubscribeMessage('document:sync')
  async handleSync(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      documentId: string;
      title?: string;
      blocks: BlockInputDto[];
    },
  ) {
    const user = this.getSocketUser(client);
    const document = await this.documentsService.syncBlocks(
      body.documentId,
      user.id,
      body.blocks,
      body.title,
    );

    client.to(body.documentId).emit('document:updated', {
      documentId: body.documentId,
      title: document.title,
      blocks: document.blocks,
      updatedBy: user.id,
      updatedAt: document.updatedAt,
    });

    return {
      ok: true,
      updatedAt: document.updatedAt,
    };
  }

  private extractToken(client: Socket) {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    const headerValue = client.handshake.headers.authorization;

    if (authToken) {
      return authToken;
    }

    if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
      return headerValue.slice(7);
    }

    return undefined;
  }

  private getSocketUser(client: Socket) {
    const user = this.socketUsers.get(client.id);

    if (!user) {
      throw new WsException('Usuário não autenticado.');
    }

    return user;
  }

  private emitPresence(documentId: string) {
    const members = Array.from(this.presence.get(documentId)?.values() ?? []);
    const uniqueMembers = Array.from(
      new Map(members.map((member) => [member.id, member])).values(),
    );

    this.server.to(documentId).emit('presence:update', uniqueMembers);
  }
}
