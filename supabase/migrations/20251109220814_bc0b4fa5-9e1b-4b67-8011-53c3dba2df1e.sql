-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can update own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Platform admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can create invitations" ON public.invitations;

-- Restrict SELECT to platform admins only
CREATE POLICY "Platform admins can view all invitations"
  ON public.invitations
  FOR SELECT
  USING (
    public.is_platform_admin(auth.uid())
  );

-- Platform admins can insert invitations
CREATE POLICY "Platform admins can create invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK (
    public.is_platform_admin(auth.uid())
  );

-- Platform admins can update invitations
CREATE POLICY "Platform admins can update invitations"
  ON public.invitations
  FOR UPDATE
  USING (
    public.is_platform_admin(auth.uid())
  );

-- Platform admins can delete invitations
CREATE POLICY "Platform admins can delete invitations"
  ON public.invitations
  FOR DELETE
  USING (
    public.is_platform_admin(auth.uid())
  );

-- Create secure function to validate invitation token for signup
CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  _token uuid,
  _email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
BEGIN
  -- Fetch invitation by token
  SELECT * INTO _invitation
  FROM public.invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
  
  -- If not found or expired
  IF _invitation IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'INVALID_OR_EXPIRED'
    );
  END IF;
  
  -- Check if email matches
  IF _invitation.email != _email THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'EMAIL_MISMATCH'
    );
  END IF;
  
  -- Return valid invitation data (without sensitive fields)
  RETURN jsonb_build_object(
    'valid', true,
    'email', _invitation.email,
    'contact_person_name', _invitation.contact_person_name,
    'intended_role', _invitation.intended_role,
    'company_id', _invitation.company_id
  );
END;
$$;

-- Create secure function to accept invitation after signup
CREATE OR REPLACE FUNCTION public.accept_invitation(
  _token uuid,
  _email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation record;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED'
    );
  END IF;
  
  -- Fetch and lock invitation
  SELECT * INTO _invitation
  FROM public.invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;
  
  -- If not found or expired
  IF _invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_OR_EXPIRED'
    );
  END IF;
  
  -- Verify email matches
  IF _invitation.email != _email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMAIL_MISMATCH'
    );
  END IF;
  
  -- Update invitation as accepted
  UPDATE public.invitations
  SET 
    status = 'accepted',
    accepted_by = _user_id,
    accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'intended_role', _invitation.intended_role,
    'company_id', _invitation.company_id
  );
END;
$$;