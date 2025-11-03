-- Add custom_period_location to jul25_family_members
ALTER TABLE jul25_family_members 
ADD COLUMN custom_period_location text CHECK (custom_period_location IN ('Jajabo', 'JaJabu'));