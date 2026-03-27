import { clsx } from "clsx";
import type {
  ApprovalStatus,
  DocumentStatus,
  SubscriptionStatus,
  WorkspaceRole,
} from "@/types";

const PT_BR_COPY_FIXES: Array<[RegExp, string]> = [
  [/\bexecucao\b/g, "execução"],
  [/\bgovernanca\b/g, "governança"],
  [/\bcolaboracao\b/g, "colaboração"],
  [/\bautenticacao\b/g, "autenticação"],
  [/\bindustria\b/g, "indústria"],
  [/\bdescricao\b/g, "descrição"],
  [/\bareas\b/g, "áreas"],
  [/\bcritica\b/g, "crítica"],
  [/\bcritico\b/g, "crítico"],
  [/\bcriticos\b/g, "críticos"],
  [/\bversao\b/g, "versão"],
  [/\bcomentario\b/g, "comentário"],
  [/\bcomentarios\b/g, "comentários"],
  [/\baprovacao\b/g, "aprovação"],
  [/\baprovacoes\b/g, "aprovações"],
  [/\brevisao\b/g, "revisão"],
  [/\bpublico\b/g, "público"],
  [/\bmonetizacao\b/g, "monetização"],
  [/\btracao\b/g, "tração"],
  [/\bsaude\b/g, "saúde"],
  [/\bexpansao\b/g, "expansão"],
  [/\brenovacao\b/g, "renovação"],
  [/\bdependencias\b/g, "dependências"],
  [/\bintegracao\b/g, "integração"],
  [/\bproxima\b/g, "próxima"],
  [/\bproximas\b/g, "próximas"],
  [/\bendereco\b/g, "endereço"],
  [/\bcriterio\b/g, "critério"],
  [/\bconcluido\b/g, "concluído"],
  [/\bSo você\b/g, "Só você"],
];

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function normalizePtBrCopy(value: string | null | undefined) {
  if (!value) {
    return value ?? "";
  }

  return PT_BR_COPY_FIXES.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  ARCHIVED: "Arquivado",
};

const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  INACTIVE: "Inativa",
  ACTIVE: "Ativa",
  TRIALING: "Em teste",
  PAST_DUE: "Em atraso",
  CANCELED: "Cancelada",
  INCOMPLETE: "Incompleta",
};

const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Membro",
  VIEWER: "Leitor",
};

const PLAN_LABELS = {
  FREE: "Starter",
  PRO: "Pro",
  TEAM: "Team",
} as const;

export function formatDocumentStatus(status?: DocumentStatus | null) {
  return status ? DOCUMENT_STATUS_LABELS[status] : "Sem status";
}

export function formatApprovalStatus(status?: ApprovalStatus | null) {
  return status ? APPROVAL_STATUS_LABELS[status] : "Sem status";
}

export function formatSubscriptionStatus(status?: SubscriptionStatus | null) {
  return status ? SUBSCRIPTION_STATUS_LABELS[status] : "Sem status";
}

export function formatWorkspaceRole(role?: WorkspaceRole | null) {
  return role ? WORKSPACE_ROLE_LABELS[role] : "Sem papel";
}

export function formatPlanLabel(plan?: keyof typeof PLAN_LABELS | null) {
  return plan ? PLAN_LABELS[plan] : "Sem plano";
}

export function formatCategoryLabel(value?: string | null) {
  if (!value) {
    return "Sem categoria";
  }

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatEnumLabel(value?: string | null) {
  if (!value) {
    return "Sem informação";
  }

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatPlural(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Workspace";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
