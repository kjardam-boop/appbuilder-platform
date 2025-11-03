-- Migrate jul25_families and jul25_family_members to use proper dates instead of day numbers

-- First, add new date columns
ALTER TABLE jul25_families 
ADD COLUMN arrival_datetime TIMESTAMPTZ,
ADD COLUMN departure_datetime TIMESTAMPTZ;

ALTER TABLE jul25_family_members
ADD COLUMN arrival_datetime TIMESTAMPTZ,
ADD COLUMN departure_datetime TIMESTAMPTZ;

-- Migrate existing data (assuming days 20-31 are Dec 2024, days 1-19 are Jan 2025)
UPDATE jul25_families
SET 
  arrival_datetime = CASE 
    WHEN arrival_date >= 20 THEN make_timestamptz(2024, 12, arrival_date, CAST(split_part(arrival_time, ':', 1) AS INT), CAST(split_part(arrival_time, ':', 2) AS INT), 0, 'UTC')
    ELSE make_timestamptz(2025, 1, arrival_date, CAST(split_part(arrival_time, ':', 1) AS INT), CAST(split_part(arrival_time, ':', 2) AS INT), 0, 'UTC')
  END,
  departure_datetime = CASE 
    WHEN departure_date >= 20 THEN make_timestamptz(2024, 12, departure_date, CAST(split_part(departure_time, ':', 1) AS INT), CAST(split_part(departure_time, ':', 2) AS INT), 0, 'UTC')
    ELSE make_timestamptz(2025, 1, departure_date, CAST(split_part(departure_time, ':', 1) AS INT), CAST(split_part(departure_time, ':', 2) AS INT), 0, 'UTC')
  END;

UPDATE jul25_family_members
SET 
  arrival_datetime = CASE 
    WHEN arrival_date >= 20 THEN make_timestamptz(2024, 12, arrival_date, CAST(split_part(arrival_time, ':', 1) AS INT), CAST(split_part(arrival_time, ':', 2) AS INT), 0, 'UTC')
    WHEN arrival_date IS NOT NULL THEN make_timestamptz(2025, 1, arrival_date, CAST(split_part(arrival_time, ':', 1) AS INT), CAST(split_part(arrival_time, ':', 2) AS INT), 0, 'UTC')
  END,
  departure_datetime = CASE 
    WHEN departure_date >= 20 THEN make_timestamptz(2024, 12, departure_date, CAST(split_part(departure_time, ':', 1) AS INT), CAST(split_part(departure_time, ':', 2) AS INT), 0, 'UTC')
    WHEN departure_date IS NOT NULL THEN make_timestamptz(2025, 1, departure_date, CAST(split_part(departure_time, ':', 1) AS INT), CAST(split_part(departure_time, ':', 2) AS INT), 0, 'UTC')
  END;

-- Drop old columns
ALTER TABLE jul25_families 
DROP COLUMN arrival_date,
DROP COLUMN arrival_time,
DROP COLUMN departure_date,
DROP COLUMN departure_time;

ALTER TABLE jul25_family_members
DROP COLUMN arrival_date,
DROP COLUMN arrival_time,
DROP COLUMN departure_date,
DROP COLUMN departure_time;

-- Rename new columns to match old names
ALTER TABLE jul25_families 
RENAME COLUMN arrival_datetime TO arrival_date;
ALTER TABLE jul25_families 
RENAME COLUMN departure_datetime TO departure_date;

ALTER TABLE jul25_family_members
RENAME COLUMN arrival_datetime TO arrival_date;
ALTER TABLE jul25_family_members
RENAME COLUMN departure_datetime TO departure_date;

-- Make dates required for families
ALTER TABLE jul25_families 
ALTER COLUMN arrival_date SET NOT NULL,
ALTER COLUMN departure_date SET NOT NULL;