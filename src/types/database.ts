export type AppRole = "admin" | "operator" | "consultant";
export type MembershipStatus = "active" | "inactive";
export type OrganizationStatus = "active" | "inactive";
export type ConsultantStatus = "active" | "inactive";
export type MerchantStatus = "active" | "inactive";
export type CatalogStatus = "active" | "inactive";

export type {
  Consultant,
  ConsultantListItem,
  ConsultantFilters,
  Merchant,
  MerchantListItem,
  MerchantFilters,
  PaginatedResult,
} from "@/features/consultants/types/consultant";

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

export interface Operator {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  status: CatalogStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Region {
  id: string;
  organization_id: string;
  name: string;
  state: string | null;
  status: CatalogStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConsultantOperator {
  organization_id: string;
  consultant_id: string;
  operator_id: string;
  created_at: string;
  created_by: string | null;
}

export interface ConsultantRegion {
  organization_id: string;
  consultant_id: string;
  region_id: string;
  created_at: string;
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
      consultants: {
        Row: import("@/features/consultants/types/consultant").Consultant;
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          document?: string | null;
          status?: ConsultantStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          user_id?: string | null;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          document?: string | null;
          status?: ConsultantStatus;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      merchants: {
        Row: import("@/features/consultants/types/consultant").Merchant;
        Insert: {
          id?: string;
          organization_id: string;
          consultant_id: string;
          legal_name: string;
          trade_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          status?: MerchantStatus;
          postal_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          consultant_id?: string;
          legal_name?: string;
          trade_name?: string | null;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          status?: MerchantStatus;
          postal_code?: string | null;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          district?: string | null;
          city?: string | null;
          state?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      operators: {
        Row: Operator;
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          status?: CatalogStatus;
          notes?: string | null;
        };
        Update: {
          name?: string;
          status?: CatalogStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      regions: {
        Row: Region;
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          state?: string | null;
          status?: CatalogStatus;
          notes?: string | null;
        };
        Update: {
          name?: string;
          state?: string | null;
          status?: CatalogStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      consultant_operators: {
        Row: ConsultantOperator;
        Insert: {
          organization_id: string;
          consultant_id: string;
          operator_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      consultant_regions: {
        Row: ConsultantRegion;
        Insert: {
          organization_id: string;
          consultant_id: string;
          region_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      consultants_with_counts: {
        Row: import("@/features/consultants/types/consultant").ConsultantListItem;
      };
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
      current_active_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      current_consultant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      membership_status: MembershipStatus;
      organization_status: OrganizationStatus;
      consultant_status: ConsultantStatus;
      merchant_status: MerchantStatus;
      catalog_status: CatalogStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
