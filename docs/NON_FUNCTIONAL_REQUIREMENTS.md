# DHub — Requisitos Não Funcionais

Estimativas baseadas no contexto operacional confirmado. Metas numéricas finas podem ser ajustadas após medição.

## Volume aproximado

| Dimensão | Ordem de grandeza |
|----------|-------------------|
| Solicitações | ~3.000/mês; ≥50/dia |
| Consultores | ~30 |
| Usuários administrativos | ~5 |
| WhatsApps (contexto atual) | ~5 |
| Planilhas (legado) | ~15 |

Crescimento inicial esperado: moderado; desenhar para multi-tenant sem over-engineering.

## Disponibilidade

- Meta inicial sugerida: horário comercial estendido com alta disponibilidade do provedor (Vercel + Supabase).
- Manutenções comunicadas; RTO/RPO a definir na Sprint 12.

## Desempenho

- Listagens e dashboards responsivos sob carga do volume acima.
- Evitar N+1; usar paginação e índices (`DATABASE_PROPOSAL.md`).
- Uploads assíncronos quando necessário.

## Paginação

- Toda lista operacional (lojistas, contratos, recargas, auditoria) paginada por padrão.
- Tamanho de página configurável com teto.

## Busca

- Busca por identificadores e campos principais (a confirmar: nome, documento, código).
- Índices adequados; evitar full scan em JSON de campos dinâmicos sem estratégia.

## Observabilidade

- Logs estruturados (app + integração).
- Correlação por `organization_id` / entity id.
- Monitorar erros de Auth, RLS denials anômalos, falhas de outbox.

## Auditoria

- Obrigatória para alterações relevantes (`audit_logs` — técnica).
- Históricos de status imutáveis (operacionais).
- Acesso à auditoria técnica: admin; históricos: conforme perfil (`AUTHORIZATION_AND_RLS.md`).

## Segurança

- TLS; secrets gerenciados; RLS; storage privado; least privilege.
- Ver `SECURITY_AND_LGPD.md` e `AUTHORIZATION_AND_RLS.md`.

## Responsividade

- UI utilizável em desktop (primário da operação) e tablet/mobile razoável para consultores.

## Acessibilidade

- Seguir boas práticas (labels, contraste, teclado) nos componentes shadcn/ui.
- Meta formal WCAG a combinar (não inventar nível sem acordo).

## Backup

- Backups automáticos do banco; retenção acordada.
- Teste de restore periódico.

## Recuperação

- Runbook de restore e de incidentes (Sprint 12).
- Dead-letter de integrações com reprocessamento.

## Manutenibilidade

- TypeScript estrito; Zod nas entradas; docs atualizados com decisões.
- Configuração de operadoras em dados, não forks de código.
- Uma sprint por vez.

## Testes

- Unitários de domínio/validações.
- Testes de RLS por papel e tenant.
- Smoke E2E dos fluxos críticos (contrato e recarga).
- lint + typecheck + build ao fim de cada sprint de código.

## Escalabilidade inicial

- Suficiente para dezenas de usuários e milhares de solicitações/mês.
- Horizontal no frontend (Vercel); vertical/managed no Postgres.
- Revisar índices e partição de `audit_logs` / `integration_events` se o volume crescer.

## Fora de escopo NFR nesta fase

- SLAs contratuais com operadoras.
- Multi-região ativa-ativa.
- Criptografia campo a campo (avaliar depois se exigido).
