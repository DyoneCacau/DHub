# Regiões, pastas de contratos e Operações e Ações — Proposta

**Status:** proposta arquitetural (sem código/SQL). Levantamento de 2026-10-07.
Decisões confirmadas: D34–D39 (`DECISION_LOG.md`). Dúvidas: Q21–Q28 (`OPEN_QUESTIONS.md`).

## Contexto

Hoje a Prime Service organiza os contratos assinados em pastas no computador: **região → consultor → bandeira → mês**. Consultores podem atender **várias bandeiras** e **várias regiões**.

Além disso, ações de bandeira exigem viagens de consultores; a gerente compra passagens, aluga carros, recarrega cartões (combustível/frota e corporativo pré-pago) e paga contas. Esse controle hoje não tem lugar no sistema.

"Bandeira" = **operadora** no modelo (`operators`): LeCard, Pluxee, Ticket, VR, ValeCard.

---

## Parte 1 — Regiões e vínculos do consultor

| Entidade (proposta) | Função |
|---------------------|--------|
| `regions` | Catálogo configurável por organização (nome, status). Pode representar uma cidade ou um agrupamento (Q25). |
| `consultant_regions` | N:N consultor ↔ região (D34). |
| `consultant_operators` | N:N consultor ↔ bandeira que atende (D35). Status ativo/inativo. |

- Sem tabela por região ou por bandeira (D20).
- Admin/operator mantêm os vínculos; consultor apenas lê os próprios.

## Parte 2 — Pastas de contratos assinados

### Navegação (requisito — D36)

```text
Região / Cidade
└── Consultor
    └── Bandeira
        └── Mês
            └── arquivos (PDF / imagem)
```

### Proposta de implementação

- As pastas **não** são armazenadas. São uma **navegação derivada** dos dados:
  `contract_documents → contracts (operadora, região, lojista) → merchants → consultants`.
- Cada arquivo pertence a um **contrato** (lojista + bandeira). Trocar consultor ou região reflete automaticamente na navegação, sem mover arquivos.
- `contract_documents.reference_month` (primeiro dia do mês) define a pasta do mês. Critério da data: Q21. Proposta: campo explícito no upload, com padrão = mês atual, editável por admin/operator.
- Região do contrato: como o consultor pode atender várias regiões, a pasta de região precisa vir do **contrato** (ex.: `contracts.region_id`) ou do endereço do lojista — Q26.
- Mesma navegação deve permitir busca direta (lojista, documento, bandeira, mês) sem abrir pasta por pasta.

### Armazenamento

- Supabase Storage, bucket **privado** (nunca público).
- Caminho por IDs, não por nomes: `{organization_id}/contracts/{contract_id}/{uuid}.{ext}`.
- Policies de storage alinhadas ao RLS de `contracts` (consultor só arquivos dos próprios lojistas).
- Formatos propostos: PDF, JPG, PNG; tamanho máximo a confirmar (Q27).
- Dropbox continua como integração futura (sincronização), não como armazenamento principal (D09).

---

## Parte 3 — Operações e Ações

Responde Q09: controle de viagens/despesas de ações de bandeira **está no escopo** (D37).

### Entidades (proposta)

| Entidade | Campos principais |
|----------|-------------------|
| `actions` | organização, título, bandeira (opcional), região/cidade, início, fim, status (`planned`, `in_progress`, `completed`, `cancelled`), orçamento previsto, observações, created_by, timestamps |
| `action_participants` | ação ↔ consultor (N:N) |
| `expense_types` | catálogo configurável por organização |
| `action_expenses` | ação, tipo, consultor beneficiado (opcional), fornecedor, descrição, data, valor previsto, valor realizado, forma de pagamento, status, observações |
| `expense_attachments` | comprovantes (PDF/imagem) em bucket privado: `{organization_id}/actions/{action_id}/{uuid}.{ext}` |

Valores monetários em `numeric(12,2)` (BRL).

### Tipos de despesa iniciais (seed configurável)

Informados pela operação: passagem aérea, aluguel de carro, combustível/abastecimento, recarga de cartão combustível/frota, recarga de cartão corporativo pré-pago, contas.
Sugestões a validar: hospedagem, alimentação, outros.

### Status da despesa (proposta)

`planned` (prevista) → `paid` (paga) | `cancelled`. Fluxo de aprovação/reembolso não confirmado (Q24).

### Permissões (D38)

| Ação | admin (gerente) | operator | consultant |
|------|:---------------:|:--------:|:----------:|
| Ver ações e despesas | sim | não | não (Q22) |
| Criar/editar ação | sim | não | não |
| Lançar/editar despesa | sim | não | não |
| Anexar comprovante | sim | não | não |
| DELETE físico | não (cancelar) | não | não |

RLS no banco (`is_org_admin`), não só no menu. Auditoria em `audit_logs` (criação, mudança de status, alteração de valores).

### Tela (aba "Operações e Ações", só admin)

- Lista de ações com filtros (bandeira, período, região, status).
- Detalhe da ação: participantes, despesas, total previsto × realizado, comprovantes.
- Resumo de gastos por mês e por bandeira.

---

## Dependências e ordem

Ver replanejamento em `IMPLEMENTATION_PLAN.md`.

1. Fechar Sprint 3 (consultores/lojistas): riscos da revisão + db push autorizado.
2. Bandeiras (operadoras) e regiões + vínculos do consultor.
3. Contratos e documentos com navegação por pastas.
4. Operações e Ações (depende de consultores, bandeiras e regiões; não depende de contratos — pode ser antecipada).
