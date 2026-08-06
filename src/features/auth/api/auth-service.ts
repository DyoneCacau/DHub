import type { Session, User } from "@supabase/supabase-js";

import { mapAuthError } from "@/features/auth/utils/map-auth-error";
import { supabase } from "@/lib/supabase";
import type { Organization, OrganizationMember, Profile } from "@/types/database";

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(mapAuthError(error));
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(mapAuthError(error));
  }
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o perfil.");
  }

  return data as Profile | null;
}

/**
 * Estratégia provisória multi-membership:
 * usa a membership active mais recente (updated_at desc).
 */
export async function fetchActiveMembership(
  userId: string,
): Promise<OrganizationMember | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a membership.");
  }

  return data as OrganizationMember | null;
}

export async function fetchAnyMembership(
  userId: string,
): Promise<OrganizationMember | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a membership.");
  }

  return data as OrganizationMember | null;
}

export async function fetchOrganization(
  organizationId: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar a organização.");
  }

  return data as Organization | null;
}

export async function updateOwnProfile(input: {
  full_name?: string | null;
  avatar_url?: string | null;
}): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name || null,
      avatar_url: input.avatar_url || null,
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível atualizar o perfil.");
  }

  return data as Profile;
}

export async function listOrganizationMembers(organizationId: string) {
  const { data: membersData, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Não foi possível listar os membros.");
  }

  const members = (membersData ?? []) as OrganizationMember[];
  const userIds = members.map((member) => member.user_id);
  if (userIds.length === 0) {
    return [] as Array<{ member: OrganizationMember; profile: Profile | null }>;
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    throw new Error("Não foi possível carregar os perfis dos membros.");
  }

  const profiles = (profilesData ?? []) as Profile[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return members.map((member) => ({
    member,
    profile: profileById.get(member.user_id) ?? null,
  }));
}

export type { User, Session };
