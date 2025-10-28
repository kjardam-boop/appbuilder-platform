-- Create company_metadata table
CREATE TABLE IF NOT EXISTS public.company_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_assessment_score INTEGER,
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high')),
  notes TEXT,
  in_crm BOOLEAN DEFAULT false,
  for_followup BOOLEAN DEFAULT false,
  has_potential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own company metadata"
  ON public.company_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company metadata"
  ON public.company_metadata
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company metadata"
  ON public.company_metadata
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company metadata"
  ON public.company_metadata
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_company_metadata_company_id ON public.company_metadata(company_id);
CREATE INDEX idx_company_metadata_user_id ON public.company_metadata(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_company_metadata_updated_at
  BEFORE UPDATE ON public.company_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_updated_at();