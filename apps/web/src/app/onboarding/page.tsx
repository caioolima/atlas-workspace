"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage } from "@/lib/utils";
import type { TemplateRecord } from "@/types";

function OnboardingContent({ workspaceId }: { workspaceId: string | null }) {
  const router = useRouter();
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Atlas Central",
    industry: "B2B SaaS",
    description:
      "Workspace para organizar onboarding, handoffs, playbooks e documentação do time.",
    aiTone: "Clara, objetiva e orientada à execução.",
    brandColor: "#9AB59F",
    templateId: "",
  });

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      try {
        const response = await authenticatedFetch<TemplateRecord[]>(
          `/workspaces/${workspaceId}/templates`,
        );

        if (!cancelled) {
          setTemplates(response);
          setForm((current) => ({
            ...current,
            templateId: response[0]?.id ?? current.templateId,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os templates do onboarding.",
          );
        }
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, workspaceId]);

  const handleSubmit = async () => {
    setSaving(true);

    try {
      await authenticatedFetch("/workspaces/onboarding", {
        method: "POST",
        body: JSON.stringify(form),
      });

      toast.success(
        "Configuração concluída.",
        "Seu workspace já está pronto para continuar.",
      );
      router.push("/dashboard");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível concluir o onboarding.",
      );
      setMessage(nextMessage);
      toast.error("Falha no onboarding.", nextMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="surface rounded-[32px] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Nome do workspace
            <input
              className="field-control px-4 py-3 text-sm"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Segmento
            <input
              className="field-control px-4 py-3 text-sm"
              value={form.industry}
              onChange={(event) =>
                setForm((current) => ({ ...current, industry: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] md:col-span-2">
            Descrição
            <textarea
              className="field-control min-h-[120px] rounded-[20px] px-4 py-4 text-sm"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Tom da IA
            <input
              className="field-control px-4 py-3 text-sm"
              value={form.aiTone}
              onChange={(event) =>
                setForm((current) => ({ ...current, aiTone: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Cor da marca
            <input
              className="field-control px-4 py-3 text-sm"
              value={form.brandColor}
              onChange={(event) =>
                setForm((current) => ({ ...current, brandColor: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)] md:col-span-2">
            Template inicial
            <select
              className="field-control px-4 py-3 text-sm"
              value={form.templateId}
              onChange={(event) =>
                setForm((current) => ({ ...current, templateId: event.target.value }))
              }
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="pill-button mt-6"
          type="button"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Concluir configuração
            </>
          )}
        </button>

        {message ? <p className="mt-4 text-sm text-[var(--danger)]">{message}</p> : null}
      </section>

      <aside className="surface rounded-[32px] p-5">
        <p className="tech-label text-[11px] text-[var(--muted)]">Antes de continuar</p>
        <div className="mt-4 grid gap-3">
          {[
            "Defina o nome e o contexto do workspace.",
            "Escolha o tom de escrita para sugestões da IA.",
            "Selecione um template para iniciar o primeiro documento.",
          ].map((item) => (
            <div key={item} className="subtle-card p-4 text-sm leading-7 text-[var(--foreground)]">
              {item}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <WorkspacePage
      title="Configuração inicial"
      subtitle="Defina o contexto do workspace, ajuste preferências e escolha como o time vai começar a usar a plataforma."
    >
      {({ workspaceId }) => <OnboardingContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
