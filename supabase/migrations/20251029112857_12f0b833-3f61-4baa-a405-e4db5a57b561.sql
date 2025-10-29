-- Phase 1: Database Migration for Onboarding & Project Phases (Fixed)

-- 1. Add onboarding columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'company_registration',
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 2. Create new project phase enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_phase_enum') THEN
    CREATE TYPE project_phase_enum AS ENUM (
      'as_is',
      'to_be',
      'evaluation',
      'execution',
      'closure'
    );
  END IF;
END $$;

-- 3. Add new phase column to projects (use new enum directly)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS current_phase project_phase_enum DEFAULT 'as_is';

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(user_id, onboarding_completed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);