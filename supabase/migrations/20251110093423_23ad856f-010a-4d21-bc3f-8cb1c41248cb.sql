-- Function to check if user has any admin permissions
-- Used to determine if user should see admin panel at all
CREATE OR REPLACE FUNCTION public.user_has_admin_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = p_user_id
      AND rp.action_key = 'admin'
      AND rp.allowed = true
  );
$$;