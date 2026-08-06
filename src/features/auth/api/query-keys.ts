export const authQueryKeys = {
  root: ["auth"] as const,
  profile: (userId: string) => ["auth", "profile", userId] as const,
  membership: (userId: string) => ["auth", "membership", userId] as const,
  organization: (organizationId: string) =>
    ["auth", "organization", organizationId] as const,
  members: (organizationId: string) => ["auth", "members", organizationId] as const,
};

export function clearAuthQueries(
  queryClient: { removeQueries: (filters: { queryKey: readonly unknown[] }) => void },
) {
  queryClient.removeQueries({ queryKey: authQueryKeys.root });
}
