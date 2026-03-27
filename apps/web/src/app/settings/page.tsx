"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  LoaderCircle,
  Palette,
  Save,
  Sparkles,
} from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage, normalizePtBrCopy } from "@/lib/utils";
import type { WorkspaceOverview } from "@/types";

const BRAND_SWATCHES = ["#55624f", "#7b8972", "#8d977f", "#b68a5f", "#c7b092", "#d9cfbe"];

function SettingsContent({
  refreshWorkspaces,
  workspaceId,
}: {
  workspaceId: string | null;
  refreshWorkspaces: () => Promise<void>;
}) {
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    brandColor: "",
    description: "",
    industry: "",
    aiTone: "",
  });

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    const loadWorkspace = async () => {
      setLoading(true);

      try {
        const response = await authenticatedFetch<WorkspaceOverview>(
          `/workspaces/${workspaceId}`,
        );

        if (!cancelled) {
          setOverview(response);
          setForm({
            name: response.name,
            logoUrl: response.logoUrl ?? "",
            brandColor: response.brandColor ?? "",
            description: normalizePtBrCopy(response.description),
            industry: response.industry ?? "",
            aiTone: normalizePtBrCopy(response.aiTone),
          });
          setMessage(null);
          setMessageTone(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Não foi possível carregar o workspace.",
          );
          setMessageTone("error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) {
      return;
    }

    setSaving(true);

    try {
      await authenticatedFetch(`/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await refreshWorkspaces();
      setMessage("Configurações salvas com sucesso.");
      setMessageTone("success");
      toast.success("Configurações salvas.", "Branding e preferências atualizados.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível salvar as configurações.",
      );
      setMessage(nextMessage);
      setMessageTone("error");
      toast.error("Falha ao salvar configurações.", nextMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[22px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando configuração do workspace...
      </div>
    );
  }

  const previewColor = form.brandColor || "var(--accent)";

  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <aside className="space-y-4">
        <section className="surface rounded-[22px] p-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Mapa</p>
          <div className="mt-4 space-y-2">
            {[
              ["#identity", "Identidade"],
              ["#context", "Contexto"],
              ["#automation", "Diretrizes de IA"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block rounded-[14px] border border-[var(--stroke)] bg-[var(--panel-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[rgba(123,137,114,0.24)] hover:bg-[var(--panel)]"
              >
                {label}
              </a>
            ))}
          </div>
        </section>

        <section className="surface rounded-[22px] p-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Workspace</p>
          <div className="mt-4 space-y-3">
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.slug ? overview.slug : "Slug indisponível"}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Identificador público</p>
            </div>
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.counts.documents ?? 0} documentos
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Base de conhecimento atual</p>
            </div>
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.counts.members ?? 0} membros
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Pessoas com acesso</p>
            </div>
          </div>
        </section>
      </aside>

      <div className="space-y-5">
        <section className="surface rounded-[24px] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Administração</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Configuração central do workspace
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Ajuste identidade, posicionamento e instruções da IA em uma estrutura mais próxima
                de um painel real de produto.
              </p>
            </div>

            <button className="pill-button" type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </button>
          </div>

          {message ? (
            <div
              className={[
                "mt-4 rounded-[16px] px-4 py-3 text-sm",
                messageTone === "success"
                  ? "border border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.08)] text-[var(--accent-2)]"
                  : "border border-[rgba(194,65,87,0.18)] bg-[rgba(194,65,87,0.08)] text-[var(--danger)]",
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}
        </section>

        <section id="identity" className="surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--accent-4)] text-[var(--accent-3)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Identidade</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                Marca e reconhecimento do workspace
              </h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
              URL da logo
              <input
                className="field-control px-4 py-3 text-sm"
                value={form.logoUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, logoUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Cor principal
              <input
                className="field-control px-4 py-3 text-sm"
                value={form.brandColor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, brandColor: event.target.value }))
                }
                placeholder="#2563EB"
              />
            </label>

            <div className="grid gap-2 text-sm text-[var(--muted)]">
              Sugestões de paleta
              <div className="flex flex-wrap gap-2">
                {BRAND_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    className="h-10 w-10 rounded-[12px] border border-[var(--stroke)]"
                    type="button"
                    style={{ backgroundColor: swatch }}
                    onClick={() =>
                      setForm((current) => ({ ...current, brandColor: swatch }))
                    }
                    aria-label={`Usar ${swatch}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="context" className="surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(15,118,110,0.08)] text-[var(--accent-2)]">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Contexto</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                Posicionamento e descrição operacional
              </h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Segmento
              <input
                className="field-control px-4 py-3 text-sm"
                value={form.industry}
                onChange={(event) =>
                  setForm((current) => ({ ...current, industry: event.target.value }))
                }
                placeholder="Ex.: B2B SaaS"
              />
            </label>

            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Descrição do workspace
              <textarea
                className="field-control min-h-[140px] rounded-[16px] px-4 py-4 text-sm"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
        </section>

        <section id="automation" className="surface rounded-[24px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(23,37,84,0.08)] text-[var(--accent-3)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">IA</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                Diretrizes para geração de conteúdo
              </h3>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Tom e padrão esperado
              <textarea
                className="field-control min-h-[160px] rounded-[16px] px-4 py-4 text-sm"
                value={form.aiTone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, aiTone: event.target.value }))
                }
              />
            </label>

            <div className="subtle-card p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Use instruções objetivas, contexto do negócio e padrão de decisão.
                </p>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Quanto mais clara for a orientação, mais consistente fica a geração de drafts,
                resumos e estruturas dentro da plataforma.
              </p>
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="surface rounded-[24px] p-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Preview</p>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--stroke)] bg-[var(--panel)]">
            <div
              className="h-28 border-b border-[var(--stroke)]"
              style={{
                background: `linear-gradient(135deg, ${previewColor} 0%, var(--accent-2) 100%)`,
              }}
            />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[16px] text-sm font-semibold text-white"
                  style={{ backgroundColor: form.brandColor || "#55624f" }}
                >
                  {(form.name || "WS").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {form.name || "Workspace"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">{form.industry || "Segmento"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {form.description || "A descrição estratégica do workspace aparece aqui."}
              </p>
            </div>
          </div>
        </section>

        <section className="surface rounded-[24px] p-5">
          <p className="tech-label text-[10px] text-[var(--muted)]">Governança</p>
          <div className="mt-4 space-y-3">
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.counts.pendingApprovals ?? 0} aprovações pendentes
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Fluxos aguardando revisão formal.
              </p>
            </div>
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.counts.activePublicShares ?? 0} links públicos ativos
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Documentos atualmente expostos fora da conta.
              </p>
            </div>
            <div className="subtle-card p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {overview?.counts.pendingInvites ?? 0} convites em aberto
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Pessoas aguardando entrada no workspace.
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <WorkspacePage
      title="Configuração do workspace"
      subtitle="Gerencie identidade, contexto operacional e diretrizes de IA em uma estrutura mais próxima de um painel administrativo real."
    >
      {({ refreshWorkspaces, workspaceId }) => (
        <SettingsContent
          workspaceId={workspaceId}
          refreshWorkspaces={refreshWorkspaces}
        />
      )}
    </WorkspacePage>
  );
}
