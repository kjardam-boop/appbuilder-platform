-- Create invitations table to track user invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_person_name TEXT,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invitations"
  ON public.invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Authenticated users can update own invitations"
  ON public.invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_by OR status = 'pending');

-- Trigger to update updated_at
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_updated_at();