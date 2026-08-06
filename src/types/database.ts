export type AppRole = "admin" | "operator" | "consultant";
export type MembershipStatus = "active" | "inactive";
export type OrganizationStatus = "active" | "inactive";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Tipos mínimos alinhados ao schema Sprint 2.
 * Geração automática (`supabase gen types`) fica para quando o link remoto estiver autorizado.
 */
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: OrganizationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          status?: OrganizationStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          status?: MembershipStatus;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          role?: AppRole;
          status?: MembershipStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_active_membership: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      is_active_member_of_any_org: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      membership_status: MembershipStatus;
      organization_status: OrganizationStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
