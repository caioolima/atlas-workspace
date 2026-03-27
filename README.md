# Atlas Workspace

Plataforma SaaS para documentação operacional, colaboração em tempo real e fluxos de revisão.

## Visão Geral

Este projeto é um monorepo com:

- `apps/web`: aplicação web em Next.js
- `apps/api`: API em NestJS com Prisma, autenticação JWT, uploads, billing e colaboração em tempo real

O produto reúne editor de documentos, biblioteca de templates, membros, analytics, billing, onboarding e compartilhamento público.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- NestJS 11
- Prisma
- PostgreSQL
- Socket.IO
- Stripe

## Funcionalidades

- Autenticação com e-mail/senha e Google OAuth
- Editor colaborativo com blocos e sincronização em tempo real
- Comentários, aprovações e histórico de versões
- Uploads e compartilhamento público de documentos
- Gestão de workspaces, membros e templates
- Billing e planos integrados à plataforma

## Estrutura

```text
.
├── apps
│   ├── api
│   └── web
├── package.json
└── docker-compose.yml
```

## Como Rodar

Instale as dependências:

```bash
npm install
```

Rode web e API juntas:

```bash
npm run dev
```

Ou rode separadamente:

```bash
npm run dev:web
npm run dev:api
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

## Observações

- Arquivos de ambiente e artefatos de build não entram no repositório.
- O projeto já possui `README` específicos em `apps/web` e `apps/api` para detalhes de cada app.
