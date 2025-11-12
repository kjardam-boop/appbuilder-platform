-- Function to seed jul25 christmas words and door content for a tenant

CREATE OR REPLACE FUNCTION seed_jul25_data_for_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_word_count INTEGER;
  v_door_count INTEGER;
BEGIN
  -- Check if data already exists for this tenant
  SELECT COUNT(*) INTO v_word_count
  FROM jul25_christmas_words
  WHERE tenant_id = p_tenant_id;
  
  SELECT COUNT(*) INTO v_door_count
  FROM jul25_door_content
  WHERE tenant_id = p_tenant_id;
  
  -- Only seed if no data exists
  IF v_word_count = 0 THEN
    -- Seed christmas words (pre-generated positive Norwegian words)
    INSERT INTO jul25_christmas_words (tenant_id, day, word) VALUES
      (p_tenant_id, 1, 'Fred'),
      (p_tenant_id, 2, 'Glede'),
      (p_tenant_id, 3, 'Lys'),
      (p_tenant_id, 4, 'Håp'),
      (p_tenant_id, 5, 'Kjærlighet'),
      (p_tenant_id, 6, 'Fellesskap'),
      (p_tenant_id, 7, 'Tradisjon'),
      (p_tenant_id, 8, 'Familie'),
      (p_tenant_id, 9, 'Varme'),
      (p_tenant_id, 10, 'Hygge'),
      (p_tenant_id, 11, 'Smil'),
      (p_tenant_id, 12, 'Latter'),
      (p_tenant_id, 13, 'Omsorg'),
      (p_tenant_id, 14, 'Takk'),
      (p_tenant_id, 15, 'Samhold'),
      (p_tenant_id, 16, 'Nestekjærlighet'),
      (p_tenant_id, 17, 'Forventning'),
      (p_tenant_id, 18, 'Magi'),
      (p_tenant_id, 19, 'Godhet'),
      (p_tenant_id, 20, 'Takknemlighet'),
      (p_tenant_id, 21, 'Harmoni'),
      (p_tenant_id, 22, 'Inspirasjon'),
      (p_tenant_id, 23, 'Medmenneskelighet'),
      (p_tenant_id, 24, 'Kjærlighet');
  END IF;
  
  IF v_door_count = 0 THEN
    -- Seed door content with default empty content
    -- Content will be customized by tenant admin
    INSERT INTO jul25_door_content (tenant_id, door_number, content)
    SELECT p_tenant_id, generate_series(1, 24), ''
    ON CONFLICT (tenant_id, door_number) DO NOTHING;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION seed_jul25_data_for_tenant(UUID) TO authenticated;

-- Create a trigger function to auto-seed when jul25 app is installed
CREATE OR REPLACE FUNCTION trigger_seed_jul25_on_install()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if this is a jul25 app installation
  IF NEW.app_type = 'jul25' AND NEW.is_active = true THEN
    -- Seed data for the tenant
    PERFORM seed_jul25_data_for_tenant(NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on applications table
DROP TRIGGER IF EXISTS trigger_seed_jul25_data ON applications;
CREATE TRIGGER trigger_seed_jul25_data
  AFTER INSERT ON applications
  FOR EACH ROW
  WHEN (NEW.app_type = 'jul25' AND NEW.is_active = true)
  EXECUTE FUNCTION trigger_seed_jul25_on_install();