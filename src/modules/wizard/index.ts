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
} from './hooks/useWizardData';

// Components
export { WizardStepIndicator } from './components/WizardStepIndicator';
export { Step1Company } from './components/Step1Company';
export { Step4Capabilities } from './components/Step4Capabilities';
export { ProjectDocumentUpload } from './components/ProjectDocumentUpload';

