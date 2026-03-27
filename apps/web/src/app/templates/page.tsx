"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  formatCategoryLabel,
  getErrorMessage,
  normalizePtBrCopy,
} from "@/lib/utils";
import type { TemplateRecord } from "@/types";

function TemplatesContent({ workspaceId }: { workspaceId: string | null }) {
  const router = useRouter();
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "Checklist de QBR",
    category: "SUCCESS",
    description: "Estrutura para preparar reunião executiva de valor e renovação.",
    icon: "briefcase",
    intro: "Centralize métricas, wins, riscos e plano dos próximos 90 dias.",
  });

  const loadTemplates = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setLoading(true);

    try {
      const response = await authenticatedFetch<TemplateRecord[]>(
        `/workspaces/${workspaceId}/templates`,
      );
      setTemplates(response);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível carregar os templates.",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, workspaceId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async () => {
    if (!workspaceId) {
      return;
    }

    setCreating(true);

    try {
      await authenticatedFetch(`/workspaces/${workspaceId}/templates`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          description: form.description,
          icon: form.icon,
          blocks: [
            {
              type: "HEADING",
              content: form.name,
              metadata: {
                level: 1,
              },
            },
            {
              type: "PARAGRAPH",
              content: form.intro,
            },
            {
              type: "TODO",
              content: "Adicionar owners, metas e próximos passos.",
              metadata: {
                checked: false,
              },
            },
          ],
        }),
      });

      setMessage("Template criado com sucesso.");
      toast.success("Template criado.", "A biblioteca foi atualizada.");
      await loadTemplates();
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível criar o template.",
      );
      setMessage(nextMessage);
      toast.error("Falha ao criar template.", nextMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleApply = async (templateId: string) => {
    if (!workspaceId) {
      return;
    }

    try {
      const response = await authenticatedFetch<{ id: string }>(
        `/workspaces/${workspaceId}/templates/${templateId}/apply`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      toast.success("Template aplicado.", "O novo documento está pronto para edição.");
      router.push(`/documents/${response.id}`);
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível aplicar o template.",
      );
      setMessage(nextMessage);
      toast.error("Falha ao aplicar template.", nextMessage);
    }
  };

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando biblioteca...
      </div>
    );
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="surface rounded-[26px] p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Coleção ativa</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Modelos para abrir processos com contexto pronto
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                A biblioteca concentra estruturas reutilizáveis para onboarding, handoff,
                incidentes e rotinas recorrentes sem depender de arquivos soltos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="subtle-card p-4">
                <p className="tech-label text-[10px] text-[var(--muted)]">Ativos</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {templates.length}
                </p>
              </div>
              <div className="subtle-card p-4">
                <p className="tech-label text-[10px] text-[var(--muted)]">Base</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {templates.filter((template) => template.isSystem).length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface rounded-[26px] p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Biblioteca</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Templates disponíveis
              </h2>
            </div>
            <span className="status-chip">{templates.length} modelos</span>
          </div>

          <div className="mt-5 space-y-4">
            {templates.map((template) => (
              <article key={template.id} className="subtle-card overflow-hidden p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="status-chip">{formatCategoryLabel(template.category)}</span>
                      <span className="status-chip" data-tone="info">
                        {template.isSystem ? "Modelo base" : "Criado pelo time"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                      {template.name}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                      {normalizePtBrCopy(template.description)}
                    </p>
                  </div>

                  <button
                    className="pill-button shrink-0"
                    type="button"
                    onClick={() => handleApply(template.id)}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Usar template
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {template.blocks.slice(0, 3).map((block) => (
                    <div
                      key={`${template.id}-${block.id}`}
                      className="rounded-[14px] border border-[var(--stroke)] bg-[var(--panel)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
                    >
                      {normalizePtBrCopy(block.content)}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="surface rounded-[26px] p-6 2xl:sticky 2xl:top-28 2xl:self-start">
        <div className="border-b border-[var(--stroke)] pb-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Novo template</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Criar modelo
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Monte uma estrutura própria para o time abrir novos documentos com o mesmo padrão.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Nome
            <input
              className="field-control px-4 py-3 text-sm"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Categoria
            <select
              className="field-control px-4 py-3 text-sm"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
            >
              {["ONBOARDING", "HANDOFF", "SOP", "INCIDENT", "SALES", "SUCCESS", "OPERATIONS", "CUSTOM"].map(
                (option) => (
                  <option key={option} value={option}>
                    {formatCategoryLabel(option)}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Descrição
            <textarea
              className="field-control min-h-[100px] rounded-[14px] px-4 py-4 text-sm"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--muted)]">
            Introdução
            <textarea
              className="field-control min-h-[120px] rounded-[14px] px-4 py-4 text-sm"
              value={form.intro}
              onChange={(event) =>
                setForm((current) => ({ ...current, intro: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="pill-button" type="button" onClick={handleCreate} disabled={creating}>
            {creating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <FilePlus2 className="h-4 w-4" />
                Criar template
              </>
            )}
          </button>
          {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
        </div>
      </aside>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <WorkspacePage
      title="Biblioteca"
      subtitle="Organize modelos reutilizáveis para abrir documentos com mais consistência e menos trabalho manual."
    >
      {({ workspaceId }) => <TemplatesContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
