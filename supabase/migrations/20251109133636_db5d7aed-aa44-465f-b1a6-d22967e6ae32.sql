-- Create table for pre-generated calendar door content
CREATE TABLE IF NOT EXISTS public.jul25_door_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  door_number INTEGER NOT NULL CHECK (door_number >= 1 AND door_number <= 24),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(door_number)
);

-- Enable RLS
ALTER TABLE public.jul25_door_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read door content
CREATE POLICY "Anyone can read door content"
  ON public.jul25_door_content
  FOR SELECT
  USING (true);

-- Policy: Only platform admins can insert/update/delete door content
CREATE POLICY "Platform admins can manage door content"
  ON public.jul25_door_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'platform'
        AND role IN ('platform_owner', 'platform_support')
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_jul25_door_content_updated_at
  BEFORE UPDATE ON public.jul25_door_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jul25_door_content_door_number 
  ON public.jul25_door_content(door_number);