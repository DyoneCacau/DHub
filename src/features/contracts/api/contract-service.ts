import { supabase } from "@/lib/supabase";
import { normalizeText } from "@/lib/normalize";
import { mapDomainError } from "@/features/consultants/utils/map-domain-error";
import type { PaginatedResult } from "@/features/consultants/types/consultant";
import type {
  ChannelType,
  Contract,
  ContractDocument,
  ContractFilters,
  ContractFolderSummaryRow,
  ContractOverview,
  ContractPendency,
  ContractStatus,
  ContractStatusHistoryEntry,
  ContractSubmission,
  IntakeChannel,
  PendencyStatus,
  SubmissionKind,
} from "@/features/contracts/types/contract";
import { CLOSED_STATUSES, QUEUE_STATUSES } from "@/features/contracts/utils/contract-status";
import { sha256Hex } from "@/features/contracts/utils/file-hash";
import type { CatalogStatus } from "@/types/database";

const DOCUMENTS_BUCKET = "contract-documents";

export const CONTRACT_FILE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CONTRACT_FILE_MAX_BYTES = 10 * 1024 * 1024;

export interface ContractInput {
  merchant_id: string;
  operator_id: string;
  signed_on: string;
  plan_name: string | null;
  notes: string | null;
}

export interface SubmissionInput {
  kind: SubmissionKind;
  channel_id: string | null;
  received_at: string;
  notes: string | null;
}

export interface UploadResult {
  uploaded: number;
  failures: string[];
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&").replace(/[,()]/g, " ").trim();
}

function monthStart(month: string): string {
  return `${month}-01`;
}

// ---------------------------------------------------------------------------
// Canais de recebimento
// ---------------------------------------------------------------------------

export async function listIntakeChannels(organizationId: string): Promise<IntakeChannel[]> {
  const { data, error } = await supabase
    .from("intake_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar os canais."));
  return (data ?? []) as IntakeChannel[];
}

export interface IntakeChannelInput {
  name: string;
  channel_type: ChannelType;
  operator_id: string | null;
  phone_label: string | null;
  notes: string | null;
}

