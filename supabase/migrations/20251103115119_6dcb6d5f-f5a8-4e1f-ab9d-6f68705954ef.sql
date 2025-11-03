-- Create table for multiple custom periods per member
CREATE TABLE IF NOT EXISTS public.jul25_member_custom_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.jul25_family_members(id) ON DELETE CASCADE,
  location text NOT NULL CHECK (location IN ('Jajabo','JaJabu')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure start before end via trigger (avoid immutable CHECK with now())
CREATE OR REPLACE FUNCTION public.validate_member_custom_period()
RETURNS trigger AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_member_custom_period ON public.jul25_member_custom_periods;
CREATE TRIGGER trg_validate_member_custom_period
BEFORE INSERT OR UPDATE ON public.jul25_member_custom_periods
FOR EACH ROW EXECUTE FUNCTION public.validate_member_custom_period();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_update_member_custom_periods_updated_at ON public.jul25_member_custom_periods;
CREATE TRIGGER trg_update_member_custom_periods_updated_at
BEFORE UPDATE ON public.jul25_member_custom_periods
FOR EACH ROW EXECUTE FUNCTION public.update_jul25_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_custom_periods_member_id ON public.jul25_member_custom_periods(member_id);
CREATE INDEX IF NOT EXISTS idx_member_custom_periods_dates ON public.jul25_member_custom_periods(start_date, end_date);

-- RLS
ALTER TABLE public.jul25_member_custom_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read custom periods" ON public.jul25_member_custom_periods;
CREATE POLICY "Authenticated can read custom periods"
ON public.jul25_member_custom_periods
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert custom periods" ON public.jul25_member_custom_periods;
CREATE POLICY "Authenticated can insert custom periods"
ON public.jul25_member_custom_periods
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update custom periods" ON public.jul25_member_custom_periods;
CREATE POLICY "Authenticated can update custom periods"
ON public.jul25_member_custom_periods
FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete custom periods" ON public.jul25_member_custom_periods;
CREATE POLICY "Authenticated can delete custom periods"
ON public.jul25_member_custom_periods
FOR DELETE
USING (auth.uid() IS NOT NULL);
