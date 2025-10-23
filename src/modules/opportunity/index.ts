/**
 * Opportunity Module
 * Sales pipeline and opportunity management
 */

// Types
export type {
  Opportunity,
  OpportunityStage,
  OpportunityActivity,
  OpportunityActivityType,
  OpportunityProduct,
  Product,
  OpportunityWithDetails,
  ForecastPeriod,
  ForecastData,
} from './types/opportunity.types';

export {
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_STAGE_COLORS,
  OPPORTUNITY_STAGE_PROBABILITIES,
  OPPORTUNITY_ACTIVITY_LABELS,
} from './types/opportunity.types';

// Services
export { OpportunityService } from './services/opportunityService';
export { ProductService } from './services/productService';

// Hooks
export { useOpportunities } from './hooks/useOpportunities';
export { useSalesForecast } from './hooks/useSalesForecast';

// Components
export { OpportunityCard } from './components/OpportunityCard';
export { OpportunityStageBadge } from './components/OpportunityStageBadge';
export { OpportunityDialog } from './components/OpportunityDialog';

// Module metadata
export const OPPORTUNITY_MODULE = {
  name: 'opportunity',
  version: '1.0.0',
  description: 'Sales pipeline and opportunity management with forecasting',
} as const;