export async function createIntakeChannel(
  organizationId: string,
  input: IntakeChannelInput,
): Promise<void> {
  const { error } = await supabase.from("intake_channels").insert({
    organization_id: organizationId,
    name: normalizeText(input.name) ?? "",
    channel_type: input.channel_type,
    operator_id: input.operator_id,
    phone_label: normalizeText(input.phone_label),
    notes: normalizeText(input.notes),
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível criar o canal."));
}

export async function updateIntakeChannel(
  id: string,
  input: Partial<IntakeChannelInput> & { status?: CatalogStatus },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = normalizeText(input.name);
  if (input.channel_type !== undefined) payload.channel_type = input.channel_type;
  if (input.operator_id !== undefined) payload.operator_id = input.operator_id;
  if (input.phone_label !== undefined) payload.phone_label = normalizeText(input.phone_label);
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);
  if (input.status !== undefined) payload.status = input.status;
  const { error } = await supabase.from("intake_channels").update(payload).eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível atualizar o canal."));
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export async function listContracts(
  organizationId: string,
  filters: ContractFilters,
): Promise<PaginatedResult<ContractOverview>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("contracts_overview")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .range(from, to);

  query =
    filters.order === "oldest_received"
      ? query.order("received_at", { ascending: true })
      : query.order("received_at", { ascending: false });

  if (filters.regionId === "none") query = query.is("region_id", null);
  else if (filters.regionId !== "all") query = query.eq("region_id", filters.regionId);
  if (filters.consultantId !== "all") query = query.eq("consultant_id", filters.consultantId);
  if (filters.operatorId !== "all") query = query.eq("operator_id", filters.operatorId);
  if (filters.merchantId !== "all") query = query.eq("merchant_id", filters.merchantId);
  if (filters.month) query = query.eq("reference_month", monthStart(filters.month));

  if (filters.status === "queue") query = query.in("status", QUEUE_STATUSES);
  else if (filters.status !== "all") query = query.eq("status", filters.status);

  const term = sanitizeSearch(filters.search);
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `merchant_legal_name.ilike.${pattern},merchant_trade_name.ilike.${pattern},merchant_document.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar contratos."));

  return {
    rows: (data ?? []) as ContractOverview[],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getContract(id: string): Promise<ContractOverview | null> {
  const { data, error } = await supabase
    .from("contracts_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar o contrato."));
  return data as ContractOverview | null;
}

export async function getQueueCounts(
  organizationId: string,
): Promise<{ inReview: number; pending: number }> {
  const [review, pending] = await Promise.all([
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", QUEUE_STATUSES),
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending_correction"),
  ]);
  const error = review.error ?? pending.error;
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar a fila."));
  return { inReview: review.count ?? 0, pending: pending.count ?? 0 };
}

export async function listFolderSummary(organizationId: string): Promise<ContractFolderSummaryRow[]> {
  const { data, error } = await supabase
    .from("contract_folder_summary")
    .select("*")
    .eq("organization_id", organizationId);
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar as pastas."));
  return (data ?? []) as ContractFolderSummaryRow[];
}

/** Contratos não encerrados do mesmo lojista na mesma bandeira (aviso, não bloqueio — Q01). */
export async function listSimilarOpenContracts(
  merchantId: string,
  operatorId: string,
): Promise<Array<Pick<Contract, "id" | "status" | "signed_on">>> {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, status, signed_on")
    .eq("merchant_id", merchantId)
    .eq("operator_id", operatorId)
    .not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
  if (error) throw new Error(mapDomainError(error, "Não foi possível verificar contratos existentes."));
  return (data ?? []) as Array<Pick<Contract, "id" | "status" | "signed_on">>;
}

export async function updateContract(id: string, input: ContractInput): Promise<void> {
  const { error } = await supabase
    .from("contracts")
    .update({
      merchant_id: input.merchant_id,
      operator_id: input.operator_id,
      signed_on: input.signed_on,
      plan_name: normalizeText(input.plan_name),
      notes: normalizeText(input.notes),
    })
    .eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível atualizar o contrato."));
}

export async function changeContractStatus(
  id: string,
  status: ContractStatus,
  note: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("contracts")
    .update({ status, status_note: normalizeText(note) })
    .eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível alterar o status."));
}

export async function listStatusHistory(contractId: string): Promise<ContractStatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("contract_status_history")
    .select("*")
    .eq("contract_id", contractId)
    .order("changed_at", { ascending: false });
  if (error) throw new Error(mapDomainError(error, "Não foi possível carregar o histórico."));
  return (data ?? []) as ContractStatusHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Remessas e documentos
// ---------------------------------------------------------------------------

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  if (file.type === "application/pdf") return "pdf";
  return file.type.split("/")[1] ?? "bin";
}

export function validateContractFile(file: File): string | null {
  if (!(CONTRACT_FILE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: formato não permitido (envie PDF, JPG, PNG ou WEBP).`;
  }
  if (file.size > CONTRACT_FILE_MAX_BYTES) {
    return `${file.name}: arquivo acima de 10 MB.`;
  }
  return null;
}

