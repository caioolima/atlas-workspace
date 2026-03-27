import { BlockType, TemplateCategory } from '@prisma/client';

type TemplateSeed = {
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string;
  icon: string;
  blocks: Array<{
    type: BlockType;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
};

export const WORKSPACE_TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    name: 'Onboarding enterprise',
    slug: 'onboarding-enterprise',
    category: TemplateCategory.ONBOARDING,
    description:
      'Estrutura para conduzir onboarding de clientes enterprise com riscos, owners e próxima etapa.',
    icon: 'rocket',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'Onboarding enterprise',
        metadata: { level: 1 },
      },
      {
        type: BlockType.PARAGRAPH,
        content:
          'Centralize escopo, milestones, stakeholders e riscos para acelerar ativação sem perder contexto.',
      },
      {
        type: BlockType.TODO,
        content: 'Validar objetivo de negócio, sponsor e prazo de go-live.',
        metadata: { checked: false },
      },
      {
        type: BlockType.TODO,
        content:
          'Definir owners internos para implementação, CS e treinamento.',
        metadata: { checked: false },
      },
      {
        type: BlockType.CALLOUT,
        content:
          'Use esta seção para registrar riscos de rollout e dependências do cliente.',
      },
    ],
  },
  {
    name: 'Handoff vendas para CS',
    slug: 'handoff-vendas-cs',
    category: TemplateCategory.HANDOFF,
    description:
      'Modelo para transferir contexto comercial, escopo e combinados para o time de sucesso.',
    icon: 'bridge',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'Handoff vendas para CS',
        metadata: { level: 1 },
      },
      {
        type: BlockType.BULLET,
        content: 'Motivo da compra e problema principal do cliente.',
      },
      {
        type: BlockType.BULLET,
        content: 'Escopo vendido, SLAs combinados e pontos de atenção.',
      },
      {
        type: BlockType.TODO,
        content:
          'Confirmar expectativas do kickoff e objetivos dos primeiros 30 dias.',
        metadata: { checked: false },
      },
    ],
  },
  {
    name: 'SOP operacional diário',
    slug: 'sop-operacional-diario',
    category: TemplateCategory.SOP,
    description:
      'Checklist para rotinas recorrentes com passos, anexos e critério de concluído.',
    icon: 'check-square',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'SOP operacional diário',
        metadata: { level: 1 },
      },
      {
        type: BlockType.PARAGRAPH,
        content:
          'Descreva quando a rotina acontece, quem é responsável e quais evidências precisam ser registradas.',
      },
      {
        type: BlockType.TODO,
        content: 'Executar passo 1 e anexar evidências.',
        metadata: { checked: false },
      },
      {
        type: BlockType.TODO,
        content: 'Executar passo 2 e sinalizar bloqueios.',
        metadata: { checked: false },
      },
    ],
  },
  {
    name: 'Playbook de incidente',
    slug: 'playbook-incidente',
    category: TemplateCategory.INCIDENT,
    description:
      'Fluxo de resposta para incidentes com severidade, owners, comunicação e pós-mortem.',
    icon: 'shield',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'Playbook de incidente',
        metadata: { level: 1 },
      },
      {
        type: BlockType.CALLOUT,
        content: 'Classifique impacto, severidade e canal de comunicação.',
      },
      {
        type: BlockType.TODO,
        content: 'Acionar owner técnico e owner de comunicação.',
        metadata: { checked: false },
      },
      {
        type: BlockType.TODO,
        content:
          'Publicar atualização inicial para stakeholders em até 15 minutos.',
        metadata: { checked: false },
      },
    ],
  },
  {
    name: 'Plano de sucesso e QBR',
    slug: 'plano-sucesso-qbr',
    category: TemplateCategory.SUCCESS,
    description:
      'Template para documentar métricas de valor, próximas entregas e riscos do cliente.',
    icon: 'line-chart',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'Plano de sucesso e QBR',
        metadata: { level: 1 },
      },
      {
        type: BlockType.PARAGRAPH,
        content:
          'Registre indicadores-chave, wins recentes, riscos e plano dos próximos 90 dias.',
      },
      {
        type: BlockType.BULLET,
        content: 'Metas acordadas e status atual.',
      },
      {
        type: BlockType.BULLET,
        content: 'Riscos de renovação, expansão ou adoção.',
      },
    ],
  },
];

export function getStarterDocumentSeed(firstName?: string | null) {
  const safeName = firstName?.trim().split(' ')[0] || 'Team';

  return {
    title: `${safeName} ops command center`,
    summary:
      'Workspace inicial para SOPs, onboardings, handoffs e processos críticos da operação.',
    category: 'Operations',
    blocks: [
      {
        type: BlockType.HEADING,
        content: 'Command center operacional',
        metadata: { level: 1 },
      },
      {
        type: BlockType.PARAGRAPH,
        content:
          'Use este playbook para organizar rituais, handoffs, anexos e critérios de qualidade do time.',
      },
      {
        type: BlockType.TODO,
        content: 'Mapear a rotina mais crítica da operação.',
        metadata: { checked: false },
      },
      {
        type: BlockType.TODO,
        content: 'Adicionar owners, anexos e indicadores de sucesso.',
        metadata: { checked: false },
      },
    ],
  };
}

export function slugifyWorkspaceName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function buildWorkspaceSlug(value: string, suffix?: string) {
  const base = slugifyWorkspaceName(value) || 'workspace';

  if (!suffix) {
    return base;
  }

  return `${base}-${suffix}`.slice(0, 60);
}
