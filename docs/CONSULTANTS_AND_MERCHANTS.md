# Consultores e lojistas — Sprint 3

## Conceitos

| Conceito | Função |
|----------|--------|
| `organization_members` | Acesso ao sistema (Auth + papel) |
| `consultants` | Cadastro operacional do profissional |
| `merchants` | Lojistas (sem login no MVP) |

- `consultants.user_id` é **opcional** (FK `profiles`).
- Um `user_id` só pode vincular **um** consultor por organização.
- Lojista tem **um** `consultant_id` responsável; mesma `organization_id` garantida por **FK composta** `(consultant_id, organization_id) → consultants(id, organization_id)`.

## Membership única

`current_active_organization_id()` retorna a organização **somente** quando há exatamente uma membership ativa (uma única consulta, sem `LIMIT 1`). Zero ou várias → `null`: policies que dependem dela negam acesso sem lançar exceção dentro do RLS, e os triggers de escrita recusam com "Organização ativa indefinida". Seletor de organização fica para quando houver usuário multi-org real.

## Regras de escrita (banco)

- INSERT por usuário autenticado: `created_by = auth.uid()`, `created_at`/`updated_at = now()` (valores do cliente ignorados).
- Vincular/alterar `user_id`: somente admin, inclusive no INSERT; o usuário precisa ser membro **ativo** da mesma organização.
- `auth.uid()` nulo (service_role/SQL Editor, cascata `ON DELETE SET NULL`): contexto confiável; valem só regras de integridade (mesma org, consultor ativo, membership do vínculo, imutáveis).
- Consultor inativo mantém leitura/edição dos lojistas existentes; não recebe lojista novo nem transferência.

## Permissões (resumo)

| Ação | admin | operator | consultant |
|------|:-----:|:--------:|:----------:|
| Listar consultores da org | sim | sim | só o próprio (RLS; UI escritório) |
| Criar/editar consultor | sim | sim | não |
| Vincular `user_id` | sim | não | não |
| Listar lojistas | org | org | próprios |
| Criar lojista | sim | sim | só para si |
| Trocar consultor do lojista | sim | sim | não |
| DELETE físico | não | não | não |

## Duplicidade de documento

Sem unique rígido (Q17). Índice + aviso no frontend. Documentos vazios permitidos.

## CPF/CNPJ e LGPD

`document` opcional; normalizado sem pontuação, em maiúsculas, preservando letras (CNPJ alfanumérico da Receita). Não logar documento/telefone/e-mail/endereço em `audit_logs` (apenas nomes de campos alterados / status / ids de consultor).

## Migration

`supabase/migrations/20260806130000_consultants_merchants.sql` — **não aplicada remotamente** até autorização.
