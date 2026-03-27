"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage } from "@/lib/utils";

const loginPalette = {
  "--login-bg": "#f4efe6",
  "--login-panel": "#fbf8f2",
  "--login-panel-soft": "#f1eadf",
  "--login-line": "#d9cfbe",
  "--login-text": "#2b312a",
  "--login-muted": "#70766e",
  "--login-olive": "#7b8972",
  "--login-olive-strong": "#55624f",
  "--login-warm-soft": "#e8dac5",
  "--login-shadow": "0 24px 60px rgba(85, 98, 79, 0.12)",
} as CSSProperties;

export default function LoginPage() {
  const router = useRouter();
  const { loading, login, register, startGoogleLogin, user } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "login") {
        await login({
          email: form.email,
          password: form.password,
        });
        toast.success("Login realizado.", "Seu workspace já está pronto para uso.");
      } else {
        await register(form);
        toast.success("Conta criada.", "Seu acesso foi liberado com sucesso.");
      }

      router.replace("/dashboard");
    } catch (error) {
      const nextMessage = getErrorMessage(error, "Não foi possível autenticar.");
      setMessage(nextMessage);
      toast.error("Falha na autenticação.", nextMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[var(--login-bg)] px-4 py-8 text-[var(--login-text)] md:px-6"
      style={loginPalette}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <section
          className="w-full rounded-[24px] border border-[var(--login-line)] bg-[var(--login-panel)] p-6 md:p-8"
          style={{ boxShadow: "var(--login-shadow)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] text-[var(--login-olive-strong)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-[-0.03em] text-[var(--login-text)]">
                  Atlas
                </p>
                <p className="text-xs text-[var(--login-muted)]">Acesso</p>
              </div>
            </div>

            <Link
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[var(--login-line)] bg-[var(--login-panel)] px-3 py-2 text-sm font-medium text-[var(--login-text)] transition hover:border-[var(--login-olive)]"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>

          <div className="mt-8">
            <p className="tech-label text-[10px] text-[var(--login-muted)]">Conta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--login-text)]">
              {mode === "login" ? "Entrar na conta" : "Criar conta"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--login-muted)]">
              {mode === "login"
                ? "Use seu e-mail e senha para acessar o workspace."
                : "Crie seu acesso para entrar na plataforma."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-[16px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] p-1">
            <button
              className={
                mode === "login"
                  ? "rounded-[12px] bg-[var(--login-olive-strong)] px-4 py-3 text-sm font-semibold text-white"
                  : "rounded-[12px] px-4 py-3 text-sm font-medium text-[var(--login-muted)] transition hover:text-[var(--login-text)]"
              }
              type="button"
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={
                mode === "register"
                  ? "rounded-[12px] bg-[var(--login-olive-strong)] px-4 py-3 text-sm font-semibold text-white"
                  : "rounded-[12px] px-4 py-3 text-sm font-medium text-[var(--login-muted)] transition hover:text-[var(--login-text)]"
              }
              type="button"
              onClick={() => setMode("register")}
            >
              Cadastro
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className="grid gap-2 text-sm text-[var(--login-muted)]">
                Nome
                <input
                  className="w-full rounded-[14px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] px-4 py-3.5 text-sm text-[var(--login-text)] outline-none transition focus:border-[var(--login-olive)] focus:ring-4 focus:ring-[rgba(123,137,114,0.12)]"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm text-[var(--login-muted)]">
              E-mail
              <input
                className="w-full rounded-[14px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] px-4 py-3.5 text-sm text-[var(--login-text)] outline-none transition focus:border-[var(--login-olive)] focus:ring-4 focus:ring-[rgba(123,137,114,0.12)]"
                placeholder="voce@empresa.com"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                />
            </label>

            <label className="grid gap-2 text-sm text-[var(--login-muted)]">
              Senha
              <input
                className="w-full rounded-[14px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] px-4 py-3.5 text-sm text-[var(--login-text)] outline-none transition focus:border-[var(--login-olive)] focus:ring-4 focus:ring-[rgba(123,137,114,0.12)]"
                placeholder="Sua senha"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>

            {message ? (
              <div className="rounded-[16px] border border-[rgba(194,65,87,0.18)] bg-[rgba(194,65,87,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                {message}
              </div>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--login-olive-strong)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--login-olive)]"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : mode === "login" ? (
                <>
                  Continuar com e-mail
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-[var(--login-muted)]">
            <span className="h-px flex-1 bg-[var(--login-line)]" />
            ou
            <span className="h-px flex-1 bg-[var(--login-line)]" />
          </div>

          <button
            className="inline-flex w-full items-center justify-center rounded-[14px] border border-[var(--login-line)] bg-[var(--login-panel-soft)] px-5 py-3.5 text-sm font-medium text-[var(--login-text)] transition hover:border-[var(--login-olive)]"
            onClick={startGoogleLogin}
            type="button"
          >
            Continuar com Google
          </button>
        </section>
      </div>
    </main>
  );
}
