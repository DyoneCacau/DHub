import type { ContractFilters } from "@/features/contracts/types/contract";

export const contractQueryKeys = {
  root: ["contracts"] as const,
  list: (organizationId: string, filters: ContractFilters) =>
    [...contractQueryKeys.root, "list", organizationId, filters] as const,
  detail: (id: string) => [...contractQueryKeys.root, "detail", id] as const,
  folders: (organizationId: string) => [...contractQueryKeys.root, "folders", organizationId] as const,
  queueCounts: (organizationId: string) =>
    [...contractQueryKeys.root, "queue-counts", organizationId] as const,
  submissions: (contractId: string) => [...contractQueryKeys.root, "submissions", contractId] as const,
  documents: (contractId: string) => [...contractQueryKeys.root, "documents", contractId] as const,
  previews: (contractId: string, ids: string[]) =>
    [...contractQueryKeys.root, "previews", contractId, ids] as const,
  pendencies: (contractId: string) => [...contractQueryKeys.root, "pendencies", contractId] as const,
  history: (contractId: string) => [...contractQueryKeys.root, "history", contractId] as const,
  channels: (organizationId: string) => [...contractQueryKeys.root, "channels", organizationId] as const,
  similar: (merchantId: string, operatorId: string) =>
    [...contractQueryKeys.root, "similar", merchantId, operatorId] as const,
  duplicates: (organizationId: string, hashes: string[]) =>
    [...contractQueryKeys.root, "duplicates", organizationId, hashes] as const,
};
