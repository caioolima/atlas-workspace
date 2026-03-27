"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  ArrowLeft,
  Bot,
  Check,
  ExternalLink,
  FileClock,
  Globe,
  LoaderCircle,
  MessageSquare,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { apiRequest, COLLABORATION_URL } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import {
  cn,
  formatApprovalStatus,
  formatCategoryLabel,
  formatDateTime,
  formatDocumentStatus,
  formatEnumLabel,
  getErrorMessage,
  getInitials,
} from "@/lib/utils";
import type { Collaborator, DocumentBlock, DocumentRecord, DocumentStatus } from "@/types";
import { useAuth } from "../providers/auth-provider";

const BLOCK_OPTIONS = [
  { label: "Parágrafo", value: "PARAGRAPH" },
  { label: "Título", value: "HEADING" },
  { label: "Tarefa", value: "TODO" },
  { label: "Lista", value: "BULLET" },
  { label: "Citação", value: "QUOTE" },
  { label: "Destaque", value: "CALLOUT" },
  { label: "Imagem", value: "IMAGE" },
] as const;

const BLOCK_LABELS: Record<DocumentBlock["type"], string> = {
  PARAGRAPH: "Parágrafo",
  HEADING: "Título",
  TODO: "Tarefa",
  BULLET: "Lista",
  QUOTE: "Citação",
  CALLOUT: "Destaque",
  IMAGE: "Imagem",
};

const BLOCK_PLACEHOLDERS: Record<DocumentBlock["type"], string> = {
  PARAGRAPH: "Escreva a instrução principal desta etapa.",
  HEADING: "Nomeie a próxima seção do documento.",
  TODO: "Defina a ação que precisa acontecer.",
  BULLET: "Adicione um ponto importante desta lista.",
  QUOTE: "Destaque uma observação ou diretriz importante.",
  CALLOUT: "Registre risco, alerta ou contexto crítico.",
  IMAGE: "Cole a URL da imagem ou faça upload no painel lateral.",
};

function createBlock(type: DocumentBlock["type"] = "PARAGRAPH"): DocumentBlock {
  return {
    id: crypto.randomUUID(),
    type,
    content: "",
    metadata:
      type === "TODO"
        ? {
            checked: false,
          }
        : {},
  };
}

