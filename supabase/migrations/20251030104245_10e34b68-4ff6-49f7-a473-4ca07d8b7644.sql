-- Seed default role permissions for existing roles using active resources and actions
-- Idempotent: clears previous entries for these roles before inserting

DO $$
BEGIN
  -- Clear existing permissions for targeted roles to avoid duplicates
  DELETE FROM public.role_permissions
  WHERE role IN (
    'platform_owner'::app_role,
    'platform_support'::app_role,
    'tenant_owner'::app_role,
    'tenant_admin'::app_role,
    'security_admin'::app_role,
    'compliance_officer'::app_role,
    'project_owner'::app_role,
    'analyst'::app_role,
    'contributor'::app_role,
    'viewer'::app_role
  );

  -- Helper inserts
  -- 1) Full access = all active actions on all active resources
  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'platform_owner'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true
  WHERE r.is_active = true;

  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'tenant_owner'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true
  WHERE r.is_active = true;

  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'tenant_admin'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true
  WHERE r.is_active = true;

  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'security_admin'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true
  WHERE r.is_active = true;

  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'project_owner'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true
  WHERE r.is_active = true;

  -- 2) Read-only = list + read on all active resources
  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'platform_support'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true AND a.key IN ('list','read')
  WHERE r.is_active = true;

  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'viewer'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true AND a.key IN ('list','read')
  WHERE r.is_active = true;

  -- 3) Compliance officer = list + read + delete (for retention/cleanup workflows)
  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'compliance_officer'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true AND a.key IN ('list','read','delete')
  WHERE r.is_active = true;

  -- 4) Analyst = list + read + create + update
  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'analyst'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true AND a.key IN ('list','read','create','update')
  WHERE r.is_active = true;

  -- 5) Contributor = list + read + create + update
  INSERT INTO public.role_permissions (role, resource_key, action_key, allowed)
  SELECT 'contributor'::app_role, r.key, a.key, true
  FROM public.permission_resources r
  JOIN public.permission_actions a ON a.is_active = true AND a.key IN ('list','read','create','update')
  WHERE r.is_active = true;
END $$;