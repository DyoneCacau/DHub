# DHub — Visão Geral do Projeto

## Contexto da Prime Service

A Prime Service opera contratos e recargas de vouchers junto às operadoras LeCard, Pluxee, Ticket, VR e ValeCard. A operação envolve consultores em contato com lojistas, e um escritório que confere documentos, cadastra informações, registra pendências e controla recargas.

Volume aproximado atual:

- ~3.000 solicitações por mês;
- ≥50 solicitações por dia;
- ~30 consultores;
- ~5 usuários administrativos;
- ~5 números de WhatsApp;
- ~15 planilhas;
- documentos armazenados no Dropbox.

## Problema atual

A operação depende de planilhas, conversas por WhatsApp e arquivos no Dropbox. Isso gera:

- fragmentação de informação entre canais e planilhas;
- risco de duplicar lojistas por operadora;
- dificuldade de conferência, rastreio de pendências e prazos;
- baixa rastreabilidade de alterações;
- isolamento incompleto entre dados de consultores;
- esforço manual elevado para status, comprovantes e acompanhamento.

## Objetivo do DHub

O DHub é a plataforma operacional da Prime Service para centralizar o fluxo:

**Consultor → Lojista → Contrato por operadora → Conferência → Recargas**

Objetivos principais:

- cadastro único de lojista por organização (**decisão**);
- contratos e recargas como entidades distintas (**decisão**);
- regras de operadoras configuráveis (**decisão**);
- conferência, pendências, histórico operacional e auditoria técnica;
- autorização por perfil com RLS no banco (**decisão**);
- base única, sem reproduzir 15 planilhas como 15 módulos (**decisão**).

Não está decidido que exista apenas um contrato por lojista e operadora (Q01).

## Participantes

| Papel | Papel no negócio | Acesso no MVP |
|-------|------------------|---------------|
| Consultor | Contato com lojista; envia documentos; acompanha andamento | Sim — somente seus dados |
| Lojista | Cliente final que assina contratos | Não (sem login) |
| Operadora | LeCard, Pluxee, Ticket, VR, ValeCard | Não (entidade de configuração) |
| Escritório (Admin / Operador) | Conferência, pendências, status, recargas, comprovantes | Sim — conforme perfil |

## Escopo do MVP

- Organização multi-tenant e usuários com perfis.
- Cadastro de consultores e lojistas (lojista único).
- Configuração de operadoras, planos, campos, documentos, prazos e motivos de pendência.
- Ciclo de vida de contratos com documentos, conferência e pendências.
- Ciclo de vida de recargas com comprovantes.
- Histórico operacional e auditoria técnica de alterações relevantes (trilhas distintas; ver `AUTHORIZATION_AND_RLS.md`).
- Autenticação (Supabase Auth) e autorização (RLS).
- Interface web (React + TypeScript + Vite) para consultor e escritório.

## Fora do MVP (posterior)

- Login do lojista.
- Integração Dropbox.
- Automações n8n.
- Integração Suri / WhatsApp.
- Importação completa das 15 planilhas e relatórios de operadoras (planejado; execução em sprints de integração).
- Módulos espelhando planilhas 1:1.

## Fluxo operacional

```mermaid
flowchart LR
  C[Consultor] --> L[Lojista]
  L --> CT[Contrato por operadora]
  CT --> R[Conferência]
  R --> RC[Recargas]
```

1. Consultor relaciona-se ao lojista e encaminha dados/documentos.
2. Escritório confere contrato, registra pendências e atualiza status.
3. Após vínculo operacional estabelecido, recargas são solicitadas e processadas no contexto do contrato.
4. Comprovantes, comentários e históricos acompanham o ciclo.

## Arquitetura de alto nível

| Camada | Tecnologia planejada |
|--------|----------------------|
| Frontend | React, TypeScript, Vite, Tailwind, shadcn/ui, React Router, RHF, Zod, TanStack Query |
| Backend / BaaS | Supabase (Auth, PostgreSQL, Storage, RLS) |
| Deploy | Vercel |
| Integrações (depois) | n8n, Dropbox, Suri/WhatsApp |

Princípios:

- regra de negócio e autorização no banco (RLS), não só no frontend;
- configuração de operadoras em dados, não em código;
- contrato ≠ recarga (status, histórico e regras separados);
- toda entidade operacional pertence a uma organização.

## Principais ganhos esperados

- Visão única do lojista e dos contratos por operadora.
- Rastreabilidade de conferência, pendências e recargas.
- Isolamento de dados por organização e por consultor.
- Redução de retrabalho e inconsistências entre planilhas/WhatsApp/Dropbox.
- Base preparada para integrações sem acoplar o fluxo interno a canais externos.
