"use client";

import { useEffect, useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  formatPlanLabel,
  formatSubscriptionStatus,
  getErrorMessage,
} from "@/lib/utils";
import type { BillingSummary } from "@/types";

function BillingContent() {
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoading(true);

      try {
        const response = await authenticatedFetch<BillingSummary>("/billing/summary");

        if (!cancelled) {
          setSummary(response);
          setMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Não foi possível carregar a cobrança.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch]);

  const handleBillingAction = async (path: string) => {
    try {
      const response = await authenticatedFetch<{ url: string }>(path, {
        method: "POST",
      });
      toast.info(
        path.includes("checkout") ? "Abrindo checkout." : "Abrindo portal do cliente.",
        "Você será redirecionado para o fluxo de cobrança.",
      );
      window.location.href = response.url;
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível abrir o fluxo de cobrança.",
      );
      setMessage(nextMessage);
      toast.error("Falha na cobrança.", nextMessage);
    }
  };

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando assinatura...
      </div>
    );
  }

  if (!summary) {
    return <div className="surface rounded-[24px] p-5 text-[var(--muted)]">{message}</div>;
  }

  return (
    <div className="space-y-5">
      <section className="surface rounded-[26px] p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--stroke)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="tech-label text-[10px] text-[var(--muted)]">Plano atual</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {formatPlanLabel(summary.plan)}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              {formatSubscriptionStatus(summary.status)}
              {summary.currentPeriodEnd ? ` · renova em ${summary.currentPeriodEnd}` : ""}
            </p>
          </div>

          <button
            className="pill-button"
            type="button"
            onClick={() =>
              void handleBillingAction(
                summary.plan === "FREE"
                  ? "/billing/checkout-session"
                  : "/billing/customer-portal",
              )
            }
          >
            <CreditCard className="h-4 w-4" />
            {summary.plan === "FREE" ? "Fazer upgrade" : "Abrir portal"}
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[18px] border border-[var(--stroke)]">
            <div className="grid grid-cols-[1.3fr_0.7fr_0.8fr] border-b border-[var(--stroke)] bg-[rgba(24,33,43,0.03)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>Métrica</span>
              <span>Valor</span>
              <span>Leitura</span>
            </div>
            {[
              ["Workspaces", String(summary.usage.workspaces), "Em uso"],
              ["Documentos", String(summary.usage.documents), "Ativos"],
              ["Uploads", String(summary.usage.uploads), "Associados"],
            ].map(([label, value, helper]) => (
              <div
                key={label}
                className="grid grid-cols-[1.3fr_0.7fr_0.8fr] border-b border-[var(--stroke)] px-4 py-4 text-sm last:border-none"
              >
                <span className="font-medium text-[var(--foreground)]">{label}</span>
                <span className="text-[var(--foreground)]">{value}</span>
                <span className="text-[var(--muted)]">{helper}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {summary.workspaces.map((workspace) => (
              <div key={workspace.id} className="subtle-card p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">{workspace.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{workspace.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface rounded-[26px] p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
          <div>
            <p className="tech-label text-[10px] text-[var(--muted)]">Comparativo</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              Estrutura dos planos
            </h2>
          </div>
          <span className="status-chip">{summary.plans.length} tiers</span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {summary.plans.map((plan) => (
            <div key={plan.id} className="subtle-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--foreground)]">{plan.name}</p>
                {plan.highlighted ? (
                  <span className="status-chip" data-tone="positive">
                    Destaque
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {plan.price}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{plan.description}</p>
            </div>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}

export default function BillingPage() {
  return (
    <WorkspacePage
      title="Assinatura"
      subtitle="Acompanhe o plano ativo, o uso atual da conta e o acesso ao portal de cobrança."
    >
      {() => <BillingContent />}
    </WorkspacePage>
  );
}
