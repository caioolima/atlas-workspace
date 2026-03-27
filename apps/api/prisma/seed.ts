import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ActivityType,
  ApprovalStatus,
  AuthProvider,
  BlockType,
  DocumentStatus,
  Prisma,
  PrismaClient,
  SubscriptionPlan,
  SubscriptionStatus,
  WorkspaceRole,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { WORKSPACE_TEMPLATE_SEEDS } from '../src/workspaces/workspace.defaults';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://notion:notion@localhost:5432/notion_ai?schema=public',
  }),
});

function asJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const [founder, opsLead, successLead] = await Promise.all([
    prisma.user.upsert({
      where: {
        email: 'demo@playbookos.dev',
      },
      update: {
        name: 'Caio Founder',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
      create: {
        email: 'demo@playbookos.dev',
        name: 'Caio Founder',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
    }),
    prisma.user.upsert({
      where: {
        email: 'ops@playbookos.dev',
      },
      update: {
        name: 'Marina Ops',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
      create: {
        email: 'ops@playbookos.dev',
        name: 'Marina Ops',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
    }),
    prisma.user.upsert({
      where: {
        email: 'cs@playbookos.dev',
      },
      update: {
        name: 'Rafa Success',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
      create: {
        email: 'cs@playbookos.dev',
        name: 'Rafa Success',
        passwordHash,
        provider: AuthProvider.LOCAL,
      },
    }),
  ]);

  await prisma.subscription.upsert({
    where: {
      userId: founder.id,
    },
    update: {
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
    create: {
      userId: founder.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.workspace.deleteMany({
    where: {
      slug: 'playbookos-demo',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'PlaybookOS Studio',
      slug: 'playbookos-demo',
      ownerId: founder.id,
      logoUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80',
      brandColor: '#2A9D8F',
      description:
        'Workspace demo para mostrar onboarding, handoff, incidentes, billing e colaboração operacional.',
      industry: 'B2B SaaS',
      aiTone: 'Clareza operacional com foco em ativação e expansão.',
      onboardingCompleted: true,
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: founder.id,
        role: WorkspaceRole.OWNER,
        title: 'Founder',
      },
      {
        workspaceId: workspace.id,
        userId: opsLead.id,
        role: WorkspaceRole.ADMIN,
        title: 'Ops Lead',
      },
      {
        workspaceId: workspace.id,
        userId: successLead.id,
        role: WorkspaceRole.MANAGER,
        title: 'Customer Success Lead',
      },
    ],
  });

  for (const template of WORKSPACE_TEMPLATE_SEEDS) {
    await prisma.template.create({
      data: {
        workspaceId: workspace.id,
        createdById: founder.id,
        name: template.name,
        slug: template.slug,
        category: template.category,
        description: template.description,
        icon: template.icon,
        isSystem: true,
        content: asJson({
          blocks: template.blocks,
        }),
      },
    });
  }

  const onboardingDocument = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      ownerId: founder.id,
      lastEditedById: opsLead.id,
      title: 'Onboarding enterprise | ACME',
      summary:
        'Playbook aprovado com milestones, riscos, handoff e anexos para onboarding enterprise.',
      category: 'Onboarding',
      status: DocumentStatus.APPROVED,
      blocks: {
        create: [
          {
            type: BlockType.HEADING,
            content: 'Onboarding enterprise | ACME',
            position: 0,
            metadata: asJson({ level: 1 }),
          },
          {
            type: BlockType.PARAGRAPH,
            content:
              'Centralize stakeholders, cronograma de rollout, escopo fechado e checkpoints de ativação.',
            position: 1,
          },
          {
            type: BlockType.TODO,
            content: 'Kickoff executivo confirmado com sponsor e champion.',
            position: 2,
            metadata: asJson({ checked: true }),
          },
          {
            type: BlockType.TODO,
            content: 'Checklist técnico compartilhado com operação e CS.',
            position: 3,
            metadata: asJson({ checked: true }),
          },
          {
            type: BlockType.CALLOUT,
            content:
              'Atenção ao risco de dependências de integração antes do go-live.',
            position: 4,
          },
        ],
      },
    },
  });

  const handoffDocument = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      ownerId: successLead.id,
      lastEditedById: successLead.id,
      title: 'Handoff vendas para CS | Beta Corp',
      summary:
        'Playbook em revisão para transferir contexto comercial, escopo e próximos passos do cliente.',
      category: 'Handoff',
      status: DocumentStatus.IN_REVIEW,
      blocks: {
        create: [
          {
            type: BlockType.HEADING,
            content: 'Handoff vendas para CS | Beta Corp',
            position: 0,
            metadata: asJson({ level: 1 }),
          },
          {
            type: BlockType.BULLET,
            content:
              'Motivo de compra: acelerar onboarding de 40 contas enterprise.',
            position: 1,
          },
          {
            type: BlockType.BULLET,
            content:
              'Escopo vendido: treinamento, rollout e playbook de adoção.',
            position: 2,
          },
          {
            type: BlockType.TODO,
            content:
              'Validar risco de expectativa fora do escopo antes do kickoff.',
            position: 3,
            metadata: asJson({ checked: false }),
          },
        ],
      },
    },
  });

  const incidentDocument = await prisma.document.create({
    data: {
      workspaceId: workspace.id,
      ownerId: opsLead.id,
      lastEditedById: opsLead.id,
      title: 'Playbook de incidente | indisponibilidade crítica',
      summary:
        'Plano de resposta com severidade, owner, comunicação e pós-mortem para incidente severo.',
      category: 'Incident',
      status: DocumentStatus.DRAFT,
      blocks: {
        create: [
          {
            type: BlockType.HEADING,
            content: 'Playbook de incidente | indisponibilidade crítica',
            position: 0,
            metadata: asJson({ level: 1 }),
          },
          {
            type: BlockType.CALLOUT,
            content:
              'Classifique o impacto e abra sala de guerra em até 5 minutos.',
            position: 1,
          },
          {
            type: BlockType.TODO,
            content: 'Nomear owner técnico e owner de comunicação.',
            position: 2,
            metadata: asJson({ checked: false }),
          },
          {
            type: BlockType.TODO,
            content: 'Publicar status page e alinhamento com CS.',
            position: 3,
            metadata: asJson({ checked: false }),
          },
        ],
      },
    },
  });

  await prisma.documentCollaborator.createMany({
    data: [
      {
        documentId: onboardingDocument.id,
        userId: opsLead.id,
        role: 'editor',
      },
      {
        documentId: onboardingDocument.id,
        userId: successLead.id,
        role: 'reviewer',
      },
      {
        documentId: handoffDocument.id,
        userId: founder.id,
        role: 'reviewer',
      },
    ],
  });

  await prisma.upload.createMany({
    data: [
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: founder.id,
        filename: 'acme-kickoff.png',
        mimeType: 'image/png',
        size: 204800,
        url: 'https://picsum.photos/seed/acme-kickoff/1200/700',
      },
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: opsLead.id,
        filename: 'implementation-map.png',
        mimeType: 'image/png',
        size: 245760,
        url: 'https://picsum.photos/seed/implementation-map/1200/700',
      },
    ],
  });

  await prisma.documentComment.createMany({
    data: [
      {
        documentId: onboardingDocument.id,
        authorId: successLead.id,
        content: 'Adicionar critério de sucesso dos primeiros 14 dias.',
      },
      {
        documentId: handoffDocument.id,
        authorId: founder.id,
        content: 'Faltou registrar expectativa de expansão no trimestre.',
      },
      {
        documentId: incidentDocument.id,
        authorId: opsLead.id,
        content:
          'Precisamos anexar runbook técnico antes de marcar como pronto.',
      },
    ],
  });

  await prisma.approvalRequest.createMany({
    data: [
      {
        documentId: onboardingDocument.id,
        requesterId: founder.id,
        reviewerId: successLead.id,
        status: ApprovalStatus.APPROVED,
        notes: 'Validar readiness de rollout e governança.',
        reviewNotes: 'Aprovado com checkpoints claros de ativação.',
        reviewedAt: new Date(),
      },
      {
        documentId: handoffDocument.id,
        requesterId: successLead.id,
        reviewerId: founder.id,
        status: ApprovalStatus.PENDING,
        notes: 'Precisamos revisar se o escopo reflete o combinado comercial.',
      },
    ],
  });

  await prisma.documentVersion.createMany({
    data: [
      {
        documentId: onboardingDocument.id,
        createdById: founder.id,
        label: 'Aprovado',
        snapshot: asJson({
          title: onboardingDocument.title,
          summary: onboardingDocument.summary,
          category: onboardingDocument.category,
          status: onboardingDocument.status,
          blocks: [
            {
              type: BlockType.HEADING,
              content: 'Onboarding enterprise | ACME',
            },
            {
              type: BlockType.PARAGRAPH,
              content:
                'Versão aprovada do playbook com milestones, owners e riscos.',
            },
          ],
        }),
      },
      {
        documentId: handoffDocument.id,
        createdById: successLead.id,
        label: 'Review',
        snapshot: asJson({
          title: handoffDocument.title,
          summary: handoffDocument.summary,
          category: handoffDocument.category,
          status: handoffDocument.status,
          blocks: [
            {
              type: BlockType.HEADING,
              content: 'Handoff vendas para CS | Beta Corp',
            },
            {
              type: BlockType.BULLET,
              content: 'Primeira versão aguardando aprovação comercial.',
            },
          ],
        }),
      },
    ],
  });

  await prisma.publicShare.create({
    data: {
      documentId: onboardingDocument.id,
      token: randomUUID(),
      title: 'Onboarding ACME para stakeholders',
      allowComments: false,
      createdById: founder.id,
    },
  });

  await prisma.workspaceInvite.create({
    data: {
      workspaceId: workspace.id,
      email: 'advisor@playbookos.dev',
      role: WorkspaceRole.VIEWER,
      token: randomUUID(),
      invitedById: founder.id,
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        userId: founder.id,
        type: ActivityType.WORKSPACE_CREATED,
        message: 'Workspace demo criado para portfólio.',
      },
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: founder.id,
        type: ActivityType.DOCUMENT_CREATED,
        message: 'Playbook de onboarding criado.',
      },
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: opsLead.id,
        type: ActivityType.UPLOAD_ADDED,
        message: 'Arquivos visuais adicionados ao onboarding.',
      },
      {
        workspaceId: workspace.id,
        documentId: handoffDocument.id,
        userId: successLead.id,
        type: ActivityType.APPROVAL_REQUESTED,
        message: 'Handoff enviado para aprovação comercial.',
      },
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: successLead.id,
        type: ActivityType.APPROVAL_APPROVED,
        message: 'Onboarding aprovado para uso com cliente enterprise.',
      },
      {
        workspaceId: workspace.id,
        documentId: onboardingDocument.id,
        userId: founder.id,
        type: ActivityType.PUBLIC_SHARE_CREATED,
        message: 'Link público criado para stakeholders.',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
