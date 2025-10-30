DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tenant_users' AND policyname = 'Tenant admins can view tenant users'
  ) THEN
    EXECUTE 'CREATE POLICY "Tenant admins can view tenant users" ON public.tenant_users FOR SELECT USING ( public.user_has_any_role(auth.uid(), tenant_id, ARRAY[''tenant_admin'',''tenant_owner'']::app_role[]) )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tenant_users' AND policyname = 'Tenant admins can insert tenant users'
  ) THEN
    EXECUTE 'CREATE POLICY "Tenant admins can insert tenant users" ON public.tenant_users FOR INSERT WITH CHECK ( public.user_has_any_role(auth.uid(), tenant_id, ARRAY[''tenant_admin'',''tenant_owner'']::app_role[]) )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tenant_users' AND policyname = 'Tenant admins can update tenant users'
  ) THEN
    EXECUTE 'CREATE POLICY "Tenant admins can update tenant users" ON public.tenant_users FOR UPDATE USING ( public.user_has_any_role(auth.uid(), tenant_id, ARRAY[''tenant_admin'',''tenant_owner'']::app_role[]) ) WITH CHECK ( public.user_has_any_role(auth.uid(), tenant_id, ARRAY[''tenant_admin'',''tenant_owner'']::app_role[]) )';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'tenant_users' AND policyname = 'Tenant admins can delete tenant users'
  ) THEN
    EXECUTE 'CREATE POLICY "Tenant admins can delete tenant users" ON public.tenant_users FOR DELETE USING ( public.user_has_any_role(auth.uid(), tenant_id, ARRAY[''tenant_admin'',''tenant_owner'']::app_role[]) )';
  END IF;
END $$;