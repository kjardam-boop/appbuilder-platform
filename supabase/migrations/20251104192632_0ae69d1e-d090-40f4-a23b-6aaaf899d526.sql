-- Integration Recommendation Engine
-- Stores computed recommendations for which external integrations a tenant should activate

CREATE TABLE integration_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  app_key TEXT NOT NULL,
  system_product_id UUID NOT NULL,
  provider TEXT NOT NULL,
  workflow_key TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown JSONB NOT NULL,
  explain JSONB NOT NULL,
  suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_recommendation_tenant_app 
  ON integration_recommendation (tenant_id, app_key, score DESC, created_at DESC);

CREATE INDEX idx_integration_recommendation_product 
  ON integration_recommendation (system_product_id);

-- RLS Policies
ALTER TABLE integration_recommendation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view their recommendations"
  ON integration_recommendation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = integration_recommendation.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Platform admins can view all recommendations"
  ON integration_recommendation FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert recommendations"
  ON integration_recommendation FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update recommendations"
  ON integration_recommendation FOR UPDATE
  USING (true);

CREATE POLICY "Tenant admins can delete their recommendations"
  ON integration_recommendation FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND scope_type = 'tenant'
        AND scope_id = integration_recommendation.tenant_id
        AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_integration_recommendation_updated_at
  BEFORE UPDATE ON integration_recommendation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jul25_updated_at();