import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

import type { AuthAccessState } from "@/features/auth/types/auth";
import type {
  AppRole,
  Organization,
  OrganizationMember,
  Profile,
} from "@/types/database";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  membership: OrganizationMember | null;
  organization: Organization | null;
  role: AppRole | null;
  accessState: AuthAccessState;
  isAuthenticated: boolean;
  isReady: boolean;
  isInitializing: boolean;
  errorMessage: string | null;
  refreshAccess: () => Promise<AuthAccessState>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
