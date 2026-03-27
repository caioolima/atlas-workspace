# Atlas Workspace

Plataforma SaaS para documentacao operacional, colaboracao em tempo real e governanca de conteudo em workspaces compartilhados. O produto concentra edicao, biblioteca, membros, aprovacoes e billing em um unico ambiente.

## Visao Geral

O projeto foi estruturado como um monorepo com interface web em Next.js e API em NestJS, apoiado por PostgreSQL, Prisma, Socket.IO e Stripe.

Na pratica, a plataforma combina:

- editor de documentos com colaboracao em tempo real
- biblioteca de documentos e templates
- gestao de workspaces e membros
- compartilhamento publico por link
- analytics operacionais e onboarding
- billing e planos integrados ao produto

## Principais Funcionalidades

- autenticacao com e-mail e senha
- Google OAuth para acesso social
- editor colaborativo com blocos e sincronizacao em tempo real
- comentarios, revisoes e historico de versoes
- criacao e reutilizacao de templates
- upload de arquivos e anexos
- compartilhamento publico de documentos
- workspaces com membros, permissoes e configuracoes
- painel de billing com integracao Stripe
- camada opcional de recursos de IA no backend

## Stack

### Frontend

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript
- Socket.IO Client
- Lucide React

### Backend

- NestJS 11
- Prisma ORM
- PostgreSQL
- Socket.IO
- Stripe
- Passport JWT
- Google OAuth 2.0

## Arquitetura

```text
.
├── apps
│   ├── api
│   └── web
├── package.json
├── docker-compose.yml
└── README.md
```

Os modulos centrais da API incluem:

- `auth`: login, JWT e Google OAuth
- `documents`: editor, metadados e historico
- `collaboration`: sincronizacao em tempo real
- `templates`: estruturas reutilizaveis
- `workspaces`: organizacao por conta e membros
- `public-shares`: compartilhamento externo
- `uploads`: anexos e arquivos
- `billing`: integracao com planos e Stripe
- `ai`: camada de recursos assistidos por modelo

## Fluxos Principais

### Workspace

- cria ou acessa um workspace
- organiza documentos e templates
- convida membros
- acompanha atividade e analytics

### Documentacao

- cria documentos a partir do zero ou de templates
- edita em colaboracao com sincronizacao em tempo real
- revisa, comenta e compartilha por link publico

### Operacao

- acompanha onboarding, membros e configuracoes
- gerencia billing e plano ativo
- usa os modulos do produto sem depender de varias ferramentas isoladas

## Execucao Local

### Requisitos

- Node.js 20+
- npm
- Docker e Docker Compose

### 1. Instale as dependencias

```bash
npm install
```

### 2. Suba o PostgreSQL

```bash
docker-compose up -d
```

Banco local:

- host: `localhost`
- porta: `5432`
- database: `notion_ai`
- user: `notion`
- password: `notion`

### 3. Configure as variaveis de ambiente

Copie os exemplos existentes:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Variaveis de integracao como Google OAuth, Anthropic e Stripe podem permanecer vazias durante o setup inicial se esses fluxos nao forem utilizados localmente.

### 4. Prepare o banco

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Inicie a aplicacao

```bash
npm run dev
```

Ou rode separadamente:

```bash
npm run dev:web
npm run dev:api
```

Enderecos locais:

- frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000/api](http://localhost:4000/api)

## Scripts Uteis

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

## Observacoes

- os arquivos `.env.example` de `apps/api` e `apps/web` ja cobrem o setup base do projeto
- Google OAuth, Stripe e recursos de IA dependem de credenciais validas para uso completo

## Roadmap Tecnico

- adicionar testes automatizados para fluxos criticos
- documentar contratos principais da API
- ampliar a camada de analytics e auditoria
- refinar permissao por workspace e papeis
- fortalecer pipeline de CI para lint, build e validacoes

## Licenca

Projeto disponibilizado para demonstracao tecnica.
