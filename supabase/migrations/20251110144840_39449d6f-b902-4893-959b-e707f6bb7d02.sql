-- Replace 'supplier' with 'external_system_vendor' in company_roles array
UPDATE companies
SET company_roles = array_replace(company_roles, 'supplier'::text, 'external_system_vendor'::text)
WHERE 'supplier' = ANY(company_roles);