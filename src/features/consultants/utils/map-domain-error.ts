import type { PostgrestError } from "@supabase/supabase-js";

const FRIENDLY: Array<{ match: RegExp; message: string }> = [
  { match: /JWT|session|not authenticated/i, message: "Sessão expirada. Entre novamente." },
  { match: /row-level security|RLS|permission denied|42501/i, message: "Acesso negado para esta operação." },
  { match: /consultants_org_user_unique|duplicate key.*user_id/i, message: "Este usuário já está vinculado a outro consultor." },
  { match: /Consultor responsável deve estar ativo/i, message: "Selecione um consultor ativo." },
  { match: /não pode transferir|Somente administrador/i, message: "Operação não permitida para o seu papel." },
  { match: /membro ativo da organização/i, message: "O usuário vinculado precisa ser membro ativo da organização." },
  { match: /Organização ativa indefinida/i, message: "Não foi possível identificar sua organização ativa. Contate o administrador." },
  { match: /operators_org_name_uidx|operators_org_code_unique/i, message: "Já existe uma bandeira com este nome ou código." },
  { match: /regions_org_name_uidx/i, message: "Já existe uma região com este nome." },
  { match: /consultant_operators_pkey|consultant_regions_pkey/i, message: "Este vínculo já existe." },
  { match: /Bandeira inativa/i, message: "Selecione uma bandeira ativa." },
  { match: /Região inativa/i, message: "Selecione uma região ativa." },
  { match: /expense_types_org_name_uidx/i, message: "Já existe um tipo de despesa com este nome." },
  { match: /action_participants_pkey/i, message: "Este consultor já participa da ação." },
  { match: /Tipo de despesa inativo/i, message: "Selecione um tipo de despesa ativo." },
  { match: /actions_period_valid/i, message: "A data final deve ser igual ou posterior ao início." },
  { match: /regions_org_state_active_uidx/i, message: "Já existe uma região ativa para esta UF." },
  { match: /intake_channels_org_name_uidx/i, message: "Já existe um canal com este nome." },
  { match: /contract_documents_contract_sha_uidx/i, message: "Este arquivo já foi enviado para este contrato." },
  { match: /contract_documents_mime_allowed/i, message: "Formato não permitido. Envie PDF, JPG, PNG ou WEBP." },
  { match: /contract_documents_size_valid/i, message: "Arquivo acima de 10 MB." },
  { match: /Transição de status inválida/i, message: "Esta mudança de status não é permitida no estado atual do contrato." },
  { match: /Abra ao menos uma pendência/i, message: "Abra ao menos uma pendência antes de pedir correção." },
  { match: /Resolva as pendências abertas/i, message: "Resolva as pendências abertas antes de aprovar." },
  { match: /Só é possível abrir pendência/i, message: "Só é possível abrir pendência em contrato em conferência." },
  { match: /Pendência encerrada/i, message: "Esta pendência já foi encerrada." },
  { match: /Contrato encerrado não recebe/i, message: "Contrato encerrado não recebe novos documentos." },
  { match: /Documento já descartado/i, message: "Este documento já foi descartado." },
  { match: /Canal de recebimento inativo/i, message: "Selecione um canal ativo." },
  { match: /Data de recebimento no futuro/i, message: "A data de recebimento não pode estar no futuro." },
  { match: /Lojista não encontrado/i, message: "Lojista não encontrado." },
  { match: /action_expenses_period_valid/i, message: "O fim do período deve ser igual ou posterior ao início." },
  { match: /action_expenses_travel_lengths/i, message: "Origem, destino ou código da reserva muito longos." },
  { match: /expense_attachments_mime_allowed|mime type .* is not supported/i, message: "Formato não permitido. Envie PDF, JPG, PNG ou WEBP." },
  { match: /expense_attachments_size_valid|exceeded the maximum allowed size|Payload too large/i, message: "Arquivo acima de 10 MB." },
  { match: /network|fetch/i, message: "Falha de rede. Tente novamente." },
];

export function mapDomainError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as PostgrestError).message)
          : fallback;

  for (const rule of FRIENDLY) {
    if (rule.match.test(message)) {
      return rule.message;
    }
  }
  return fallback;
}
