-- Add credentials field to company_external_systems table
ALTER TABLE public.company_external_systems
ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}'::jsonb;