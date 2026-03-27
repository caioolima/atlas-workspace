import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  ApprovalStatus,
  BlockType,
  DocumentStatus,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { BlockInputDto } from './dto/sync-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

type UserPreview = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type DocumentRecord = Prisma.DocumentGetPayload<{
  include: {
    blocks: {
      orderBy: {
        position: 'asc';
      };
    };
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
    lastEditedBy: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
    workspace: {
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true;
                name: true;
                email: true;
                avatarUrl: true;
              };
            };
          };
        };
      };
    };
    collaborators: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
    };
    comments: {
      include: {
        author: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
    approvals: {
      include: {
        requester: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
        reviewer: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
    versions: {
      include: {
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
      take: 15;
    };
    publicShares: {
      where: {
        revokedAt: null;
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
    uploads: {
      orderBy: {
        createdAt: 'desc';
      };
    };
    activities: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
      take: 20;
    };
  };
}>;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listDocuments(userId: string, workspaceId?: string) {
    const targetWorkspaceId =
      workspaceId ??
      (await this.workspacesService.getDefaultWorkspaceId(userId));

    if (!targetWorkspaceId) {
      return [];
    }

    await this.workspacesService.requireWorkspaceMember(
      targetWorkspaceId,
      userId,
    );

    const documents = await this.prisma.document.findMany({
      where: {
        workspaceId: targetWorkspaceId,
      },
      include: {
        blocks: {
          orderBy: {
            position: 'asc',
          },
          take: 1,
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            approvals: true,
            publicShares: true,
            uploads: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return documents.map((document) => ({
      id: document.id,
      workspaceId: document.workspaceId,
      title: document.title,
      icon: document.icon,
      coverUrl: document.coverUrl,
      summary: document.summary,
      category: document.category,
      status: document.status,
      ownerId: document.ownerId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      isOwner: document.ownerId === userId,
      blocks: document.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        metadata: block.metadata,
        position: block.position,
      })),
      collaborators: this.serializeCollaborators(
        document.owner,
        document.workspace.members,
      ),
      commentsCount: document._count.comments,
      approvalsCount: document._count.approvals,
      sharesCount: document._count.publicShares,
      uploadsCount: document._count.uploads,
    }));
  }

  async createDocument(userId: string, dto: CreateDocumentDto) {
    const workspaceId =
      dto.workspaceId ??
      (await this.workspacesService.getDefaultWorkspaceId(userId));

    if (!workspaceId) {
      throw new NotFoundException(
        'Nenhum workspace encontrado para este usuário.',
      );
    }

    await this.workspacesService.requireWorkspaceMember(workspaceId, userId);

    if (dto.templateId) {
      const createdFromTemplate = await this.workspacesService.applyTemplate(
        workspaceId,
        dto.templateId,
        userId,
        {
          title: dto.title,
        },
      );

      return this.getDocument(createdFromTemplate.id, userId);
    }

    const document = await this.prisma.document.create({
      data: {
        workspaceId,
        ownerId: userId,
        lastEditedById: userId,
        title: dto.title?.trim() || 'Novo playbook operacional',
        summary:
          'Documento criado para organizar processo, checklist e execução operacional.',
        category: dto.category?.trim() || 'Operations',
        blocks: {
          create: [
            {
              id: randomUUID(),
              type: BlockType.HEADING,
              content: dto.title?.trim() || 'Novo playbook operacional',
              position: 0,
              metadata: {
                level: 1,
              } as Prisma.InputJsonValue,
            },
            {
              id: randomUUID(),
              type: BlockType.PARAGRAPH,
              content:
                'Descreva a rotina, adicione owners e use a IA para montar a primeira versão do playbook.',
              position: 1,
            },
          ],
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        workspaceId,
        documentId: document.id,
        userId,
        type: ActivityType.DOCUMENT_CREATED,
        message: `Playbook ${document.title} criado.`,
      },
    });

    return this.getDocument(document.id, userId);
  }

  async getDocument(documentId: string, userId: string) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    return this.serializeDocument(document, userId);
  }

  async updateDocument(
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);

    await this.prisma.$transaction(async (transaction) => {
      await this.createVersionSnapshot(
        transaction,
        document,
        userId,
        'Metadata',
      );

      await transaction.document.update({
        where: {
          id: documentId,
        },
        data: {
          title: dto.title?.trim(),
          icon: dto.icon?.trim(),
          coverUrl: dto.coverUrl?.trim(),
          summary: dto.summary?.trim(),
          category: dto.category?.trim(),
          status: dto.status,
          lastEditedById: userId,
        },
      });

      await transaction.activityLog.create({
        data: {
          workspaceId: document.workspaceId,
          documentId,
          userId,
          type:
            dto.status && dto.status !== document.status
              ? ActivityType.DOCUMENT_STATUS_CHANGED
              : ActivityType.DOCUMENT_UPDATED,
          message:
            dto.status && dto.status !== document.status
              ? `Status do playbook alterado para ${dto.status}.`
              : `Playbook ${document.title} atualizado.`,
          metadata:
            dto.status && dto.status !== document.status
              ? ({
                  previousStatus: document.status,
                  nextStatus: dto.status,
                } as Prisma.InputJsonValue)
              : undefined,
        },
      });
    });

    return this.getDocument(documentId, userId);
  }

  async syncBlocks(
    documentId: string,
    userId: string,
    blocks: BlockInputDto[],
    title?: string,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    const sanitizedBlocks = blocks.slice(0, 200).map((block, index) => ({
      id: block.id || randomUUID(),
      documentId,
      type: block.type,
      content: block.content,
      metadata: block.metadata
        ? (block.metadata as Prisma.InputJsonValue)
        : undefined,
      position: index,
    }));

    await this.prisma.$transaction(async (transaction) => {
      await this.createVersionSnapshot(
        transaction,
        document,
        userId,
        'Autosave',
      );

      await transaction.block.deleteMany({
        where: {
          documentId,
        },
      });

      if (sanitizedBlocks.length > 0) {
        await transaction.block.createMany({
          data: sanitizedBlocks,
        });
      }

      await transaction.document.update({
        where: {
          id: documentId,
        },
        data: {
          title: title?.trim() || undefined,
          lastEditedById: userId,
          updatedAt: new Date(),
        },
      });

      await transaction.activityLog.create({
        data: {
          workspaceId: document.workspaceId,
          documentId,
          userId,
          type: ActivityType.DOCUMENT_UPDATED,
          message: 'Conteudo do playbook sincronizado em tempo real.',
        },
      });
    });

    return this.getDocument(documentId, userId);
  }

  async shareDocument(
    documentId: string,
    userId: string,
    dto: ShareDocumentDto,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    await this.workspacesService.requireWorkspaceMember(
      document.workspaceId,
      userId,
      [
        WorkspaceRole.OWNER,
        WorkspaceRole.ADMIN,
        WorkspaceRole.MANAGER,
        WorkspaceRole.MEMBER,
      ],
    );

    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      await this.prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: document.workspaceId,
            userId: user.id,
          },
        },
        update: {
          role: WorkspaceRole.MEMBER,
        },
        create: {
          workspaceId: document.workspaceId,
          userId: user.id,
          role: WorkspaceRole.MEMBER,
        },
      });

      await this.prisma.documentCollaborator.upsert({
        where: {
          documentId_userId: {
            documentId,
            userId: user.id,
          },
        },
        update: {},
        create: {
          documentId,
          userId: user.id,
          role: 'editor',
        },
      });
    } else {
      await this.prisma.workspaceInvite.create({
        data: {
          workspaceId: document.workspaceId,
          email,
          role: WorkspaceRole.MEMBER,
          token: randomUUID(),
          invitedById: userId,
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        workspaceId: document.workspaceId,
        documentId,
        userId,
        type: ActivityType.MEMBER_INVITED,
        message: `Compartilhamento enviado para ${email}.`,
      },
    });

    return this.getDocument(documentId, userId);
  }

  async addComment(documentId: string, userId: string, dto: AddCommentDto) {
    const document = await this.getDocumentOrThrow(documentId, userId);

    const comment = await this.prisma.documentComment.create({
      data: {
        documentId,
        authorId: userId,
        blockId: dto.blockId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        workspaceId: document.workspaceId,
        documentId,
        userId,
        type: ActivityType.COMMENT_ADDED,
        message: 'Novo comentário registrado no playbook.',
      },
    });

    return {
      id: comment.id,
      blockId: comment.blockId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      resolvedAt: comment.resolvedAt,
      author: comment.author,
    };
  }

  async requestApproval(
    documentId: string,
    userId: string,
    dto: CreateApprovalDto,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);

    if (dto.reviewerId) {
      await this.workspacesService.requireWorkspaceMember(
        document.workspaceId,
        dto.reviewerId,
      );
    }

    const approval = await this.prisma.approvalRequest.create({
      data: {
        documentId,
        requesterId: userId,
        reviewerId: dto.reviewerId,
        notes: dto.notes?.trim(),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: DocumentStatus.IN_REVIEW,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        workspaceId: document.workspaceId,
        documentId,
        userId,
        type: ActivityType.APPROVAL_REQUESTED,
        message: 'Aprovacao solicitada para este playbook.',
      },
    });

    return approval;
  }

  async reviewApproval(
    documentId: string,
    approvalId: string,
    userId: string,
    dto: ReviewApprovalDto,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    const approval = await this.prisma.approvalRequest.findFirst({
      where: {
        id: approvalId,
        documentId,
      },
    });

    if (!approval) {
      throw new NotFoundException('Solicitacao de aprovação não encontrada.');
    }

    if (approval.reviewerId && approval.reviewerId !== userId) {
      await this.workspacesService.requireWorkspaceMember(
        document.workspaceId,
        userId,
        [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MANAGER],
      );
    }

    const nextDocumentStatus =
      dto.status === ApprovalStatus.APPROVED
        ? DocumentStatus.APPROVED
        : DocumentStatus.DRAFT;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.approvalRequest.update({
        where: {
          id: approvalId,
        },
        data: {
          status: dto.status,
          reviewerId: userId,
          reviewNotes: dto.reviewNotes?.trim(),
          reviewedAt: new Date(),
        },
      });

      await transaction.document.update({
        where: {
          id: documentId,
        },
        data: {
          status: nextDocumentStatus,
        },
      });

      await transaction.activityLog.create({
        data: {
          workspaceId: document.workspaceId,
          documentId,
          userId,
          type:
            dto.status === ApprovalStatus.APPROVED
              ? ActivityType.APPROVAL_APPROVED
              : ActivityType.APPROVAL_REJECTED,
          message:
            dto.status === ApprovalStatus.APPROVED
              ? 'Playbook aprovado.'
              : 'Playbook devolvido para ajustes.',
          metadata: dto.reviewNotes
            ? ({
                reviewNotes: dto.reviewNotes,
              } as Prisma.InputJsonValue)
            : undefined,
        },
      });
    });

    return this.getDocument(documentId, userId);
  }

  async listVersions(documentId: string, userId: string) {
    await this.getDocumentOrThrow(documentId, userId);

    const versions = await this.prisma.documentVersion.findMany({
      where: {
        documentId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    }));
  }

  async restoreVersion(documentId: string, versionId: string, userId: string) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        id: versionId,
        documentId,
      },
    });

    if (!version) {
      throw new NotFoundException('Versão não encontrada.');
    }

    const snapshot = this.parseSnapshot(version.snapshot);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.block.deleteMany({
        where: {
          documentId,
        },
      });

      if (snapshot.blocks.length > 0) {
        await transaction.block.createMany({
          data: snapshot.blocks.map((block, index) => ({
            id: randomUUID(),
            documentId,
            type: block.type,
            content: block.content,
            position: index,
            metadata: block.metadata
              ? (block.metadata as Prisma.InputJsonValue)
              : undefined,
          })),
        });
      }

      await transaction.document.update({
        where: {
          id: documentId,
        },
        data: {
          title: snapshot.title,
          summary: snapshot.summary,
          category: snapshot.category,
          status: snapshot.status,
          lastEditedById: userId,
        },
      });

      await transaction.activityLog.create({
        data: {
          workspaceId: document.workspaceId,
          documentId,
          userId,
          type: ActivityType.VERSION_RESTORED,
          message: 'Versão anterior restaurada.',
        },
      });
    });

    return this.getDocument(documentId, userId);
  }

  async createPublicShare(
    documentId: string,
    userId: string,
    dto: CreatePublicShareDto,
  ) {
    const document = await this.getDocumentOrThrow(documentId, userId);

    await this.prisma.publicShare.updateMany({
      where: {
        documentId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const share = await this.prisma.publicShare.create({
      data: {
        documentId,
        createdById: userId,
        token: randomUUID(),
        title: dto.title?.trim() || document.title,
        allowComments: dto.allowComments ?? false,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        workspaceId: document.workspaceId,
        documentId,
        userId,
        type: ActivityType.PUBLIC_SHARE_CREATED,
        message: 'Link público criado para este playbook.',
      },
    });

    return {
      id: share.id,
      token: share.token,
      title: share.title,
      allowComments: share.allowComments,
      createdAt: share.createdAt,
      revokedAt: share.revokedAt,
    };
  }

  async revokePublicShare(documentId: string, shareId: string, userId: string) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    const share = await this.prisma.publicShare.findFirst({
      where: {
        id: shareId,
        documentId,
        revokedAt: null,
      },
    });

    if (!share) {
      throw new NotFoundException('Compartilhamento não encontrado.');
    }

    await this.prisma.publicShare.update({
      where: {
        id: shareId,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        workspaceId: document.workspaceId,
        documentId,
        userId,
        type: ActivityType.PUBLIC_SHARE_REVOKED,
        message: 'Link público revogado.',
      },
    });

    return {
      success: true,
    };
  }

  async getDocumentActivity(documentId: string, userId: string) {
    await this.getDocumentOrThrow(documentId, userId);

    const activities = await this.prisma.activityLog.findMany({
      where: {
        documentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      user: activity.user,
    }));
  }

  async getPublicDocument(token: string) {
    const share = await this.prisma.publicShare.findFirst({
      where: {
        token,
        revokedAt: null,
      },
      include: {
        document: {
          include: {
            blocks: {
              orderBy: {
                position: 'asc',
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
                brandColor: true,
                description: true,
              },
            },
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
            },
          },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Link público não encontrado ou expirado.');
    }

    return {
      share: {
        id: share.id,
        title: share.title,
        allowComments: share.allowComments,
        createdAt: share.createdAt,
      },
      document: {
        id: share.document.id,
        title: share.document.title,
        summary: share.document.summary,
        category: share.document.category,
        status: share.document.status,
        blocks: share.document.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          metadata: block.metadata,
          position: block.position,
        })),
        owner: share.document.owner,
        workspace: share.document.workspace,
        comments: share.document.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: comment.author,
        })),
      },
    };
  }

  async assertCanAccess(documentId: string, userId: string) {
    await this.getDocumentOrThrow(documentId, userId);
  }

  async getWorkspaceIdForDocument(documentId: string, userId: string) {
    const document = await this.getDocumentOrThrow(documentId, userId);
    return document.workspaceId;
  }

  private async getDocumentOrThrow(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        blocks: {
          orderBy: {
            position: 'asc',
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        approvals: {
          include: {
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        versions: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 15,
        },
        publicShares: {
          where: {
            revokedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        uploads: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado.');
    }

    return document;
  }

  private serializeDocument(document: DocumentRecord, userId: string) {
    return {
      id: document.id,
      workspaceId: document.workspaceId,
      workspaceName: document.workspace.name,
      title: document.title,
      icon: document.icon,
      coverUrl: document.coverUrl,
      summary: document.summary,
      category: document.category,
      status: document.status,
      ownerId: document.ownerId,
      lastEditedBy: document.lastEditedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      isOwner: document.ownerId === userId,
      blocks: document.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        metadata: block.metadata,
        position: block.position,
      })),
      collaborators: this.serializeCollaborators(
        document.owner,
        document.workspace.members,
        document.collaborators,
      ),
      comments: document.comments.map((comment) => ({
        id: comment.id,
        blockId: comment.blockId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        resolvedAt: comment.resolvedAt,
        author: comment.author,
      })),
      approvals: document.approvals.map((approval) => ({
        id: approval.id,
        status: approval.status,
        notes: approval.notes,
        reviewNotes: approval.reviewNotes,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        reviewedAt: approval.reviewedAt,
        requester: approval.requester,
        reviewer: approval.reviewer,
      })),
      versions: document.versions.map((version) => ({
        id: version.id,
        label: version.label,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
      })),
      publicShares: document.publicShares.map((share) => ({
        id: share.id,
        token: share.token,
        title: share.title,
        allowComments: share.allowComments,
        createdAt: share.createdAt,
      })),
      uploads: document.uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        mimeType: upload.mimeType,
        size: upload.size,
        url: upload.url,
        createdAt: upload.createdAt,
      })),
      activity: document.activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
        user: activity.user,
      })),
    };
  }

  private serializeCollaborators(
    owner: UserPreview,
    members: Array<
      Prisma.WorkspaceMemberGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              name: true;
              email: true;
              avatarUrl: true;
            };
          };
        };
      }>
    >,
    collaborators: Array<
      Prisma.DocumentCollaboratorGetPayload<{
        include: {
          user: {
            select: {
              id: true;
              name: true;
              email: true;
              avatarUrl: true;
            };
          };
        };
      }>
    > = [],
  ) {
    const items = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string;
        avatarUrl: string | null;
        role: string;
      }
    >();

    items.set(owner.id, {
      ...owner,
      role: 'owner',
    });

    for (const member of members) {
      items.set(member.user.id, {
        ...member.user,
        role: member.role.toLowerCase(),
      });
    }

    for (const collaborator of collaborators) {
      items.set(collaborator.user.id, {
        ...collaborator.user,
        role: collaborator.role,
      });
    }

    return Array.from(items.values());
  }

  private async createVersionSnapshot(
    transaction: Prisma.TransactionClient,
    document: DocumentRecord,
    userId: string,
    label?: string,
  ) {
    await transaction.documentVersion.create({
      data: {
        documentId: document.id,
        createdById: userId,
        label,
        snapshot: {
          title: document.title,
          summary: document.summary,
          category: document.category,
          status: document.status,
          blocks: document.blocks.map((block) => ({
            type: block.type,
            content: block.content,
            metadata: block.metadata,
          })),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private parseSnapshot(snapshot: Prisma.JsonValue) {
    const candidate =
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
        ? snapshot
        : {};

    const rawBlocks =
      'blocks' in candidate && Array.isArray(candidate.blocks)
        ? candidate.blocks
        : [];

    return {
      title:
        'title' in candidate && typeof candidate.title === 'string'
          ? candidate.title
          : 'Documento restaurado',
      summary:
        'summary' in candidate && typeof candidate.summary === 'string'
          ? candidate.summary
          : null,
      category:
        'category' in candidate && typeof candidate.category === 'string'
          ? candidate.category
          : null,
      status:
        'status' in candidate &&
        typeof candidate.status === 'string' &&
        candidate.status in DocumentStatus
          ? DocumentStatus[candidate.status as keyof typeof DocumentStatus]
          : DocumentStatus.DRAFT,
      blocks: rawBlocks.map((block) => ({
        type:
          typeof block === 'object' &&
          block &&
          'type' in block &&
          typeof block.type === 'string' &&
          block.type in BlockType
            ? BlockType[block.type as keyof typeof BlockType]
            : BlockType.PARAGRAPH,
        content:
          typeof block === 'object' &&
          block &&
          'content' in block &&
          typeof block.content === 'string'
            ? block.content
            : '',
        metadata:
          typeof block === 'object' &&
          block &&
          'metadata' in block &&
          block.metadata &&
          typeof block.metadata === 'object'
            ? (block.metadata as Record<string, unknown>)
            : undefined,
      })),
    };
  }
}
