import type { CatalogStatus } from "@/types/database";

export type ContractStatus =
  | "draft"
  | "awaiting_review"
  | "pending_correction"
  | "corrected"
  | "approved"
  | "registered_at_operator"
  | "active"
  | "rejected"
  | "cancelled"
  | "inactive";

export type PendencyStatus = "open" | "resolved" | "cancelled";
export type SubmissionKind = "initial" | "correction" | "complement";
export type ChannelType = "whatsapp" | "email" | "presencial" | "outro";

export interface IntakeChannel {
  id: string;
  organization_id: string;
  name: string;
  channel_type: ChannelType;
  operator_id: string | null;
  phone_label: string | null;
  status: CatalogStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Contract {
  id: string;
  organization_id: string;
  merchant_id: string;
  operator_id: string;
  consultant_id: string;
  region_id: string | null;
  signed_on: string;
  reference_month: string;
  plan_name: string | null;
  status: ContractStatus;
  status_note: string | null;
  status_changed_at: string;
  received_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContractOverview extends Contract {
  merchant_legal_name: string;
  merchant_trade_name: string | null;
  merchant_document: string | null;
  merchant_city: string | null;
  merchant_state: string | null;
  consultant_name: string;
  operator_name: string;
  region_name: string | null;
  region_state: string | null;
  open_pendency_count: number;
  document_count: number;
  last_received_at: string | null;
}

export interface ContractStatusHistoryEntry {
  id: string;
  organization_id: string;
  contract_id: string;
  from_status: ContractStatus | null;
  to_status: ContractStatus;
  changed_by: string | null;
  note: string | null;
  changed_at: string;
}

export interface ContractSubmission {
  id: string;
  organization_id: string;
  contract_id: string;
  kind: SubmissionKind;
  channel_id: string | null;
  received_at: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ContractDocument {
  id: string;
  organization_id: string;
  contract_id: string;
  submission_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  discarded_at: string | null;
  discarded_by: string | null;
  discard_reason: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ContractPendency {
  id: string;
  organization_id: string;
  contract_id: string;
  reason: string;
  status: PendencyStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ContractFolderSummaryRow {
  organization_id: string;
  region_id: string | null;
  consultant_id: string;
  operator_id: string;
  reference_month: string;
  total: number;
  in_review: number;
  pending: number;
}

/** "queue" = aguardando conferência + correção recebida. */
export type ContractStatusFilter = ContractStatus | "all" | "queue";

/** "none" = contratos sem região (UF do lojista sem região cadastrada). */
export interface ContractFilters {
  regionId: string | "all" | "none";
  consultantId: string | "all";
  operatorId: string | "all";
  merchantId: string | "all";
  month: string;
  status: ContractStatusFilter;
  search: string;
  order: "oldest_received" | "recent";
  page: number;
  pageSize: number;
}
