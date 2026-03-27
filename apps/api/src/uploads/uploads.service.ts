import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly configService: ConfigService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async createUpload(
    userId: string,
    file: Express.Multer.File,
    documentId?: string,
    workspaceId?: string,
  ) {
    const resolvedWorkspaceId = documentId
      ? await this.documentsService.getWorkspaceIdForDocument(
          documentId,
          userId,
        )
      : workspaceId;

    if (documentId) {
      await this.documentsService.assertCanAccess(documentId, userId);
    }

    if (!resolvedWorkspaceId) {
      throw new BadRequestException(
        'workspaceId ou documentId e obrigatorio para upload.',
      );
    }

    if (!documentId) {
      await this.workspacesService.requireWorkspaceMember(
        resolvedWorkspaceId,
        userId,
      );
    }

    const baseUrl =
      this.configService.get<string>('API_PUBLIC_URL') ||
      `http://localhost:${this.configService.get('PORT') || 4000}`;

    return this.prisma.upload.create({
      data: {
        workspaceId: resolvedWorkspaceId,
        userId,
        documentId,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        url: `${baseUrl}/uploads/${file.filename}`,
      },
    });
  }
}
