-- 1. Opprett ny tabell for tidsperioder/steder
CREATE TABLE jul25_family_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES jul25_families(id) ON DELETE CASCADE,
  location TEXT NOT NULL CHECK (location IN ('Jajabo', 'JaJabu')),
  arrival_date TIMESTAMPTZ NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_jul25_family_periods_updated_at
  BEFORE UPDATE ON jul25_family_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_jul25_updated_at();

-- 2. Tabell for medlems deltakelse i perioder (many-to-many)
CREATE TABLE jul25_member_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES jul25_family_members(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES jul25_family_periods(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, period_id)
);

-- 3. Migrer eksisterende data - opprett default periode for hver familie
INSERT INTO jul25_family_periods (family_id, location, arrival_date, departure_date)
SELECT id, 'Jajabo', arrival_date, departure_date
FROM jul25_families
WHERE arrival_date IS NOT NULL AND departure_date IS NOT NULL;

-- 4. Koble eksisterende medlemmer til de nye periodene
INSERT INTO jul25_member_periods (member_id, period_id)
SELECT fm.id, fp.id
FROM jul25_family_members fm
JOIN jul25_family_periods fp ON fp.family_id = fm.family_id;

-- 5. Gjør arrival_date og departure_date nullable på members (optional overrides)
ALTER TABLE jul25_family_members ALTER COLUMN arrival_date DROP NOT NULL;
ALTER TABLE jul25_family_members ALTER COLUMN departure_date DROP NOT NULL;

-- 6. Fjern arrival_date og departure_date fra families (nå håndtert via periods)
ALTER TABLE jul25_families DROP COLUMN arrival_date;
ALTER TABLE jul25_families DROP COLUMN departure_date;

-- 7. RLS policies for jul25_family_periods
ALTER TABLE jul25_family_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view family periods"
  ON jul25_family_periods FOR SELECT
  USING (true);

CREATE POLICY "Family admins can manage periods"
  ON jul25_family_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jul25_family_members
      WHERE family_id = jul25_family_periods.family_id
      AND user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jul25_family_members
      WHERE family_id = jul25_family_periods.family_id
      AND user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create periods"
  ON jul25_family_periods FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. RLS policies for jul25_member_periods
ALTER TABLE jul25_member_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view member periods"
  ON jul25_member_periods FOR SELECT
  USING (true);

CREATE POLICY "Family admins can manage member periods"
  ON jul25_member_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jul25_family_members fm
      JOIN jul25_family_periods fp ON fp.id = jul25_member_periods.period_id
      WHERE fm.family_id = fp.family_id
      AND fm.user_id = auth.uid()
      AND fm.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create member periods"
  ON jul25_member_periods FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);