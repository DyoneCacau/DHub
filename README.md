# DHub

Plataforma operacional da **Prime Service** para contratos e recargas de vouchers.

## Contexto

A Prime Service trabalha com contratos e recargas junto às operadoras LeCard, Pluxee, Ticket, VR e ValeCard. O DHub centraliza o fluxo operacional atualmente disperso em planilhas, WhatsApp e Dropbox.

## Modelo principal

```text
Consultor → Lojista → Contrato por operadora → Conferência → Recargas
```

Contrato e recarga são entidades distintas.

## Stack (Sprint 1)

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- React Router
- TanStack Query
- React Hook Form + Zod
- Lucide React
- ESLint + Prettier

## Pré-requisitos

- Node.js 20+ (recomendado)
- npm 10+

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck de projeto + build de produção |
| `npm run typecheck` | Verificação TypeScript (`tsc --noEmit -p tsconfig.app.json`) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview do build |
| `npm run format` | Prettier |

> `typecheck` usa `-p tsconfig.app.json` porque o `tsconfig.json` raiz é composto por project references (`tsc -b` no build).

## Estrutura

```text
src/
  app/           # App, providers, query client
  components/    # layout, shared, ui
  config/        # navegação e dados demonstrativos
  lib/           # utilitários (cn)
  pages/         # páginas estruturais
  routes/        # definição de rotas
  styles/        # CSS global / tokens
  types/         # tipos mínimos locais
```

## Rotas

| Rota | Descrição |
|------|-----------|
| `/login` | Interface de login (sem auth real) |
| `/dashboard` | Indicadores estruturais |
| `/consultores` | Lista estrutural |
| `/lojistas` | Lista estrutural |
| `/lojistas/:merchantId` | Detalhe com abas |
| `/contratos` | Lista estrutural |
| `/contratos/:contractId` | Detalhe estrutural |
| `/recargas` | Lista estrutural |
| `/operadoras` | LeCard, Pluxee, Ticket, VR, ValeCard (local) |
| `/relatorios` | Estrutura sem gráficos |
| `/configuracoes` | Seções visuais + integrações futuras |
| `/acesso-negado` | Página estrutural |
| `*` | 404 |

## Estado atual (Sprint 1)

- Fundação frontend na raiz do repositório
- Layout administrativo responsivo
- Navegação desktop/mobile
- Páginas estruturais e estados vazios
- Validação local do formulário de login

## Limitações da Sprint 1

- **Supabase não está conectado**
- Sem autenticação real, sessão ou RLS
- Sem CRUD, migrations, SQL ou buckets
- Sem upload e sem integrações (Dropbox, n8n, Suri, WhatsApp)
- **Não existem dados reais** (sem CPF/CNPJ reais)
- Operadoras são configuração local demonstrativa

## Próximas sprints

1. ~~Documentação~~ / ~~Fundação frontend~~
2. Supabase, autenticação e autorização
3. Configuração de operadoras
4. Consultores e lojistas
5. Contratos e documentos
6. Conferência e pendências
7. Recargas
8. Dashboard e relatórios
9–11. Integrações
12. Segurança, testes e produção

Documentação arquitetural: pasta [`docs/`](./docs).