async function uploadDocuments(
  organizationId: string,
  contractId: string,
  submissionId: string,
  files: File[],
): Promise<UploadResult> {
  const failures: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    const invalid = validateContractFile(file);
    if (invalid) {
      failures.push(invalid);
      continue;
    }

    const sha256 = await sha256Hex(file);
    const path = `${organizationId}/contracts/${contractId}/${crypto.randomUUID()}.${fileExtension(file)}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      failures.push(`${file.name}: ${mapDomainError(uploadError, "falha no envio.")}`);
      continue;
    }

    const { error } = await supabase.from("contract_documents").insert({
      organization_id: organizationId,
      contract_id: contractId,
      submission_id: submissionId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      sha256,
    });
    if (error) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      failures.push(`${file.name}: ${mapDomainError(error, "falha ao registrar.")}`);
      continue;
    }
    uploaded += 1;
  }

  return { uploaded, failures };
}

async function createSubmission(
  organizationId: string,
  contractId: string,
  input: SubmissionInput,
): Promise<ContractSubmission> {
  const { data, error } = await supabase
    .from("contract_submissions")
    .insert({
      organization_id: organizationId,
      contract_id: contractId,
      kind: input.kind,
      channel_id: input.channel_id,
      received_at: new Date(input.received_at).toISOString(),
      notes: normalizeText(input.notes),
    })
    .select("*")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível registrar a remessa."));
  return data as ContractSubmission;
}

/** Cria o contrato (aguardando conferência), a remessa inicial e envia os arquivos. */
export async function receiveContract(
  organizationId: string,
  contract: ContractInput,
  submission: Omit<SubmissionInput, "kind">,
  files: File[],
): Promise<{ contractId: string } & UploadResult> {
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      organization_id: organizationId,
      merchant_id: contract.merchant_id,
      operator_id: contract.operator_id,
      signed_on: contract.signed_on,
      plan_name: normalizeText(contract.plan_name),
      notes: normalizeText(contract.notes),
      status: "awaiting_review",
      received_at: new Date(submission.received_at).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(mapDomainError(error, "Não foi possível criar o contrato."));

  const contractId = (data as { id: string }).id;
  const created = await createSubmission(organizationId, contractId, { ...submission, kind: "initial" });
  const result = await uploadDocuments(organizationId, contractId, created.id, files);
  return { contractId, ...result };
}

export async function addSubmission(
  organizationId: string,
  contractId: string,
  input: SubmissionInput,
  files: File[],
): Promise<UploadResult> {
  const created = await createSubmission(organizationId, contractId, input);
  return uploadDocuments(organizationId, contractId, created.id, files);
}

export async function listSubmissions(contractId: string): Promise<ContractSubmission[]> {
  const { data, error } = await supabase
    .from("contract_submissions")
    .select("*")
    .eq("contract_id", contractId)
    .order("received_at", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar as remessas."));
  return (data ?? []) as ContractSubmission[];
}

export async function listDocuments(contractId: string): Promise<ContractDocument[]> {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar os documentos."));
  return (data ?? []) as ContractDocument[];
}

/** Arquivos já existentes na organização com os mesmos hashes (aviso de duplicidade). */
export async function findDocumentsByHash(
  organizationId: string,
  hashes: string[],
): Promise<Array<Pick<ContractDocument, "contract_id" | "file_name" | "sha256">>> {
  if (hashes.length === 0) return [];
  const { data, error } = await supabase
    .from("contract_documents")
    .select("contract_id, file_name, sha256")
    .eq("organization_id", organizationId)
    .is("discarded_at", null)
    .in("sha256", hashes);
  if (error) throw new Error(mapDomainError(error, "Não foi possível verificar duplicidade."));
  return (data ?? []) as Array<Pick<ContractDocument, "contract_id" | "file_name" | "sha256">>;
}

export async function getDocumentUrl(document: ContractDocument): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, 60);
  if (error || !data) throw new Error(mapDomainError(error, "Não foi possível abrir o documento."));
  return data.signedUrl;
}

/** URLs assinadas curtas para miniaturas de imagens. */
export async function getPreviewUrls(documents: ContractDocument[]): Promise<Record<string, string>> {
  const images = documents.filter((d) => d.mime_type.startsWith("image/"));
  if (images.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(
      images.map((d) => d.storage_path),
      300,
    );
  if (error || !data) return {};
  const byPath = new Map(data.map((item) => [item.path, item.signedUrl]));
  const result: Record<string, string> = {};
  for (const image of images) {
    const url = byPath.get(image.storage_path);
    if (url) result[image.id] = url;
  }
  return result;
}

export async function discardDocument(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("contract_documents")
    .update({ discard_reason: reason.trim(), discarded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível descartar o documento."));
}

// ---------------------------------------------------------------------------
// Pendências
// ---------------------------------------------------------------------------

export async function listPendencies(contractId: string): Promise<ContractPendency[]> {
  const { data, error } = await supabase
    .from("contract_pendencies")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(mapDomainError(error, "Não foi possível listar as pendências."));
  return (data ?? []) as ContractPendency[];
}

export async function openPendency(
  organizationId: string,
  contractId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.from("contract_pendencies").insert({
    organization_id: organizationId,
    contract_id: contractId,
    reason: reason.trim(),
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível abrir a pendência."));
}

export async function closePendency(
  id: string,
  status: Exclude<PendencyStatus, "open">,
  note: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("contract_pendencies")
    .update({ status, resolution_note: normalizeText(note) })
    .eq("id", id);
  if (error) throw new Error(mapDomainError(error, "Não foi possível encerrar a pendência."));
}
