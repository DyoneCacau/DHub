import { supabase } from "@/lib/supabase";
import {
  normalizeDocument,
  normalizeEmail,
  normalizePhone,
  normalizePostalCode,
  normalizeText,
  normalizeUf,
  normalizeWhatsapp,
} from "@/lib/normalize";
import { mapDomainError } from "@/features/consultants/utils/map-domain-error";
import type {
  Merchant,
  MerchantFilters,
  MerchantListItem,
  MerchantStatus,
  PaginatedResult,
} from "@/features/merchants/types/merchant";

export interface MerchantInput {
  legal_name: string;
  trade_name?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  status: MerchantStatus;
  consultant_id: string;
  postal_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
}

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&");
}

function toPayload(organizationId: string, input: MerchantInput) {
  return {
    organization_id: organizationId,
    consultant_id: input.consultant_id,
    legal_name: normalizeText(input.legal_name) ?? "",
    trade_name: normalizeText(input.trade_name),
    document: normalizeDocument(input.document),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    whatsapp: normalizeWhatsapp(input.whatsapp),
    status: input.status,
    postal_code: normalizePostalCode(input.postal_code),
    street: normalizeText(input.street),
    number: normalizeText(input.number),
    complement: normalizeText(input.complement),
    district: normalizeText(input.district),
    city: normalizeText(input.city),
    state: normalizeUf(input.state),
    notes: normalizeText(input.notes),
  };
}

export async function listMerchants(
  organizationId: string,
  filters: MerchantFilters,
): Promise<PaginatedResult<MerchantListItem>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("merchants")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("legal_name", { ascending: true })
    .range(from, to);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.consultantId !== "all") {
    query = query.eq("consultant_id", filters.consultantId);
  }
  if (filters.state !== "all") {
    query = query.eq("state", filters.state);
  }

  const term = filters.search.trim();
  if (term) {
    const pattern = `%${escapeIlike(term)}%`;
    query = query.or(
      `legal_name.ilike.${pattern},trade_name.ilike.${pattern},document.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar lojistas."));
  }

  const rows = (data ?? []) as Merchant[];
  const consultantIds = [...new Set(rows.map((r) => r.consultant_id))];
  let nameById = new Map<string, string>();

  if (consultantIds.length > 0) {
    const { data: consultants } = await supabase
      .from("consultants")
      .select("id, full_name")
      .in("id", consultantIds);
    nameById = new Map(
      ((consultants ?? []) as Array<{ id: string; full_name: string }>).map((c) => [
        c.id,
        c.full_name,
      ]),
    );
  }

  return {
    rows: rows.map((row) => ({
      ...row,
      consultant_name: nameById.get(row.consultant_id) ?? null,
    })),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export interface MerchantOption {
  id: string;
  legal_name: string;
  trade_name: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  status: MerchantStatus;
}

export async function listMerchantsForSelect(
  organizationId: string,
  consultantId: string,
): Promise<MerchantOption[]> {
  const { data, error } = await supabase
    .from("merchants")
    .select("id, legal_name, trade_name, document, city, state, status")
    .eq("organization_id", organizationId)
    .eq("consultant_id", consultantId)
    .order("legal_name", { ascending: true });
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar lojistas do consultor."));
  }
  return (data ?? []) as MerchantOption[];
}

export async function getMerchant(id: string): Promise<MerchantListItem | null> {
  const { data, error } = await supabase.from("merchants").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível carregar o lojista."));
  }
  if (!data) return null;
  const merchant = data as Merchant;

  const { data: consultant } = await supabase
    .from("consultants")
    .select("full_name")
    .eq("id", merchant.consultant_id)
    .maybeSingle();

  return {
    ...merchant,
    consultant_name: (consultant as { full_name?: string } | null)?.full_name ?? null,
  };
}

export async function createMerchant(
  organizationId: string,
  input: MerchantInput,
): Promise<Merchant> {
  const { data, error } = await supabase
    .from("merchants")
    .insert(toPayload(organizationId, input))
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível criar o lojista."));
  }
  return data as Merchant;
}

export async function updateMerchant(id: string, input: Partial<MerchantInput>): Promise<Merchant> {
  const payload: Record<string, unknown> = {};
  if (input.legal_name !== undefined) payload.legal_name = normalizeText(input.legal_name);
  if (input.trade_name !== undefined) payload.trade_name = normalizeText(input.trade_name);
  if (input.document !== undefined) payload.document = normalizeDocument(input.document);
  if (input.email !== undefined) payload.email = normalizeEmail(input.email);
  if (input.phone !== undefined) payload.phone = normalizePhone(input.phone);
  if (input.whatsapp !== undefined) payload.whatsapp = normalizeWhatsapp(input.whatsapp);
  if (input.status !== undefined) payload.status = input.status;
  if (input.consultant_id !== undefined) payload.consultant_id = input.consultant_id;
  if (input.postal_code !== undefined) payload.postal_code = normalizePostalCode(input.postal_code);
  if (input.street !== undefined) payload.street = normalizeText(input.street);
  if (input.number !== undefined) payload.number = normalizeText(input.number);
  if (input.complement !== undefined) payload.complement = normalizeText(input.complement);
  if (input.district !== undefined) payload.district = normalizeText(input.district);
  if (input.city !== undefined) payload.city = normalizeText(input.city);
  if (input.state !== undefined) payload.state = normalizeUf(input.state);
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);

  const { data, error } = await supabase
    .from("merchants")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível atualizar o lojista."));
  }
  return data as Merchant;
}

export async function setMerchantStatus(id: string, status: MerchantStatus): Promise<Merchant> {
  return updateMerchant(id, { status });
}

export async function changeMerchantConsultant(
  id: string,
  consultantId: string,
): Promise<Merchant> {
  return updateMerchant(id, { consultant_id: consultantId });
}

export async function findMerchantsByDocument(
  organizationId: string,
  document: string,
  excludeId?: string,
): Promise<Array<Pick<Merchant, "id" | "legal_name" | "document">>> {
  const normalized = normalizeDocument(document);
  if (!normalized) return [];

  let query = supabase
    .from("merchants")
    .select("id, legal_name, document")
    .eq("organization_id", organizationId)
    .eq("document", normalized)
    .limit(5);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível verificar documento."));
  }
  return (data ?? []) as Array<Pick<Merchant, "id" | "legal_name" | "document">>;
}
