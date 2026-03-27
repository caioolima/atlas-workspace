"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage } from "@/lib/utils";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setSessionFromTokens } = useAuth();
  const toast = useToast();
  const [{ accessToken, refreshToken }] = useState(() => {
    if (typeof window === "undefined") {
      return {
        accessToken: null as string | null,
        refreshToken: null as string | null,
      };
    }

    const params = new URLSearchParams(window.location.search);

    return {
      accessToken: params.get("accessToken"),
      refreshToken: params.get("refreshToken"),
    };
  });
  const hasTokens = Boolean(accessToken && refreshToken);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    void setSessionFromTokens({
      accessToken,
      refreshToken,
    })
      .then(() => {
        toast.success("Login com Google concluído.", "Redirecionando para o dashboard.");
        router.replace("/dashboard");
      })
      .catch((error) => {
        const nextMessage = getErrorMessage(
          error,
          "Falha ao concluir o login com Google.",
        );
        setMessage(nextMessage);
        toast.error("Falha no Google OAuth.", nextMessage);
      });
  }, [accessToken, refreshToken, router, setSessionFromTokens, toast]);

  const displayMessage = hasTokens
    ? message ?? "Finalizando autenticação com Google..."
    : "Os tokens de autenticação não chegaram corretamente.";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="surface flex max-w-xl items-center gap-4 rounded-[32px] px-6 py-5 text-sm text-[var(--foreground)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent)]" />
        {displayMessage}
      </div>
    </main>
  );
}
