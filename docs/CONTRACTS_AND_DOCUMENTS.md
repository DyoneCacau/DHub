# DHub — Contratos e documentos

Sprint 6. Migration `supabase/migrations/20261007160000_contracts_documents.sql` (rollback de referência em `supabase/rollback/20261007160000_rollback_contracts_documents.sql.example`). Decisões D55–D61.

## Problema

Hoje o consultor fecha o contrato com o lojista, fotografa o contrato assinado e envia por um dos 4–5 WhatsApps do escritório (um por bandeira). Os arquivos acabam em pastas dentro de pastas e o controle fica em planilhas. Não há rastreio de quem recebeu, quando, o que faltou e o que foi corrigido.

## Fluxo da fase 1 (somente escritório — D55)

1. **Canal**: o admin cadastra os canais de recebimento em *Contratos → Canais* (ex.: "WhatsApp VR"), com a bandeira padrão de cada um (D56).
2. **Receber contrato** (`/contratos/receber`): quem atende o WhatsApp escolhe o canal (a bandeira é pré-preenchida), o consultor, o lojista, a data de assinatura e a data/hora em que chegou, e anexa as fotos/PDFs (arrastar e soltar, vários arquivos).
   - O sistema avisa se algum arquivo já foi recebido antes (mesmo conteúdo, via SHA-256) e se o lojista já tem contrato em aberto com a mesma bandeira.
   - Consultor e região são derivados do cadastro do lojista (D57).
3. **Fila** (`/contratos/fila`): contratos aguardando conferência ou corrigidos, mais antigos primeiro; idade em vermelho a partir de 3 dias. Aba *Pendentes* lista os que aguardam correção do consultor.
4. **Conferência** (detalhe do contrato): abrir pendências (com sugestões de motivo), aprovar, rejeitar, cancelar.
   - Abrir pendência move o contrato para *Pendente de correção*.
   - Quando o consultor manda a correção, o escritório registra uma **nova remessa** do tipo *Correção*; o contrato vai para *Corrigido* e volta à fila.
   - Aprovar exige todas as pendências resolvidas/canceladas.
5. **Pastas** (`/contratos`): navegação Estado → Consultor → Bandeira → Mês da assinatura (D36, D48–D50), com contadores de total, em conferência e pendentes. As pastas são derivadas dos dados; nada é movido manualmente.

## Tabelas

| Tabela | Papel |
|--------|-------|
| `intake_channels` | Canais de recebimento (WhatsApp/e-mail/presencial/outro), com bandeira padrão opcional |
| `contracts` | Contrato lojista ↔ bandeira. `consultant_id` e `region_id` são snapshot do lojista; `reference_month` = mês de `signed_on` |
| `contract_status_history` | Histórico append-only de mudanças de status (quem, quando, nota) |
| `contract_submissions` | Remessas: cada recebimento de arquivos (inicial, correção, complemento), canal e data/hora |
| `contract_documents` | Arquivos no bucket privado; nunca excluídos, apenas descartados com motivo (D59) |
| `contract_pendencies` | Pendências da conferência: aberta → resolvida/cancelada, com nota |

Views (`security_invoker`): `contracts_overview` (contrato + lojista, consultor, bandeira, região, contadores) e `contract_folder_summary` (contadores por pasta).

Índice novo em `regions`: no máximo uma região **ativa** por UF na organização (`regions_org_state_active_uidx`, D50).

## Status e transições

| De | Para |
|----|------|
| `draft` | `awaiting_review`, `cancelled` |
| `awaiting_review` | `pending_correction`, `approved`, `rejected`, `cancelled` |
| `pending_correction` | `corrected`, `cancelled` |
| `corrected` | `awaiting_review`, `pending_correction`, `approved`, `rejected`, `cancelled` |
| `approved` | `registered_at_operator`, `rejected`, `cancelled` |
| `registered_at_operator` | `active`, `cancelled` |
| `active` | `inactive`, `cancelled` |

