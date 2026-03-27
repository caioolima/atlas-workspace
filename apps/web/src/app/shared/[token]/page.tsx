"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  formatCategoryLabel,
  formatDateTime,
  formatDocumentStatus,
  normalizePtBrCopy,
} from "@/lib/utils";
import type { PublicDocumentPayload } from "@/types";

function renderBlock(block: PublicDocumentPayload["document"]["blocks"][number]) {
  switch (block.type) {
    case "HEADING":
      return (
        <h2 className="font-display text-4xl tracking-[-0.04em] text-[var(--foreground)]">
          {normalizePtBrCopy(block.content)}
        </h2>
      );
    case "TODO":
      return (
        <p className="text-base leading-8 text-[var(--foreground)]">
          [ ] {normalizePtBrCopy(block.content)}
        </p>
      );
    case "QUOTE":
      return (
        <blockquote className="border-l-4 border-[var(--accent)] pl-4 text-lg italic text-[var(--foreground)]">
          {normalizePtBrCopy(block.content)}
        </blockquote>
      );
    case "CALLOUT":
      return (
        <div className="subtle-card px-4 py-4 text-base text-[var(--foreground)]">
          {normalizePtBrCopy(block.content)}
        </div>
      );
    default:
      return (
        <p className="text-base leading-8 text-[var(--foreground)]">
          {normalizePtBrCopy(block.content)}
        </p>
      );
  }
}

export default function SharedDocumentPage() {
  const params = useParams<{ token: string }>();
  const [payload, setPayload] = useState<PublicDocumentPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      try {
        const response = await apiRequest<PublicDocumentPayload>(
          `/public-shares/${params.token}`,
        );

        if (!cancelled) {
          setPayload(response);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível abrir este compartilhamento.",
          );
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (!payload && !message) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[var(--muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Abrindo compartilhamento...
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface rounded-[32px] p-6 text-center text-[var(--muted)]">
          {message}
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="surface rounded-[36px] p-8">
          <p className="tech-label text-[11px] text-[var(--muted)]">
            Compartilhado por {payload.document.workspace.name}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)]">
            {payload.share.title ?? payload.document.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
            {normalizePtBrCopy(payload.document.summary)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <span className="status-chip">{formatCategoryLabel(payload.document.category)}</span>
            <span className="status-chip">{formatDocumentStatus(payload.document.status)}</span>
            <span className="status-chip">
              Compartilhado em {formatDateTime(payload.share.createdAt)}
            </span>
          </div>
        </section>

        <section className="surface rounded-[36px] p-8">
          <div className="space-y-5">
            {payload.document.blocks.map((block) => (
              <div key={block.id}>{renderBlock(block)}</div>
            ))}
          </div>
        </section>

        <section className="surface rounded-[36px] p-8">
          <p className="tech-label text-[11px] text-[var(--muted)]">Comentários recentes</p>
          <div className="mt-4 grid gap-3">
            {payload.document.comments.map((comment) => (
              <div key={comment.id} className="subtle-card px-4 py-4">
                <p className="text-sm text-[var(--foreground)]">
                  {normalizePtBrCopy(comment.content)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {comment.author.name ?? comment.author.email}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
