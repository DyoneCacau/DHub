export const catalogQueryKeys = {
  root: ["catalogs"] as const,
  operators: (organizationId: string) =>
    [...catalogQueryKeys.root, "operators", organizationId] as const,
  regions: (organizationId: string) =>
    [...catalogQueryKeys.root, "regions", organizationId] as const,
  consultantLinks: (consultantIds: string[]) =>
    [...catalogQueryKeys.root, "consultant-links", consultantIds] as const,
  consultantIdsByFilter: (organizationId: string, regionId: string, operatorId: string) =>
    [...catalogQueryKeys.root, "consultant-ids", organizationId, regionId, operatorId] as const,
};
