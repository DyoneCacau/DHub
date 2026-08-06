# DHub — Segurança e LGPD

Documento **operacional/técnico**. Não constitui parecer jurídico.

## Dados potencialmente tratados

CPF, CNPJ, data de nascimento, telefone, e-mail, endereço, documentos, contratos, comprovantes — além de metadados operacionais e logs.

## Minimização de dados

- Coletar apenas campos necessários ao fluxo confirmado.
- Campos dinâmicos configuráveis não devem virar depósito irrestrito sem necessidade.
- Evitar PII em `notifications.payload`, logs de integração e mensagens de erro.

## Controle de acesso

- Autenticação: Supabase Auth.
- Autorização: RLS + papéis (`admin`, `operator`, `consultant`).
- Sem login de lojista no MVP.
- Service role apenas em backend confiável / jobs.

### Trilhas e permissões (Sprint 0.1)

| Trilha | Admin | Operador | Consultor |
|--------|-------|----------|-----------|
| Histórico operacional | Sim (org) | Sim (necessário ao trabalho) | Somente escopo próprio |
| Auditoria técnica | Sim (org) | Não | Não |
| Logs de integração | Sim | Não automaticamente | Não |
| Logs de segurança | Sim | Não | Não |

## Segregação por perfil

- Consultor: somente seus lojistas/contratos/recargas e históricos autorizados; sem auditoria técnica.
- Operador: operação e históricos operacionais; sem configs críticas; sem auditoria técnica completa nem eventos de segurança/admin.
- Admin: configuração, relatórios, históricos e auditoria técnica da organização.
- Ver `AUTHORIZATION_AND_RLS.md`.

## Arquivos privados

- Storage privado (não público).
- Paths com `organization_id` e IDs de entidade.
- Policies de storage alinhadas ao RLS das tabelas.
- Antivírus/scanning: avaliar em sprint de segurança.

## Links temporários

- URLs assinadas com expiração curta para download.
- Não compartilhar links permanentes em WhatsApp/planilhas.
- Revogação: rota/path invalidável quando possível.

## Retenção

- Definir prazos de retenção com o negócio/jurídico (em aberto).
- Históricos e auditoria: retenção alongada; purge controlado.
- Notificações e logs de integração: retenção mais curta.

## Exclusão

- Soft delete / inativação preferencial para cadastros.
- Exclusão definitiva (direito do titular) exige processo: anonimização vs remoção, impacto em auditoria — **procedimento a definir** (não inventar prazo legal aqui).
- Arquivos: remoção no storage + Dropbox quando integrado.

## Backup

- Backups gerenciados do Postgres (Supabase) + política de retenção.
- Testar restore periodicamente (Sprint 12).
- Backups também contêm PII → acesso restrito.

## Auditoria

- `audit_logs`: auditoria **técnica**; leitura restrita a admin.
- Históricos de status: trilha **operacional** (acesso conforme perfil).
- Não misturar com logs de integração ou segurança.

## Logs sem exposição indevida

- Não logar CPF/CNPJ completos, documentos, tokens, senhas.
- Mascarar identificadores quando necessário.
- Separar logs operacionais de dumps de payload.

## Resposta a incidentes (operacional)

1. Contenção (revogar chaves, desativar usuários, rotacionar secrets).
2. Avaliação de escopo (orgs/tabelas afetadas).
3. Registro interno do incidente.
4. Comunicação conforme política da empresa (não detalhada aqui).
5. Postmortem e correção de causa raiz.

## Desligamento de usuários

- Desativar membership (`is_active=false`) e sessão Auth.
- Remover acesso a storage e integrações.
- Reatribuir lojistas do consultor (regra de negócio em aberto) antes/depois do desligamento.
- Manter trilha de auditoria das ações passadas.

## Exportação de dados

- Export administrativo controlado (relatórios).
- Exportação a pedido do titular: formato e processo a definir.
- Exports auditados; arquivos temporários com TTL.

## Controles técnicos recomendados

| Controle | Aplicação |
|----------|-----------|
| TLS | Em trânsito (Vercel/Supabase) |
| Criptografia em repouso | Provider |
| Secrets | Env / secret manager |
| 2FA | Recomendado para admin |
| Rate limit | Auth e endpoints sensíveis |
| Headers segurança | App web |

## Abertos relacionados

- Bases legais e prazos de retenção (jurídico).
- Inventário exato dos campos nas planilhas.
- Necessidade de criptografia adicional campo a campo.

Ver `OPEN_QUESTIONS.md`.
