# DHub — Plano de Integrações

Planejamento **sem implementação**. Integrações somente após o fluxo interno estável.

## Princípios

- Sistema interno é fonte de verdade operacional.
- Integrações via `integration_events` (outbox): idempotência, retries, logs, dead-letter.
- Falha externa não deve corromper contrato/recarga; estados internos avançam por regras próprias.
- Credenciais apenas em secrets (Supabase/Vercel/n8n); nunca no frontend.

## Dropbox

| Tema | Plano |
|------|-------|
| Objetivo | Armazenar/arquivar documentos e comprovantes espelhando o DHub |
| Abordagem | App Dropbox; pastas namespaced por `organization_id` (+ contrato/recarga) |
| Gatilhos | Upload de `contract_documents` / `recharge_receipts` |
| Riscos | Estrutura legada; permissões; duplicidade; migração histórica |
| MVP | Não; Sprint 9 |

## n8n

| Tema | Plano |
|------|-------|
| Objetivo | Orquestrar automações (sync, avisos, importações) |
| Abordagem | Webhooks autenticados + polling de outbox; workflows versionados |
| Regras | Não colocar autorização de dados no n8n no lugar do RLS |
| Riscos | Lógica crítica só em workflow frágil |
| MVP | Não; Sprint 10 |

## Suri

| Tema | Plano |
|------|-------|
| Objetivo | Ponte com canais de atendimento/WhatsApp usados pela operação |
| Abordagem | Eventos de notificação (pendência, status) com templates aprovados |
| Riscos | Mapeamento de números (~5 WhatsApps); identidade do consultor; LGPD |
| MVP | Não; Sprint 11 |

## WhatsApp

| Tema | Plano |
|------|-------|
| Objetivo | Comunicação operacional com consultores (e possivelmente lojistas no futuro) |
| Abordagem | Via Suri ou API oficial; opt-in; horários; templates |
| Riscos | Conteúdo com PII; spam; números compartilhados |
| MVP | Não |

## Webhooks

| Tema | Plano |
|------|-------|
| Direção | DHub → n8n/Suri; futuros inbound de operadoras se existirem |
| Segurança | Assinatura HMAC, timestamp, IP allowlist se possível |
| Idempotência | `idempotency_key` única por org |
| Retries | Backoff exponencial; máximo de attempts; dead-letter |

## Importação de planilhas

| Tema | Plano |
|------|-------|
| Objetivo | Migrar/apoiar as ~15 planilhas atuais |
| Abordagem | Mapear colunas → entidades (merchant, contract, recharge); importadores por tipo, não 15 módulos eternos |
| Riscos | Dados sujos; duplicar lojistas; sem chave natural |
| Status | Conteúdo das planilhas **não confirmado** — ver OPEN_QUESTIONS |

## Importação de relatórios das operadoras

| Tema | Plano |
|------|-------|
| Objetivo | Conciliar status/valores com fontes das operadoras |
| Abordagem | Parsers por formato; jobs; matching por chaves de contrato/recarga |
| Riscos | Formatos divergentes; origem/destino não confirmados |
| Status | Em aberto |

## Notificações

| Canal | Fase |
|-------|------|
| In-app (`notifications`) | MVP interno |
| E-mail | Opcional / a confirmar |
| WhatsApp / Suri | Pós-MVP |
| Regras | Preferências por usuário; sem vazar dados cross-consultant |

## Idempotência

- Chave estável: `org + provider + event_type + entity_id + version/hash`.
- Unique constraint em `integration_events.idempotency_key`.
- Consumidores devem ser safe sob replay.

## Retries e falhas

```text
pending → processing → succeeded
                   ↘ failed → (retry) → dead_letter
```

- Alertar admin em dead-letter.
- Reprocessamento manual auditado.
- Não avançar estado de negócio apenas porque o webhook foi enfileirado.

## Logs

- Correlacionar `integration_event_id`, `organization_id`, entity.
- Sem tokens, documentos completos ou PII desnecessária nos logs.
- Retenção alinhada a `SECURITY_AND_LGPD.md`.

## Ordem sugerida

1. Fluxo interno (contratos/recargas) estável  
2. Outbox + observabilidade  
3. Dropbox  
4. n8n  
5. Suri/WhatsApp  
6. Importadores de planilhas/relatórios conforme prioridade de negócio  
