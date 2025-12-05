/**
 * App Creation Wizard
 * 
 * 6-step wizard for creating new customer applications.
 * Uses React Query for data management and modular step components.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useTenantContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared';

// Import from wizard module
import {
  WizardStepIndicator,
  Step1Company,
  Step2Discovery,
  Step3Workshop,
  Step4Capabilities,
  Step5Generate,
  Step6Deploy,
  ProjectDocumentUpload,
  useProject,
  useCustomerCompanies,
  usePartners,
  useExternalSystems,
  useProjectMutation,
  useProjectSystemsMutation,
  usePartnersMutation,
  wizardKeys,
  WizardService,
  type WizardState,
  type WorkshopStatus,
} from '@/modules/wizard';

// Step definitions
const WIZARD_STEPS = [
  { key: 'company', label: 'Selskap', description: 'Velg kunde og systemer' },
  { key: 'discovery', label: 'Discovery', description: 'Kartlegg behov' },
  { key: 'workshop', label: 'Workshop', description: 'Gjennomfør workshop' },
  { key: 'capabilities', label: 'Capabilities', description: 'Velg funksjoner' },
  { key: 'generate', label: 'Generer', description: 'Lag appkonfig' },
  { key: 'deploy', label: 'Deploy', description: 'Publiser app' },
];

// Default state for new projects
const DEFAULT_STATE: WizardState = {
  step: 1,
  highestStepReached: 1,
  projectId: null,
  projectName: '',
  projectDescription: '',
  companyId: null,
  systems: [],
  partners: [],
  questionnaire: {},
  questions: [],
  workshopStatus: 'not_started',
  miroUrl: null,
  notionUrl: null,
  generatedConfig: null,
  selectedCapabilities: [],
};

export default function NewAppWizard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tenantContext = useTenantContext();
  
  // Get project ID from URL
  const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId');
  
  // Local UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [highestStepReached, setHighestStepReached] = useState(1);
  const [localState, setLocalState] = useState<WizardState>(DEFAULT_STATE);
  const [isSaving, setIsSaving] = useState(false);
  
  // React Query hooks for data fetching
  const { data: projectData, isLoading: loadingProject } = useProject(projectIdFromUrl);
  const { data: companies = [], isLoading: loadingCompanies } = useCustomerCompanies(tenantContext?.tenant_id);
  const { data: partners = [], isLoading: loadingPartners } = usePartners();
  const { data: externalSystems = [], isLoading: loadingSystems } = useExternalSystems();
  
  // Mutations
  const projectMutation = useProjectMutation();
  const systemsMutation = useProjectSystemsMutation();
  const partnersMutation = usePartnersMutation();
  
  // Sync project data to local state when loaded
  useEffect(() => {
    if (projectData) {
      setLocalState(prev => ({
        ...prev,
        ...projectData,
      }));
      setCurrentStep(projectData.step || 1);
      setHighestStepReached(projectData.highestStepReached || projectData.step || 1);
    }
  }, [projectData]);
  
  // Update URL when project is created
  useEffect(() => {
    if (localState.projectId && !projectIdFromUrl) {
      setSearchParams({ project: localState.projectId });
    }
  }, [localState.projectId]);
  
  // Update highest step reached
  useEffect(() => {
    if (currentStep > highestStepReached) {
      setHighestStepReached(currentStep);
    }
  }, [currentStep]);
  
  // State update handler for child components
  const handleStateChange = useCallback((updates: Partial<WizardState>) => {
    setLocalState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Save project (manual or auto)
  const saveProject = async (showToast = true) => {
    if (!tenantContext?.tenant_id) {
      toast.error('No tenant context');
      return null;
    }
    
    if (!localState.companyId || !localState.projectName) {
      if (showToast) toast.error('Velg et selskap og gi prosjektet et navn');
      return null;
    }
    
    setIsSaving(true);
    try {
      // Create or update project
      const result = await projectMutation.mutateAsync({
        projectId: localState.projectId,
        tenantId: tenantContext.tenant_id,
        data: localState,
      });
      
      const projectId = result?.id || localState.projectId;
      
      if (projectId) {
        // Save systems
        if (localState.systems.length > 0) {
          await systemsMutation.mutateAsync({
            projectId,
            systemIds: localState.systems.map(s => s.id),
          });
        }
        
        // Save partners
        if (localState.partners.length > 0) {
          await partnersMutation.mutateAsync({
            projectId,
            partnerIds: localState.partners.map(p => p.id),
          });
        }
        
        // Update local state with project ID
        setLocalState(prev => ({ ...prev, projectId }));
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: wizardKeys.project(projectId) });
        
        if (showToast) toast.success('Prosjekt lagret');
        return projectId;
      }
      
      return null;
    } catch (error) {
      console.error('Save failed:', error);
      if (showToast) toast.error('Kunne ikke lagre prosjektet');
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Navigation handlers
  const goToStep = (step: number) => {
    // Can go to any step up to highest reached
    if (step >= 1 && step <= WIZARD_STEPS.length && step <= highestStepReached) {
      setCurrentStep(step);
    }
  };
  
  const nextStep = async () => {
    // Save before moving forward
    if (currentStep === 1) {
      const savedId = await saveProject();
      if (!savedId) return;
    }
    
    if (currentStep < WIZARD_STEPS.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      if (newStep > highestStepReached) {
        setHighestStepReached(newStep);
      }
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Loading state
  const isLoading = loadingProject || loadingCompanies || loadingPartners || loadingSystems;
  
  if (isLoading && projectIdFromUrl) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const tenantId = tenantContext?.tenant_id || '';
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={localState.projectName || 'Nytt App-prosjekt'}
        description="Opprett en ny kundeapplikasjon steg for steg"
        showBackButton
        backPath="/admin/customer-apps"
      />
      
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-8">
        {WIZARD_STEPS.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const isReachable = stepNum <= highestStepReached;
          
          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                onClick={() => goToStep(stepNum)}
                disabled={!isReachable}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  isReachable && !isActive && "cursor-pointer hover:opacity-80",
                  !isReachable && "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-green-500 text-white",
                    !isActive && !isCompleted && isReachable && "bg-muted text-muted-foreground",
                    !isReachable && "bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <div className="hidden md:block">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary",
                    !isActive && "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                </div>
              </button>
              
              {index < WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-2",
                  index < currentStep - 1 ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Step content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && (
          <div className="space-y-6">
            <Step1Company
              state={localState}
              onStateChange={handleStateChange}
              companies={companies}
              externalSystems={externalSystems}
              partners={partners}
              isLoading={isLoading}
            />
            
            {/* Document upload - only show if project exists */}
            {localState.projectId && (
              <ProjectDocumentUpload
                projectId={localState.projectId}
                tenantId={tenantId}
                companyId={localState.companyId}
              />
            )}
          </div>
        )}
        
        {currentStep === 2 && localState.projectId && (
          <Step2Discovery
            project={localState}
            onAnswerChange={(key, value) => {
              handleStateChange({
                questionnaire: { ...localState.questionnaire, [key]: value },
              });
            }}
            tenantId={tenantId}
          />
        )}
        
        {currentStep === 3 && localState.projectId && (
          <Step3Workshop
            project={localState}
            onStatusChange={(status: WorkshopStatus) => handleStateChange({ workshopStatus: status })}
            onMiroUrlChange={(url) => handleStateChange({ miroUrl: url })}
            onNotionUrlChange={(url) => handleStateChange({ notionUrl: url })}
            tenantId={tenantId}
          />
        )}
        
        {currentStep === 4 && localState.projectId && (
          <Step4Capabilities
            state={localState}
            onStateChange={handleStateChange}
            tenantId={tenantId}
          />
        )}
        
        {currentStep === 5 && localState.projectId && (
          <Step5Generate
            project={localState}
            onConfigGenerated={(config) => handleStateChange({ generatedConfig: config })}
            tenantId={tenantId}
          />
        )}
        
        {currentStep === 6 && localState.projectId && (
          <Step6Deploy project={localState} />
        )}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Forrige
        </Button>
        
        <div className="flex gap-2">
          {currentStep === 1 && (
            <Button
              variant="outline"
              onClick={() => saveProject()}
              disabled={isSaving || !localState.companyId}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Lagre
            </Button>
          )}
          
          {currentStep < WIZARD_STEPS.length ? (
            <Button onClick={nextStep} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Neste
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate(`/admin/customer-apps/${localState.projectId}`)}
            >
              Fullfør
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
