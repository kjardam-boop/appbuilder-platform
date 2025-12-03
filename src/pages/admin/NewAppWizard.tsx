import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/hooks/useTenantContext';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  MessageSquare, 
  Users, 
  Wand2, 
  Rocket,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  Plus,
  X,
  Puzzle,  // New icon for capabilities
  Save,
  ChevronsUpDown,
  Check,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import from wizard module
import {
  WizardStepIndicator,
  Step1Company as Step1CompanyNew,
  Step4Capabilities,
  useCustomerCompanies,
  usePartners,
  useExternalSystems,
  type WizardState as WizardStateModule,
} from '@/modules/wizard';

// Import PageHeader for consistency
import { PageHeader } from '@/components/shared';

// Types
interface WizardState {
  step: number;
  projectId: string | null;
  projectName: string;
  projectDescription: string;
  companyId: string | null;
  systems: Array<{ id: string; name: string; type: string }>;
  partners: Array<{ id: string; name: string }>;
  questionnaire: Record<string, string>;
  workshopStatus: 'not_started' | 'preparing' | 'board_ready' | 'in_progress' | 'complete' | 'processed';
  miroUrl: string | null;
  notionUrl: string | null;
  generatedConfig: any | null;
  // Step 4: Selected capabilities
  selectedCapabilities: Array<{
    id: string;
    key: string;
    name: string;
    category: string;
    variant?: string;
    config?: Record<string, any>;
  }>;
}

interface Company {
  id: string;
  name: string;
  org_number: string | null;
  industry_description: string | null;
  company_roles: string[] | null;
  hasTenant?: boolean;
}

interface ExternalSystem {
  id: string;
  name: string;
  systemType: string;  // derived from system_types[] or slug
  vendor: string | null;
}

interface ImplementationPartner {
  id: string;
  name: string;
  industry_description: string | null;
}

// 6-step wizard with Capabilities added
const WIZARD_STEPS = [
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'discovery', label: 'Discovery', icon: MessageSquare },
  { key: 'workshop', label: 'Workshop', icon: Users },
  { key: 'capabilities', label: 'Capabilities', icon: Puzzle },  // NEW STEP
  { key: 'generate', label: 'Generate', icon: Wand2 },
  { key: 'deploy', label: 'Deploy', icon: Rocket },
];

