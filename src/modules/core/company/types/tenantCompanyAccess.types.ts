import { BaseEntity } from "@/core/types/common.types";

export type TenantCompanyAccessType = 'view' | 'edit' | 'owner';

export interface TenantCompanyAccess extends BaseEntity {
  tenant_id: string;
  company_id: string;
  access_type: TenantCompanyAccessType;
  granted_by: string | null;
  granted_at: string;
}

export const ACCESS_TYPE_LABELS: Record<TenantCompanyAccessType, string> = {
  view: 'Lesetilgang',
  edit: 'Redigeringstilgang',
  owner: 'Eier',
};
