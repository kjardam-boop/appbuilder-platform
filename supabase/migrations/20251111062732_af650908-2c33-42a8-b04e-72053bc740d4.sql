-- Add config field to company_external_systems table for integration-specific configuration
ALTER TABLE public.company_external_systems
ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;