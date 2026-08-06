import { useContext } from "react";

import {
  AuthContext,
  type AuthContextValue,
} from "@/features/auth/hooks/auth-context";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
