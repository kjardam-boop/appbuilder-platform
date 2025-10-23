import type { AppType } from "../../applications/types/application.types";

/**
 * Evaluation target for scoring - can be general type, specific product, SKU or installation
 */
export interface EvaluationTarget {
  app_type?: AppType;
  app_product_id?: string;
  sku_id?: string;
  company_app_id?: string;
}

/**
 * Extended criteria with evaluation target
 */
export interface CriteriaWithTarget {
  id: string;
  project_id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  source: string;
  evaluation_target?: EvaluationTarget;
  is_active: boolean;
}
