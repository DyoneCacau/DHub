import { supabase } from "@/lib/supabase";
import { normalizeText, normalizeUf } from "@/lib/normalize";
import { mapDomainError } from "@/features/consultants/utils/map-domain-error";
import type {
  CatalogStatus,
  ConsultantOperator,
  ConsultantRegion,
  Operator,
  Region,
} from "@/types/database";

export interface OperatorInput {
  name: string;
  code: string;
  notes?: string | null;
}

export interface RegionInput {
  name: string;
  state?: string | null;
  notes?: string | null;
}

export async function listOperators(organizationId: string): Promise<Operator[]> {
  const { data, error } = await supabase
    .from("operators")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar bandeiras."));
  }
  return (data ?? []) as Operator[];
}

export async function createOperator(
  organizationId: string,
  input: OperatorInput,
): Promise<Operator> {
  const { data, error } = await supabase
    .from("operators")
    .insert({
      organization_id: organizationId,
      name: normalizeText(input.name) ?? "",
      code: input.code.trim().toLowerCase(),
      notes: normalizeText(input.notes),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível criar a bandeira."));
  }
  return data as Operator;
}

export async function updateOperator(
  id: string,
  input: { name?: string; notes?: string | null; status?: CatalogStatus },
): Promise<Operator> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = normalizeText(input.name);
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("operators")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível atualizar a bandeira."));
  }
  return data as Operator;
}

export async function listRegions(organizationId: string): Promise<Region[]> {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível listar regiões."));
  }
  return (data ?? []) as Region[];
}

export async function createRegion(organizationId: string, input: RegionInput): Promise<Region> {
  const { data, error } = await supabase
    .from("regions")
    .insert({
      organization_id: organizationId,
      name: normalizeText(input.name) ?? "",
      state: normalizeUf(input.state),
      notes: normalizeText(input.notes),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível criar a região."));
  }
  return data as Region;
}

export async function updateRegion(
  id: string,
  input: { name?: string; state?: string | null; notes?: string | null; status?: CatalogStatus },
): Promise<Region> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = normalizeText(input.name);
  if (input.state !== undefined) payload.state = normalizeUf(input.state);
  if (input.notes !== undefined) payload.notes = normalizeText(input.notes);
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("regions")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(mapDomainError(error, "Não foi possível atualizar a região."));
  }
  return data as Region;
}

export interface ConsultantLinks {
  operators: ConsultantOperator[];
  regions: ConsultantRegion[];
}

export async function listConsultantLinks(consultantIds: string[]): Promise<ConsultantLinks> {
  if (consultantIds.length === 0) {
    return { operators: [], regions: [] };
  }

  const [operatorsResult, regionsResult] = await Promise.all([
    supabase.from("consultant_operators").select("*").in("consultant_id", consultantIds),
    supabase.from("consultant_regions").select("*").in("consultant_id", consultantIds),
  ]);

  if (operatorsResult.error) {
    throw new Error(mapDomainError(operatorsResult.error, "Não foi possível carregar bandeiras do consultor."));
  }
  if (regionsResult.error) {
    throw new Error(mapDomainError(regionsResult.error, "Não foi possível carregar regiões do consultor."));
  }

  return {
    operators: (operatorsResult.data ?? []) as ConsultantOperator[],
    regions: (regionsResult.data ?? []) as ConsultantRegion[],
  };
}

/** IDs de consultores que atendem a região e/ou bandeira; null = sem filtro. */
export async function listConsultantIdsByFilter(
  organizationId: string,
  regionId: string | null,
  operatorId: string | null,
): Promise<string[] | null> {
  if (!regionId && !operatorId) return null;

  let ids: Set<string> | null = null;

  if (regionId) {
    const { data, error } = await supabase
      .from("consultant_regions")
      .select("consultant_id")
      .eq("organization_id", organizationId)
      .eq("region_id", regionId);
    if (error) throw new Error(mapDomainError(error, "Não foi possível filtrar por região."));
    ids = new Set(((data ?? []) as Array<{ consultant_id: string }>).map((row) => row.consultant_id));
  }

  if (operatorId) {
    const { data, error } = await supabase
      .from("consultant_operators")
      .select("consultant_id")
      .eq("organization_id", organizationId)
      .eq("operator_id", operatorId);
    if (error) throw new Error(mapDomainError(error, "Não foi possível filtrar por bandeira."));
    const byOperator = ((data ?? []) as Array<{ consultant_id: string }>).map(
      (row) => row.consultant_id,
    );
    ids = ids ? new Set(byOperator.filter((id) => ids?.has(id))) : new Set(byOperator);
  }

  return [...(ids ?? [])];
}

export async function addConsultantOperator(
  organizationId: string,
  consultantId: string,
  operatorId: string,
): Promise<void> {
  const { error } = await supabase.from("consultant_operators").insert({
    organization_id: organizationId,
    consultant_id: consultantId,
    operator_id: operatorId,
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível vincular a bandeira."));
}

export async function removeConsultantOperator(
  consultantId: string,
  operatorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("consultant_operators")
    .delete()
    .eq("consultant_id", consultantId)
    .eq("operator_id", operatorId);
  if (error) throw new Error(mapDomainError(error, "Não foi possível remover a bandeira."));
}

export async function addConsultantRegion(
  organizationId: string,
  consultantId: string,
  regionId: string,
): Promise<void> {
  const { error } = await supabase.from("consultant_regions").insert({
    organization_id: organizationId,
    consultant_id: consultantId,
    region_id: regionId,
  });
  if (error) throw new Error(mapDomainError(error, "Não foi possível vincular a região."));
}

export async function removeConsultantRegion(
  consultantId: string,
  regionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("consultant_regions")
    .delete()
    .eq("consultant_id", consultantId)
    .eq("region_id", regionId);
  if (error) throw new Error(mapDomainError(error, "Não foi possível remover a região."));
}
