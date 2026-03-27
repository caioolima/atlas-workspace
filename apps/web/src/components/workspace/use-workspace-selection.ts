"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import type { WorkspaceCard, WorkspaceListResponse } from "@/types";

const STORAGE_KEY = "playbookos.workspaceId";

export function useWorkspaceSelection(preferredWorkspaceId?: string) {
  const { authenticatedFetch, loading, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceCard[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(
    preferredWorkspaceId ?? null,
  );
  const [screenState, setScreenState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setCurrentWorkspaceId = useCallback((workspaceId: string) => {
    setCurrentWorkspaceIdState(workspaceId);
    window.localStorage.setItem(STORAGE_KEY, workspaceId);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceIdState(null);
      setScreenState("ready");
      return;
    }

    try {
      const response = await authenticatedFetch<WorkspaceListResponse>("/workspaces");
      setWorkspaces(response.items);

      const storedWorkspaceId =
        preferredWorkspaceId ??
        window.localStorage.getItem(STORAGE_KEY) ??
        response.defaultWorkspaceId ??
        response.items[0]?.id ??
        null;

      const nextWorkspaceId = response.items.some(
        (workspace) => workspace.id === storedWorkspaceId,
      )
        ? storedWorkspaceId
        : response.items[0]?.id ?? null;

      setCurrentWorkspaceIdState(nextWorkspaceId);

      if (nextWorkspaceId) {
        window.localStorage.setItem(STORAGE_KEY, nextWorkspaceId);
      }

      setScreenState("ready");
      setErrorMessage(null);
    } catch (error) {
      setScreenState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível carregar os workspaces.",
      );
    }
  }, [authenticatedFetch, preferredWorkspaceId, user]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refreshWorkspaces();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loading, refreshWorkspaces]);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === currentWorkspaceId) ??
      workspaces[0] ??
      null,
    [currentWorkspaceId, workspaces],
  );

  return {
    workspaces,
    currentWorkspace,
    currentWorkspaceId: currentWorkspace?.id ?? null,
    setCurrentWorkspaceId,
    refreshWorkspaces,
    screenState,
    errorMessage,
  };
}
