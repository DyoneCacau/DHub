# DHub — Plano de Implementação

Uma sprint por vez. Não implementar fora da sprint atual.

## Replanejamento (2026-10-07)

A Sprint 3 executada foi **Consultores e lojistas** (originalmente Sprint 4). Novos requisitos: regiões, consultor com várias bandeiras/regiões, pastas de contratos por região → consultor → bandeira → mês e módulo **Operações e Ações** (D34–D39; `REGIONS_DOCUMENTS_AND_ACTIONS.md`).

Ordem proposta a partir daqui (seções abaixo mantêm a numeração original como referência de escopo):

| Ordem | Sprint | Escopo | Seção original |
|-------|--------|--------|----------------|
| 3 | Consultores e lojistas | Concluída (migration aplicada, commit `54ce166`) | Sprint 4 |
| 4 | Bandeiras e regiões | `operators` (seeds), `regions`, `consultant_regions`, `consultant_operators`; ver `OPERATORS_AND_REGIONS.md` | Sprint 3 (parcial) + novo |
| 5 | Contratos e documentos | Planos, campos, tipos de documento, motivos de pendência (D42); contratos, anexos em storage privado, navegação por pastas (região → consultor → bandeira → mês) | Sprint 3 (restante) + Sprint 5 + novo |
| 6 | Operações e Ações | Ações, participantes, despesas, comprovantes; só admin. Pode ser antecipada (não depende de contratos) | novo |
| 7+ | Conferência, recargas, dashboard, integrações, produção | Sem mudança de escopo | Sprints 6–12 |

### Sprint (nova) — Operações e Ações

| Item | Conteúdo |
|------|----------|
| Objetivo | Controlar ações de bandeira e as despesas de viagem/operação |
| Escopo | `actions`, `action_participants`, `expense_types`, `action_expenses`, `expense_attachments`; aba só admin; totais previsto × realizado |
| Entregáveis | CRUD com cancelamento (sem DELETE); upload privado de comprovantes; RLS admin; auditoria |
| Dependências | Consultores; bandeiras e regiões |
| Riscos | Regras de aprovação/reembolso e cartões não confirmadas (Q22–Q24, Q28) |
| Critérios de aceite | Operator/consultant sem acesso no banco; comprovantes privados; lint/typecheck/build OK |
| Fora de escopo | Integração bancária/cartões; reembolso automático; relatórios financeiros avançados |

---

## Sprint 0 — Documentação e arquitetura

| Item | Conteúdo |
|------|----------|
| Objetivo | Documentação técnica, funcional e arquitetural inicial |
| Escopo | Pasta `docs/` e regras de contexto; modelagem e workflows em texto |
| Entregáveis | Arquivos listados na Sprint 0 |
| Dependências | Contexto confirmado do negócio |
| Riscos | Ambiguidades de domínio sem resposta |
| Critérios de aceite | Docs criados; dúvidas em OPEN_QUESTIONS; sem código/app |
| Fora de escopo | React, deps, SQL, integrações, commit |

---

## Sprint 1 — Fundação frontend

| Item | Conteúdo |
|------|----------|
| Objetivo | Scaffold da aplicação web |
| Escopo | Vite + React + TS estrito, Tailwind, shadcn/ui, Router, layout base, lint/format |
| Entregáveis | App inicial, rotas placeholder, design system base |
| Dependências | Sprint 0 |
| Riscos | Over-engineering de UI antes do domínio |
| Critérios de aceite | lint, typecheck, build OK; app sobe localmente |
| Fora de escopo | Auth real, Supabase, CRUD de negócio |

---

## Sprint 2 — Supabase, autenticação e autorização

| Item | Conteúdo |
|------|----------|
| Objetivo | Base de dados, Auth e RLS |
| Escopo | Projeto Supabase; tabelas fundação (orgs, profiles, members); login; policies iniciais |
| Entregáveis | Migrations iniciais; login; guards de rota; testes RLS básicos |
| Dependências | Sprint 1 |
| Riscos | Policies incorretas; vazamento cross-tenant |
| Critérios de aceite | Login; isolamento org; consultant isolation smoke tests |
| Fora de escopo | Contratos/recargas completos; integrações |

---

## Sprint 3 — Configuração de operadoras

| Item | Conteúdo |
|------|----------|
| Objetivo | Catálogo configurável de operadoras e planos |
| Escopo | CRUD admin: operators, plans, field_definitions, document_types, pendency_reasons e vínculos |
| Entregáveis | Telas admin de configuração; validação Zod |
| Dependências | Sprint 2 |
| Riscos | Inventar campos/docs obrigatórios reais |
| Critérios de aceite | Admin configura sem deploy; operator sem acesso crítico |
| Fora de escopo | Preencher catálogo real sem confirmação; n8n |

---

## Sprint 4 — Consultores e lojistas

