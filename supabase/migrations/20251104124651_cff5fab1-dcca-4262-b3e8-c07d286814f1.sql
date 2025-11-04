-- Add technical implementation fields to capabilities table
ALTER TABLE capabilities
ADD COLUMN IF NOT EXISTS frontend_files text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS backend_files text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hooks text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS domain_tables text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS database_migrations text[] DEFAULT '{}';