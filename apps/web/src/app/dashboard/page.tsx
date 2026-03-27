"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, FilePlus2, LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  formatCategoryLabel,
  formatDateTime,
  formatDocumentStatus,
  formatPlanLabel,
  formatPlural,
  formatSubscriptionStatus,
  getErrorMessage,
  normalizePtBrCopy,
} from "@/lib/utils";
import type { BillingSummary, WorkspaceOverview } from "@/types";

function DashboardContent({ workspaceId }: { workspaceId: string | null }) {
  const router = useRouter();
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setScreenState("loading");

      try {
        const [workspaceOverview, billingSummary] = await Promise.all([
          authenticatedFetch<WorkspaceOverview>(`/workspaces/${workspaceId}`),
          authenticatedFetch<BillingSummary>("/billing/summary"),
        ]);

        if (!cancelled) {
          setOverview(workspaceOverview);
          setBilling(billingSummary);
          setScreenState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a visão do workspace.",
          );
          setScreenState("error");
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, workspaceId]);

  const handleCreateDocument = async () => {
    if (!workspaceId) {
      return;
    }

    try {
      const document = await authenticatedFetch<{ id: string }>("/documents", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          title: "Novo documento operacional",
          category: "Operations",
        }),
      });

      router.push(`/documents/${document.id}`);
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Não foi possível criar o documento.");
      setMessage(nextMessage);
      toast.error("Falha ao criar documento.", nextMessage);
      return;
    }

    toast.success("Documento criado.", "Abrindo o editor do novo documento.");
  };

  if (screenState === "loading") {
    return (
      <div className="surface flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando visão geral...
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="surface rounded-[24px] p-6 text-[var(--muted)]">
        Nenhum workspace encontrado para esta conta.
      </div>
    );
  }

  if (screenState === "error" || !overview || !billing) {
    return (
      <div className="surface rounded-[24px] p-6 text-[var(--muted)]">
        {message ?? "Não foi possível carregar o dashboard agora."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div className="surface rounded-[24px] p-4 text-sm text-[var(--danger)]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Documentos", String(overview.counts.documents), "Base ativa do workspace"],
          ["Membros", String(overview.counts.members), "Equipe conectada ao fluxo"],
          ["Links públicos", String(overview.counts.activePublicShares), "Documentos externos ativos"],
          [
            "Plano atual",
            formatPlanLabel(billing.plan),
            `${formatSubscriptionStatus(billing.status)} na cobrança`,
          ],
        ].map(([label, value, helper]) => (
          <article key={label} className="metric-card">
            <p className="tech-label text-[10px] text-[var(--muted)]">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {value}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface rounded-[26px] p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--stroke)] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Documentos recentes</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                O que está em andamento no workspace
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="pill-button" type="button" onClick={handleCreateDocument}>
                <FilePlus2 className="h-4 w-4" />
                Novo documento
              </button>
              <Link className="outline-button" href="/onboarding">
                Revisar configuração
              </Link>
            </div>
          </div>

          <div className="mt-2">
            {overview.documents.length === 0 ? (
              <div className="py-6 text-sm text-[var(--muted)]">
                Ainda não existem documentos neste workspace.
              </div>
            ) : (
              overview.documents.map((document) => (
                <Link
                  key={document.id}
                  href={`/documents/${document.id}`}
                  className="grid gap-3 border-b border-[var(--stroke)] py-5 transition last:border-none hover:bg-[rgba(24,33,43,0.02)] md:grid-cols-[minmax(0,1fr)_220px_160px]"
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="status-chip">{formatCategoryLabel(document.category)}</span>
                      <span className="status-chip" data-tone="info">
                        {formatDocumentStatus(document.status)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                      {document.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                      {normalizePtBrCopy(document.summary)}
                    </p>
                  </div>

                  <div className="text-sm text-[var(--muted)]">
                    <p>{formatPlural(document.commentsCount, "comentário")}</p>
                    <p className="mt-1">{formatPlural(document.approvalsCount, "aprovação")}</p>
                    <p className="mt-1">{formatPlural(document.sharesCount, "link", "links")}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-[var(--muted)] md:justify-end">
                    <span>Atualizado em {formatDateTime(document.updatedAt)}</span>
                    <ArrowRight className="h-4 w-4 md:ml-3" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="surface rounded-[26px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(86,120,104,0.1)] text-[var(--accent)]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="tech-label text-[10px] text-[var(--muted)]">Biblioteca</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  Templates disponíveis
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {overview.templates.slice(0, 4).map((template) => (
                <div key={template.id} className="subtle-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{template.name}</p>
                    <span className="status-chip">{formatCategoryLabel(template.category)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    {normalizePtBrCopy(template.description)}
                  </p>
                </div>
              ))}
            </div>

            <Link className="outline-button mt-4 w-full" href="/templates">
              Abrir biblioteca
            </Link>
          </section>

          <section className="surface rounded-[26px] p-5">
            <p className="tech-label text-[10px] text-[var(--muted)]">Estado do workspace</p>
            <div className="mt-4 grid gap-3">
              <div className="subtle-card p-4">
                <p className="text-sm text-[var(--muted)]">Aprovações pendentes</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {overview.counts.pendingApprovals}
                </p>
              </div>
              <div className="subtle-card p-4">
                <p className="text-sm text-[var(--muted)]">Convites em aberto</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {overview.invites.length}
                </p>
              </div>
              <div className="subtle-card p-4">
                <p className="text-sm text-[var(--muted)]">Próximo ciclo</p>
                <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                  {billing.currentPeriodEnd
                    ? `Renovação em ${formatDateTime(billing.currentPeriodEnd)}`
                    : "Sem data de renovação registrada."}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <WorkspacePage
      title="Resumo do workspace"
      subtitle="Acompanhe documentos, biblioteca, equipe e cobrança em uma visão central do produto."
    >
      {({ workspaceId }) => <DashboardContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