function autoresize(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function getTodoChecked(block: DocumentBlock) {
  return Boolean(
    block.metadata && typeof block.metadata === "object" && "checked" in block.metadata
      ? block.metadata.checked
      : false,
  );
}

function getSyncCopy(state: "connecting" | "saved" | "syncing" | "error") {
  if (state === "saved") {
    return "Salvo e sincronizado";
  }

  if (state === "syncing") {
    return "Sincronizando alterações";
  }

  if (state === "connecting") {
    return "Reconectando colaboração";
  }

  return "Erro de sincronização";
}

function getSyncTone(state: "connecting" | "saved" | "syncing" | "error") {
  if (state === "saved") {
    return "positive";
  }

  if (state === "syncing") {
    return "info";
  }

  if (state === "connecting") {
    return "warning";
  }

  return "danger";
}

function getStatusTone(status?: DocumentStatus) {
  if (status === "APPROVED") {
    return "positive";
  }

  if (status === "IN_REVIEW") {
    return "warning";
  }

  if (status === "ARCHIVED") {
    return "danger";
  }

  return "info";
}

function getBlockPreview(block: DocumentBlock) {
  const value = block.content.trim();

  if (!value) {
    return BLOCK_PLACEHOLDERS[block.type];
  }

  if (block.type === "IMAGE") {
    return "Bloco visual com imagem anexada.";
  }

  return value.length > 88 ? `${value.slice(0, 88)}...` : value;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10} KB`;
  }

  return `${Math.round(size / 104857.6) / 10} MB`;
}

export function DocumentEditor({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { accessToken, authenticatedFetch, loading, user } = useAuth();
  const toast = useToast();
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [presence, setPresence] = useState<Collaborator[]>([]);
  const [screenState, setScreenState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [syncState, setSyncState] = useState<
    "connecting" | "saved" | "syncing" | "error"
  >("connecting");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [aiPrompt, setAiPrompt] = useState(
    "Crie um SOP de onboarding para novo cliente enterprise com etapas, responsáveis, riscos e checklist.",
  );
  const [aiTone, setAiTone] = useState("Objetivo, executivo e pronto para operação");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [approvalNotes, setApprovalNotes] = useState(
    "Validar se este fluxo está pronto para uso com o cliente e com o time interno.",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastChangeSourceRef = useRef<"local" | "remote" | null>(null);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      setScreenState("loading");

      try {
        const response = await authenticatedFetch<DocumentRecord>(`/documents/${documentId}`);

        if (!cancelled) {
          lastChangeSourceRef.current = "remote";
          hasHydratedRef.current = true;
          setDocument(response);
          setSummaryDraft(response.summary ?? "");
          setCategoryDraft(response.category ?? "");
          setScreenState("ready");
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setScreenState("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o documento.",
          );
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, documentId, user]);

  useEffect(() => {
    if (!accessToken || !user) {
      return;
    }

    const socket = io(COLLABORATION_URL, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket"],
    });

    socketRef.current = socket;
    setSyncState("connecting");

    socket.on("connect", async () => {
      setSyncState("saved");

      try {
        await socket.emitWithAck("document:join", {
          documentId,
        });
      } catch {
        setSyncState("error");
      }
    });

    socket.on("document:snapshot", (snapshot: DocumentRecord) => {
      lastChangeSourceRef.current = "remote";
      hasHydratedRef.current = true;
      setDocument(snapshot);
      setSummaryDraft(snapshot.summary ?? "");
      setCategoryDraft(snapshot.category ?? "");
    });

    socket.on(
      "document:updated",
      (payload: {
        title?: string;
        blocks: DocumentBlock[];
        updatedAt?: string;
      }) => {
        lastChangeSourceRef.current = "remote";
        setDocument((current) =>
          current
            ? {
                ...current,
                title: payload.title ?? current.title,
                blocks: payload.blocks,
                updatedAt: payload.updatedAt ?? current.updatedAt,
              }
            : current,
        );
      },
    );

    socket.on("presence:update", (members: Collaborator[]) => {
      setPresence(members);
    });

    socket.on("disconnect", () => {
      setSyncState("connecting");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, documentId, user]);

  useEffect(() => {
    if (
      !document ||
      !socketRef.current ||
      !socketRef.current.connected ||
      !hasHydratedRef.current ||
      lastChangeSourceRef.current !== "local"
    ) {
      return;
    }

    setSyncState("syncing");

    const timeout = window.setTimeout(async () => {
      try {
        await socketRef.current?.emitWithAck("document:sync", {
          documentId,
          title: document.title,
          blocks: document.blocks,
        });
        setSyncState("saved");
      } catch {
        setSyncState("error");
      } finally {
        lastChangeSourceRef.current = null;
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [document, documentId]);

  const reloadDocument = async () => {
    const response = await authenticatedFetch<DocumentRecord>(`/documents/${documentId}`);
    lastChangeSourceRef.current = "remote";
    setDocument(response);
    setSummaryDraft(response.summary ?? "");
    setCategoryDraft(response.category ?? "");
  };

  const applyLocalDocumentUpdate = (
    updater: (current: DocumentRecord) => DocumentRecord,
  ) => {
    setDocument((current) => {
      if (!current) {
        return current;
      }

      lastChangeSourceRef.current = "local";
      return updater(current);
    });
  };

  const updateBlock = (blockId: string, nextValue: Partial<DocumentBlock>) => {
    applyLocalDocumentUpdate((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, ...nextValue } : block,
      ),
    }));
  };

  const removeBlock = (blockId: string) => {
    applyLocalDocumentUpdate((current) => {
      const nextBlocks = current.blocks.filter((block) => block.id !== blockId);

      return {
        ...current,
        blocks: nextBlocks.length > 0 ? nextBlocks : [createBlock()],
      };
    });
  };

  const addBlockAfter = (blockId?: string, type: DocumentBlock["type"] = "PARAGRAPH") => {
    applyLocalDocumentUpdate((current) => {
      const block = createBlock(type);

      if (!blockId) {
        return {
          ...current,
          blocks: [...current.blocks, block],
        };
      }

      const index = current.blocks.findIndex((item) => item.id === blockId);

      if (index < 0) {
        return {
          ...current,
          blocks: [...current.blocks, block],
        };
      }

      return {
        ...current,
        blocks: [
          ...current.blocks.slice(0, index + 1),
          block,
          ...current.blocks.slice(index + 1),
        ],
      };
    });
  };

  const handleUpload = async (file: File) => {
    if (!accessToken || !document) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentId", document.id);

      const upload = await apiRequest<{
        id: string;
        url: string;
        filename: string;
        mimeType: string;
        size: number;
        createdAt: string;
      }>(
        "/uploads",
        {
          method: "POST",
          body: formData,
        },
        accessToken,
      );

      applyLocalDocumentUpdate((current) => ({
        ...current,
        uploads: [...(current.uploads ?? []), upload],
        blocks: [
          ...current.blocks,
          {
            id: crypto.randomUUID(),
            type: "IMAGE",
            content: upload.url,
            metadata: {
              filename: upload.filename,
            },
          },
        ],
      }));
      toast.success("Upload concluído.", "O arquivo já foi anexado ao documento.");
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Não foi possível enviar o arquivo.");
      setErrorMessage(nextMessage);
      toast.error("Falha no upload.", nextMessage);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      return;
    }

    try {
      const nextDocument = await authenticatedFetch<DocumentRecord>(
        `/documents/${documentId}/share`,
        {
          method: "POST",
          body: JSON.stringify({
            email: shareEmail.trim(),
          }),
        },
      );

      lastChangeSourceRef.current = "remote";
      setDocument(nextDocument);
      setShareEmail("");
      setShareMessage("Acesso compartilhado com sucesso.");
      toast.success("Documento compartilhado.", "O colaborador já recebeu acesso.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível compartilhar o documento.",
      );
      setShareMessage(nextMessage);
      toast.error("Falha ao compartilhar.", nextMessage);
    }
  };

  const handleGenerate = async () => {
    if (!document || !aiPrompt.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await authenticatedFetch<{
        plan: { summary: string };
        blocks: DocumentBlock[];
      }>("/ai/assist", {
        method: "POST",
        body: JSON.stringify({
          action: "outline",
          documentTitle: document.title,
          instruction: aiPrompt.trim(),
          tone: aiTone.trim(),
          blocks: document.blocks,
        }),
      });

      setAiSummary(response.plan.summary);

      applyLocalDocumentUpdate((current) => ({
        ...current,
        blocks: [...current.blocks, ...response.blocks],
      }));
      toast.success("Estrutura gerada com IA.", "Os novos blocos foram inseridos no canvas.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível gerar conteúdo com a IA.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha na IA.", nextMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMetadataSave = async (status?: DocumentStatus) => {
    if (!document) {
      return;
    }

    setIsSavingMeta(true);

    try {
      const nextDocument = await authenticatedFetch<DocumentRecord>(`/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          summary: summaryDraft,
          category: categoryDraft,
          status: status ?? document.status,
        }),
      });

      setDocument(nextDocument);
      setErrorMessage(null);
      toast.success("Metadados salvos.", "Resumo, categoria e status foram atualizados.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível salvar os metadados do documento.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao salvar metadados.", nextMessage);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim()) {
      return;
    }

    try {
      await authenticatedFetch(`/documents/${documentId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: commentInput.trim(),
        }),
      });
      setCommentInput("");
      await reloadDocument();
      toast.success("Comentário adicionado.", "A revisão do documento foi atualizada.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível adicionar comentário.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao comentar.", nextMessage);
    }
  };

  const handleRequestApproval = async () => {
    try {
      await authenticatedFetch(`/documents/${documentId}/approvals`, {
        method: "POST",
        body: JSON.stringify({
          notes: approvalNotes,
        }),
      });
      await reloadDocument();
      toast.success("Aprovação solicitada.", "O fluxo de revisão foi iniciado.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível solicitar aprovação.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao solicitar aprovação.", nextMessage);
    }
  };

  const handleReviewApproval = async (approvalId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await authenticatedFetch(`/documents/${documentId}/approvals/${approvalId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewNotes:
            status === "APPROVED"
              ? "Aprovado para uso em operação real."
              : "Precisa de ajustes antes de liberar para o time.",
        }),
      });
      await reloadDocument();
      toast.success(
        status === "APPROVED" ? "Documento aprovado." : "Documento rejeitado.",
        "O status da aprovação foi atualizado.",
      );
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível revisar a aprovação.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha na revisão.", nextMessage);
    }
  };

  const handleCreatePublicShare = async () => {
    try {
      await authenticatedFetch(`/documents/${documentId}/public-share`, {
        method: "POST",
        body: JSON.stringify({
          title: document?.title,
          allowComments: false,
        }),
      });
      await reloadDocument();
      toast.success("Link público criado.", "O endereço de compartilhamento já está disponível.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível criar o link público.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao criar link público.", nextMessage);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await authenticatedFetch(`/documents/${documentId}/public-share/${shareId}`, {
        method: "DELETE",
      });
      await reloadDocument();
      toast.success("Link revogado.", "O compartilhamento público foi encerrado.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível revogar o link público.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao revogar link.", nextMessage);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      await authenticatedFetch(`/documents/${documentId}/versions/${versionId}/restore`, {
        method: "POST",
      });
      await reloadDocument();
      toast.success("Versão restaurada.", "O snapshot escolhido voltou a ser o atual.");
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível restaurar esta versão.",
      );
      setErrorMessage(nextMessage);
      toast.error("Falha ao restaurar versão.", nextMessage);
    }
  };

  const activeShare = document?.publicShares?.[0] ?? null;
  const publicShareUrl =
    activeShare && typeof window !== "undefined"
      ? `${window.location.origin}/shared/${activeShare.token}`
      : null;

  if (screenState === "loading" || loading) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="surface flex items-center gap-3 rounded-[20px] px-5 py-4 text-sm text-[var(--muted)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando ambiente de documento...
          </div>
        </div>
      </div>
    );
  }

  if (screenState === "error" || !document) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="surface rounded-[24px] p-8 text-center">
            <p className="tech-label text-[10px] text-[var(--muted)]">Documento indisponível</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Não foi possível abrir este documento.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{errorMessage}</p>
            <button className="pill-button mt-6" onClick={() => router.push("/dashboard")}>
              Voltar ao dashboard
            </button>
          </section>
        </div>
      </div>
    );
  }

  const headingEntries = document.blocks.filter(
    (block) => block.type === "HEADING" && block.content.trim().length > 0,
  );
  const outlineEntries =
    headingEntries.length > 0 ? headingEntries : document.blocks.slice(0, Math.min(6, document.blocks.length));
  const totalTodos = document.blocks.filter((block) => block.type === "TODO").length;
  const completedTodos = document.blocks.filter(
    (block) => block.type === "TODO" && getTodoChecked(block),
  ).length;
  const comments = document.comments ?? [];
  const approvals = document.approvals ?? [];
  const uploads = document.uploads ?? [];
  const versions = document.versions ?? [];
  const collaborators = document.collaborators ?? [];
  const liveEditors = presence.length > 0 ? presence : collaborators;

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="surface rounded-[24px] p-5 md:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="icon-button"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="eyebrow">Document Studio</span>
                <span className="status-chip" data-tone={getStatusTone(document.status)}>
                  {formatDocumentStatus(document.status)}
                </span>
                <span className="status-chip" data-tone={getSyncTone(syncState)}>
                  {getSyncCopy(syncState)}
                </span>
              </div>

              <div>
                <p className="tech-label text-[10px] text-[var(--muted)]">
                  {document.workspaceName ?? "Workspace"}
                </p>
                <input
                  className="mt-3 w-full bg-transparent text-[clamp(2.3rem,4vw,4.1rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--foreground)] outline-none"
                  value={document.title}
                  onChange={(event) =>
                    applyLocalDocumentUpdate((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Atualizado em {formatDateTime(document.updatedAt)}
                  {document.lastEditedBy
                    ? ` por ${document.lastEditedBy.name ?? document.lastEditedBy.email}`
                    : ""}
                </p>
              </div>

              <textarea
                className="field-control min-h-[112px] rounded-[16px] px-4 py-4 text-sm leading-7 text-[var(--foreground)]"
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                placeholder="Descreva o objetivo, o contexto e o impacto deste documento."
              />
            </div>

            <div className="w-full xl:max-w-[430px]">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Blocos", `${document.blocks.length}`],
                  ["Tarefas", totalTodos > 0 ? `${completedTodos}/${totalTodos}` : "0"],
                  ["Comentários", `${comments.length}`],
                  ["Aprovações", `${approvals.length}`],
                ].map(([label, value]) => (
                  <article key={label} className="metric-card">
                    <p className="tech-label text-[10px] text-[var(--muted)]">{label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                      {value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="surface-inset mt-4 rounded-[18px] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="tech-label text-[10px] text-[var(--muted)]">Equipe ativa</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                      {liveEditors.length > 0
                        ? liveEditors.map((person) => person.name || person.email).join(", ")
                        : "Nenhum colaborador conectado no momento."}
                    </p>
                  </div>
                  <div className="flex -space-x-2">
                    {liveEditors.slice(0, 4).map((person) => (
                      <div
                        key={person.id}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-[var(--accent-4)] text-xs font-semibold text-[var(--foreground)]"
                      >
                        {getInitials(person.name, person.email)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="pill-button"
                    type="button"
                    onClick={() => void handleMetadataSave()}
                    disabled={isSavingMeta}
                  >
                    {isSavingMeta ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Salvando
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salvar documento
                      </>
                    )}
                  </button>
                  <button className="outline-button" type="button" onClick={() => void handleGenerate()}>
                    <Sparkles className="h-4 w-4" />
                    Assistir com IA
                  </button>
                </div>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-[16px] border border-[rgba(194,65,87,0.18)] bg-[rgba(194,65,87,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </div>
          ) : null}
        </header>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <section className="surface rounded-[22px] p-5">
              <p className="tech-label text-[10px] text-[var(--muted)]">Controle</p>
              <div className="mt-4 grid gap-4">
                <div className="subtle-card p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {document.workspaceName ?? "Workspace atual"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Última publicação interna em {formatDateTime(document.updatedAt)}.
                  </p>
                </div>

                <label className="grid gap-2 text-sm text-[var(--muted)]">
                  Categoria
                  <input
                    className="field-control px-4 py-3 text-sm"
                    placeholder="Ex.: Onboarding, CS, Financeiro"
                    value={categoryDraft}
                    onChange={(event) => setCategoryDraft(event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm text-[var(--muted)]">
                  Status
                  <select
                    className="field-control px-4 py-3 text-sm"
                    value={document.status ?? "DRAFT"}
                    onChange={(event) =>
                      void handleMetadataSave(event.target.value as DocumentStatus)
                    }
                  >
                    {["DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED"].map((status) => (
                      <option key={status} value={status}>
                        {formatDocumentStatus(status as DocumentStatus)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="subtle-card p-4">
                    <p className="tech-label text-[10px] text-[var(--muted)]">Resumo</p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {summaryDraft.trim() ? "Preenchido" : "Pendente"}
                    </p>
                  </div>
                  <div className="subtle-card p-4">
                    <p className="tech-label text-[10px] text-[var(--muted)]">Categoria atual</p>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {formatCategoryLabel(categoryDraft)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Estrutura</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Navegue pelas seções do documento.
                  </p>
                </div>
                <span className="status-chip">{outlineEntries.length} entradas</span>
              </div>

              <div className="mt-4 space-y-2">
                {outlineEntries.map((block, index) => (
                  <a
                    key={block.id}
                    href={`#block-${block.id}`}
                    className="block rounded-[14px] border border-[var(--stroke)] bg-[var(--panel-soft)] px-3 py-3 transition hover:border-[rgba(37,99,235,0.16)] hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {block.content.trim() || `Seção ${index + 1}`}
                      </p>
                      <span className="tech-label text-[10px] text-[var(--muted)]">
                        {BLOCK_LABELS[block.type]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                      {getBlockPreview(block)}
                    </p>
                  </a>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {BLOCK_OPTIONS.slice(0, 4).map((option) => (
                  <button
                    key={option.value}
                    className="outline-button px-3 py-2 text-xs"
                    type="button"
                    onClick={() => addBlockAfter(undefined, option.value)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Arquivos</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    Materiais visuais e anexos operacionais.
                  </p>
                </div>
                <Upload className="h-4 w-4 text-[var(--accent)]" />
              </div>

              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--stroke-strong)] bg-[var(--panel-soft)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                <Upload className="h-4 w-4" />
                Enviar imagem ou arquivo
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void handleUpload(file);
                    }
                  }}
                />
              </label>

              <div className="mt-4 space-y-2">
                {uploads.length === 0 ? (
                  <div className="subtle-card p-4 text-sm text-[var(--muted)]">
                    Nenhum arquivo foi anexado ainda.
                  </div>
                ) : (
                  uploads.map((upload) => (
                    <a
                      key={upload.id}
                      href={upload.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[14px] border border-[var(--stroke)] bg-white px-4 py-3 transition hover:border-[rgba(37,99,235,0.18)]"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {upload.filename}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatFileSize(upload.size)} · {formatDateTime(upload.createdAt)}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className="surface rounded-[24px] p-4 md:p-6">
            <div className="flex flex-col gap-4 border-b border-[var(--stroke)] pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="tech-label text-[10px] text-[var(--muted)]">Canvas</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  Editor principal
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  O conteúdo fica no centro, com estrutura clara para edição, revisão e publicação.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {BLOCK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className="outline-button px-3 py-2 text-xs"
                    type="button"
                    onClick={() => addBlockAfter(undefined, option.value)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-[var(--stroke)] bg-white px-5 py-6 md:px-8 md:py-8">
              {document.blocks.map((block) => {
                const todoChecked = block.type === "TODO" && getTodoChecked(block);

                return (
                  <article
                    key={block.id}
                    id={`block-${block.id}`}
                    className="group grid gap-4 border-b border-[var(--stroke)] py-6 first:pt-0 last:border-none last:pb-0 md:grid-cols-[120px_minmax(0,1fr)_84px]"
                  >
                    <div className="pt-1">
                      <p className="tech-label text-[10px] text-[var(--muted)]">
                        {BLOCK_LABELS[block.type]}
                      </p>
                    </div>

                    <div className="min-w-0">
                      {block.type === "IMAGE" ? (
                        <div className="space-y-4">
                          {block.content ? (
                            <Image
                              src={block.content}
                              alt="Asset do documento"
                              width={1400}
                              height={900}
                              unoptimized
                              className="max-h-[360px] w-full rounded-[18px] border border-[var(--stroke)] object-cover"
                            />
                          ) : null}
                          <input
                            className="field-control px-4 py-3 text-sm"
                            placeholder={BLOCK_PLACEHOLDERS.IMAGE}
                            value={block.content}
                            onChange={(event) =>
                              updateBlock(block.id, {
                                content: event.target.value,
                              })
                            }
                          />
                        </div>
                      ) : block.type === "TODO" ? (
                        <label className="flex items-start gap-3">
                          <input
                            checked={todoChecked}
                            className="mt-1 h-5 w-5 rounded border-[var(--stroke)]"
                            type="checkbox"
                            onChange={(event) =>
                              updateBlock(block.id, {
                                metadata: {
                                  ...(block.metadata || {}),
                                  checked: event.target.checked,
                                },
                              })
                            }
                          />
                          <textarea
                            className={cn(
                              "w-full resize-none border-none bg-transparent text-base leading-8 text-[var(--foreground)] outline-none",
                              todoChecked && "text-[var(--muted)] line-through",
                            )}
                            value={block.content}
                            rows={1}
                            placeholder={BLOCK_PLACEHOLDERS.TODO}
                            onChange={(event) =>
                              updateBlock(block.id, {
                                content: event.target.value,
                              })
                            }
                            onInput={(event) => autoresize(event.currentTarget)}
                          />
                        </label>
                      ) : (
                        <textarea
                          className={cn(
                            "w-full resize-none border-none bg-transparent outline-none",
                            block.type === "HEADING" &&
                              "text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)]",
                            block.type === "QUOTE" &&
                              "border-l-4 border-[var(--accent)] pl-5 text-xl italic leading-8 text-[var(--foreground)]",
                            block.type === "CALLOUT" &&
                              "rounded-[16px] bg-[var(--panel-soft)] p-4 text-base leading-8 text-[var(--foreground)]",
                            block.type === "BULLET" &&
                              "text-base leading-8 text-[var(--foreground)]",
                            block.type === "PARAGRAPH" &&
                              "text-base leading-8 text-[var(--foreground)]",
                          )}
                          value={block.type === "BULLET" ? `• ${block.content}` : block.content}
                          rows={1}
                          placeholder={BLOCK_PLACEHOLDERS[block.type]}
                          onChange={(event) =>
                            updateBlock(block.id, {
                              content:
                                block.type === "BULLET"
                                  ? event.target.value.replace(/^•\s*/, "")
                                  : event.target.value,
                            })
                          }
                          onInput={(event) => autoresize(event.currentTarget)}
                        />
                      )}
                    </div>

                    <div className="flex flex-row items-start justify-end gap-2 md:flex-col md:opacity-0 md:transition md:group-hover:opacity-100">
                      <select
                        className="field-control field-control-auto rounded-[10px] px-3 py-2 text-sm"
                        value={block.type}
                        onChange={(event) =>
                          updateBlock(block.id, {
                            type: event.target.value as DocumentBlock["type"],
                            metadata:
                              event.target.value === "TODO"
                                ? { checked: false }
                                : block.metadata,
                          })
                        }
                      >
                        {BLOCK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => addBlockAfter(block.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => removeBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}

              <button
                className="outline-button mt-8"
                type="button"
                onClick={() => addBlockAfter(undefined)}
              >
                <Plus className="h-4 w-4" />
                Adicionar bloco ao final
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Assistente</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Estruture o próximo draft
                  </p>
                </div>
              </div>

              <textarea
                className="field-control mt-4 min-h-[132px] rounded-[16px] px-4 py-4 text-sm leading-7"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
              />
              <input
                className="field-control mt-3 px-4 py-3 text-sm"
                value={aiTone}
                onChange={(event) => setAiTone(event.target.value)}
                placeholder="Tom da escrita"
              />

              <button
                className="pill-button mt-4 w-full justify-center"
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Gerando blocos...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Inserir sugestão
                  </>
                )}
              </button>

              {aiSummary ? (
                <div className="subtle-card mt-4 p-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Check className="h-4 w-4" />
                    Plano sugerido
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{aiSummary}</p>
                </div>
              ) : null}
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Colaboração</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Pessoas com acesso
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {collaborators.length === 0 ? (
                  <div className="subtle-card w-full p-4 text-sm text-[var(--muted)]">
                    Só você tem acesso por enquanto.
                  </div>
                ) : (
                  collaborators.map((person) => (
                    <span
                      key={person.id}
                      className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1 text-sm text-[var(--foreground)]"
                    >
                      {person.name ?? person.email} · {formatEnumLabel(person.role)}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className="field-control rounded-[10px] px-4 py-3 text-sm"
                  placeholder="Convidar por e-mail"
                  value={shareEmail}
                  onChange={(event) => setShareEmail(event.target.value)}
                />
                <button className="icon-button" type="button" onClick={() => void handleShare()}>
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {shareMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{shareMessage}</p> : null}
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-2)]" />
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Revisão</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Aprovação e liberação
                  </p>
                </div>
              </div>

              <textarea
                className="field-control mt-4 min-h-[112px] rounded-[16px] px-4 py-4 text-sm leading-7"
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
              />
              <button
                className="pill-button mt-4 w-full justify-center"
                onClick={() => void handleRequestApproval()}
              >
                Solicitar aprovação
              </button>

              <div className="mt-4 space-y-3">
                {approvals.length === 0 ? (
                  <div className="subtle-card p-4 text-sm text-[var(--muted)]">
                    Nenhuma aprovação foi registrada ainda.
                  </div>
                ) : (
                  approvals.map((approval) => (
                    <div key={approval.id} className="subtle-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="status-chip"
                          data-tone={
                            approval.status === "APPROVED"
                              ? "positive"
                              : approval.status === "REJECTED"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {formatApprovalStatus(approval.status)}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {formatDateTime(approval.createdAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                        {approval.notes}
                      </p>
                      {approval.status === "PENDING" ? (
                        <div className="mt-3 flex gap-2">
                          <button
                            className="outline-button"
                            type="button"
                            onClick={() => void handleReviewApproval(approval.id, "APPROVED")}
                          >
                            Aprovar
                          </button>
                          <button
                            className="outline-button"
                            type="button"
                            onClick={() => void handleReviewApproval(approval.id, "REJECTED")}
                          >
                            Rejeitar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Feedback</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Comentários do time
                  </p>
                </div>
              </div>

              <textarea
                className="field-control mt-4 min-h-[110px] rounded-[16px] px-4 py-4 text-sm leading-7"
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Registre um ajuste, risco ou observação."
              />
              <button className="pill-button mt-4 w-full justify-center" onClick={() => void handleAddComment()}>
                Adicionar comentário
              </button>

              <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                  <div className="subtle-card p-4 text-sm text-[var(--muted)]">
                    Ainda não existem comentários neste documento.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="subtle-card p-4">
                      <p className="text-sm leading-7 text-[var(--foreground)]">{comment.content}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {comment.author.name ?? comment.author.email} ·{" "}
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Distribuição</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Compartilhamento público
                  </p>
                </div>
              </div>

              {activeShare && publicShareUrl ? (
                <div className="subtle-card mt-4 p-4">
                  <p className="text-sm leading-7 text-[var(--foreground)]">{publicShareUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="outline-button" href={publicShareUrl} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Link>
                    <button
                      className="outline-button"
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(publicShareUrl);
                        toast.success("Link copiado.", "O endereço foi enviado para a área de transferência.");
                      }}
                    >
                      Copiar
                    </button>
                    <button
                      className="outline-button"
                      type="button"
                      onClick={() => void handleRevokeShare(activeShare.id)}
                    >
                      Revogar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="pill-button mt-4 w-full justify-center"
                  type="button"
                  onClick={() => void handleCreatePublicShare()}
                >
                  Criar link público
                </button>
              )}
            </section>

            <section className="surface rounded-[22px] p-5">
              <div className="flex items-center gap-3">
                <FileClock className="h-5 w-5 text-[var(--accent-2)]" />
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">Versões</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Histórico restaurável
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {versions.length === 0 ? (
                  <div className="subtle-card p-4 text-sm text-[var(--muted)]">
                    Nenhum snapshot disponível ainda.
                  </div>
                ) : (
                  versions.map((version) => (
                    <div key={version.id} className="subtle-card p-4">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {version.label || "Snapshot"}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {version.createdBy.name ?? version.createdBy.email} ·{" "}
                        {formatDateTime(version.createdAt)}
                      </p>
                      <button
                        className="outline-button mt-3"
                        type="button"
                        onClick={() => void handleRestoreVersion(version.id)}
                      >
                        Restaurar versão
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
