"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BarChart3,
  Building2,
  CreditCard,
  FolderKanban,
  LoaderCircle,
  LogOut,
  Settings,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { useWorkspaceSelection } from "@/components/workspace/use-workspace-selection";
import {
  formatDisplayEmail,
  formatDisplayName,
  formatPlanLabel,
  formatPlural,
  formatWorkspaceDisplayName,
  formatWorkspaceRole,
  getInitials,
  normalizePtBrCopy,
} from "@/lib/utils";
import type { WorkspaceCard } from "@/types";

type WorkspacePageRenderProps = {
  workspace: WorkspaceCard | null;
  workspaceId: string | null;
  refreshWorkspaces: () => Promise<void>;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumo", icon: Workflow },
  { href: "/templates", label: "Biblioteca", icon: FolderKanban },
  { href: "/members", label: "Equipe", icon: Users },
  { href: "/billing", label: "Assinatura", icon: CreditCard },
  { href: "/analytics", label: "Análises", icon: BarChart3 },
  { href: "/activity", label: "Atividade", icon: Sparkles },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function WorkspacePage({
  title,
  subtitle,
  preferredWorkspaceId,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  preferredWorkspaceId?: string;
  actions?: React.ReactNode;
  children: (props: WorkspacePageRenderProps) => React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, logout, user } = useAuth();
  const toast = useToast();
  const {
    currentWorkspace,
    currentWorkspaceId,
    errorMessage,
    refreshWorkspaces,
    screenState,
    setCurrentWorkspaceId,
    workspaces,
  } = useWorkspaceSelection(preferredWorkspaceId);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || screenState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[var(--muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Carregando workspace...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (screenState === "ready" && workspaces.length === 0) {
    return (
      <main className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-4xl">
          <section className="surface rounded-[28px] p-8 md:p-10">
            <span className="eyebrow">
              <Building2 className="h-4 w-4 text-[var(--accent)]" />
              Workspace necessário
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Nenhum workspace disponível.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--muted)]">
              Configure o primeiro workspace para começar a organizar documentos,
              equipe, templates e permissões.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                "Defina o contexto do workspace.",
                "Escolha um template inicial.",
                "Continue no painel com a estrutura pronta.",
              ].map((item) => (
                <div key={item} className="subtle-card p-4 text-sm leading-7 text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </div>

            {errorMessage ? (
              <p className="mt-5 text-sm text-[var(--danger)]">{errorMessage}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="outline-button" type="button" onClick={() => void refreshWorkspaces()}>
                Atualizar
              </button>
              <Link className="pill-button" href="/onboarding">
                Criar workspace
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast.info("Sessão encerrada.", "Seu acesso foi encerrado com sucesso.");
  };

  return (
    <main className="px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <header className="surface sticky top-5 z-20 rounded-[26px]">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(86,120,104,0.1)] text-[var(--accent)]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    Atlas
                  </p>
                  <p className="text-xs text-[var(--muted)]">Operação documental</p>
                </div>
              </Link>

              <div className="h-8 w-px bg-[var(--stroke)]" />

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[rgba(24,33,43,0.05)] text-sm font-semibold text-[var(--foreground)]">
                  {getInitials(formatWorkspaceDisplayName(currentWorkspace?.name))}
                </div>
                <div className="min-w-[220px]">
                  <select
                    className="field-control px-3.5 py-2.5 text-sm"
                    value={currentWorkspaceId ?? ""}
                    onChange={(event) => setCurrentWorkspaceId(event.target.value)}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {formatWorkspaceDisplayName(workspace.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="status-chip">{formatWorkspaceRole(currentWorkspace?.role)}</span>
              <span className="status-chip" data-tone="warning">
                {formatPlanLabel(user.plan)}
              </span>
              <div className="flex items-center gap-3 rounded-[14px] border border-[var(--stroke)] bg-[rgba(24,33,43,0.03)] px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-xs font-semibold text-[var(--foreground)]">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatDisplayName(user.name, user.email)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatDisplayEmail(user.email)}
                  </p>
                </div>
              </div>
              <button className="outline-button" type="button" onClick={() => void handleLogout()}>
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--stroke)] px-3 py-2 md:px-5">
            <nav className="flex gap-2 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "inline-flex shrink-0 items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-[rgba(86,120,104,0.1)] text-[var(--foreground)]"
                        : "text-[var(--muted-strong)] hover:bg-[rgba(24,33,43,0.04)]",
                    ].join(" ")}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <header className="surface rounded-[26px] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">
                    {formatWorkspaceDisplayName(currentWorkspace?.name)}
                  </p>
                  <h1 className="mt-2 text-[clamp(2rem,3.4vw,2.8rem)] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    {title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                    {subtitle}
                  </p>
                  {errorMessage ? (
                    <p className="mt-3 text-sm text-[var(--danger)]">{errorMessage}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">{actions}</div>
              </div>
            </header>

            {children({
              workspace: currentWorkspace,
              workspaceId: currentWorkspaceId,
              refreshWorkspaces,
            })}
          </div>

          <aside className="space-y-5">
            <section className="surface rounded-[26px] p-5">
              <p className="tech-label text-[10px] text-[var(--muted)]">Workspace</p>
              <div className="mt-4">
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {formatWorkspaceDisplayName(currentWorkspace?.name)}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {normalizePtBrCopy(currentWorkspace?.description)}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="subtle-card p-4">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    {currentWorkspace?.counts.documents ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Documentos</p>
                </div>
                <div className="subtle-card p-4">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    {currentWorkspace?.counts.members ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Membros</p>
                </div>
              </div>
            </section>

            <section className="surface rounded-[26px] p-5">
              <p className="tech-label text-[10px] text-[var(--muted)]">Contexto</p>
              <div className="mt-4 space-y-3">
                <div className="subtle-card p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatPlural(currentWorkspace?.counts.templates ?? 0, "template")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Estruturas prontas para abrir documentos com padrão definido.
                  </p>
                </div>
                <div className="subtle-card p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatPlural(currentWorkspace?.counts.uploads ?? 0, "upload")}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Arquivos de apoio centralizados junto dos fluxos do workspace.
                  </p>
                </div>
                <Link className="outline-button w-full" href="/billing">
                  Abrir cobrança
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
