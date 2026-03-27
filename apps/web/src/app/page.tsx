import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FileText,
  Layers3,
  ShieldCheck,
} from "lucide-react";

const homePalette = {
  "--home-bg": "#f4efe6",
  "--home-panel": "#fbf8f2",
  "--home-panel-soft": "#f1eadf",
  "--home-line": "#d9cfbe",
  "--home-text": "#2b312a",
  "--home-muted": "#70766e",
  "--home-olive": "#7b8972",
  "--home-olive-strong": "#55624f",
  "--home-warm": "#b68a5f",
  "--home-warm-soft": "#e8dbc8",
  "--home-shadow": "0 24px 60px rgba(85, 98, 79, 0.12)",
} as CSSProperties;

const productAreas = [
  {
    icon: FileText,
    title: "Editor preparado para operação",
    description:
      "Documentos, playbooks e materiais internos são criados com estrutura, continuidade e contexto de time.",
  },
  {
    icon: ShieldCheck,
    title: "Revisão dentro do fluxo",
    description:
      "Comentários, aprovações e histórico fazem parte da plataforma, sem depender de processos paralelos.",
  },
  {
    icon: CreditCard,
    title: "Conta e billing integrados",
    description:
      "Plano, uso e cobrança acompanham a jornada da conta na mesma linguagem visual do produto.",
  },
];

const rollout = [
  {
    label: "01",
    title: "Estruture o workspace",
    description: "Defina contexto, equipe, identidade e biblioteca inicial no mesmo ambiente.",
  },
  {
    label: "02",
    title: "Produza conteúdo recorrente",
    description: "Crie materiais operacionais em um editor pensado para uso real do time.",
  },
  {
    label: "03",
    title: "Revise e publique",
    description: "Acompanhe comentários, aprovações e publicação dentro do mesmo fluxo.",
  },
];

const useCases = [
  "Operações e handoffs internos.",
  "Onboarding e documentação de CS.",
  "Materiais de revenue e expansão.",
  "Projetos internos com base documental.",
];

