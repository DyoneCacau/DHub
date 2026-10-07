# DHub — Questões em Aberto

Dúvidas **não confirmadas**. Não responder por suposição. Atualizar quando o negócio decidir; promover decisões para `DECISION_LOG.md`.

| ID | Pergunta | Impacto | Status |
|----|----------|---------|--------|
| Q01 | Um lojista pode ter mais de um contrato com a mesma operadora? Inclui: vários ativos; contratos por plano; renovação; substituição; histórico de inativos? Deve existir índice parcial ou regra só para “contrato ativo”? | Constraints/índices em `contracts`; UX. **Não** há unique `merchant_id+operator_id` confirmado | Aberta |
| Q02 | Qual a relação exata entre **plano** e **contrato**? (obrigatório? 1:1? mudável?) | FK `operator_plan_id`; configuração de campos/docs | Aberta |
| Q03 | Quais são os **campos obrigatórios** por operadora/plano? | `field_definitions` / validação | Aberta |
| Q04 | Quais **documentos** são obrigatórios por operadora/plano? | Uploads e bloqueio de transição | Aberta |
| Q05 | Quais são os **prazos** operacionais (conferência, pendência, recarga)? | `due_at`, SLAs, dashboards | Aberta |
| Q06 | Prazos em **dias úteis** ou **corridos**? | Cálculo de vencimento | Aberta |
| Q07 | Qual o **fluxo real da recarga** hoje (passos, sistemas externos, comprovantes)? A proposta `processed`≠`completed` reflete a operação? | Validação do workflow de recarga | Aberta |
| Q08 | Quais **dados** existem nas ~15 planilhas e qual o mapeamento para entidades? | Importação; modelo de dados | Aberta |
| Q09 | Existem **regras de despesas** dos consultores no escopo do DHub? | Módulo futuro ou fora | Respondida (D37/D38): módulo Operações e Ações, gerido só pelo admin; detalhes em Q22–Q24, Q28 |
| Q10 | Qual o **formato** e a obrigatoriedade dos comprovantes de recarga para `completed`? | `recharge_receipts`; bloqueio de encerramento | Aberta |
| Q11 | Qual a **origem e destino** dos relatórios das operadoras? | Integrações; conciliação | Aberta |
| Q12 | Quais as **regras de mudança de consultor** do lojista (quem autoriza, efeito em contratos abertos / snapshot)? | History + RLS | Aberta |
| Q13 | Há necessidade de **importação histórica** (planilhas/Dropbox) no go-live? | Escopo sprints 9+ | Aberta |
| Q14 | A remoção de `submitted` (envio → `awaiting_review`) atende a operação, ou existe etapa distinta de “enviado” vs “em fila”? | Workflow de contrato | Aberta (proposta consolidada remove `submitted`; validar com operação) |
| Q15 | O estado `corrected` é necessário ou basta voltar para `awaiting_review`? | Workflow de contrato | Aberta (Sprint 6 manteve `corrected` e permite conferir direto — D58; validar com operação) |
| Q16 | Recarga só é permitida com contrato em `active`, ou também em outros status? | Pré-condição de criação | Aberta |
| Q17 | Qual o **critério de unicidade** do lojista (CNPJ, CPF, outro)? | Constraints; deduplicação. Sprint 3: sem unique rígido; índice + aviso UI | Aberta (parcialmente mitigada) |
| Q18 | Quais **relatórios operacionais** o operador deve ver? (Auditoria técnica: **não** — consolidado na Sprint 0.1) | Menus e RLS de relatórios | Aberta (escopo de relatórios); auditoria técnica fechada como negada ao operador |
| Q19 | Consultor pode **cancelar** contrato/recarga após envio? Em quais estados? | Transições e policies | Aberta |
| Q20 | Reativação `inactive` → `active` é permitida? | Workflow | Aberta |
| Q21 | O **mês da pasta** do contrato vem de qual data (assinatura, recebimento pelo escritório, cadastro)? Resposta inicial: "por mês", sem data definida | `contract_documents.reference_month` | Respondida (D48): mês da **data de assinatura** do contrato |
| Q22 | Consultor deve **ver** as ações em que participa e os gastos ligados a ele? | RLS de `actions`/`action_expenses`. Hoje: só admin (D38) | Aberta |
| Q23 | Os **cartões** (combustível/frota e corporativo) precisam de cadastro próprio (titular, final do cartão, saldo) ou basta lançar as recargas como despesa? | Entidade `cards` opcional | Aberta |
| Q24 | Despesas precisam de **aprovação/reembolso** ou apenas registro de previsto × pago? | Status de `action_expenses` | Aberta |
| Q25 | **Região** é lista da cliente? Região agrupa cidades ou cada cidade é uma região? | Estrutura de `regions` | Respondida (D50): região = **estado (UF)** |
| Q26 | Consultor atende várias regiões (D34): a **região do contrato** vem do endereço do lojista, é escolhida no contrato ou outro critério? | Navegação por pastas; `contracts.region_id` | Respondida (D49/D50): vem do **estado (UF) do endereço do lojista** (automático) |
| Q27 | **Formatos e tamanho máximo** dos arquivos (PDF, JPG, PNG, HEIC?) | Validação de upload; bucket | Aberta |
| Q28 | Ações têm **orçamento/limite** ou centro de custo? Quem paga (empresa, bandeira, reembolso da bandeira)? | Campos de `actions`; relatórios | Aberta |

## Como usar

1. Levar a pergunta ao stakeholder da Prime Service.
2. Registrar a resposta e a data em `DECISION_LOG.md`.
3. Atualizar status aqui para `Respondida` com referência à decisão.
4. Ajustar docs de domínio/workflow/DB impactados.
