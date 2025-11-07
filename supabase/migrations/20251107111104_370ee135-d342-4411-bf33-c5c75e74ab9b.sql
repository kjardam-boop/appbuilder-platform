-- Create task_categories table
CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for tenant lookups
CREATE INDEX idx_task_categories_tenant_id ON public.task_categories(tenant_id);
CREATE INDEX idx_task_categories_active ON public.task_categories(tenant_id, is_active);

-- Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_categories
CREATE POLICY "Tenant members can view their task categories"
  ON public.task_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = task_categories.tenant_id
    )
  );

CREATE POLICY "Tenant admins can insert task categories"
  ON public.task_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = task_categories.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant admins can update task categories"
  ON public.task_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = task_categories.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant admins can delete task categories"
  ON public.task_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = task_categories.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_task_categories_updated_at
  BEFORE UPDATE ON public.task_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();