-- Add 'app' to role_scope enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role_scope' AND e.enumlabel = 'app'
  ) THEN
    ALTER TYPE role_scope ADD VALUE 'app';
  END IF;
END$$;

-- Add app-specific roles to app_role enum
DO $$
BEGIN
  -- app_admin role
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'app_admin'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'app_admin';
  END IF;
  
  -- app_user role
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'app_user'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'app_user';
  END IF;
END$$;