| Item | Conteúdo |
|------|----------|
| Objetivo | Cadastros centrais do domínio |
| Escopo | Consultants, merchants, histórico de consultor; isolamento consultor |
| Entregáveis | CRUD; unicidade de lojista por org (critério confirmado); RLS |
| Dependências | Sprint 2–3 |
| Riscos | Critério de deduplicação indefinido |
| Critérios de aceite | Lojista único; consultor só vê os seus |
| Fora de escopo | Login do lojista; despesas de consultor (se não confirmado) |

---

## Sprint 5 — Contratos e documentos

| Item | Conteúdo |
|------|----------|
| Objetivo | Ciclo de contrato + anexos |
| Escopo | Contracts, field values, documents, status history; storage privado |
| Entregáveis | Criação/edição/envio; upload; máquina de estados inicial |
| Dependências | Sprint 3–4 |
| Riscos | Estados redundantes; storage inseguro |
| Critérios de aceite | Fluxo draft→awaiting_review→conferência; docs privados |
| Fora de escopo | Recargas; Dropbox |

---

## Sprint 6 — Conferência e pendências

| Item | Conteúdo |
|------|----------|
| Objetivo | Operação do escritório sobre contratos |
| Escopo | Reviews, pendencies, correções, notificações in-app básicas |
| Entregáveis | Filas de conferência; abrir/resolver pendência; reenvio |
| Dependências | Sprint 5 |
| Riscos | Prazos sem regra confirmada |
| Critérios de aceite | Pendência notifica consultor; histórico registrado |
| Fora de escopo | WhatsApp; SLAs inventados |

---

## Sprint 7 — Recargas

| Item | Conteúdo |
|------|----------|
| Objetivo | Movimentações no contrato |
| Escopo | Recharges, status history, receipts; workflows separados |
| Entregáveis | Solicitação, processamento, comprovantes, completed |
| Dependências | Sprint 5–6 |
| Riscos | Distinção processed vs completed sujeita a validação operacional (Q07/Q10) |
| Critérios de aceite | Recarga só no contrato; RLS; histórico próprio |
| Fora de escopo | Automação operadora; n8n |

---

## Sprint 8 — Dashboard e relatórios

| Item | Conteúdo |
|------|----------|
| Objetivo | Visão operacional e indicadores |
| Escopo | Dashboards por perfil; listagens paginadas; filtros |
| Entregáveis | Painéis consultor/escritório; export simples se confirmado |
| Dependências | Sprint 5–7 |
| Riscos | Relatórios espelharem planilhas 1:1 |
| Critérios de aceite | Métricas básicas com isolamento correto |
| Fora de escopo | BI externo; 15 módulos de planilha |

---

## Sprint 9 — Integração com Dropbox

| Item | Conteúdo |
|------|----------|
| Objetivo | Sincronizar/arquivar documentos no Dropbox |
| Escopo | OAuth/app key, pastas por org, outbox `integration_events` |
| Entregáveis | Upload/sync confiável; logs; idempotência |
| Dependências | Sprint 5+; fluxo interno estável |
| Riscos | Estrutura de pastas; duplicidade |
| Critérios de aceite | Arquivo no DHub refletido no Dropbox sem vazar tenant |
| Fora de escopo | Migrar histórico completo sem plano |

---

## Sprint 10 — Automações com n8n

| Item | Conteúdo |
|------|----------|
| Objetivo | Orquestrar automações sobre eventos |
| Escopo | Webhooks/eventos; workflows n8n; retries |
| Entregáveis | Pipelines acordados; dead-letter |
| Dependências | Sprint 9 ou eventos internos estáveis |
| Riscos | Lógica de negócio só no n8n |
| Critérios de aceite | Falha não corrompe estado interno |
| Fora de escopo | Substituir RLS/core no n8n |

---

## Sprint 11 — Integração Suri e WhatsApp

| Item | Conteúdo |
|------|----------|
| Objetivo | Comunicação operacional nos canais atuais |
| Escopo | Suri/WhatsApp para notificações/roteamento acordado |
| Entregáveis | Templates; opt-in; logs; idempotência |
| Dependências | Notificações internas; sprints de integração |
| Riscos | LGPD; múltiplos números; spam |
| Critérios de aceite | Mensagens só no escopo autorizado; auditáveis |
| Fora de escopo | Chat completo substituindo o DHub |

---

## Sprint 12 — Segurança, testes e produção

| Item | Conteúdo |
|------|----------|
| Objetivo | Endurecimento e go-live |
| Escopo | Revisar RLS, LGPD operacional, backups, monitoramento, testes E2E, Vercel prod |
| Entregáveis | Checklist prod; runbooks; cobertura mínima |
| Dependências | Sprints anteriores relevantes ao MVP |
| Riscos | Dados sensíveis; incidentes |
| Critérios de aceite | Checklist segurança; backup/restore testado; build/lint/typecheck OK |
| Fora de escopo | Novas features de domínio |

---

## Observações

- Integrações somente após fluxo interno (decisão confirmada).
- Ao final de cada sprint de código: lint, typecheck, build; listar arquivos; sem commit/push sem autorização.