- Validadas no banco (`contract_transition_allowed` + trigger) e espelhadas na UI (`contract-status.ts`).
- `pending_correction` exige ao menos uma pendência aberta; `approved` exige nenhuma.
- Rejeitar, cancelar e inativar exigem nota na UI.
- Contrato novo só nasce como `draft` ou `awaiting_review`; `received_at` é imutável.
- Ajuste em relação à proposta de `CONTRACT_WORKFLOW.md`: `corrected` pode ser aprovado/rejeitado diretamente, sem voltar a `awaiting_review` (D58; Q15 segue aberta para validação).

## Segurança

- RLS: `admin` e `operator` leem, criam e atualizam contratos, remessas, documentos e pendências da própria organização. Histórico: só leitura. Canais: leitura escritório, escrita só admin. **Consultor sem acesso** nesta fase.
- INSERT exige `organization_id = current_active_organization_id()`; `created_by`/`created_at` forçados por trigger; colunas imutáveis protegidas.
- Sem DELETE em nenhuma tabela (grants). Documento errado é descartado (uma vez, com motivo; `discarded_at`/`discarded_by` preenchidos pelo banco).
- Bucket privado `contract-documents` (10 MB; PDF/JPEG/PNG/WEBP — provisório, Q27). Caminho `{org}/contracts/{contract}/{uuid}.{ext}`, validado no INSERT do registro.
  - Policies em `storage.objects`: pasta raiz = org ativa e papel admin/operator.
  - DELETE de objeto só quando não existe registro em `contract_documents` com aquele caminho (limpeza de upload órfão).
  - Download por URL assinada de 60 s; miniaturas de imagem por URL assinada de 300 s.
- Funções de trigger sem EXECUTE para `anon`/`authenticated`.

## Auditoria (`audit_logs`)

| Evento | Origem |
|--------|--------|
| `intake_channel.*` | INSERT/UPDATE de canal |
| `contract.*` | INSERT/UPDATE de contrato |
| `contract.submission_added` | Nova remessa (metadata: `kind`) |
| `contract_document.*` | Upload e descarte de documento |
| `contract_pendency.*` | Abertura, edição e encerramento de pendência |

Mudanças de status ficam também em `contract_status_history` (trilha operacional).

## Modelo flexível (D60)

- Sem unique lojista + bandeira (D22/Q01): a UI só avisa quando já existe contrato em aberto para o mesmo par.
- Plano é texto opcional (Q02), sem FK para catálogo de planos.
- Campos e documentos obrigatórios por bandeira (Q03/Q04) e prazos (Q05/Q06) ainda não confirmados; não há bloqueio por checklist.

## Testes de RLS sugeridos

1. Consultor autenticado: SELECT em `contracts`, `contract_documents`, `contract_pendencies`, `intake_channels` retorna 0 linhas; INSERT falha.
2. Operator: cria contrato, remessa, documento e pendência; não cria/edita canal.
3. Admin de outra organização: não vê contratos nem objetos do bucket.
4. INSERT com `organization_id` de outra org falha (policy + trigger).
5. Transição inválida (ex.: `awaiting_review` → `active`) falha no banco.
6. Aprovar com pendência aberta falha.
7. UPDATE de documento alterando `storage_path` ou descartando duas vezes falha.
8. DELETE em qualquer tabela da sprint falha (sem grant).
9. DELETE de objeto do bucket com registro em `contract_documents` falha; órfão é permitido.
10. Remessa em contrato rejeitado/cancelado falha; segunda remessa inicial falha.

## Fase 2 (fora desta sprint)

- Integração Suri/WhatsApp: mensagens com mídia criam remessas automaticamente no canal correspondente (Sprint 11).
- Login do consultor para acompanhar os próprios contratos e pendências (RLS por `current_consultant_id()`).
- Checklist de documentos por bandeira/plano e prazos (após Q03–Q06).
- Exportação/sincronização com Dropbox (Sprint 9).
