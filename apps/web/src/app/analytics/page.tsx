"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import {
  formatCategoryLabel,
  formatDateTime,
  formatDocumentStatus,
  formatWorkspaceRole,
} from "@/lib/utils";
import type { AnalyticsResponse } from "@/types";

function AnalyticsContent({ workspaceId }: { workspaceId: string | null }) {
  const { authenticatedFetch } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);

      try {
        const response = await authenticatedFetch<AnalyticsResponse>(
          `/workspaces/${workspaceId}/analytics`,
        );

        if (!cancelled) {
          setAnalytics(response);
          setMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Não foi possível carregar as análises.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, workspaceId]);

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando análises...
      </div>
    );
  }

  if (!analytics) {
    return <div className="surface rounded-[24px] p-5 text-[var(--muted)]">{message}</div>;
  }

  const maxStatusCount = Math.max(
    1,
    ...analytics.statusBreakdown.map((item) => item.count),
    ...analytics.categoryBreakdown.map((item) => item.count),
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Documentos", analytics.overview.documents],
          ["Aprovados", analytics.overview.approvedDocuments],
          ["Comentários", analytics.overview.openComments],
          ["Links públicos", analytics.overview.activePublicShares],
        ].map(([label, value]) => (
          <article key={label} className="metric-card">
            <p className="tech-label text-[10px] text-[var(--muted)]">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {value}
            </h3>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface rounded-[26px] p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Distribuição</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Status e categorias
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Status dos documentos</p>
              <div className="mt-4 grid gap-4">
                {analytics.statusBreakdown.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--foreground)]">
                        {formatDocumentStatus(item.status)}
                      </span>
                      <span className="text-[var(--muted)]">{item.count}</span>
                    </div>
                    <div className="progress-rail mt-2">
                      <div
                        className="progress-value"
                        style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Categorias mais usadas</p>
              <div className="mt-4 grid gap-4">
                {analytics.categoryBreakdown.map((item) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[var(--foreground)]">
                        {formatCategoryLabel(item.category)}
                      </span>
                      <span className="text-[var(--muted)]">{item.count}</span>
                    </div>
                    <div className="progress-rail mt-2">
                      <div
                        className="progress-value"
                        style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="surface rounded-[26px] p-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Equipe</p>
          <div className="mt-4 space-y-3">
            {analytics.memberActivity.map((member) => (
              <div key={member.id} className="subtle-card p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatWorkspaceRole(member.role)} · {member.activityCount} eventos
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="surface rounded-[26px] p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
          <div>
            <p className="tech-label text-[10px] text-[var(--muted)]">Top documentos</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              Documentos com melhor tração
            </h2>
          </div>
        </div>

        <div className="mt-2">
          {analytics.topDocuments.map((document) => (
            <div
              key={document.id}
              className="grid gap-3 border-b border-[var(--stroke)] py-5 last:border-none md:grid-cols-[minmax(0,1fr)_140px_200px]"
            >
              <div>
                <p className="text-base font-medium text-[var(--foreground)]">{document.title}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {formatDocumentStatus(document.status)} · {formatCategoryLabel(document.category)}
                </p>
              </div>
              <div className="text-sm text-[var(--foreground)]">{document.score} pts</div>
              <div className="text-sm text-[var(--muted)]">
                Atualizado em {formatDateTime(document.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <WorkspacePage
      title="Análises"
      subtitle="Acompanhe distribuição de documentos, categorias, atividade do time e sinais de uso do workspace."
    >
      {({ workspaceId }) => <AnalyticsContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
