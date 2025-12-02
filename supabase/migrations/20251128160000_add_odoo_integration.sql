-- Add Odoo integration fields to companies table

-- Add odoo_partner_id to track synced companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS odoo_partner_id integer;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_odoo_partner_id 
ON companies(odoo_partner_id) 
WHERE odoo_partner_id IS NOT NULL;

-- Add last_odoo_sync timestamp
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS odoo_synced_at timestamptz;

-- Comment
COMMENT ON COLUMN companies.odoo_partner_id IS 'Odoo res.partner ID for synced companies';
COMMENT ON COLUMN companies.odoo_synced_at IS 'Last sync timestamp with Odoo';

