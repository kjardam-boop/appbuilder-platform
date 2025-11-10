-- RLS policies for mcp_tenant_workflow_map are already well-configured
-- Adding additional policies for more granular access control

-- Allow all authenticated tenant members to VIEW workflows (read-only)
-- This gives transparency while keeping modification restricted
CREATE POLICY "Tenant members can view workflow maps"
ON public.mcp_tenant_workflow_map
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.scope_type = 'tenant'
      AND user_roles.scope_id = mcp_tenant_workflow_map.tenant_id
  )
);

-- Allow project owners to view workflows in their tenant
-- (This is already covered by the policy above, but making it explicit)
COMMENT ON POLICY "Tenant members can view workflow maps" 
ON public.mcp_tenant_workflow_map 
IS 'All authenticated users with ANY role in a tenant can view that tenant''s workflow mappings. Only tenant admins and platform admins can modify.';

-- Add helper function to check if user can manage workflows
CREATE OR REPLACE FUNCTION public.can_manage_workflows(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Platform admins can manage all
  SELECT is_platform_admin(auth.uid())
  OR
  -- Tenant admins can manage their own
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND scope_type = 'tenant'
      AND scope_id = _tenant_id
      AND role IN ('tenant_owner', 'tenant_admin')
  );
$$;

COMMENT ON FUNCTION public.can_manage_workflows IS 'Check if current user can manage workflow mappings for a given tenant';

-- Add column to track who last modified
ALTER TABLE public.mcp_tenant_workflow_map 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.mcp_tenant_workflow_map.updated_by 
IS 'User who last updated this workflow mapping';

-- Create trigger to auto-update updated_by
CREATE OR REPLACE FUNCTION public.update_workflow_map_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_workflow_map_audit_trigger ON public.mcp_tenant_workflow_map;

CREATE TRIGGER update_workflow_map_audit_trigger
BEFORE UPDATE ON public.mcp_tenant_workflow_map
FOR EACH ROW
EXECUTE FUNCTION public.update_workflow_map_audit();