-- Create table for task assignments (many-to-many relationship)
CREATE TABLE public.jul25_task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.jul25_tasks(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES public.jul25_family_members(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_id, family_member_id)
);

-- Enable RLS
ALTER TABLE public.jul25_task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view task assignments"
  ON public.jul25_task_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create task assignments"
  ON public.jul25_task_assignments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Task creators and assigned members can delete assignments"
  ON public.jul25_task_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM jul25_tasks
      WHERE jul25_tasks.id = jul25_task_assignments.task_id
      AND jul25_tasks.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM jul25_family_members
      WHERE jul25_family_members.id = jul25_task_assignments.family_member_id
      AND jul25_family_members.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_task_assignments_task_id ON public.jul25_task_assignments(task_id);
CREATE INDEX idx_task_assignments_member_id ON public.jul25_task_assignments(family_member_id);