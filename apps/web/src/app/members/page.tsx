"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, LoaderCircle } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  formatDateTime,
  formatDisplayEmail,
  formatDisplayName,
  formatWorkspaceRole,
  getErrorMessage,
  getInitials,
  normalizePtBrCopy,
} from "@/lib/utils";
import type { WorkspaceInviteRecord, WorkspaceMemberRecord, WorkspaceRole } from "@/types";

function MembersContent({ workspaceId }: { workspaceId: string | null }) {
  const { authenticatedFetch } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [invites, setInvites] = useState<WorkspaceInviteRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: "advisor@atlas.dev",
    role: "VIEWER",
    title: "Advisor",
  });

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    setLoading(true);

    try {
      const response = await authenticatedFetch<{
        members: WorkspaceMemberRecord[];
        invites: WorkspaceInviteRecord[];
      }>(`/workspaces/${workspaceId}/members`);
      setMembers(response.members);
      setInvites(response.invites);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível carregar os membros.",
      );
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, workspaceId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!workspaceId) {
      return;
    }

    try {
      await authenticatedFetch(`/workspaces/${workspaceId}/invites`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Convite enviado com sucesso.");
      toast.success("Convite enviado.", "A lista de membros foi atualizada.");
      await loadMembers();
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível convidar esse membro.",
      );
      setMessage(nextMessage);
      toast.error("Falha ao convidar membro.", nextMessage);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    if (!workspaceId) {
      return;
    }

    try {
      await authenticatedFetch(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast.success("Permissão atualizada.", "O papel do membro foi alterado.");
      await loadMembers();
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível atualizar a permissão.",
      );
      setMessage(nextMessage);
      toast.error("Falha ao atualizar papel.", nextMessage);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!workspaceId) {
      return;
    }

    try {
      await authenticatedFetch(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
      });
      toast.success("Membro removido.", "A governança do workspace foi atualizada.");
      await loadMembers();
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Não foi possível remover o membro.",
      );
      setMessage(nextMessage);
      toast.error("Falha ao remover membro.", nextMessage);
    }
  };

  if (loading) {
    return (
      <div className="surface flex items-center gap-3 rounded-[24px] px-5 py-4 text-sm text-[var(--muted)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Carregando equipe...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="surface rounded-[26px] p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
          <div>
            <p className="tech-label text-[10px] text-[var(--muted)]">Equipe</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              Membros do workspace
            </h2>
          </div>
          <span className="status-chip">{members.length} pessoas</span>
        </div>

        <div className="mt-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="grid gap-4 border-b border-[var(--stroke)] py-5 last:border-none md:grid-cols-[minmax(0,1fr)_180px_120px]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--panel-soft)] text-sm font-semibold text-[var(--foreground)]">
                  {getInitials(member.user.name, member.user.email)}
                </div>
                <div>
                  <p className="text-base font-medium text-[var(--foreground)]">
                    {formatDisplayName(member.user.name, member.user.email)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatDisplayEmail(member.user.email)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {normalizePtBrCopy(member.title) || "Sem cargo definido"}
                  </p>
                </div>
              </div>

              <div>
                <select
                  className="field-control px-4 py-3 text-sm"
                  value={member.role}
                  onChange={(event) => void handleRoleChange(member.id, event.target.value)}
                >
                  {["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"].map((role) => (
                    <option key={role} value={role}>
                      {formatWorkspaceRole(role as WorkspaceRole)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center md:justify-end">
                {member.role !== "OWNER" ? (
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => void handleRemove(member.id)}
                  >
                    Remover
                  </button>
                ) : (
                  <span className="status-chip" data-tone="info">
                    Titular
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface rounded-[26px] p-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--stroke)] pb-5">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Convites</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                Pendências de acesso
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {invites.length === 0 ? (
              <div className="subtle-card p-4 text-sm text-[var(--muted)]">
                Nenhum convite pendente.
              </div>
            ) : (
              invites.map((invite) => (
                <div key={invite.id} className="subtle-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {invite.email}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatWorkspaceRole(invite.role)} · {invite.status}
                      </p>
                    </div>
                    <span className="status-chip">{formatDateTime(invite.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="surface rounded-[26px] p-6">
          <p className="tech-label text-[10px] text-[var(--muted)]">Novo acesso</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm text-[var(--muted)]">
              E-mail
              <input
                className="field-control px-4 py-3 text-sm"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Papel
              <select
                className="field-control px-4 py-3 text-sm"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                {["ADMIN", "MANAGER", "MEMBER", "VIEWER"].map((role) => (
                  <option key={role} value={role}>
                    {formatWorkspaceRole(role as WorkspaceRole)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-[var(--muted)]">
              Cargo
              <input
                className="field-control px-4 py-3 text-sm"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <button className="pill-button" type="button" onClick={handleInvite}>
              <UserPlus className="h-4 w-4" />
              Enviar convite
            </button>
            {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function MembersPage() {
  return (
    <WorkspacePage
      title="Equipe"
      subtitle="Gerencie papéis, convites e acesso de cada pessoa dentro do workspace."
    >
      {({ workspaceId }) => <MembersContent workspaceId={workspaceId} />}
    </WorkspacePage>
  );
}
