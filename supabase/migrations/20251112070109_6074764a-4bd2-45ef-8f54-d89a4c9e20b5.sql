-- Add tenant_id to jul25_christmas_words and jul25_door_content for proper tenant isolation

-- Step 1: Add tenant_id column to jul25_christmas_words
ALTER TABLE public.jul25_christmas_words 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Step 2: Add tenant_id column to jul25_door_content
ALTER TABLE public.jul25_door_content 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data to platform tenant (if any exists)
DO $$
DECLARE
  platform_tenant_id UUID;
BEGIN
  -- Get platform tenant ID
  SELECT id INTO platform_tenant_id 
  FROM public.tenants 
  WHERE is_platform_tenant = TRUE 
  LIMIT 1;
  
  -- Update existing records to belong to platform tenant
  IF platform_tenant_id IS NOT NULL THEN
    UPDATE public.jul25_christmas_words 
    SET tenant_id = platform_tenant_id 
    WHERE tenant_id IS NULL;
    
    UPDATE public.jul25_door_content 
    SET tenant_id = platform_tenant_id 
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Step 4: Make tenant_id NOT NULL after migration
ALTER TABLE public.jul25_christmas_words 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.jul25_door_content 
ALTER COLUMN tenant_id SET NOT NULL;

-- Step 5: Drop old UNIQUE constraints
ALTER TABLE public.jul25_christmas_words 
DROP CONSTRAINT IF EXISTS jul25_christmas_words_day_key;

ALTER TABLE public.jul25_door_content 
DROP CONSTRAINT IF EXISTS jul25_door_content_door_number_key;

-- Step 6: Add new UNIQUE constraints with tenant_id
ALTER TABLE public.jul25_christmas_words 
ADD CONSTRAINT jul25_christmas_words_tenant_day_unique 
UNIQUE (tenant_id, day);

ALTER TABLE public.jul25_door_content 
ADD CONSTRAINT jul25_door_content_tenant_door_unique 
UNIQUE (tenant_id, door_number);

-- Step 7: Enable RLS (if not already enabled)
ALTER TABLE public.jul25_christmas_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jul25_door_content ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for jul25_christmas_words
CREATE POLICY "Users can view christmas words for their tenant"
ON public.jul25_christmas_words
FOR SELECT
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
  )
);

CREATE POLICY "App admins can insert christmas words"
ON public.jul25_christmas_words
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);

CREATE POLICY "App admins can update christmas words"
ON public.jul25_christmas_words
FOR UPDATE
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);

CREATE POLICY "App admins can delete christmas words"
ON public.jul25_christmas_words
FOR DELETE
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);

-- Step 9: Create RLS policies for jul25_door_content
CREATE POLICY "Users can view door content for their tenant"
ON public.jul25_door_content
FOR SELECT
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
  )
);

CREATE POLICY "App admins can insert door content"
ON public.jul25_door_content
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);

CREATE POLICY "App admins can update door content"
ON public.jul25_door_content
FOR UPDATE
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);

CREATE POLICY "App admins can delete door content"
ON public.jul25_door_content
FOR DELETE
USING (
  tenant_id IN (
    SELECT scope_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND scope_type = 'tenant'
    AND role IN ('tenant_owner', 'tenant_admin', 'app_admin')
  )
);