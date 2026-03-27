import Link from "next/link";
import { Check, CreditCard, ShieldCheck } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "R$ 0",
    description: "Para times pequenos começarem a centralizar documentos e fluxos.",
    features: ["1 workspace", "Templates base", "Editor com IA", "Link público"],
  },
  {
    name: "Team",
    price: "R$ 79",
    description: "Para colaboração contínua com aprovações, histórico e operação recorrente.",
    features: [
      "Colaboração em tempo real",
      "Aprovações e histórico",
      "Portal do cliente",
      "Análises e atividade",
    ],
  },
  {
    name: "Scale",
    price: "R$ 199",
    description: "Para operações com mais clientes, equipes maiores e bibliotecas avançadas.",
    features: [
      "Mais clientes e documentos",
      "Bibliotecas por operação",
      "Permissões avançadas",
      "Maior capacidade de uploads",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="px-4 py-5 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="surface rounded-[30px] p-8 md:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <p className="tech-label text-[10px] text-[var(--muted)]">Planos</p>
              <h1 className="mt-3 text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--foreground)]">
                Assinaturas pensadas para diferentes estágios de operação.
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted)]">
                A cobrança acompanha o uso do workspace com upgrade simples, portal do
                cliente e visibilidade do plano atual dentro da plataforma.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link className="pill-button w-full" href="/dashboard">
                Abrir workspace
              </Link>
              <Link className="outline-button w-full" href="/login">
                Acessar conta
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={[
                "surface rounded-[26px] p-6",
                index === 1 ? "ring-1 ring-[rgba(86,120,104,0.12)]" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="tech-label text-[10px] text-[var(--muted)]">{plan.name}</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    {plan.price}
                  </h2>
                </div>
                {index === 1 ? (
                  <span className="status-chip" data-tone="positive">
                    Mais usado
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{plan.description}</p>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="subtle-card flex items-center gap-3 px-4 py-3 text-sm text-[var(--foreground)]">
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                    {feature}
                  </div>
                ))}
              </div>

              <Link className="pill-button mt-6 w-full" href="/dashboard">
                Escolher plano
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="surface rounded-[26px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(86,120,104,0.1)] text-[var(--accent)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="tech-label text-[10px] text-[var(--muted)]">Cobrança</p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  Upgrade e autogestão da assinatura
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                "Entrada simples com plano inicial.",
                "Tier principal para colaboração do time.",
                "Evolução natural para operações mais complexas.",
                "Portal do cliente dentro do fluxo do produto.",
              ].map((item) => (
                <div key={item} className="subtle-card p-4 text-sm leading-7 text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="surface rounded-[26px] p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <p className="tech-label text-[10px] text-[var(--muted)]">Assinatura</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">
              O plano atual, o caminho de upgrade e a gestão da cobrança fazem parte
              da experiência central da plataforma.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
