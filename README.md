# DHub

Plataforma operacional da **Prime Service** para contratos e recargas de vouchers.

## Contexto

A Prime Service trabalha com contratos e recargas junto às operadoras LeCard, Pluxee, Ticket, VR e ValeCard. O DHub centraliza o fluxo operacional atualmente disperso em planilhas, WhatsApp e Dropbox.

## Modelo principal

```text
Consultor → Lojista → Contrato por operadora → Conferência → Recargas
```

Contrato e recarga são entidades distintas.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router + TanStack Query
- React Hook Form + Zod
- **Supabase Auth + PostgreSQL (RLS)** — Sprint 2
- Lucide React, ESLint, Prettier

## Ambiente

1. Copie `.env.example` para `.env.local`
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (nunca commitar `.env.local`)
3. Aplique migrations quando autorizado (ver `docs/SUPABASE_SETUP.md`)
4. Execute o bootstrap do primeiro admin (SQL revisado)

```bash
npm install
npm run dev
```

Detalhes: [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) · testes RLS: [`docs/RLS_TEST_PLAN.md`](./docs/RLS_TEST_PLAN.md)

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck de projeto + build de produção |
| `npm run typecheck` | Verificação TypeScript (`tsc --noEmit -p tsconfig.app.json`) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview do build |
| `npm run format` | Prettier |

## Estrutura

```text
src/
  app/              # bootstrap, providers
  components/       # layout, shared, ui
  config/           # env, navegação
  features/         # auth, consultants, merchants
  lib/              # supabase client, normalize, utils
  pages/
  routes/
  types/
supabase/
  migrations/       # SQL versionado (não aplicado remotamente sem autorização)
  bootstrap/        # exemplo de primeiro admin
docs/
```

## Rotas

| Rota | Acesso |
|------|--------|
| `/login`, `/esqueci-senha` | Público |
| `/redefinir-senha` | Sessão de recovery |
| `/dashboard` | Membership ativa |
| `/consultores`, `/consultores/:id`, formulários | Admin / Operator |
| `/lojistas`, `/lojistas/:id`, formulários | Membership ativa (RLS por papel) |
| `/configuracoes`, `/configuracoes/usuarios`, `/operadoras` | Admin |
| `/relatorios` | Admin / Operator |
| `/conta` | Membership ativa |
| `/acesso-negado` | Autenticado com papel insuficiente |

## Estado atual

- Sprint 1: fundação visual
- Sprint 2: Auth + org + membership + RLS
- Sprint 3: Consultores + lojistas (CRUD, RLS, auditoria) — migration **local** até autorização
- Sem contratos/recargas/operadoras configuráveis
- Sem `service_role` no frontend

## Limitações

- Migration Sprint 3 ainda não aplicada no remoto até autorização
- Sem unique rígido de documento de lojista (Q17)
- Múltiplas memberships ativas bloqueiam helpers de org até seletor existir
- Lista de usuários é somente leitura

## Próximas sprints

4. Operadoras/planos (ou conforme plano revisado) · contratos · recargas · integrações

Documentação: [`docs/`](./docs) · consultores/lojistas: [`docs/CONSULTANTS_AND_MERCHANTS.md`](./docs/CONSULTANTS_AND_MERCHANTS.md).