export default function NewAppWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tenantContext = useTenantContext();
  
  // Get project ID from URL (support both 'project' and 'projectId' params)
  const projectIdFromUrl = searchParams.get('project') || searchParams.get('projectId');
  
  const [state, setState] = useState<WizardState>({
    step: 1,
    projectId: projectIdFromUrl,
    projectName: '',
    projectDescription: '',
    companyId: null,
    systems: [],
    partners: [],
    questionnaire: {},
    workshopStatus: 'not_started',
    miroUrl: null,
    notionUrl: null,
    generatedConfig: null,
    selectedCapabilities: [],
  });

  // Auto-save status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialLoad = useRef(true);
  const lastSavedState = useRef<string>('');

  // Combobox states for searchable selectors
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [systemOpen, setSystemOpen] = useState(false);
  const [systemSearch, setSystemSearch] = useState('');
  const [systemTypeFilter, setSystemTypeFilter] = useState<string>('all');
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');

  // Debounce state for auto-save (1.5 second delay)
  const debouncedProjectName = useDebounce(state.projectName, 1500);
  const debouncedProjectDescription = useDebounce(state.projectDescription, 1500);
  const debouncedCompanyId = useDebounce(state.companyId, 500);
  const debouncedSystems = useDebounce(state.systems, 1000);
  const debouncedPartners = useDebounce(state.partners, 1000);
  const debouncedQuestionnaire = useDebounce(state.questionnaire, 1500);

  // Load existing project if resuming
  useEffect(() => {
    if (projectIdFromUrl) {
      loadProject(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  const loadProject = async (projectId: string) => {
    // Fetch basic project data (using any to avoid type issues with new columns)
    const { data, error } = await supabase
      .from('customer_app_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      console.error('Failed to load project:', error);
      toast.error('Kunne ikke laste prosjekt');
      return;
    }

    // Cast to any to access new columns not yet in TypeScript types
    const projectData = data as any;
    
    // Determine which step to show based on workshop status
    let currentStep = 1;
    const workshopStatus = projectData.workshop_status || 'not_started';
    
    if (workshopStatus === 'processed') {
      currentStep = 5; // Go to Generate step
    } else if (workshopStatus === 'complete' || workshopStatus === 'in_progress' || workshopStatus === 'board_ready') {
      currentStep = 3; // Stay on Workshop step
    } else if (projectData.company_id) {
      currentStep = 2; // Go to Discovery if company is selected
    }

    setState(prev => ({
      ...prev,
      step: currentStep,
      projectId: projectId,
      projectName: projectData.name || '',
      projectDescription: projectData.description || '',
      companyId: projectData.company_id || null,
      workshopStatus: workshopStatus,
      miroUrl: projectData.miro_board_url || null,
      notionUrl: projectData.notion_page_url || null,
      systems: [], // Will be loaded separately if project_systems table exists
      questionnaire: {},
    }));
    
    toast.success(`Prosjekt "${projectData.name}" lastet`);

    // Load systems from project_systems table
    try {
      const { data: systemsData, error: systemsError } = await supabase
        .from('project_systems')
        .select('*, external_system:external_systems(id, name, slug, system_types)')
        .eq('project_id', projectId);
      
      if (!systemsError && systemsData && systemsData.length > 0) {
        const loadedSystems = systemsData.map((s: any) => ({
          id: s.external_system_id || s.id,
          name: s.external_system?.name || s.custom_system_name || 'Unknown',
          type: s.external_system?.system_types?.[0] || s.custom_system_type || 'System',
        }));
        
        setState(prev => ({ ...prev, systems: loadedSystems }));
        console.log('Loaded systems:', loadedSystems);
      }
    } catch (e) {
      console.log('Could not load project_systems:', e);
    }

    // Load questionnaire responses
    try {
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('project_questionnaire_responses')
        .select('question_key, answer')
        .eq('project_id', projectId)
        .order('sort_order');
      
      if (!questionnaireError && questionnaireData && questionnaireData.length > 0) {
        const loadedQuestionnaire: Record<string, string> = {};
        questionnaireData.forEach((q: any) => {
          if (q.question_key && q.answer) {
            loadedQuestionnaire[q.question_key] = q.answer;
          }
        });
        
        setState(prev => ({ ...prev, questionnaire: loadedQuestionnaire }));
        console.log('Loaded questionnaire:', loadedQuestionnaire);
      }
    } catch (e) {
      console.log('Could not load questionnaire responses:', e);
    }

    // Load implementation partners
    try {
      const { data: partnersData, error: partnersError } = await supabase
        .from('project_implementation_partners')
        .select('company_id, companies(id, name)')
        .eq('project_id', projectId);
      
      if (!partnersError && partnersData && partnersData.length > 0) {
        const loadedPartners = partnersData.map((p: any) => ({
          id: p.company_id,
          name: p.companies?.name || 'Unknown Partner',
        }));
        
        setState(prev => ({ ...prev, partners: loadedPartners }));
        console.log('Loaded partners:', loadedPartners);
      }
    } catch (e) {
      console.log('Could not load project_implementation_partners:', e);
    }

    // Load selected capabilities
    try {
      const { data: capabilitiesData, error: capabilitiesError } = await supabase
        .from('app_capability_usage')
        .select('capability_id, capabilities(id, key, name, category)')
        .eq('project_id', projectId);
      
      if (!capabilitiesError && capabilitiesData && capabilitiesData.length > 0) {
        const loadedCapabilities = capabilitiesData.map((c: any) => ({
          id: c.capability_id,
          key: c.capabilities?.key || 'unknown',
          name: c.capabilities?.name || 'Unknown',
          category: c.capabilities?.category || 'Unknown',
        }));
        
        setState(prev => ({ ...prev, selectedCapabilities: loadedCapabilities }));
        console.log('Loaded capabilities:', loadedCapabilities);
      }
    } catch (e) {
      console.log('Could not load project capabilities:', e);
    }
  };

  // Fetch ALL companies for selector (tenant will be created when app is ready for deploy)
  const { data: companies } = useQuery({
    queryKey: ['all-companies-for-wizard'],
    queryFn: async () => {
      // Fetch all companies - we can create tenant later when app is ready
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id, 
          name, 
          org_number, 
          industry_description, 
          company_roles,
          tenants:tenants(id)
        `)
        .order('name');
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        hasTenant: Array.isArray(c.tenants) ? c.tenants.length > 0 : !!c.tenants,
      })) as (Company & { hasTenant: boolean })[];
    },
  });

  // Fetch external systems catalog
  const { data: externalSystems, error: systemsError } = useQuery({
    queryKey: ['external-systems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_systems')
        .select('id, name, slug, system_types, description')
        .order('name');
      
      if (error) {
        console.error('Failed to fetch external systems:', error);
        throw error;
      }
      
      // Map to our interface, deriving systemType from system_types array or slug
      return (data || []).map(s => ({
        id: s.id,
        name: s.name || 'Unnamed System',
        systemType: s.system_types?.[0] || s.slug || 'System',
        vendor: null,
      })) as ExternalSystem[];
    },
  });

  // Fetch implementation partners (companies with 'partner' role)
  const { data: implementationPartners } = useQuery({
    queryKey: ['implementation-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, industry_description')
        .contains('company_roles', ['partner'])
        .order('name');
      if (error) throw error;
      return data as ImplementationPartner[];
    },
  });

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!companySearch.trim()) return companies;
    const search = companySearch.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.org_number?.toLowerCase().includes(search) ||
      c.industry_description?.toLowerCase().includes(search)
    );
  }, [companies, companySearch]);

  // Get unique system types for filter
  const systemTypes = useMemo(() => {
    if (!externalSystems) return [];
    const types = new Set(externalSystems.map(s => s.systemType));
    return Array.from(types).sort();
  }, [externalSystems]);

  // Filtered systems based on search and type filter
  const filteredSystems = useMemo(() => {
    if (!externalSystems) return [];
    let filtered = externalSystems.filter(s => !state.systems.find(ss => ss.id === s.id));
    
    if (systemTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.systemType === systemTypeFilter);
    }
    
    if (systemSearch.trim()) {
      const search = systemSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.systemType.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [externalSystems, state.systems, systemSearch, systemTypeFilter]);

  // Filtered partners based on search
  const filteredPartners = useMemo(() => {
    if (!implementationPartners) return [];
    const available = implementationPartners.filter(p => !state.partners.find(sp => sp.id === p.id));
    if (!partnerSearch.trim()) return available;
    const search = partnerSearch.toLowerCase();
    return available.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.industry_description?.toLowerCase().includes(search)
    );
  }, [implementationPartners, state.partners, partnerSearch]);

  // Create or update project mutation
  const projectMutation = useMutation({
    mutationFn: async (data: Partial<WizardState>) => {
      // Validate required fields
      if (!tenantContext?.tenant_id) {
        throw new Error('No tenant context available. Please refresh the page.');
      }
      if (!data.projectName?.trim()) {
        throw new Error('Project name is required');
      }

      const payload = {
        tenant_id: tenantContext.tenant_id,
        name: data.projectName.trim(),
        description: data.projectDescription || null,
        company_id: data.companyId || null,
        workshop_status: data.workshopStatus || 'not_started',
      };

      console.log('Saving project with payload:', payload);

      if (state.projectId) {
        const { data: updated, error } = await supabase
          .from('customer_app_projects')
          .update(payload)
          .eq('id', state.projectId)
          .select()
          .single();
        if (error) {
          console.error('Update error:', error);
          throw new Error(error.message);
        }
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('customer_app_projects')
          .insert(payload)
          .select()
          .single();
        if (error) {
          console.error('Insert error:', error);
          throw new Error(error.message);
        }
        return created;
      }
    },
    onSuccess: (data) => {
      setState(prev => ({ ...prev, projectId: data.id }));
      toast.success('Project saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save project: ${error.message}`);
      console.error('Project mutation error:', error);
    },
  });

  // Save systems to project
  const saveSystemsMutation = useMutation({
    mutationFn: async (systems: WizardState['systems']) => {
      if (!state.projectId) return;

      try {
        // Delete existing and insert new
        await supabase
          .from('project_systems')
          .delete()
          .eq('project_id', state.projectId);

        if (systems.length > 0) {
          const { error } = await supabase
            .from('project_systems')
            .insert(systems.map(s => ({
              project_id: state.projectId,
              external_system_id: s.id,
              custom_system_name: null,
              custom_system_type: s.type,
            })));
          if (error) {
            console.error('Error saving systems:', error);
            throw error;
          }
        }
        console.log('Systems saved:', systems.length);
      } catch (e) {
        console.error('project_systems save failed:', e);
      }
    },
  });

  // Save questionnaire responses
  const saveQuestionnaireMutation = useMutation({
    mutationFn: async (questionnaire: Record<string, string>) => {
      if (!state.projectId) return;

      try {
        // Delete existing responses for this project
        await supabase
          .from('project_questionnaire_responses')
          .delete()
          .eq('project_id', state.projectId);

        // Insert new responses
        const entries = Object.entries(questionnaire);
        if (entries.length > 0) {
          const { error } = await supabase
            .from('project_questionnaire_responses')
            .insert(entries.map(([key, answer], index) => ({
              project_id: state.projectId,
              question_key: key,
              question_text: key, // Will be updated with actual question text
              answer: answer,
              sort_order: index,
            })));
          if (error) {
            console.error('Error saving questionnaire:', error);
            throw error;
          }
        }
        console.log('Questionnaire saved:', entries.length, 'responses');
      } catch (e) {
        console.error('questionnaire save failed:', e);
      }
    },
  });

  // Save implementation partners
  const savePartnersMutation = useMutation({
    mutationFn: async (partners: WizardState['partners']) => {
      if (!state.projectId) return;

      try {
        // Delete existing partners for this project
        await supabase
          .from('project_implementation_partners')
          .delete()
          .eq('project_id', state.projectId);

        // Insert new partners
        if (partners.length > 0) {
          const { error } = await supabase
            .from('project_implementation_partners')
            .insert(partners.map(p => ({
              project_id: state.projectId,
              company_id: p.id,
              role: 'implementation',
            })));
          if (error) {
            console.error('Error saving partners:', error);
            throw error;
          }
        }
        console.log('Partners saved:', partners.length);
      } catch (e) {
        console.error('partners save failed:', e);
      }
    },
  });

  // Save selected capabilities
  const saveCapabilitiesMutation = useMutation({
    mutationFn: async (capabilities: WizardState['selectedCapabilities']) => {
      if (!state.projectId) return;

      try {
        // Delete existing capabilities for this project (use project_id)
        await supabase
          .from('app_capability_usage')
          .delete()
          .eq('project_id', state.projectId);

        // Insert new capabilities with project_id
        if (capabilities.length > 0) {
          const { error } = await supabase
            .from('app_capability_usage')
            .insert(capabilities.map(cap => ({
              project_id: state.projectId,  // Use project_id for customer projects
              capability_id: cap.id,
              is_required: false,
              config_schema: cap.config || null,
            })));
          if (error) {
            console.error('Error saving capabilities:', error);
            throw error;
          }
        }
        console.log('Capabilities saved:', capabilities.length);
      } catch (e) {
        console.error('capabilities save failed:', e);
      }
    },
  });

  // ============================================================================
  // AUTO-SAVE EFFECTS
  // ============================================================================

  // Mark initial load as complete after project loads
  useEffect(() => {
    if (state.projectId && isInitialLoad.current) {
      // Wait a bit for all data to settle
      const timer = setTimeout(() => {
        isInitialLoad.current = false;
        // Store initial state hash
        lastSavedState.current = JSON.stringify({
          projectName: state.projectName,
          projectDescription: state.projectDescription,
          companyId: state.companyId,
          systems: state.systems,
          partners: state.partners,
          questionnaire: state.questionnaire,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.projectId]);

  // Auto-save Step 1: Project details
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!state.projectId) return;
    if (!debouncedProjectName.trim()) return;
    if (!tenantContext?.tenant_id) return;
    
    // Check if anything actually changed
    const currentHash = JSON.stringify({
      projectName: debouncedProjectName,
      projectDescription: debouncedProjectDescription,
      companyId: debouncedCompanyId,
    });
    if (currentHash === lastSavedState.current.slice(0, currentHash.length)) return;
    
    const saveProject = async () => {
      setAutoSaveStatus('saving');
      try {
        const { error } = await supabase
          .from('customer_app_projects')
          .update({
            name: debouncedProjectName.trim(),
            description: debouncedProjectDescription || null,
            company_id: debouncedCompanyId || null,
          })
          .eq('id', state.projectId);
        
        if (error) throw error;
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save project failed:', error);
        setAutoSaveStatus('error');
      }
    };
    
    saveProject();
  }, [debouncedProjectName, debouncedProjectDescription, debouncedCompanyId, state.projectId, tenantContext?.tenant_id]);

  // Auto-save Step 1: Systems
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!state.projectId) return;
    
    const saveSystems = async () => {
      setAutoSaveStatus('saving');
      try {
        await supabase
          .from('project_systems')
          .delete()
          .eq('project_id', state.projectId);

        if (debouncedSystems.length > 0) {
          const { error } = await supabase
            .from('project_systems')
            .insert(debouncedSystems.map(s => ({
              project_id: state.projectId,
              external_system_id: s.id,
              custom_system_name: null,
              custom_system_type: s.type,
            })));
          if (error) throw error;
        }
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save systems failed:', error);
        setAutoSaveStatus('error');
      }
    };
    
    saveSystems();
  }, [debouncedSystems, state.projectId]);

  // Auto-save Step 1: Partners
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!state.projectId) return;
    
    const savePartners = async () => {
      setAutoSaveStatus('saving');
      try {
        await supabase
          .from('project_implementation_partners')
          .delete()
          .eq('project_id', state.projectId);

        if (debouncedPartners.length > 0) {
          const { error } = await supabase
            .from('project_implementation_partners')
            .insert(debouncedPartners.map(p => ({
              project_id: state.projectId,
              company_id: p.id,
              role: 'implementation',
            })));
          if (error) throw error;
        }
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save partners failed:', error);
        setAutoSaveStatus('error');
      }
    };
    
    savePartners();
  }, [debouncedPartners, state.projectId]);

  // Auto-save Step 2: Questionnaire
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!state.projectId) return;
    if (Object.keys(debouncedQuestionnaire).length === 0) return;
    
    const saveQuestionnaire = async () => {
      setAutoSaveStatus('saving');
      try {
        await supabase
          .from('project_questionnaire_responses')
          .delete()
          .eq('project_id', state.projectId);

        const entries = Object.entries(debouncedQuestionnaire);
        if (entries.length > 0) {
          const { error } = await supabase
            .from('project_questionnaire_responses')
            .insert(entries.map(([key, answer], index) => ({
              project_id: state.projectId,
              question_key: key,
              question_text: key,
              answer: answer,
              sort_order: index,
            })));
          if (error) throw error;
        }
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save questionnaire failed:', error);
        setAutoSaveStatus('error');
      }
    };
    
    saveQuestionnaire();
  }, [debouncedQuestionnaire, state.projectId]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  // Navigation
  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, step }));
  };

  const nextStep = async () => {
    // Step 1: Need to create project first if it doesn't exist
    if (state.step === 1 && !state.projectId) {
      await projectMutation.mutateAsync(state);
    }
    
    // All other saves are handled by auto-save with debounce
    // Just navigate to next step
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 6) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.projectName.trim().length > 0 && state.companyId !== null;
      case 2:
        return Object.keys(state.questionnaire).length > 0;
      case 3:
        return state.workshopStatus === 'processed' || state.workshopStatus === 'complete';
      case 4:
        // Capabilities step - always can proceed (optional selection)
        return true;
      case 5:
        return state.generatedConfig !== null;
      default:
        return true;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Create New Application</h1>
          <p className="text-muted-foreground">
            Follow the wizard to create a custom application for your customer
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Auto-save indicator */}
          {state.projectId && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Lagrer...
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Lagret
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <X className="h-3.5 w-3.5 text-destructive" />
                  Feil ved lagring
                </>
              )}
              {autoSaveStatus === 'idle' && (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Auto-lagring aktiv
                </>
              )}
            </span>
          )}
          <Button variant="outline" onClick={() => navigate('/admin/apps')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Apps
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10" />
          <div 
            className="absolute top-4 left-0 h-0.5 bg-primary -z-10 transition-all duration-300"
            style={{ width: `${((state.step - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
          />
          
          {WIZARD_STEPS.map((step, i) => (
            <button
              key={step.key}
              onClick={() => i + 1 <= state.step && goToStep(i + 1)}
              disabled={i + 1 > state.step}
              className={cn(
                "flex flex-col items-center transition-colors",
                i + 1 <= state.step ? "text-primary cursor-pointer" : "text-muted-foreground cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                i + 1 === state.step 
                  ? "bg-primary text-primary-foreground" 
                  : i + 1 < state.step 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground"
              )}>
                <step.icon className="h-4 w-4" />
              </div>
              <span className="text-xs mt-1 font-medium">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {state.step === 1 && (
          <Step1Company 
            state={state} 
            setState={setState}
            companies={companies || []}
            externalSystems={externalSystems || []}
            implementationPartners={implementationPartners || []}
          />
        )}
        {state.step === 2 && (
          <Step2Discovery 
            state={state} 
            setState={setState}
            tenantId={tenantContext?.tenant_id || ''}
          />
        )}
        {state.step === 3 && (
          <Step3Workshop 
            state={state} 
            setState={setState}
            tenantId={tenantContext?.tenant_id || ''}
          />
        )}
        {/* NEW: Step 4 - Capabilities Selection */}
        {state.step === 4 && (
          <Step4Capabilities 
            state={state as any}
            onStateChange={(updates) => setState(prev => ({ ...prev, ...updates }))}
            tenantId={tenantContext?.tenant_id || ''}
          />
        )}
        {state.step === 5 && (
          <Step4Generate 
            state={state} 
            setState={setState}
            tenantId={tenantContext?.tenant_id || ''}
          />
        )}
        {state.step === 6 && (
          <Step5Deploy 
            state={state} 
            setState={setState}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6 pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={state.step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {/* Updated to 6 steps */}
        {state.step < 6 ? (
          <Button 
            onClick={nextStep}
            disabled={!canProceed() || projectMutation.isPending}
          >
            {projectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => navigate(`/admin/apps/${state.projectId}`)}>
            <Rocket className="mr-2 h-4 w-4" />
            Go to App
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Company & Systems Selection
// ============================================================================

interface Step1Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  companies: Company[];
  externalSystems: ExternalSystem[];
  implementationPartners: ImplementationPartner[];
}

function Step1Company({ state, setState, companies, externalSystems, implementationPartners }: Step1Props) {
  // Combobox states for searchable selectors
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [systemOpen, setSystemOpen] = useState(false);
  const [systemSearch, setSystemSearch] = useState('');
  const [systemTypeFilter, setSystemTypeFilter] = useState<string>('all');
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!companySearch.trim()) return companies;
    const search = companySearch.toLowerCase();
    return companies.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.org_number?.toLowerCase().includes(search) ||
      c.industry_description?.toLowerCase().includes(search)
    );
  }, [companies, companySearch]);

  // Get unique system types for filter
  const systemTypes = useMemo(() => {
    if (!externalSystems) return [];
    const types = new Set(externalSystems.map(s => s.systemType));
    return Array.from(types).sort();
  }, [externalSystems]);

  // Filtered systems based on search and type filter
  const filteredSystems = useMemo(() => {
    if (!externalSystems) return [];
    let filtered = externalSystems.filter(s => !state.systems.find(ss => ss.id === s.id));
    
    if (systemTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.systemType === systemTypeFilter);
    }
    
    if (systemSearch.trim()) {
      const search = systemSearch.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.systemType.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [externalSystems, state.systems, systemSearch, systemTypeFilter]);

  // Filtered partners based on search
  const filteredPartners = useMemo(() => {
    if (!implementationPartners) return [];
    const available = implementationPartners.filter(p => !state.partners.find(sp => sp.id === p.id));
    if (!partnerSearch.trim()) return available;
    const search = partnerSearch.toLowerCase();
    return available.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.industry_description?.toLowerCase().includes(search)
    );
  }, [implementationPartners, state.partners, partnerSearch]);

  const addSystem = (systemId: string) => {
    const system = externalSystems.find(s => s.id === systemId);
    if (system && !state.systems.find(s => s.id === systemId)) {
      setState(prev => ({
        ...prev,
        systems: [...prev.systems, { id: system.id, name: system.name, type: system.systemType }],
      }));
    }
  };

  const removeSystem = (systemId: string) => {
    setState(prev => ({
      ...prev,
      systems: prev.systems.filter(s => s.id !== systemId),
    }));
  };

  const addPartner = (partnerId: string) => {
    const partner = implementationPartners.find(p => p.id === partnerId);
    if (partner && !state.partners.find(p => p.id === partnerId)) {
      setState(prev => ({
        ...prev,
        partners: [...prev.partners, { id: partner.id, name: partner.name }],
      }));
    }
  };

  const removePartner = (partnerId: string) => {
    setState(prev => ({
      ...prev,
      partners: prev.partners.filter(p => p.id !== partnerId),
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Basic information about the application you're creating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={state.projectName}
              onChange={(e) => setState(prev => ({ ...prev, projectName: e.target.value }))}
              placeholder="e.g., Acme Corp Dashboard"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="projectDescription">Description</Label>
            <Textarea
              id="projectDescription"
              value={state.projectDescription}
              onChange={(e) => setState(prev => ({ ...prev, projectDescription: e.target.value }))}
              placeholder="Brief description of the application..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Company</CardTitle>
          <CardDescription>
            Select the company this application is being built for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Company *</Label>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyOpen}
                  className="w-full justify-between font-normal"
                >
                  {state.companyId ? (
                    <span className="flex items-center gap-2">
                      {companies?.find(c => c.id === state.companyId)?.name || 'Select company...'}
                      {companies?.find(c => c.id === state.companyId)?.hasTenant && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">Tenant</Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search for company...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search company name, org number..." 
                    value={companySearch}
                    onValueChange={setCompanySearch}
                  />
                  <CommandList>
                    <CommandEmpty>No company found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCompanies.slice(0, 50).map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.id}
                          onSelect={() => {
                            setState(prev => ({ ...prev, companyId: company.id }));
                            setCompanyOpen(false);
                            setCompanySearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              state.companyId === company.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                              {company.name}
                              {company.hasTenant && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">Tenant</Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {company.org_number && `Org: ${company.org_number}`}
                              {company.industry_description && ` • ${company.industry_description}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {(!companies || companies.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No companies found.{' '}
                <a href="/admin/companies" className="text-primary underline">Manage companies →</a>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Tenant will be created automatically when the app is ready for deployment.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Systems</CardTitle>
          <CardDescription>
            What systems does this company currently use? This helps us understand integration needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected systems */}
          {state.systems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.systems.map((system) => (
                <Badge key={system.id} variant="secondary" className="pl-2 pr-1 py-1">
                  {system.name}
                  <span className="text-xs text-muted-foreground ml-1">({system.type})</span>
                  <button
                    onClick={() => removeSystem(system.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* System selector with type filter */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="mb-2 block">Add System</Label>
                <Popover open={systemOpen} onOpenChange={setSystemOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={systemOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="text-muted-foreground">Search for system...</span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search system name..." 
                        value={systemSearch}
                        onValueChange={setSystemSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No system found.</CommandEmpty>
                        <CommandGroup heading={`${filteredSystems.length} systems available`}>
                          {filteredSystems.slice(0, 50).map((system) => (
                            <CommandItem
                              key={system.id}
                              value={system.id}
                              onSelect={() => {
                                addSystem(system.id);
                                setSystemOpen(false);
                                setSystemSearch('');
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span>{system.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {system.systemType}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-48">
                <Label className="mb-2 block">Filter by Type</Label>
                <Select value={systemTypeFilter} onValueChange={setSystemTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {systemTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(!externalSystems || externalSystems.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No external systems found.{' '}
                <a href="/admin/external-systems" className="text-primary underline">Add systems →</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Partners</CardTitle>
          <CardDescription>
            Select implementation partners or consultants involved in this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected partners */}
          {state.partners.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.partners.map((partner) => (
                <Badge key={partner.id} variant="outline" className="pl-2 pr-1 py-1">
                  {partner.name}
                  <button
                    onClick={() => removePartner(partner.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Partner selector */}
          <div className="space-y-2">
            <Label>Add Partner</Label>
            <Popover open={partnerOpen} onOpenChange={setPartnerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={partnerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="text-muted-foreground">Search for partner...</span>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search partner name..." 
                    value={partnerSearch}
                    onValueChange={setPartnerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No partner found.</CommandEmpty>
                    <CommandGroup heading={`${filteredPartners.length} partners available`}>
                      {filteredPartners.slice(0, 50).map((partner) => (
                        <CommandItem
                          key={partner.id}
                          value={partner.id}
                          onSelect={() => {
                            addPartner(partner.id);
                            setPartnerOpen(false);
                            setPartnerSearch('');
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{partner.name}</span>
                            {partner.industry_description && (
                              <span className="text-xs text-muted-foreground">
                                {partner.industry_description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {(!implementationPartners || implementationPartners.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No implementation partners found. Companies need the 'partner' role.{' '}
                <a href="/implementation-partners" className="text-primary underline">Manage partners →</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Step 2: Discovery Questions
// ============================================================================

interface Step2Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  tenantId: string;
}

function Step2Discovery({ state, setState, tenantId }: Step2Props) {
  const [questions, setQuestions] = useState<Array<{ key: string; text: string; placeholder?: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  // Generate questions when entering step
  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-questions', {
        body: {
          companyId: state.companyId,
          systems: state.systems.map(s => s.name),
          context: 'app_creation_discovery',
        },
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions.map((q: any, i: number) => ({
          key: `q${i}`,
          text: typeof q === 'string' ? q : q.question_text || q.text || 'Question',
          placeholder: typeof q === 'object' ? q.placeholder : undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      // Fallback questions
      setQuestions([
        { key: 'pain_points', text: 'What are the biggest pain points in your current workflow?' },
        { key: 'manual_tasks', text: 'What tasks are currently done manually that could be automated?' },
        { key: 'data_sources', text: 'What are your main data sources and how are they connected?' },
        { key: 'reporting_needs', text: 'What reports or dashboards do you need but don\'t have?' },
        { key: 'integrations', text: 'Which systems need to share data with each other?' },
        { key: 'success_metrics', text: 'How would you measure success of a new application?' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateAnswer = (key: string, value: string) => {
    setState(prev => ({
      ...prev,
      questionnaire: { ...prev.questionnaire, [key]: value },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Discovery Questions
        </CardTitle>
        <CardDescription>
          These AI-generated questions help us understand your customer's needs and pain points.
          The answers will be used to prepare the workshop and generate the application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Generating questions based on company context...</span>
          </div>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={generateQuestions}
              className="mb-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Questions
            </Button>

            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.key || `question-${i}`} className="space-y-2">
                  <div className="flex items-start gap-2 text-sm font-medium">
                    <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">
                      {i + 1}
                    </span>
                    <span>{q.text || 'Question not available'}</span>
                  </div>
                  <Textarea
                    value={state.questionnaire[q.key] || ''}
                    onChange={(e) => updateAnswer(q.key, e.target.value)}
                    placeholder={q.placeholder || "Enter your answer..."}
                    rows={3}
                    className="ml-8"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Step 3: Workshop (Miro Integration)
// ============================================================================

interface Step3Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  tenantId: string;
}

function Step3Workshop({ state, setState, tenantId }: Step3Props) {
  const [isPreparingBoard, setIsPreparingBoard] = useState(false);
  const [isProcessingResults, setIsProcessingResults] = useState(false);

  const prepareWorkshopBoard = async () => {
    if (!state.projectId) {
      toast.error('Project must be saved first');
      return;
    }

    setIsPreparingBoard(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          workflowKey: 'prepare-miro-workshop',
          action: 'prepare',
          input: {
            project_id: state.projectId,
            company_id: state.companyId,
            systems: state.systems,
            questionnaire: state.questionnaire,
          },
          tenantId,
        },
      });

      if (error) throw error;

      if (data?.data?.board_url) {
        setState(prev => ({
          ...prev,
          miroUrl: data.data.board_url,
          workshopStatus: 'board_ready',
        }));
        
        // Update project (cast to any for new columns not yet in TS types)
        await supabase
          .from('customer_app_projects')
          .update({
            miro_board_url: data.data.board_url,
            miro_board_id: data.data.board_id,
            workshop_status: 'board_ready',
          } as any)
          .eq('id', state.projectId);

        toast.success('Workshop board created!');
      }
    } catch (error: any) {
      console.error('Failed to create board:', error);
      toast.error('Failed to create workshop board. Make sure n8n workflow is configured.');
    } finally {
      setIsPreparingBoard(false);
    }
  };

  const processWorkshopResults = async () => {
    if (!state.projectId) return;

    setIsProcessingResults(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          workflowKey: 'process-workshop-results',
          action: 'process',
          input: {
            project_id: state.projectId,
          },
          tenantId,
        },
      });

      if (error) throw error;

      // Check for notion URL in response (supports both naming conventions)
      const notionUrl = data?.data?.notion_page_url || data?.data?.notion_url || data?.notion_page_url;
      
      if (notionUrl || data?.success) {
        setState(prev => ({
          ...prev,
          notionUrl: notionUrl || prev.notionUrl,
          workshopStatus: 'processed',
        }));

        // Update project (cast to any for new columns not yet in TS types)
        if (notionUrl) {
          await supabase
            .from('customer_app_projects')
            .update({
              notion_page_url: notionUrl,
              workshop_status: 'processed',
            } as any)
            .eq('id', state.projectId);
        } else {
          await supabase
            .from('customer_app_projects')
            .update({
              workshop_status: 'processed',
            } as any)
            .eq('id', state.projectId);
        }

        toast.success('Workshop results processed! View the summary in Notion.');
      }
    } catch (error: any) {
      console.error('Failed to process results:', error);
      toast.error('Failed to process workshop results. Make sure n8n workflow is configured.');
    } finally {
      setIsProcessingResults(false);
    }
  };

  const markWorkshopStatus = async (status: WizardState['workshopStatus']) => {
    setState(prev => ({ ...prev, workshopStatus: status }));
    
    if (state.projectId) {
      await supabase
        .from('customer_app_projects')
        .update({ workshop_status: status } as any)
        .eq('id', state.projectId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery Workshop</CardTitle>
        <CardDescription>
          Run a collaborative workshop in Miro to map processes and define requirements.
          Workshop results will be automatically documented in Notion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={
            state.workshopStatus === 'complete' || state.workshopStatus === 'processed' 
              ? 'default' 
              : state.workshopStatus === 'board_ready' || state.workshopStatus === 'in_progress'
              ? 'secondary'
              : 'outline'
          }>
            {state.workshopStatus === 'not_started' && 'Not Started'}
            {state.workshopStatus === 'preparing' && 'Preparing Board...'}
            {state.workshopStatus === 'board_ready' && 'Board Ready'}
            {state.workshopStatus === 'in_progress' && 'Workshop In Progress'}
            {state.workshopStatus === 'complete' && 'Workshop Complete'}
            {state.workshopStatus === 'processed' && 'Results Processed'}
          </Badge>
        </div>

        {/* Step 1: Prepare Board */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus !== 'not_started' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                1. Prepare Miro Board
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Creates a workshop board pre-populated with company info and discovery insights
              </p>
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'not_started' && (
                <>
                  <Button 
                    onClick={prepareWorkshopBoard}
                    disabled={isPreparingBoard}
                  >
                    {isPreparingBoard && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Board
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => markWorkshopStatus('complete')}
                  >
                    Skip (Manual Workshop)
                  </Button>
                </>
              )}
              
              {state.miroUrl && (
                <>
                  <Button variant="outline" asChild>
                    <a href={state.miroUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in Miro
                    </a>
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setState(prev => ({ 
                        ...prev, 
                        miroUrl: null, 
                        workshopStatus: 'not_started' 
                      }));
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Create New Board
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Run Workshop */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus === 'complete' || state.workshopStatus === 'processed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                2. Run Workshop
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Facilitate the workshop with your customer in Miro
              </p>
              
              {/* Workshop agenda */}
              {state.miroUrl && state.workshopStatus !== 'processed' && (
                <div className="mt-3 text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">Suggested Agenda (2-3 hours):</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Review current state & systems (15 min)</li>
                    <li>Process mapping exercise (45 min)</li>
                    <li>Pain point identification & voting (20 min)</li>
                    <li>Solution brainstorming (30 min)</li>
                    <li>MoSCoW prioritization (20 min)</li>
                    <li>UI sketching (30 min)</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'board_ready' && (
                <Button 
                  variant="outline"
                  onClick={() => markWorkshopStatus('in_progress')}
                >
                  Mark as Started
                </Button>
              )}
              
              {state.workshopStatus === 'in_progress' && (
                <Button 
                  onClick={() => markWorkshopStatus('complete')}
                >
                  Mark as Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Process Results */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus === 'processed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                3. Process Results
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Extract insights from Miro, create documentation in Notion, and prepare for app generation
              </p>
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'complete' && (
                <Button 
                  onClick={processWorkshopResults}
                  disabled={isProcessingResults}
                >
                  {isProcessingResults && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Process Results
                </Button>
              )}
              
              {state.notionUrl && state.workshopStatus !== 'processed' && (
                <Button variant="outline" asChild>
                  <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in Notion
                  </a>
                </Button>
              )}
            </div>
          </div>
          
          {/* Show Notion summary link prominently when processed */}
          {state.workshopStatus === 'processed' && state.notionUrl && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Workshop Summary Ready
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    AI-generated insights and recommendations are available in Notion
                  </p>
                </div>
                <Button asChild>
                  <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Notion Summary
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Skip workshop option */}
        {state.workshopStatus === 'not_started' && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Don't have time for a full workshop?
            </p>
            <Button 
              variant="ghost" 
              onClick={() => markWorkshopStatus('processed')}
            >
              Skip workshop and generate from discovery answers
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Step 4: Generate App Config
// ============================================================================

interface Step4Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  tenantId: string;
}

function Step4Generate({ state, setState, tenantId }: Step4Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAppConfig = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tenant-app', {
        body: {
          projectId: state.projectId,
          companyId: state.companyId,
          systems: state.systems,
          questionnaire: state.questionnaire,
          tenantId,
        },
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        generatedConfig: data.config,
      }));

      toast.success('Application config generated!');
    } catch (error: any) {
      console.error('Failed to generate config:', error);
      toast.error('Failed to generate application configuration');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Generate Application
        </CardTitle>
        <CardDescription>
          AI will generate the application configuration based on discovery and workshop results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!state.generatedConfig ? (
          <div className="text-center py-12">
            <Wand2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We'll create a custom application configuration based on the company's systems, 
              discovery answers, and workshop insights.
            </p>
            <Button 
              size="lg"
              onClick={generateAppConfig}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Application
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Configuration Generated
              </h3>
              <Button variant="outline" onClick={generateAppConfig}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
            
            {/* Preview of generated config */}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(state.generatedConfig, null, 2)}
              </pre>
            </div>
            
            <p className="text-sm text-muted-foreground">
              You can edit this configuration after deployment in the App Config Editor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Step 5: Deploy
// ============================================================================

interface Step5Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

function Step5Deploy({ state, setState }: Step5Props) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);

  const deployApp = async () => {
    setIsDeploying(true);
    try {
      // Save the config to the project
      if (state.projectId && state.generatedConfig) {
        await supabase
          .from('customer_app_projects')
          .update({
            status: 'deployed',
            branding: state.generatedConfig.theme,
            deployed_to_preview_at: new Date().toISOString(),
          })
          .eq('id', state.projectId);
      }
      
      setIsDeployed(true);
      toast.success('Application deployed to preview!');
    } catch (error) {
      toast.error('Failed to deploy application');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Deploy Application
        </CardTitle>
        <CardDescription>
          Review and deploy your new application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Project</h4>
            <p className="font-medium">{state.projectName}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Systems</h4>
            <p className="font-medium">{state.systems.length} integrations</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-4">
          {state.miroUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={state.miroUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Miro Board
              </a>
            </Button>
          )}
          {state.notionUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Notion Docs
              </a>
            </Button>
          )}
        </div>

        {/* Deploy button */}
        {!isDeployed ? (
          <div className="text-center py-8">
            <Button 
              size="lg"
              onClick={deployApp}
              disabled={isDeploying || !state.generatedConfig}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy to Preview
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Application Deployed!</h3>
            <p className="text-muted-foreground mb-4">
              Your application is now available in preview mode.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

