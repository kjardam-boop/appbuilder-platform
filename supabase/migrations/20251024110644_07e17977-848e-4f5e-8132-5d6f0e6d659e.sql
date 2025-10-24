-- Fix search_path for update_compliance_updated_at function
CREATE OR REPLACE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;