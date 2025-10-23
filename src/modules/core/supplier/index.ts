export { EvaluationService } from './services/evaluationService';
export { AIScoringService } from './services/aiScoringService';
export {
  useSupplierEvaluations,
  useEvaluationSummary,
  useAllEvaluationSummaries,
  useSaveEvaluation,
  useCreatePortalInvitation,
} from './hooks/useSupplierEvaluation';
export type {
  SupplierEvaluation,
  SupplierEvaluationSummary,
  SupplierPortalInvitation,
  SupplierEvaluationCategory,
} from './types/evaluation.types';
export { SUPPLIER_EVALUATION_CATEGORIES } from './types/evaluation.types';
export type {
  AIScore,
  AICriteria,
  AIRisk,
  AIFollowUpQuestion,
} from './services/aiScoringService';

// Register module
export const SUPPLIER_MODULE = {
  name: 'supplier',
  version: '1.0.0',
  description: 'Supplier evaluation and management'
};
