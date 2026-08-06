import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  fetchActiveMembership,
  fetchAnyMembership,
  fetchOrganization,
  fetchProfile,
  onAuthStateChange,
  getSession,
  signOut as authSignOut,
} from "@/features/auth/api/auth-service";
import { clearAuthQueries } from "@/features/auth/api/query-keys";
import {
  AuthContext,
  type AuthContextValue,
} from "@/features/auth/hooks/auth-context";
import type { AuthAccessState } from "@/features/auth/types/auth";
import type { Organization, OrganizationMember, Profile } from "@/types/database";

async function loadAccess(userId: string): Promise<{
  profile: Profile | null;
  membership: OrganizationMember | null;
  organization: Organization | null;
  accessState: AuthAccessState;
  errorMessage: string | null;
}> {
  try {
    const profile = await fetchProfile(userId);
    const activeMembership = await fetchActiveMembership(userId);

    if (activeMembership) {
      const organization = await fetchOrganization(activeMembership.organization_id);
      return {
        profile,
        membership: activeMembership,
        organization,
        accessState: "ready",
        errorMessage: null,
      };
    }

    const anyMembership = await fetchAnyMembership(userId);
    if (anyMembership && anyMembership.status === "inactive") {
      return {
        profile,
        membership: anyMembership,
        organization: null,
        accessState: "membership_inactive",
        errorMessage: null,
      };
    }

    return {
      profile,
      membership: null,
      organization: null,
      accessState: "authenticated_no_membership",
      errorMessage: null,
    };
  } catch {
    return {
      profile: null,
      membership: null,
      organization: null,
      accessState: "profile_error",
      errorMessage: "Não foi possível carregar o perfil ou a membership.",
    };
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [accessState, setAccessState] = useState<AuthAccessState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setMembership(null);
      setOrganization(null);
      setErrorMessage(null);
      setAccessState("unauthenticated");
      return;
    }

    const access = await loadAccess(nextSession.user.id);
    setProfile(access.profile);
    setMembership(access.membership);
    setOrganization(access.organization);
    setAccessState(access.accessState);
    setErrorMessage(access.errorMessage);
  }, []);

  const refreshAccess = useCallback(async () => {
    const current = await getSession();
    if (!current?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setMembership(null);
      setOrganization(null);
      setErrorMessage(null);
      setAccessState("unauthenticated");
      return "unauthenticated" as const;
    }

    setSession(current);
    setUser(current.user);
    const access = await loadAccess(current.user.id);
    setProfile(access.profile);
    setMembership(access.membership);
    setOrganization(access.organization);
    setAccessState(access.accessState);
    setErrorMessage(access.errorMessage);
    return access.accessState;
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const current = await getSession();
        if (!active) {
          return;
        }
        await applySession(current);
      } catch {
        if (!active) {
          return;
        }
        setAccessState("profile_error");
        setErrorMessage("Falha ao restaurar a sessão.");
      } finally {
        if (active) {
          setBootstrapped(true);
        }
      }
    })();

    const { data } = onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const logout = useCallback(async () => {
    await authSignOut();
    clearAuthQueries(queryClient);
    setProfile(null);
    setMembership(null);
    setOrganization(null);
    setSession(null);
    setUser(null);
    setAccessState("unauthenticated");
    setErrorMessage(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      membership,
      organization,
      role: membership?.status === "active" ? membership.role : null,
      accessState: bootstrapped ? accessState : "initializing",
      isAuthenticated: Boolean(user),
      isReady: bootstrapped && accessState === "ready",
      isInitializing: !bootstrapped || accessState === "initializing",
      errorMessage,
      refreshAccess,
      logout,
    }),
    [
      user,
      session,
      profile,
      membership,
      organization,
      accessState,
      bootstrapped,
      errorMessage,
      refreshAccess,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
