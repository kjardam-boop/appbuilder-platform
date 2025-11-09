-- Fix 1: Remove overly permissive system policy on mcp_tenant_secret
-- This policy allowed unrestricted access to HMAC signing secrets
DROP POLICY IF EXISTS system_manage_secrets ON mcp_tenant_secret;

-- Fix 2: Remove overly permissive policy on jul25_invitations
-- This policy allowed anyone to view all invitations across all tenants
DROP POLICY IF EXISTS "Anyone can read jul25 invitation by token" ON jul25_invitations;

-- Create SECURITY DEFINER function to validate jul25 invitation token
-- This replaces the overly permissive RLS policy with server-side validation
CREATE OR REPLACE FUNCTION public.validate_jul25_invitation_token(_token uuid, _identifier text)
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
  FROM public.jul25_invitations
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
  
  -- Check if identifier matches (email or phone)
  IF _invitation.email IS NOT NULL AND _invitation.email != _identifier THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'IDENTIFIER_MISMATCH'
    );
  END IF;
  
  IF _invitation.phone IS NOT NULL AND _invitation.phone != _identifier THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'IDENTIFIER_MISMATCH'
    );
  END IF;
  
  -- Return valid invitation data (without sensitive fields)
  RETURN jsonb_build_object(
    'valid', true,
    'email', _invitation.email,
    'phone', _invitation.phone,
    'invitation_type', _invitation.invitation_type
  );
END;
$$;

-- Create SECURITY DEFINER function to accept jul25 invitation
-- This ensures proper validation and access control when accepting invitations
CREATE OR REPLACE FUNCTION public.accept_jul25_invitation(_token uuid, _identifier text)
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
  FROM public.jul25_invitations
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
  
  -- Verify identifier matches
  IF _invitation.email IS NOT NULL AND _invitation.email != _identifier THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IDENTIFIER_MISMATCH'
    );
  END IF;
  
  IF _invitation.phone IS NOT NULL AND _invitation.phone != _identifier THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IDENTIFIER_MISMATCH'
    );
  END IF;
  
  -- Update invitation as accepted
  UPDATE public.jul25_invitations
  SET 
    status = 'accepted',
    accepted_by = _user_id,
    accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_type', _invitation.invitation_type
  );
END;
$$;