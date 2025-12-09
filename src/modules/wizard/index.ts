/**
 * Wizard Module
 * 
 * Exports for the App Creation Wizard module.
 */

// Types
export * from './types/wizard.types';

// Services
export { WizardService } from './services/WizardService';

// Hooks
export {
  wizardKeys,
  useCustomerCompanies,
  usePartners,
  useExternalSystems,
  useProject,
  useDiscoveryQuestions,
  useProjectMutation,
  useProjectSystemsMutation,
  useWorkshopStatusMutation,
  useMiroBoardMutation,
  useProcessWorkshopMutation,
  useQuestionnaireMutation,
  usePartnersMutation,
} from './hooks/useWizardData';

// Components
export { WizardStepIndicator, type WizardStep } from './components/WizardStepIndicator';
export { StepErrorBoundary } from './components/StepErrorBoundary';
export { Step1Company } from './components/Step1Company';
export { Step2Discovery } from './components/Step2Discovery';
export { Step3Workshop } from './components/Step3Workshop';
export { Step4Capabilities } from './components/Step4Capabilities';
export { Step5Generate } from './components/Step5Generate';
export { Step6Deploy } from './components/Step6Deploy';
export { ProjectDocumentUpload } from './components/ProjectDocumentUpload';

