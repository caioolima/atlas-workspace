"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { formatDateTime, normalizePtBrCopy } from "@/lib/utils";
import type { ActivityRecord } from "@/types";

function ActivityContent({ workspaceId }: { workspaceId: string | null }) {
  const { authenticatedFetch } = useAuth();
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    const loadActivity = async () => {
      setLoading(true);

      try {
        const response = await authenticatedFetch<ActivityRecord[]>(
          `/workspaces/${workspaceId}/activity`,
        );

        if (!cancelled) {
          setActivity(response);
          setMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Não foi possível carregar a atividade.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, workspaceId]);

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[28px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando atividade...
      </div>
    );
  }

  return (
    <section className="surface rounded-[32px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="tech-label text-[11px] text-[var(--muted)]">Linha do tempo</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Atualizações recentes do workspace
          </h3>
        </div>
        <span className="status-chip">{activity.length} eventos</span>
      </div>

      <div className="mt-6 grid gap-4">
        {activity.map((item) => (
          <article key={item.id} className="subtle-card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="tech-label text-[11px] text-[var(--muted)]">{item.type}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {normalizePtBrCopy(item.message)}
                </h3>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {item.user?.name ?? item.user?.email ?? "Sistema"}
                </p>
              </div>
              <span className="status-chip">{formatDateTime(item.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--danger)]">{message}</p> : null}
    </section>
  );
}

export default function ActivityPage() {
  return (
    <WorkspacePage
      title="Atividade"
      subtitle="Acompanhe alterações recentes, movimentações da equipe e eventos relevantes do workspace."
    >
      {({ workspaceId }) => <ActivityContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
