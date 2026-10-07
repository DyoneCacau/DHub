import type { ContractOverview } from "@/features/contracts/types/contract";

/** Parâmetros da URL da navegação por pastas: r=região (ou "none"), c=consultor, o=bandeira, m=AAAA-MM. */
export interface FolderPath {
  regionId: string | null;
  consultantId: string | null;
  operatorId: string | null;
  month: string | null;
}

export const NO_REGION = "none";

export function folderSearch(path: Partial<FolderPath>): string {
  const params = new URLSearchParams();
  if (path.regionId) params.set("r", path.regionId);
  if (path.regionId && path.consultantId) params.set("c", path.consultantId);
  if (path.regionId && path.consultantId && path.operatorId) params.set("o", path.operatorId);
  if (path.regionId && path.consultantId && path.operatorId && path.month) params.set("m", path.month);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function folderLink(contract: ContractOverview, depth: 1 | 2 | 3 | 4): string {
  return `/contratos${folderSearch({
    regionId: contract.region_id ?? NO_REGION,
    consultantId: depth >= 2 ? contract.consultant_id : null,
    operatorId: depth >= 3 ? contract.operator_id : null,
    month: depth >= 4 ? contract.reference_month.slice(0, 7) : null,
  })}`;
}
