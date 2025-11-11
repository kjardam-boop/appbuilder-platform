-- Add archived_at column to external_systems table
ALTER TABLE public.external_systems 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- Add archived_at column to external_system_vendors table
ALTER TABLE public.external_system_vendors 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance on archived items
CREATE INDEX IF NOT EXISTS idx_external_systems_archived_at ON public.external_systems(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_system_vendors_archived_at ON public.external_system_vendors(archived_at) WHERE archived_at IS NOT NULL;