-- Enable realtime for Jul25 tables and ensure full row images are captured

-- Ensure updates send full row data for changes
ALTER TABLE public.jul25_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.jul25_task_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.jul25_member_periods REPLICA IDENTITY FULL;
ALTER TABLE public.jul25_member_custom_periods REPLICA IDENTITY FULL;
ALTER TABLE public.jul25_family_periods REPLICA IDENTITY FULL;

-- Add tables to the realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jul25_tasks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jul25_tasks';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jul25_task_assignments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jul25_task_assignments';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jul25_member_periods'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jul25_member_periods';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jul25_member_custom_periods'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jul25_member_custom_periods';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jul25_family_periods'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jul25_family_periods';
  END IF;
END $$;