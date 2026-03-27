import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  BlockType,
  DocumentStatus,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import {
  buildWorkspaceSlug,
  getStarterDocumentSeed,
  slugifyWorkspaceName,
  WORKSPACE_TEMPLATE_SEEDS,
} from './workspace.defaults';

type WorkspaceMemberRecord = Prisma.WorkspaceMemberGetPayload<{
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
}>;

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces(userId: string) {
    await this.ensureUserWorkspaceAccess(userId);

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                documents: true,
                members: true,
                templates: true,
                uploads: true,
              },
            },
            documents: {
              orderBy: {
                updatedAt: 'desc',
              },
              take: 3,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      defaultWorkspaceId: memberships[0]?.workspaceId ?? null,
      items: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        logoUrl: membership.workspace.logoUrl,
        brandColor: membership.workspace.brandColor,
        description: membership.workspace.description,
        industry: membership.workspace.industry,
        aiTone: membership.workspace.aiTone,
        onboardingCompleted: membership.workspace.onboardingCompleted,
        role: membership.role,
        counts: membership.workspace._count,
        documents: membership.workspace.documents.map((document) => ({
          id: document.id,
          title: document.title,
          status: document.status,
          category: document.category,
          updatedAt: document.updatedAt,
        })),
      })),
    };
  }

  async getWorkspaceOverview(workspaceId: string, userId: string) {
    const membership = await this.requireWorkspaceMember(workspaceId, userId);
    const workspace = membership.workspace;

    const [members, documents, templates, invites, activities] =
      await Promise.all([
        this.prisma.workspaceMember.findMany({
          where: {
            workspaceId,
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
            createdAt: 'asc',
          },
        }),
        this.prisma.document.findMany({
          where: {
            workspaceId,
          },
          include: {
            _count: {
              select: {
                comments: true,
                approvals: true,
                publicShares: true,
                uploads: true,
                versions: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 8,
        }),
        this.prisma.template.findMany({
          where: {
            workspaceId,
          },
          orderBy: [
            {
              isSystem: 'desc',
            },
            {
              name: 'asc',
            },
          ],
          take: 8,
        }),
        this.prisma.workspaceInvite.findMany({
          where: {
            workspaceId,
            revokedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.activityLog.findMany({
          where: {
            workspaceId,
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
          take: 12,
        }),
      ]);

    const counts = {
      documents: documents.length,
      members: members.length,
      templates: templates.length,
      pendingInvites: invites.filter((invite) => !invite.acceptedAt).length,
      activePublicShares: documents.reduce(
        (total, document) => total + document._count.publicShares,
        0,
      ),
      pendingApprovals: documents.reduce(
        (total, document) => total + document._count.approvals,
        0,
      ),
    };

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      logoUrl: workspace.logoUrl,
      brandColor: workspace.brandColor,
      description: workspace.description,
      industry: workspace.industry,
      aiTone: workspace.aiTone,
      onboardingCompleted: workspace.onboardingCompleted,
      role: membership.role,
      counts,
      documents: documents.map((document) => ({
        id: document.id,
        title: document.title,
        summary: document.summary,
        category: document.category,
        status: document.status,
        updatedAt: document.updatedAt,
        commentsCount: document._count.comments,
        approvalsCount: document._count.approvals,
        sharesCount: document._count.publicShares,
        uploadsCount: document._count.uploads,
      })),
      members: members.map((member) => this.serializeMember(member)),
      templates: templates.map((template) => this.serializeTemplate(template)),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        acceptedAt: invite.acceptedAt,
      })),
      activity: activities.map((activity) => this.serializeActivity(activity)),
    };
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const workspace =
      (await this.prisma.workspace.findFirst({
        where: {
          ownerId: userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })) ?? (await this.createStarterWorkspaceForUser(userId));

    const slug = await this.generateWorkspaceSlug(dto.name, workspace.id);

    await this.prisma.workspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        industry: dto.industry?.trim(),
        aiTone: dto.aiTone?.trim(),
        brandColor: dto.brandColor?.trim() || '#2A9D8F',
        onboardingCompleted: true,
      },
    });

    await this.logActivity({
      workspaceId: workspace.id,
      userId,
      type: ActivityType.WORKSPACE_UPDATED,
      message: 'Workspace configurado durante o onboarding.',
      metadata: {
        industry: dto.industry,
        aiTone: dto.aiTone,
      },
    });

    if (dto.templateId) {
      await this.applyTemplate(workspace.id, dto.templateId, userId, {});
    }

    return this.getWorkspaceOverview(workspace.id, userId);
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MANAGER,
    ]);

    const data: Prisma.WorkspaceUpdateInput = {
      description: dto.description?.trim(),
      industry: dto.industry?.trim(),
      aiTone: dto.aiTone?.trim(),
      brandColor: dto.brandColor?.trim(),
      logoUrl: dto.logoUrl?.trim(),
    };

    if (dto.name?.trim()) {
      data.name = dto.name.trim();
      data.slug = await this.generateWorkspaceSlug(
        dto.name.trim(),
        workspaceId,
      );
    }

    await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
    });

    await this.logActivity({
      workspaceId,
      userId,
      type: ActivityType.WORKSPACE_UPDATED,
      message: 'Workspace atualizado nas configurações.',
      metadata: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        brandColor: dto.brandColor,
        description: dto.description,
        industry: dto.industry,
        aiTone: dto.aiTone,
      },
    });

    return this.getWorkspaceOverview(workspaceId, userId);
  }

  async listMembers(workspaceId: string, userId: string) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const [members, invites] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
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
          createdAt: 'asc',
        },
      }),
      this.prisma.workspaceInvite.findMany({
        where: {
          workspaceId,
          revokedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      members: members.map((member) => this.serializeMember(member)),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        createdAt: invite.createdAt,
        acceptedAt: invite.acceptedAt,
      })),
    };
  }

  async inviteMember(
    workspaceId: string,
    userId: string,
    dto: InviteMemberDto,
  ) {
    const membership = await this.requireWorkspaceMember(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MANAGER,
    ]);
    const email = dto.email.toLowerCase();
    const role = dto.role ?? WorkspaceRole.MEMBER;
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      await this.prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
        update: {
          role,
          title: dto.title?.trim(),
        },
        create: {
          workspaceId,
          userId: existingUser.id,
          role,
          title: dto.title?.trim(),
        },
      });

      await this.logActivity({
        workspaceId,
        userId,
        type: ActivityType.MEMBER_INVITED,
        message: `${existingUser.email} foi adicionado ao workspace.`,
        metadata: {
          role,
        },
      });
    } else {
      await this.prisma.workspaceInvite.create({
        data: {
          workspaceId,
          email,
          role,
          token: randomUUID(),
          invitedById: membership.userId,
        },
      });

      await this.logActivity({
        workspaceId,
        userId,
        type: ActivityType.MEMBER_INVITED,
        message: `Convite enviado para ${email}.`,
        metadata: {
          role,
        },
      });
    }

    return this.listMembers(workspaceId, userId);
  }

  async acceptInvite(token: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const invite = await this.prisma.workspaceInvite.findUnique({
      where: {
        token,
      },
    });

    if (!invite || invite.revokedAt) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'Este convite pertence a outro endereço de e-mail.',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
        update: {
          role: invite.role,
        },
        create: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      });

      await transaction.workspaceInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          acceptedAt: new Date(),
          acceptedById: userId,
          status: 'ACCEPTED',
        },
      });

      await this.createActivity(transaction, {
        workspaceId: invite.workspaceId,
        userId,
        type: ActivityType.INVITE_ACCEPTED,
        message: `${user.email} aceitou o convite do workspace.`,
        metadata: {
          role: invite.role,
        },
      });
    });

    return this.getWorkspaceOverview(invite.workspaceId, userId);
  }

  async updateMember(
    workspaceId: string,
    userId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado.');
    }

    const updated = await this.prisma.workspaceMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: dto.role,
        title: dto.title?.trim(),
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
    });

    await this.logActivity({
      workspaceId,
      userId,
      type: ActivityType.WORKSPACE_UPDATED,
      message: `${updated.user.email} teve suas permissões atualizadas.`,
      metadata: {
        role: dto.role,
        title: dto.title,
      },
    });

    return {
      member: this.serializeMember(updated),
    };
  }

  async removeMember(workspaceId: string, userId: string, memberId: string) {
    await this.requireWorkspaceMember(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado.');
    }

    if (member.role === WorkspaceRole.OWNER) {
      throw new ConflictException(
        'O owner principal do workspace não pode ser removido.',
      );
    }

    await this.prisma.workspaceMember.delete({
      where: {
        id: memberId,
      },
    });

    await this.logActivity({
      workspaceId,
      userId,
      type: ActivityType.WORKSPACE_UPDATED,
      message: `${member.user.email} foi removido do workspace.`,
    });

    return this.listMembers(workspaceId, userId);
  }

  async listTemplates(workspaceId: string, userId: string) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const templates = await this.prisma.template.findMany({
      where: {
        workspaceId,
      },
      orderBy: [
        {
          isSystem: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });

    return templates.map((template) => this.serializeTemplate(template));
  }

  async createTemplate(
    workspaceId: string,
    userId: string,
    dto: CreateTemplateDto,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
      WorkspaceRole.MANAGER,
    ]);

    const slug = await this.generateTemplateSlug(workspaceId, dto.name);

    const template = await this.prisma.template.create({
      data: {
        workspaceId,
        createdById: userId,
        name: dto.name.trim(),
        slug,
        category: dto.category,
        description: dto.description.trim(),
        icon: dto.icon?.trim(),
        isSystem: false,
        content: {
          blocks: dto.blocks,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.logActivity({
      workspaceId,
      userId,
      type: ActivityType.WORKSPACE_UPDATED,
      message: `Template ${template.name} criado.`,
      metadata: {
        category: template.category,
      },
    });

    return this.serializeTemplate(template);
  }

  async applyTemplate(
    workspaceId: string,
    templateId: string,
    userId: string,
    dto: ApplyTemplateDto,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        workspaceId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado.');
    }

    const blocks = this.extractTemplateBlocks(template.content);
    const title = dto.title?.trim() || template.name;
    const document = await this.prisma.document.create({
      data: {
        workspaceId,
        ownerId: userId,
        lastEditedById: userId,
        title,
        summary: template.description,
        category: template.category,
        blocks: {
          create: blocks.map((block, index) => ({
            type: block.type,
            content: block.content,
            position: index,
            metadata: block.metadata
              ? (block.metadata as Prisma.InputJsonValue)
              : undefined,
          })),
        },
      },
    });

    await this.logActivity({
      workspaceId,
      userId,
      documentId: document.id,
      type: ActivityType.TEMPLATE_APPLIED,
      message: `Template ${template.name} aplicado em um novo playbook.`,
      metadata: {
        templateId: template.id,
      },
    });

    return {
      id: document.id,
      title: document.title,
    };
  }

  async getAnalytics(workspaceId: string, userId: string) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const [documents, members, uploadsCount, activities] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          workspaceId,
        },
        include: {
          _count: {
            select: {
              comments: true,
              approvals: true,
              publicShares: true,
              versions: true,
            },
          },
        },
      }),
      this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
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
      }),
      this.prisma.upload.count({
        where: {
          workspaceId,
        },
      }),
      this.prisma.activityLog.findMany({
        where: {
          workspaceId,
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
        take: 150,
      }),
    ]);

    const statusBreakdown = Object.values(DocumentStatus).map((status) => ({
      status,
      count: documents.filter((document) => document.status === status).length,
    }));

    const categoryCounts = new Map<string, number>();
    for (const document of documents) {
      const key = document.category || 'Uncategorized';
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }

    const memberActivityMap = new Map<string, number>();
    for (const activity of activities) {
      if (activity.userId) {
        memberActivityMap.set(
          activity.userId,
          (memberActivityMap.get(activity.userId) ?? 0) + 1,
        );
      }
    }

    return {
      overview: {
        documents: documents.length,
        members: members.length,
        uploads: uploadsCount,
        approvedDocuments: documents.filter(
          (document) => document.status === DocumentStatus.APPROVED,
        ).length,
        pendingApprovals: documents.reduce(
          (total, document) => total + document._count.approvals,
          0,
        ),
        openComments: documents.reduce(
          (total, document) => total + document._count.comments,
          0,
        ),
        activePublicShares: documents.reduce(
          (total, document) => total + document._count.publicShares,
          0,
        ),
      },
      statusBreakdown,
      categoryBreakdown: Array.from(categoryCounts.entries()).map(
        ([category, count]) => ({
          category,
          count,
        }),
      ),
      topDocuments: documents
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(0, 5)
        .map((document) => ({
          id: document.id,
          title: document.title,
          status: document.status,
          category: document.category,
          updatedAt: document.updatedAt,
          score:
            document._count.comments +
            document._count.approvals +
            document._count.publicShares +
            document._count.versions,
        })),
      memberActivity: members.map((member) => ({
        ...this.serializeMember(member),
        activityCount: memberActivityMap.get(member.userId) ?? 0,
      })),
      recentActivity: activities
        .slice(0, 10)
        .map((activity) => this.serializeActivity(activity)),
    };
  }

  async getActivity(workspaceId: string, userId: string) {
    await this.requireWorkspaceMember(workspaceId, userId);

    const activities = await this.prisma.activityLog.findMany({
      where: {
        workspaceId,
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

    return activities.map((activity) => this.serializeActivity(activity));
  }

  async createStarterWorkspaceForUser(userId: string, name?: string | null) {
    const existingWorkspace = await this.prisma.workspace.findFirst({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (existingWorkspace) {
      return existingWorkspace;
    }

    const starterName = `${name?.trim().split(' ')[0] || 'Team'} workspace`;
    const slug = await this.generateWorkspaceSlug(starterName);
    const starterDocument = getStarterDocumentSeed(name);

    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: {
          name: starterName,
          slug,
          ownerId: userId,
          brandColor: '#2A9D8F',
          description:
            'Workspace para organizar playbooks, onboarding e execução recorrente do time.',
          aiTone:
            'Clareza operacional com foco em receita e experiência do cliente.',
          members: {
            create: {
              userId,
              role: WorkspaceRole.OWNER,
              title: 'Founder',
            },
          },
        },
      });

      await this.seedWorkspaceTemplates(transaction, workspace.id, userId);

      await transaction.document.create({
        data: {
          workspaceId: workspace.id,
          ownerId: userId,
          lastEditedById: userId,
          title: starterDocument.title,
          summary: starterDocument.summary,
          category: starterDocument.category,
          blocks: {
            create: starterDocument.blocks.map((block, index) => ({
              type: block.type,
              content: block.content,
              position: index,
              metadata: block.metadata
                ? (block.metadata as Prisma.InputJsonValue)
                : undefined,
            })),
          },
        },
      });

      await this.createActivity(transaction, {
        workspaceId: workspace.id,
        userId,
        type: ActivityType.WORKSPACE_CREATED,
        message: 'Workspace inicial criado para o novo usuário.',
      });

      return workspace;
    });
  }

  async acceptPendingInvitesForUser(userId: string, email: string) {
    const invites = await this.prisma.workspaceInvite.findMany({
      where: {
        email: email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (invites.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      for (const invite of invites) {
        await transaction.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          update: {
            role: invite.role,
          },
          create: {
            workspaceId: invite.workspaceId,
            userId,
            role: invite.role,
          },
        });

        await transaction.workspaceInvite.update({
          where: {
            id: invite.id,
          },
          data: {
            acceptedAt: new Date(),
            acceptedById: userId,
            status: 'ACCEPTED',
          },
        });

        await this.createActivity(transaction, {
          workspaceId: invite.workspaceId,
          userId,
          type: ActivityType.INVITE_ACCEPTED,
          message: `${email} entrou no workspace automaticamente ao fazer login.`,
        });
      }
    });
  }

  async requireWorkspaceMember(
    workspaceId: string,
    userId: string,
    roles?: WorkspaceRole[],
  ) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Você não faz parte deste workspace.');
    }

    if (roles?.length && !roles.includes(membership.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para executar esta ação.',
      );
    }

    return membership;
  }

  async getDefaultWorkspaceId(userId: string) {
    await this.ensureUserWorkspaceAccess(userId);

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        workspaceId: true,
      },
    });

    return membership?.workspaceId ?? null;
  }

  private async ensureUserWorkspaceAccess(userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (membership) {
      return;
    }

    const [user, ownedWorkspace] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.workspace.findFirst({
        where: {
          ownerId: userId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (ownedWorkspace) {
      await this.prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: ownedWorkspace.id,
            userId,
          },
        },
        update: {
          role: WorkspaceRole.OWNER,
        },
        create: {
          workspaceId: ownedWorkspace.id,
          userId,
          role: WorkspaceRole.OWNER,
          title: 'Founder',
        },
      });

      return;
    }

    await this.createStarterWorkspaceForUser(userId, user.name);
  }

  private serializeMember(member: WorkspaceMemberRecord) {
    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      title: member.title,
      createdAt: member.createdAt,
      user: member.user,
    };
  }

  private serializeTemplate(
    template: Prisma.TemplateGetPayload<Record<string, never>>,
  ) {
    return {
      id: template.id,
      name: template.name,
      slug: template.slug,
      category: template.category,
      description: template.description,
      icon: template.icon,
      isSystem: template.isSystem,
      blocks: this.extractTemplateBlocks(template.content),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private serializeActivity(
    activity: Prisma.ActivityLogGetPayload<{
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
    }>,
  ) {
    return {
      id: activity.id,
      type: activity.type,
      message: activity.message,
      metadata: activity.metadata,
      documentId: activity.documentId,
      createdAt: activity.createdAt,
      user: activity.user,
    };
  }

  private extractTemplateBlocks(content: Prisma.JsonValue) {
    const parsed =
      content &&
      typeof content === 'object' &&
      !Array.isArray(content) &&
      'blocks' in content &&
      Array.isArray(content.blocks)
        ? content.blocks
        : [];

    return parsed.map((block) => ({
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
    }));
  }

  private async generateWorkspaceSlug(name: string, workspaceId?: string) {
    const base = buildWorkspaceSlug(name);
    let candidate = base;
    let attempt = 2;

    while (
      await this.prisma.workspace.findFirst({
        where: {
          slug: candidate,
          ...(workspaceId
            ? {
                id: {
                  not: workspaceId,
                },
              }
            : {}),
        },
      })
    ) {
      candidate = buildWorkspaceSlug(name, String(attempt));
      attempt += 1;
    }

    return candidate;
  }

  private async generateTemplateSlug(workspaceId: string, name: string) {
    const base = slugifyWorkspaceName(name) || 'template';
    let candidate = base;
    let attempt = 2;

    while (
      await this.prisma.template.findFirst({
        where: {
          workspaceId,
          slug: candidate,
        },
      })
    ) {
      candidate = `${base}-${attempt}`;
      attempt += 1;
    }

    return candidate;
  }

  private async seedWorkspaceTemplates(
    transaction: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
  ) {
    for (const template of WORKSPACE_TEMPLATE_SEEDS) {
      await transaction.template.create({
        data: {
          workspaceId,
          createdById: userId,
          name: template.name,
          slug: template.slug,
          category: template.category,
          description: template.description,
          icon: template.icon,
          isSystem: true,
          content: {
            blocks: template.blocks,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async logActivity(input: {
    workspaceId: string;
    userId?: string;
    documentId?: string;
    type: ActivityType;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.createActivity(this.prisma, input);
  }

  private async createActivity(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      workspaceId: string;
      userId?: string;
      documentId?: string;
      type: ActivityType;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await client.activityLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        documentId: input.documentId,
        type: input.type,
        message: input.message,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