export default function Home() {
  return (
    <main
      className="min-h-screen bg-[var(--home-bg)] text-[var(--home-text)]"
      style={homePalette}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--home-panel)] text-[var(--home-olive-strong)] shadow-[0_10px_24px_rgba(85,98,79,0.08)]">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-[-0.03em]">Atlas</p>
              <p className="text-xs text-[var(--home-muted)]">Operational Workspace</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-[12px] border border-[var(--home-line)] bg-[var(--home-panel)] px-4 py-3 text-sm font-medium transition hover:border-[var(--home-olive)]"
            >
              Planos
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-[12px] border border-[var(--home-line)] bg-[var(--home-panel)] px-4 py-3 text-sm font-medium transition hover:border-[var(--home-olive)]"
            >
              Entrar
            </Link>
          </nav>
        </header>

        <section
          className="mt-8 rounded-[38px] border border-[var(--home-line)] bg-[var(--home-panel)]"
          style={{ boxShadow: "var(--home-shadow)" }}
        >
          <div className="grid gap-10 px-6 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-center">
            <div className="max-w-[620px]">
              <div className="inline-flex items-center rounded-full border border-[var(--home-line)] bg-[var(--home-panel-soft)] px-4 py-2 text-sm text-[var(--home-muted)]">
                Plataforma para documentação, revisão e governança operacional
              </div>

              <h1 className="mt-6 text-[clamp(3rem,5vw,5.25rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
                Documentação, revisão e governança no mesmo workspace.
              </h1>

              <p className="mt-6 max-w-[560px] text-lg leading-8 text-[var(--home-muted)]">
                Atlas organiza conteúdo operacional, biblioteca, equipe e billing em uma
                experiência única, com estrutura clara de produto e leitura mais profissional.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--home-olive-strong)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--home-olive)]"
                  style={{ color: "#fff" }}
                >
                  Entrar na plataforma
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-[14px] border border-[var(--home-line)] bg-[var(--home-panel)] px-5 py-3.5 text-sm font-medium transition hover:border-[var(--home-olive)]"
                >
                  Ver planos
                </Link>
              </div>

              <div className="mt-10 grid gap-4 border-t border-[var(--home-line)] pt-6 sm:grid-cols-3">
                {[
                  ["Workspaces", "06"],
                  ["Documentos", "124"],
                  ["Membros", "32"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--home-muted)]">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--home-line)] bg-[var(--home-panel-soft)] p-4">
              <div className="overflow-hidden rounded-[24px] border border-[var(--home-line)] bg-[var(--home-panel)]">
                <div className="flex items-center justify-between border-b border-[var(--home-line)] px-5 py-4">
                  <div>
                    <p className="text-sm font-medium">Workspace Atlas Central</p>
                    <p className="mt-1 text-xs text-[var(--home-muted)]">
                      Biblioteca, revisão e operação no mesmo ambiente
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--home-warm-soft)] px-3 py-1 text-xs text-[var(--home-olive-strong)]">
                    Team plan
                  </span>
                </div>

                <div className="grid gap-0 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <aside className="border-b border-[var(--home-line)] px-4 py-4 lg:border-b-0 lg:border-r">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--home-muted)]">
                      Navegação
                    </p>
                    <div className="mt-4 space-y-2">
                      {["Resumo", "Biblioteca", "Equipe", "Análises", "Billing"].map(
                        (item, index) => (
                          <div
                            key={item}
                            className={[
                              "rounded-[12px] px-3 py-2 text-sm",
                              index === 0
                                ? "bg-[var(--home-olive-strong)] text-white"
                                : "text-[var(--home-muted)]",
                            ].join(" ")}
                          >
                            {item}
                          </div>
                        ),
                      )}
                    </div>
                  </aside>

                  <div className="px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["24", "Ativos"],
                        ["09", "Revisão"],
                        ["14", "Links"],
                      ].map(([value, label]) => (
                        <div
                          key={label}
                          className="rounded-[16px] border border-[var(--home-line)] bg-[var(--home-panel-soft)] px-4 py-4"
                        >
                          <p className="text-2xl font-semibold tracking-[-0.05em]">{value}</p>
                          <p className="mt-1 text-sm text-[var(--home-muted)]">{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--home-line)] bg-[var(--home-panel)]">
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_110px] border-b border-[var(--home-line)] bg-[var(--home-panel-soft)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--home-muted)]">
                        <span>Documento</span>
                        <span>Status</span>
                        <span>Tempo</span>
                      </div>
                      {[
                        ["Onboarding enterprise", "Revisão", "12 min"],
                        ["Renovação anual", "Aprovado", "34 min"],
                        ["Implantação CS", "Rascunho", "1 h"],
                      ].map(([title, status, time]) => (
                        <div
                          key={title}
                          className="grid grid-cols-[minmax(0,1fr)_110px_110px] border-t border-[var(--home-line)] px-4 py-3 text-sm"
                        >
                          <span>{title}</span>
                          <span className="text-[var(--home-muted)]">{status}</span>
                          <span className="text-[var(--home-muted)]">{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {productAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-[28px] border border-[var(--home-line)] bg-[var(--home-panel)] px-6 py-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--home-panel-soft)] text-[var(--home-olive-strong)]">
                <area.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{area.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--home-muted)]">
                {area.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[32px] border border-[var(--home-line)] bg-[var(--home-panel)] px-6 py-7 md:px-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--home-muted)]">Fluxo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              Um caminho claro para adoção do produto
            </h2>

            <div className="mt-6 space-y-6">
              {rollout.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-4 border-b border-[var(--home-line)] pb-6 last:border-none last:pb-0 md:grid-cols-[68px_minmax(0,1fr)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--home-line)] text-sm font-semibold">
                    {item.label}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--home-muted)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[32px] border border-[var(--home-line)] bg-[var(--home-panel-soft)] px-6 py-7">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--home-muted)]">
              Casos de uso
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Equipes que dependem de operação bem organizada
            </h2>

            <div className="mt-6 space-y-3">
              {useCases.map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-[var(--home-line)] bg-[var(--home-panel)] px-4 py-4 text-sm leading-7"
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-10 rounded-[34px] border border-[var(--home-line)] bg-[var(--home-olive-strong)] px-6 py-8 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--home-warm-soft)]">
                Próximo passo
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--home-panel)]">
                Entre, configure o workspace e comece a operar em uma interface coerente.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--home-warm-soft)]">
                Corrigi a proporção da hero, encurtei a headline e removi os elementos que estavam
                destruindo a leitura da primeira dobra.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-[14px] bg-[var(--home-panel)] px-5 py-3.5 text-sm font-semibold text-[var(--home-text)] transition hover:bg-[var(--home-panel-soft)]"
              >
                Abrir plataforma
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-[14px] border border-[var(--home-warm-soft)] px-5 py-3.5 text-sm font-medium !text-white transition hover:bg-[var(--home-olive)] hover:!text-white"
              >
                Ver planos
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-[14px] border border-[var(--home-warm-soft)] px-5 py-3.5 text-sm font-medium !text-white transition hover:bg-[var(--home-olive)] hover:!text-white"
              >
                Acessar conta
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
