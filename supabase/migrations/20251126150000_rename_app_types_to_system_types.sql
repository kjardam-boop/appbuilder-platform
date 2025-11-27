-- Rename app_types to system_types in external_systems table
-- This aligns terminology: "system types" for external systems (ERP, CRM, etc.)
-- while "app types" is reserved for platform applications (global, custom, platform)

-- Rename the column
ALTER TABLE public.external_systems 
  RENAME COLUMN app_types TO system_types;

-- Update any comments
COMMENT ON COLUMN public.external_systems.system_types IS 
  'Types of system: ERP, CRM, EmailSuite, HRPayroll, BI, iPaaS, CMS, eCommerce, WMS, TMS, PLM, MES, ITSM, IAM, RPA, ProjectMgmt, ServiceMgmt';

-- Note: No data migration needed as the column just gets renamed

