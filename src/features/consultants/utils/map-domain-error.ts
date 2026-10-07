import type { PostgrestError } from "@supabase/supabase-js";

const FRIENDLY: Array<{ match: RegExp; message: string }> = [
  { match: /JWT|session|not authenticated/i, message: "Sessão expirada. Entre novamente." },
  { match: /row-level security|RLS|permission denied|42501/i, message: "Acesso negado para esta operação." },
  { match: /consultants_org_user_unique|duplicate key.*user_id/i, message: "Este usuário já está vinculado a outro consultor." },
  { match: /Consultor responsável deve estar ativo/i, message: "Selecione um consultor ativo." },
  { match: /não pode transferir|Somente administrador/i, message: "Operação não permitida para o seu papel." },
  { match: /membro ativo da organização/i, message: "O usuário vinculado precisa ser membro ativo da organização." },
  { match: /Organização ativa indefinida/i, message: "Não foi possível identificar sua organização ativa. Contate o administrador." },
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
