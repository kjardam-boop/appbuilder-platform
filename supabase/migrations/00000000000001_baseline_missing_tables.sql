-- BASELINE MIGRATION: Creates tables that existed in Lovable but weren't captured in migrations
-- This must run BEFORE all other migrations

-- ============================================
-- ENUMS (required by later migrations)
-- ============================================

-- App role enum (used by tenant_users and user_roles)
-- Complete list of all roles used across migrations
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'platform_owner',
    'platform_admin',
    'platform_support', 
    'tenant_owner',
    'tenant_admin',
    'tenant_user',
    'company_admin',
    'company_user',
    'project_manager',
    'project_member',
    'project_owner',
    'contributor',
    'viewer',
    'analyst',
    'compliance_officer',
    'security_admin',
    'app_admin',
    'app_user'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Role scope enum - Created by migration 20251030072330 along with user_roles table
-- NOT CREATED HERE to avoid duplicate

-- ============================================
-- TENANTS TABLE (core platform table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TENANT_USERS TABLE (required by early migrations, later replaced by user_roles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roles app_role[] NOT NULL DEFAULT ARRAY['tenant_user']::app_role[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Basic policy for tenant_users (will be enhanced by later migrations)
CREATE POLICY "Users can view their own tenant memberships"
ON public.tenant_users
FOR SELECT
USING (auth.uid() = user_id);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);

-- ============================================
-- COMPANY_USERS TABLE - Created by migration 20251029153320
-- ============================================
-- NOT CREATED HERE - will be created by later migration with proper structure
-- (company_users uses role TEXT, not roles app_role[])

-- ============================================
-- PROFILES TABLE - Created by migration 20251024110256
-- ============================================
-- NOT CREATED HERE - will be created by later migration with proper structure
-- (profiles has id + user_id as separate columns)

-- ============================================
-- COMPANIES TABLE - Created by migration 20251023143151
-- ============================================
-- NOT CREATED HERE - will be created by later migration with proper structure
-- company_users FK will be added after companies exists

-- ============================================
-- INDUSTRIES TABLE - Created by migration 20251023141557
-- ============================================
-- NOT CREATED HERE - will be created by later migration with proper structure

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user_has_any_role function (stub version using tenant_users, later replaced to use user_roles)
CREATE OR REPLACE FUNCTION public.user_has_any_role(_user_id uuid, _tenant_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND roles && _roles  -- Array overlap operator
      AND is_active = true
  );
$function$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_users_updated_at ON public.tenant_users;
CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Note: profiles and companies triggers added when those tables are created
