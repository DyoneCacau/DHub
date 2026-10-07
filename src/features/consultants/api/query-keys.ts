import type { ConsultantFilters, MerchantFilters } from "@/features/consultants/types/consultant";

export const consultantQueryKeys = {
  root: ["consultants"] as const,
  lists: () => [...consultantQueryKeys.root, "list"] as const,
  list: (organizationId: string, filters: ConsultantFilters) =>
    [...consultantQueryKeys.lists(), organizationId, filters] as const,
  details: () => [...consultantQueryKeys.root, "detail"] as const,
  detail: (id: string) => [...consultantQueryKeys.details(), id] as const,
  linkableMembers: (organizationId: string) =>
    [...consultantQueryKeys.root, "linkable-members", organizationId] as const,
};

export const merchantQueryKeys = {
  root: ["merchants"] as const,
  lists: () => [...merchantQueryKeys.root, "list"] as const,
  list: (organizationId: string, filters: MerchantFilters) =>
    [...merchantQueryKeys.lists(), organizationId, filters] as const,
  details: () => [...merchantQueryKeys.root, "detail"] as const,
  detail: (id: string) => [...merchantQueryKeys.details(), id] as const,
  documentMatches: (organizationId: string, document: string) =>
    [...merchantQueryKeys.root, "document", organizationId, document] as const,
};
