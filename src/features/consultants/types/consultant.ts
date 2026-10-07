export type ConsultantStatus = "active" | "inactive";
export type MerchantStatus = "active" | "inactive";

export interface Consultant {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  status: ConsultantStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConsultantListItem extends Consultant {
  merchant_count: number;
  active_merchant_count: number;
}

export interface ConsultantFilters {
  search: string;
  status: ConsultantStatus | "all";
  page: number;
  pageSize: number;
}

export interface Merchant {
  id: string;
  organization_id: string;
  consultant_id: string;
  legal_name: string;
  trade_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: MerchantStatus;
  postal_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MerchantListItem extends Merchant {
  consultant_name?: string | null;
}

export interface MerchantFilters {
  search: string;
  status: MerchantStatus | "all";
  consultantId: string | "all";
  state: string | "all";
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}
