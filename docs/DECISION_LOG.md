# DHub — Decision Log

Apenas **decisões confirmadas**. Propostas, hipóteses e dúvidas → docs de workflow/`OPEN_QUESTIONS.md`.

| ID | Data | Decisão | Implicações |
|----|------|---------|-------------|
| D01 | 2026-08-06 | Nome do sistema: **DHub** | Branding, docs, repositório |
| D02 | 2026-08-06 | Lojista cadastrado **uma única vez** por organização | Sem duplicar lojista por operadora; critério de chave de negócio em Q17 |
| D03 | 2026-08-06 | Um consultor pode possuir **vários** lojistas | Modelo 1:N consultant→merchants |
| D04 | 2026-08-06 | Um lojista pode possuir **vários** contratos | Não implica unique por operadora (Q01) |
| D05 | 2026-08-06 | **Contrato separado de recarga** | Tabelas, status, históricos e regras distintos |
| D06 | 2026-08-06 | Lojista **sem acesso** no MVP | Sem role/login de lojista |
| D07 | 2026-08-06 | **Base única** (não 15 módulos = 15 planilhas) | Configuração + domínio unificado |
| D08 | 2026-08-06 | Regras de operadoras **configuráveis** | Campos, documentos, planos, prazos, pendências em dados |
| D09 | 2026-08-06 | Integrações **somente após** o fluxo interno | Dropbox, n8n, Suri/WhatsApp pós-núcleo |
| D10 | 2026-08-06 | Uso planejado de **Supabase** (Postgres, Auth, RLS) | Sprint 2+ |
| D11 | 2026-08-06 | Uso futuro de **n8n, Dropbox e Suri** | Sprints 9–11 |
| D12 | 2026-08-06 | Operadoras iniciais: LeCard, Pluxee, Ticket, VR, ValeCard | Seeds de configuração (não tabelas físicas separadas) |
| D13 | 2026-08-06 | Fluxo oficial: Consultor → Lojista → Contrato por operadora → Conferência → Recargas | Base de todos os docs |
| D14 | 2026-08-06 | Perfis MVP: admin, operator, consultant | Membership + RLS |
| D15 | 2026-08-06 | Autorização **não só no frontend**; RLS no banco | Sprint 2 |
| D16 | 2026-08-06 | Stack frontend: React, TS, Vite, Tailwind, shadcn/ui, RHF, Zod, TanStack Query, Router; deploy Vercel | Sprint 1+ |
| D17 | 2026-08-06 | Toda entidade operacional pertence a uma **organização** | Multi-tenant |
| D18 | 2026-08-06 | Toda alteração relevante gera **histórico e auditoria** | History operacional + `audit_logs` (trilhas distintas) |
| D19 | 2026-08-06 | Consultor **não acessa** dados de outro consultor | Predicado RLS de ownership |
| D20 | 2026-08-06 | Não criar tabela separada por operadora | `operators` + config |
| D21 | 2026-08-06 | Sprint 0/0.1 apenas documentação; sem app/SQL/commit | Restrições da sprint |
| D22 | 2026-08-06 | **Não** adotar constraint exclusiva rígida `merchant_id + operator_id` nesta etapa | Unicidade/renovação/planos permanecem em Q01; sem SQL |
| D23 | 2026-08-06 | Proposta consolidada de estados de contrato **sem** `submitted` (envio → `awaiting_review`) | Ver `CONTRACT_WORKFLOW.md`; ajustes futuros após levantamento (Q14, Q15) |
| D24 | 2026-08-06 | Proposta consolidada: `processed` = processada/registrada; `completed` = ciclo administrativo finalizado com comprovante/encerramento | Ver `RECHARGE_WORKFLOW.md`; validação operacional Q07/Q10 |
| D25 | 2026-08-06 | Permissões de trilha: admin acessa auditoria técnica + históricos; operador acessa históricos operacionais necessários, **sem** auditoria técnica completa nem eventos de segurança/admin; consultor só históricos autorizados do próprio escopo, **sem** auditoria técnica | Ver `AUTHORIZATION_AND_RLS.md` |
| D26 | 2026-08-06 | Frontend usa somente publishable key; nunca service_role/sb_secret/senha/connection string no client | `src/lib/supabase.ts` |
| D27 | 2026-08-06 | Sem cadastro público; bootstrap do primeiro admin via Auth Dashboard + SQL revisado | `docs/SUPABASE_SETUP.md` |
| D28 | 2026-08-06 | Papel e org vêm de `organization_members` no banco (não de metadata/localStorage) | AuthProvider + RLS |
| D29 | 2026-08-06 | Lista de membros na UI é somente leitura nesta sprint; alteração de papel via RPC fica para depois | `/configuracoes/usuarios` |
| D30 | 2026-08-06 | `consultants` ≠ `organization_members`; vínculo Auth opcional via `user_id` | Sprint 3 |
| D31 | 2026-08-06 | Mesma organização consultor↔lojista garantida por FK composta `(consultant_id, organization_id)` | Migration `20260806130000` |
| D32 | 2026-08-06 | Sem unique rígido de documento de lojista nesta sprint; aviso de possível duplicidade na UI | Q17 |
| D33 | 2026-08-06 | Consultant: lojistas só próprios; sem troca de `consultant_id`; sem UPDATE em consultores nesta sprint | RLS Sprint 3 |
| D34 | 2026-10-07 | Consultor pode atender **várias regiões/cidades** | N:N `consultant_regions`; ver `REGIONS_DOCUMENTS_AND_ACTIONS.md` |
| D35 | 2026-10-07 | Consultor pode atender **várias bandeiras** (operadoras) | N:N `consultant_operators` |
| D36 | 2026-10-07 | Contratos assinados (PDF/imagem) navegáveis por **região → consultor → bandeira → mês** | Pastas derivadas dos dados (proposta); critério do mês em Q21; região do contrato em Q26 |
| D37 | 2026-10-07 | Módulo **Operações e Ações** no escopo: ações de bandeira com viagens e despesas (passagens, aluguel de carro, combustível, recarga de cartões, contas) | Responde Q09 |
| D38 | 2026-10-07 | Somente **admin (gerente)** cria/gerencia ações e despesas | RLS `is_org_admin`; operator e consultant sem acesso (Q22) |
| D39 | 2026-10-07 | Existem **cartão combustível/frota** e **cartão corporativo pré-pago** | Tipos de despesa distintos; cadastro de cartões em Q23 |
| D40 | 2026-10-07 | Sprint 3 endurecida antes do push: `current_active_organization_id()` retorna null com 0 ou várias memberships (sem `LIMIT 1` arbitrário nem exceção em RLS); vínculo `user_id` só admin (inclusive INSERT) e só para membro ativo; `created_by`/`created_at` forçados no INSERT; documento preserva letras (CNPJ alfanumérico) | Migration `20260806130000` aplicada |
| D41 | 2026-10-07 | Bandeiras e regiões são **configuração**: escrita só admin; leitura para membros ativos. Vínculos consultor↔bandeira/região geridos por admin/operator | Sprint 4; `OPERATORS_AND_REGIONS.md` |
| D42 | 2026-10-07 | Planos, campos, tipos de documento e motivos de pendência movidos para a sprint de contratos | `IMPLEMENTATION_PLAN.md` |
| D43 | 2026-10-07 | Sprint Operações e Ações antecipada (antes de contratos), pois não depende deles | `OPERATIONS_AND_ACTIONS.md` |
| D44 | 2026-10-07 | Tipos de despesa são catálogo configurável por organização (seeds iniciais), não enum fixo | `expense_types` |
| D45 | 2026-10-07 | Ações e despesas sem DELETE (cancelamento por status); participantes e comprovantes podem ser removidos pelo admin | RLS + grants |
| D46 | 2026-10-07 | Comprovantes em bucket privado `action-receipts`, caminho `{org}/actions/{action}/…`, acesso por URL assinada de 60 s; limites provisórios 10 MB e PDF/JPEG/PNG/WEBP | Q27 |
| D47 | 2026-10-07 | Forma de pagamento da despesa é texto livre com sugestões (sem cadastro de cartões por enquanto) | Q23 |
| D48 | 2026-10-07 | Mês da pasta do contrato = mês da **data de assinatura** | Responde Q21; data de assinatura obrigatória para arquivar na pasta |
| D49 | 2026-10-07 | Região do contrato vem do **endereço do lojista** (automático), não escolhida no contrato | Responde Q26 |
| D50 | 2026-10-07 | Região = **estado (UF)**. Região do contrato = região cuja UF é a do endereço do lojista | Responde Q25; na sprint de contratos: no máximo uma região ativa por UF na org e UF do lojista obrigatória para arquivar |
| D51 | 2026-10-07 | Estados atendidos: BA, CE, DF, MA, PA, PE, PR, RJ, RN, RS, SC, SP (seed); outros entram pela tela quando aparecerem. PI já existia e foi mantido | Migration `20261007140000_seed_regions.sql` |

## Classificação (obrigatória nos docs)

| Tipo | Onde fica |
|------|-----------|
| Decisão confirmada | Este arquivo |
| Proposta arquitetural | Workflows, DB proposal, RLS (rotuladas) |
| Hipótese | Explicitamente marcada; não vira regra |
| Questão aberta | `OPEN_QUESTIONS.md` |
