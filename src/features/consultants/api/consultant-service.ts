import { supabase } from "@/lib/supabase";
import {
  normalizeDocument,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "@/lib/normalize";
import { mapDomainError } from "@/features/consultants/utils/map-domain-error";
import type {
  Consultant,
  ConsultantFilters,
  ConsultantListItem,
  ConsultantStatus,
  PaginatedResult,
} from "@/features/consultants/types/consultant";
import type { AppRole, OrganizationMember, Profile } from "@/types/database";

export interface ConsultantInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  status: ConsultantStatus;
  notes?: string | null;
  user_id?: string | null;
}

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&");
}

export async function listConsultants(
  organizationId: string,
  filters: ConsultantFilters,
): Promise<PaginatedResult<ConsultantListItem>> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = supabase
    .from("consultants_with_counts")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true })
    .range(from, to);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const term = filters.search.trim();
  if (term) {
    const pattern = `%${escapeIlike(term)}%`;
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar consultores."));
  }

  return {
    rows: (data ?? []) as ConsultantListItem[],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getConsultant(id: string): Promise<ConsultantListItem | null> {
  const { data, error } = await supabase
    .from("consultants_with_counts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível carregar o consultor."));
  }
  return data as ConsultantListItem | null;
}

export async function createConsultant(
  organizationId: string,
  input: ConsultantInput,
): Promise<Consultant> {
  const payload = {
    organization_id: organizationId,
    full_name: normalizeText(input.full_name) ?? "",
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    document: normalizeDocument(input.document),
    status: input.status,
    notes: normalizeText(input.notes),
    user_id: input.user_id || null,
  };

  const { data, error } = await supabase.from("consultants").insert(payload).select("*").single();
  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível criar o consultor."));
  }
  return data as Consultant;
}

export async function updateConsultant(
  id: string,
  input: Partial<ConsultantInput>,
): Promise<Consultant> {
  const payload: Record<string, unknown> = {};
  if (input.full_name !== undefined) payload.full_name = normalizeText(input.full_name);
  if (input.email !== undefined) payload.email = normalizeEmail(input.email);
  if (input.phone !== undefined) payload.phone = normalizePhone(input.phone);
  if (input.document !== undefined) payload.document = normalizeDocument(input.document);
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);
  if (input.user_id !== undefined) payload.user_id = input.user_id || null;

  const { data, error } = await supabase
    .from("consultants")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível atualizar o consultor."));
  }
  return data as Consultant;
}

export async function setConsultantStatus(
  id: string,
  status: ConsultantStatus,
): Promise<Consultant> {
  return updateConsultant(id, { status });
}

export async function listActiveConsultantsForSelect(
  organizationId: string,
): Promise<Array<Pick<Consultant, "id" | "full_name" | "status">>> {
  const { data, error } = await supabase
    .from("consultants")
    .select("id, full_name, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível carregar consultores."));
  }
  return (data ?? []) as Array<Pick<Consultant, "id" | "full_name" | "status">>;
}

export async function listLinkableMembers(organizationId: string): Promise<
  Array<{ member: OrganizationMember; profile: Profile | null }>
> {
  const { data: membersData, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("role", ["consultant", "operator", "admin"] satisfies AppRole[])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar membros."));
  }

  const members = (membersData ?? []) as OrganizationMember[];
  const userIds = members.map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: linked } = await supabase
    .from("consultants")
    .select("user_id")
    .eq("organization_id", organizationId)
    .not("user_id", "is", null);

  const linkedSet = new Set(
    ((linked ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
  );

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(mapDomainError(profilesError, "Não foi possível carregar perfis."));
  }

  const profiles = (profilesData ?? []) as Profile[];
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return members
    .filter((m) => !linkedSet.has(m.user_id))
    .map((member) => ({
      member,
      profile: byId.get(member.user_id) ?? null,
    }));
}

export async function listMerchantsByConsultant(
  consultantId: string,
  limit = 20,
): Promise<Array<{ id: string; legal_name: string; trade_name: string | null; status: string }>> {
  const { data, error } = await supabase
    .from("merchants")
    .select("id, legal_name, trade_name, status")
    .eq("consultant_id", consultantId)
    .order("legal_name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar lojistas do consultor."));
  }
  return (data ?? []) as Array<{
    id: string;
    legal_name: string;
    trade_name: string | null;
    status: string;
  }>;
}
