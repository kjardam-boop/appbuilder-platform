-- Jul25 Family Christmas App Tables

-- Families table
CREATE TABLE public.jul25_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number_of_people INTEGER NOT NULL DEFAULT 2,
  arrival_date INTEGER NOT NULL, -- Day of month (19-31)
  arrival_time TEXT NOT NULL DEFAULT '15:00',
  departure_date INTEGER NOT NULL,
  departure_time TEXT NOT NULL DEFAULT '12:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family members (link users to families)
CREATE TABLE public.jul25_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.jul25_families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  arrival_date INTEGER, -- Optional individual dates
  arrival_time TEXT,
  departure_date INTEGER,
  departure_time TEXT,
  is_admin BOOLEAN DEFAULT false, -- Family admin who can edit family
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- Tasks assigned to families
CREATE TABLE public.jul25_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  assigned_family_id UUID REFERENCES public.jul25_families(id) ON DELETE SET NULL,
  deadline DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Christmas calendar words
CREATE TABLE public.jul25_christmas_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INTEGER NOT NULL UNIQUE CHECK (day >= 1 AND day <= 24),
  word TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jul25_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jul25_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jul25_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jul25_christmas_words ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families - everyone can view, members can update their own
CREATE POLICY "Anyone can view families"
  ON public.jul25_families FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create families"
  ON public.jul25_families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family members can update their family"
  ON public.jul25_families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jul25_family_members
      WHERE family_id = jul25_families.id 
      AND user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Family admins can delete their family"
  ON public.jul25_families FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jul25_family_members
      WHERE family_id = jul25_families.id 
      AND user_id = auth.uid()
      AND is_admin = true
    )
  );

-- RLS Policies for family members - everyone can view, users manage their own
CREATE POLICY "Anyone can view family members"
  ON public.jul25_family_members FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own membership"
  ON public.jul25_family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON public.jul25_family_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own membership"
  ON public.jul25_family_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Anyone can view tasks"
  ON public.jul25_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.jul25_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Task creators and family members can update tasks"
  ON public.jul25_tasks FOR UPDATE
  USING (
    auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM public.jul25_family_members
      WHERE family_id = jul25_tasks.assigned_family_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Task creators can delete tasks"
  ON public.jul25_tasks FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for christmas words
CREATE POLICY "Anyone can view christmas words"
  ON public.jul25_christmas_words FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create christmas words"
  ON public.jul25_christmas_words FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_family_members_user_id ON public.jul25_family_members(user_id);
CREATE INDEX idx_family_members_family_id ON public.jul25_family_members(family_id);
CREATE INDEX idx_tasks_assigned_family ON public.jul25_tasks(assigned_family_id);
CREATE INDEX idx_tasks_done ON public.jul25_tasks(done);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_jul25_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_jul25_families_updated_at
  BEFORE UPDATE ON public.jul25_families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();

CREATE TRIGGER update_jul25_family_members_updated_at
  BEFORE UPDATE ON public.jul25_family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();

CREATE TRIGGER update_jul25_tasks_updated_at
  BEFORE UPDATE ON public.jul25_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();