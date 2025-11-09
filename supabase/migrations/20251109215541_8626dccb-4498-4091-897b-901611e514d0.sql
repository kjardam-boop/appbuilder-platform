-- Add intended_role column to invitations table for platform role assignment
ALTER TABLE public.invitations 
ADD COLUMN intended_role app_role;

-- Create jul25_invitations table for jul25-specific invitation tracking
CREATE TABLE public.jul25_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text,
  phone text,
  family_id uuid REFERENCES jul25_families(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for jul25_invitations
CREATE INDEX idx_jul25_invitations_token ON jul25_invitations(token);
CREATE INDEX idx_jul25_invitations_status ON jul25_invitations(status);
CREATE INDEX idx_jul25_invitations_email ON jul25_invitations(email);
CREATE INDEX idx_jul25_invitations_phone ON jul25_invitations(phone);

-- Enable RLS on jul25_invitations
ALTER TABLE jul25_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can read invitation by token (needed for public signup flow)
CREATE POLICY "Anyone can read jul25 invitation by token"
ON jul25_invitations FOR SELECT
USING (true);

-- Jul25 app admins can create invitations
CREATE POLICY "Jul25 app admins can create invitations"
ON jul25_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'app'
    AND role = 'app_admin'
    AND scope_id IN (
      SELECT id FROM applications WHERE app_type = 'jul25'
    )
  )
  OR is_platform_admin(auth.uid())
);

-- Jul25 app admins can update invitations
CREATE POLICY "Jul25 app admins can update invitations"
ON jul25_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'app'
    AND role = 'app_admin'
    AND scope_id IN (
      SELECT id FROM applications WHERE app_type = 'jul25'
    )
  )
  OR is_platform_admin(auth.uid())
);

-- Jul25 app admins can view all invitations
CREATE POLICY "Jul25 app admins can view invitations"
ON jul25_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND scope_type = 'app'
    AND role = 'app_admin'
    AND scope_id IN (
      SELECT id FROM applications WHERE app_type = 'jul25'
    )
  )
  OR is_platform_admin(auth.uid())
);

-- Trigger for jul25_invitations updated_at
CREATE TRIGGER update_jul25_invitations_updated_at
BEFORE UPDATE ON jul25_invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-assign platform role when invitation is accepted
CREATE OR REPLACE FUNCTION assign_role_on_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If invitation has intended_role, assign it to the user
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.accepted_by IS NOT NULL THEN
    IF NEW.intended_role IS NOT NULL THEN
      -- Get platform tenant ID
      INSERT INTO user_roles (user_id, role, scope_type, scope_id)
      VALUES (
        NEW.accepted_by, 
        NEW.intended_role, 
        'tenant'::role_scope,
        (SELECT id FROM tenants WHERE is_platform_tenant = true LIMIT 1)
      )
      ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to assign role when platform invitation is accepted
CREATE TRIGGER trigger_assign_role_on_invitation_accepted
AFTER UPDATE OF status ON invitations
FOR EACH ROW
EXECUTE FUNCTION assign_role_on_invitation_accepted();

-- Function to auto-assign jul25 app access when jul25 invitation is accepted
CREATE OR REPLACE FUNCTION grant_jul25_access_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id uuid;
BEGIN
  -- If jul25 invitation is accepted
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.accepted_by IS NOT NULL THEN
    -- Find jul25 application
    SELECT id INTO app_id
    FROM applications
    WHERE app_type = 'jul25'
    LIMIT 1;

    -- If app exists, grant app_user role
    IF app_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role, scope_type, scope_id)
      VALUES (NEW.accepted_by, 'app_user'::app_role, 'app'::role_scope, app_id)
      ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to assign jul25 access when jul25 invitation is accepted
CREATE TRIGGER trigger_grant_jul25_access
AFTER UPDATE OF status ON jul25_invitations
FOR EACH ROW
EXECUTE FUNCTION grant_jul25_access_on_signup();