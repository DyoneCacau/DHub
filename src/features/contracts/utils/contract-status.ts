import type {
  ChannelType,
  ContractStatus,
  PendencyStatus,
  SubmissionKind,
} from "@/features/contracts/types/contract";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Rascunho",
  awaiting_review: "Aguardando conferência",
  pending_correction: "Pendente de correção",
  corrected: "Correção recebida",
  approved: "Aprovado",
  registered_at_operator: "Cadastrado na bandeira",
  active: "Ativo",
  rejected: "Recusado",
  cancelled: "Cancelado",
  inactive: "Inativo",
};

export function contractStatusVariant(status: ContractStatus) {
  switch (status) {
    case "approved":
    case "registered_at_operator":
    case "active":
      return "success" as const;
    case "pending_correction":
      return "warning" as const;
    case "awaiting_review":
    case "corrected":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

/** Espelha public.contract_transition_allowed (o banco é a fonte da verdade). */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ["awaiting_review", "cancelled"],
  awaiting_review: ["pending_correction", "approved", "rejected", "cancelled"],
  pending_correction: ["corrected", "cancelled"],
  corrected: ["awaiting_review", "pending_correction", "approved", "rejected", "cancelled"],
  approved: ["registered_at_operator", "rejected", "cancelled"],
  registered_at_operator: ["active", "cancelled"],
  active: ["inactive", "cancelled"],
  rejected: [],
  cancelled: [],
  inactive: [],
};

/** pending_correction é aplicado ao abrir uma pendência, não por botão. */
export const TRANSITION_ACTION_LABEL: Partial<Record<ContractStatus, string>> = {
  awaiting_review: "Enviar para conferência",
  corrected: "Marcar como corrigido",
  approved: "Aprovar",
  registered_at_operator: "Marcar cadastrado na bandeira",
  active: "Ativar",
  inactive: "Inativar",
  rejected: "Recusar",
  cancelled: "Cancelar contrato",
};

export const TRANSITIONS_REQUIRING_NOTE: ContractStatus[] = ["rejected", "cancelled", "inactive"];

export function manualTransitions(status: ContractStatus): ContractStatus[] {
  return CONTRACT_TRANSITIONS[status].filter((target) => target !== "pending_correction");
}

export const QUEUE_STATUSES: ContractStatus[] = ["awaiting_review", "corrected"];
export const CLOSED_STATUSES: ContractStatus[] = ["rejected", "cancelled", "inactive"];

export const PENDENCY_STATUS_LABEL: Record<PendencyStatus, string> = {
  open: "Aberta",
  resolved: "Resolvida",
  cancelled: "Cancelada",
};

export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, string> = {
  initial: "Remessa inicial",
  correction: "Correção",
  complement: "Complemento",
};

export const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

export const PENDENCY_SUGGESTIONS = [
  "Foto ilegível",
  "Falta página do contrato",
  "Falta assinatura do lojista",
  "Falta documento do sócio",
  "Dados divergentes do cadastro",
  "Contrato sem data",
];

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function formatAge(value: string | null | undefined): string {
  const days = daysSince(value);
  if (days === null) return "—";
  if (days === 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

/** Valor para <input type="datetime-local"> no fuso local. */
export function nowForDateTimeInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
