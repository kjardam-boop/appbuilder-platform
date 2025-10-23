-- Create industries table
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  nace_codes TEXT[] NOT NULL DEFAULT '{}',
  default_modules TEXT[],
  parent_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint for key format (slug)
ALTER TABLE public.industries
ADD CONSTRAINT industries_key_format CHECK (key ~ '^[a-z0-9_]+$');

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_industries_key ON public.industries(key);

-- Create index on nace_codes using GIN for array searches
CREATE INDEX IF NOT EXISTS idx_industries_nace_codes ON public.industries USING GIN(nace_codes);

-- Enable RLS
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active industries
CREATE POLICY "Active industries are viewable by everyone"
ON public.industries
FOR SELECT
USING (is_active = true);

-- Policy: Authenticated users can manage industries
CREATE POLICY "Authenticated users can manage industries"
ON public.industries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_industries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER industries_updated_at
BEFORE UPDATE ON public.industries
FOR EACH ROW
EXECUTE FUNCTION public.update_industries_updated_at();