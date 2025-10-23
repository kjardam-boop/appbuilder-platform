import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, ChevronDown, ChevronUp, Maximize2, Minimize2, UserCog } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";
import { RelatedEntityLink } from "@/components/ui/related-entity-link";
import { RelatedEntitiesCard } from "@/components/RelatedEntitiesCard";
import { ProjectMandate } from "@/components/Project/ProjectMandate";
import { ProjectStakeholders } from "@/components/Project/ProjectStakeholders";
import { ProjectRequirements } from "@/components/Project/ProjectRequirements";
import { ProjectSuppliers } from "@/components/Project/ProjectSuppliers";
import { ProjectERPSystems } from "@/components/Project/ProjectERPSystems";
import { ProjectInvitation } from "@/components/Project/Phase2/ProjectInvitation";
import { ProjectConference } from "@/components/Project/Phase2/ProjectConference";
import { ProjectSupplierQuestionsManager } from "@/components/Project/Phase2/ProjectSupplierQuestionsManager";
import { SupplierInvitationManager } from "@/components/Project/Phase2/SupplierInvitationManager";
import { ProjectSupplierEvaluation } from "@/components/Project/Phase2/ProjectSupplierEvaluation";
import { ContractInvitation } from "@/components/Project/Phase3/ContractInvitation";
import { TenderDocuments } from "@/components/Project/Phase3/TenderDocuments";
import { ContractInvitationSender } from "@/components/Project/Phase3/ContractInvitationSender";
import { ResponseHandling } from "@/components/Project/Phase3/ResponseHandling";
import { ContractNegotiation } from "@/components/Project/Phase4/ContractNegotiation";
import { SupplierPerformance } from "@/components/Project/Phase4/SupplierPerformance";
import { ContractManagement } from "@/components/Project/Phase4/ContractManagement";
import { ProjectEvaluation } from "@/components/Project/Phase5/ProjectEvaluation";
import { SupplierEvaluation } from "@/components/Project/Phase5/SupplierEvaluation";
import { LessonsLearned } from "@/components/Project/Phase5/LessonsLearned";
import { ProjectClosure } from "@/components/Project/Phase5/ProjectClosure";
import { PhaseSelector } from "@/components/Project/PhaseSelector";
import { PhaseNavigation } from "@/components/Project/PhaseNavigation";
import { CompanyDescription } from "@/components/Project/CompanyDescription";
import { DocumentUploadDialog } from "@/components/Project/Phase2/DocumentUploadDialog";
import { DocumentsList } from "@/components/Project/Phase2/DocumentsList";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContextTaskButton } from "@/modules/tasks";
import { ChangeOwnerDialog } from "@/modules/project";
import { useCurrentUser } from "@/modules/user/hooks/useCurrentUser";

interface Project {
  id: string;
  title: string;
  description: string | null;
  current_phase: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  owner_id: string;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
  org_number: string;
  industry_description: string | null;
  website: string | null;
  contact_person: string | null;
  contact_person_role: string | null;
}

interface Profile {
  full_name: string;
  email: string;
}

const phaseNames: Record<string, string> = {
  malbilde: "Målbilde",
  markedsdialog: "Markedsdialog",
  invitasjon: "Invitasjon til kontrakt",
  leverandor: "Leverandøroppfølging",
  evaluering: "Evaluering",
};

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useCurrentUser();
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showChangeOwner, setShowChangeOwner] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [projectSuppliers, setProjectSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);

  // Collapsible states with localStorage
  const getStoredState = (key: string) => {
    const stored = localStorage.getItem(`project-${id}-${key}`);
    return stored === 'true';
  };

  const [openInfo, setOpenInfo] = useState(() => getStoredState('info'));
  const [openMandate, setOpenMandate] = useState(() => getStoredState('mandate'));
  const [openStakeholders, setOpenStakeholders] = useState(() => getStoredState('stakeholders'));
  const [openRequirements, setOpenRequirements] = useState(() => getStoredState('requirements'));
  const [openSuppliers, setOpenSuppliers] = useState(() => getStoredState('suppliers'));
  const [openErpSystems, setOpenErpSystems] = useState(() => getStoredState('erpSystems'));
  const [openInvitation, setOpenInvitation] = useState(() => getStoredState('invitation'));
  const [openConference, setOpenConference] = useState(() => getStoredState('conference'));
  const [openEvaluation, setOpenEvaluation] = useState(() => getStoredState('evaluation'));
  const [openCompanyDescription, setOpenCompanyDescription] = useState(() => getStoredState('companyDescription'));
  const [openDocuments, setOpenDocuments] = useState(() => getStoredState('documents'));
  const [openContractInvitation, setOpenContractInvitation] = useState(() => getStoredState('contractInvitation'));
  const [openTenderDocs, setOpenTenderDocs] = useState(() => getStoredState('tenderDocs'));
  const [openInvitationSender, setOpenInvitationSender] = useState(() => getStoredState('invitationSender'));
  const [openResponses, setOpenResponses] = useState(() => getStoredState('responses'));
  const [openNegotiation, setOpenNegotiation] = useState(() => getStoredState('negotiation'));
  const [openPerformance, setOpenPerformance] = useState(() => getStoredState('performance'));
  const [openContract, setOpenContract] = useState(() => getStoredState('contract'));
  const [openProjectEval, setOpenProjectEval] = useState(() => getStoredState('projectEval'));
  const [openSupplierEval, setOpenSupplierEval] = useState(() => getStoredState('supplierEval'));
  const [openLessons, setOpenLessons] = useState(() => getStoredState('lessons'));
  const [openClosure, setOpenClosure] = useState(() => getStoredState('closure'));

  // Function to toggle all collapsibles
  const toggleAllSections = (open: boolean) => {
    setOpenInfo(open);
    setOpenMandate(open);
    setOpenStakeholders(open);
    setOpenRequirements(open);
    setOpenSuppliers(open);
    setOpenErpSystems(open);
    setOpenInvitation(open);
    setOpenConference(open);
    setOpenEvaluation(open);
    setOpenCompanyDescription(open);
    setOpenDocuments(open);
    setOpenContractInvitation(open);
    setOpenTenderDocs(open);
    setOpenInvitationSender(open);
    setOpenResponses(open);
    setOpenNegotiation(open);
    setOpenPerformance(open);
    setOpenContract(open);
    setOpenProjectEval(open);
    setOpenSupplierEval(open);
    setOpenLessons(open);
    setOpenClosure(open);
  };

  const areAllOpen = openInfo && openMandate && openStakeholders && openRequirements && 
    openSuppliers && openErpSystems && openInvitation && openConference && openEvaluation && openCompanyDescription &&
    openDocuments && openContractInvitation && openTenderDocs && openInvitationSender && openResponses && openNegotiation &&
    openPerformance && openContract && openProjectEval && openSupplierEval && openLessons && openClosure;

  // Save states to localStorage
  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-info`, String(openInfo));
  }, [id, openInfo]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-mandate`, String(openMandate));
  }, [id, openMandate]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-stakeholders`, String(openStakeholders));
  }, [id, openStakeholders]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-requirements`, String(openRequirements));
  }, [id, openRequirements]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-suppliers`, String(openSuppliers));
  }, [id, openSuppliers]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-erpSystems`, String(openErpSystems));
  }, [id, openErpSystems]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-invitation`, String(openInvitation));
  }, [id, openInvitation]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-conference`, String(openConference));
  }, [id, openConference]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-evaluation`, String(openEvaluation));
  }, [id, openEvaluation]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-companyDescription`, String(openCompanyDescription));
  }, [id, openCompanyDescription]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-documents`, String(openDocuments));
  }, [id, openDocuments]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-contractInvitation`, String(openContractInvitation));
  }, [id, openContractInvitation]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-tenderDocs`, String(openTenderDocs));
  }, [id, openTenderDocs]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-invitationSender`, String(openInvitationSender));
  }, [id, openInvitationSender]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-responses`, String(openResponses));
  }, [id, openResponses]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-negotiation`, String(openNegotiation));
  }, [id, openNegotiation]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-performance`, String(openPerformance));
  }, [id, openPerformance]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-contract`, String(openContract));
  }, [id, openContract]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-projectEval`, String(openProjectEval));
  }, [id, openProjectEval]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-supplierEval`, String(openSupplierEval));
  }, [id, openSupplierEval]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-lessons`, String(openLessons));
  }, [id, openLessons]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(`project-${id}-closure`, String(openClosure));
  }, [id, openClosure]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      fetchProfile();
      fetchProject();
    };
    checkAuth();
  }, [id, navigate]);

  // Handle hash navigation (scroll to section from task link)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    // Wait for DOM to be ready
    setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Open the corresponding collapsible
        const sectionOpeners: Record<string, (value: boolean) => void> = {
          'info': setOpenInfo,
          'mandat': setOpenMandate,
          'interessenter': setOpenStakeholders,
          'krav': setOpenRequirements,
          'leverandormodellering': setOpenSuppliers,
          'invitasjon': setOpenInvitation,
          'konferanse': setOpenConference,
          'evaluering': setOpenEvaluation,
          'selskapsbeskrivelse': setOpenCompanyDescription,
          'dokumenter': setOpenDocuments,
          'kontraktsinvitasjon': setOpenContractInvitation,
          'anbudsdokumenter': setOpenTenderDocs,
          'invitasjon-leverandør': setOpenInvitationSender,
          'respons': setOpenResponses,
          'forhandling': setOpenNegotiation,
          'ytelse': setOpenPerformance,
          'kontrakt': setOpenContract,
          'prosjektevaluering': setOpenProjectEval,
          'leverandørevaluering': setOpenSupplierEval,
          'lærdommer': setOpenLessons,
          'avslutning': setOpenClosure,
        };
        sectionOpeners[hash]?.(true);
      }
    }, 100);
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }
    setProfile(data);
  };

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProject(data);

      // Fetch owner profile
      if (data.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", data.owner_id)
          .single();

        if (!ownerError && ownerData) {
          setOwnerProfile(ownerData);
        }
      }

      // Fetch company if linked
      if (data.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, name, org_number, industry_description, website, contact_person, contact_person_role")
          .eq("id", data.company_id)
          .single();

        if (!companyError && companyData) {
          setCompany(companyData);
        }
      }

      // Fetch project suppliers for document upload dialog
      const { data: suppliersData } = await supabase
        .from("project_suppliers")
        .select(`
          id,
          companies (
            id,
            name
          )
        `)
        .eq("project_id", id);

      if (suppliersData) {
        const formattedSuppliers = suppliersData
          .filter(ps => ps.companies)
          .map(ps => ({
            id: (ps.companies as any).id,
            name: (ps.companies as any).name
          }));
        setProjectSuppliers(formattedSuppliers);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Kunne ikke laste prosjekt");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laster prosjekt...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userEmail={profile?.email} />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs customLabel={project?.title} />

        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-tight">{project.title}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllSections(!areAllOpen)}
              className="gap-2"
            >
              {areAllOpen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Lukk alle
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Åpne alle
                </>
              )}
            </Button>
          </div>

          <Collapsible open={openInfo} onOpenChange={setOpenInfo}>
            <Card id="info">
              <CardHeader>
                <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                  <CardTitle>Prosjektinformasjon</CardTitle>
                  {openInfo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {company && (
                    <div className="pb-4 border-b space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Bedrift:</span>
                        <RelatedEntityLink
                          entityType="company"
                          entityId={company.id}
                          entityName={company.name}
                        />
                      </div>
                      {company.org_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Org.nr:</span>
                          <span className="text-sm text-muted-foreground">{company.org_number}</span>
                        </div>
                      )}
                      {company.industry_description && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Bransje:</span>
                          <span className="text-sm text-muted-foreground">{company.industry_description}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Nettside:</span>
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {ownerProfile && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Prosjekteier:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{ownerProfile.full_name}</span>
                        {(isAdmin || userId === project.owner_id) && project.company_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowChangeOwner(true)}
                            title="Bytt prosjekteier"
                          >
                            <UserCog className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Nåværende fase:</span>
                    <PhaseSelector 
                      projectId={project.id}
                      currentPhase={project.current_phase}
                      onPhaseChange={fetchProject}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Opprettet:</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(project.created_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sist oppdatert:</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(project.updated_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                      </span>
                    </div>
                  </div>

                  {/* Related Resources Card */}
                  <div className="pt-4 border-t">
                    <RelatedEntitiesCard entityType="project" entityId={project.id} />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <PhaseNavigation 
            projectId={project.id}
            currentPhase={project.current_phase}
            onPhaseChange={fetchProject}
          />

          {/* Phase 1 - Målbilde: Show phase-specific components */}
          {project.current_phase === 'malbilde' && userId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-semibold">Fase 1: Målbilde, Virksomhetsprosesser & Behov</h2>
              </div>
              
              <Card>
                <Collapsible open={openMandate} onOpenChange={setOpenMandate} id="mandat">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Mandat og Mål</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Oppdatere mandat"
                          contextDescription="Gjennomgå eller oppdatere prosjektmandatet"
                          contextBadge="Mandat"
                          contextSection="Mandat"
                          contextPhase="malbilde"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openMandate ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Definer mandatet, målene og rammene for anskaffelsen. Kom i gang ved å svare på spørsmål eller bruk kontekschaten.
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectMandate 
                        projectId={project.id} 
                        initialDescription={project.description}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {company && (
                <Card>
                  <Collapsible open={openCompanyDescription} onOpenChange={setOpenCompanyDescription}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                            <CardTitle>Bedriftsbeskrivelse</CardTitle>
                          </CollapsibleTrigger>
                          {company && (
                            <ContextTaskButton
                              entityType="company"
                              entityId={company.id}
                              contextTitle="Oppdatere bedriftsinformasjon"
                              contextDescription="Gjennomgå eller oppdatere bedriftsbeskrivelsen"
                              contextBadge="Bedrift"
                              contextSection="Bedriftsbeskrivelse"
                              contextPhase="malbilde"
                              suggestedPriority="medium"
                              variant="icon"
                            />
                          )}
                        </div>
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          {openCompanyDescription ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </CollapsibleTrigger>
                      </div>
                      <CardDescription>
                        Beskrivelse av {company.name}s virksomhet
                      </CardDescription>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <CompanyDescription 
                          projectId={project.id}
                          company={company}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}
              
              <Card>
                <Collapsible open={openStakeholders} onOpenChange={setOpenStakeholders} id="interessenter">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Interessenter</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Kontakte interessent"
                          contextDescription="Følge opp eller kontakte en interessent"
                          contextBadge="Interessenter"
                          contextSection="Interessenter"
                          contextPhase="malbilde"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openStakeholders ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Identifiser og dokumenter interessenter i prosjektet
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectStakeholders 
                        projectId={project.id}
                        company={company}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openRequirements} onOpenChange={setOpenRequirements} id="krav">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Behov og krav</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Følge opp krav"
                          contextDescription="Definere eller oppdatere krav for prosjektet"
                          contextBadge="Krav"
                          contextSection="Krav"
                          contextPhase="malbilde"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openRequirements ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Definer krav og behov for anskaffelsen
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectRequirements 
                        projectId={project.id}
                        userId={userId}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openSuppliers} onOpenChange={setOpenSuppliers} id="leverandormodellering">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Leverandørmodellering</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Leverandørmodellering"
                          contextDescription="Identifisere og modellere potensielle leverandører"
                          contextBadge="Leverandørmodellering"
                          contextSection="Leverandørmodellering"
                          contextPhase="malbilde"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openSuppliers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Identifiser og modeller potensielle leverandører
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectSuppliers 
                        projectId={project.id}
                        userId={userId}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* ERP Systems Section */}
              <Card>
                <Collapsible open={openErpSystems} onOpenChange={setOpenErpSystems}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle id="erp-systemer">ERP-systemer</CardTitle>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openErpSystems ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      ERP-systemer som vurderes for prosjektet
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectERPSystems projectId={project.id} />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          {/* Phase 2 - Markedsdialog: IItD & Nedvalg */}
          {project.current_phase === 'markedsdialog' && userId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-semibold">Fase 2: Markedsdialog, IItD & Nedvalg</h2>
              </div>
              
              <Card>
                <Collapsible open={openInvitation} onOpenChange={setOpenInvitation}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Invitasjon</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Sende invitasjon"
                          contextDescription="Opprette og sende invitasjon til dialogkonferanse"
                          contextBadge="Invitasjon"
                          contextSection="Invitasjon"
                          contextPhase="markedsdialog"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openInvitation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Opprett invitasjon til dialogkonferanse
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectInvitation 
                        projectId={project.id}
                        userId={userId}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openConference} onOpenChange={setOpenConference}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Dialogkonferanse</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Planlegge dialogkonferanse"
                          contextDescription="Administrere milepæler og oppgaver for dialogkonferansen"
                          contextBadge="Konferanse"
                          contextSection="Dialogkonferanse"
                          contextPhase="markedsdialog"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openConference ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Administrer milepæler for dialogkonferansen
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectConference projectId={project.id} />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openEvaluation} onOpenChange={setOpenEvaluation}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                            <CardTitle>Spørsmål til leverandører</CardTitle>
                          </CollapsibleTrigger>
                          <ContextTaskButton
                            entityType="project"
                            entityId={project.id}
                            contextTitle="Administrere spørsmål"
                            contextDescription="Opprette og generere spørsmål til leverandører"
                            contextBadge="Spørsmål"
                            contextSection="Leverandørspørsmål"
                            contextPhase="markedsdialog"
                            suggestedPriority="medium"
                            variant="icon"
                          />
                        </div>
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          {openEvaluation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </CollapsibleTrigger>
                      </div>
                      <CardDescription>
                        Administrer spørsmål for leverandørevaluering
                      </CardDescription>
                    </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectSupplierQuestionsManager 
                        projectId={project.id}
                        projectTitle={project.title}
                        projectDescription={project.description || undefined}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openInvitation} onOpenChange={setOpenInvitation}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                            <CardTitle>Send invitasjoner</CardTitle>
                          </CollapsibleTrigger>
                          <ContextTaskButton
                            entityType="project"
                            entityId={project.id}
                            contextTitle="Sende leverandørinvitasjon"
                            contextDescription="Sende invitasjoner til leverandørportal"
                            contextBadge="Invitasjon"
                            contextSection="Leverandørinvitasjon"
                            contextPhase="markedsdialog"
                            suggestedPriority="high"
                            variant="icon"
                          />
                        </div>
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          {openInvitation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </CollapsibleTrigger>
                      </div>
                      <CardDescription>
                        Send invitasjoner til leverandører for å besvare spørsmål
                      </CardDescription>
                    </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <SupplierInvitationManager projectId={project.id} />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          {/* Phase 3 - Invitasjon til kontrakt */}
          {project.current_phase === 'invitasjon' && userId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-semibold">Fase 3: Invitasjon til kontrakt</h2>
              </div>
              
              <Card>
                <Collapsible open={openEvaluation} onOpenChange={setOpenEvaluation}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Leverandørevaluering</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Evaluere leverandørsvar"
                          contextDescription="Se og evaluer svar fra leverandører"
                          contextBadge="Evaluering"
                          contextSection="Leverandørevaluering"
                          contextPhase="invitasjon"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openEvaluation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>
                      Se svar og sammenlign leverandører
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ProjectSupplierEvaluation projectId={project.id} />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openContractInvitation} onOpenChange={setOpenContractInvitation}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Kontraktsinvitasjon</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Sende kontraktsinvitasjon"
                          contextDescription="Opprette og sende formell invitasjon til kontrakt"
                          contextBadge="Kontrakt"
                          contextSection="Kontraktsinvitasjon"
                          contextPhase="invitasjon"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openContractInvitation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Opprett formell invitasjon til kontrakt</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ContractInvitation projectId={project.id} userId={userId} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openTenderDocs} onOpenChange={setOpenTenderDocs}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Anbudsdokumenter</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Administrere anbudsdokumenter"
                          contextDescription="Opprette og gjennomgå nødvendige anbudsdokumenter"
                          contextBadge="Dokumenter"
                          contextSection="Anbudsdokumenter"
                          contextPhase="invitasjon"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openTenderDocs ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Administrer nødvendige anbudsdokumenter</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><TenderDocuments projectId={project.id} userId={userId} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openInvitationSender} onOpenChange={setOpenInvitationSender}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Send til leverandør</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Sende invitasjon til leverandør"
                          contextDescription="Send kontraktsinvitasjon til leverandører"
                          contextBadge="Invitasjon"
                          contextSection="Send til leverandør"
                          contextPhase="invitasjon"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openInvitationSender ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Send kontraktsinvitasjon til leverandørens kontaktperson</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ContractInvitationSender projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openResponses} onOpenChange={setOpenResponses}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Mottatte tilbud</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Evaluere tilbud"
                          contextDescription="Gjennomgå og evaluere mottatte tilbud"
                          contextBadge="Tilbud"
                          contextSection="Mottatte tilbud"
                          contextPhase="invitasjon"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openResponses ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Håndter og evaluer mottatte tilbud</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ResponseHandling projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          {/* Phase 4 - Leverandøroppfølging */}
          {project.current_phase === 'leverandor' && userId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-semibold">Fase 4: Leverandøroppfølging</h2>
              </div>
              
              <Card>
                <Collapsible open={openNegotiation} onOpenChange={setOpenNegotiation}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Kontraktsforhandlinger</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Følge opp kontraktsforhandlinger"
                          contextDescription="Gjennomgå eller oppdatere forhandlingspunkter"
                          contextBadge="Forhandling"
                          contextSection="Kontraktsforhandlinger"
                          contextPhase="leverandor"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openNegotiation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Forhandlingspunkter og timeline</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ContractNegotiation projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openContract} onOpenChange={setOpenContract}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Kontraktsdetaljer</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Administrere kontraktsdetaljer"
                          contextDescription="Oppdatere eller gjennomgå kontraktsinformasjon"
                          contextBadge="Kontrakt"
                          contextSection="Kontraktsdetaljer"
                          contextPhase="leverandor"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openContract ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Administrer kontraktsinformasjon</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ContractManagement projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openPerformance} onOpenChange={setOpenPerformance}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Leverandørytelse</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Evaluere leverandørens ytelse"
                          contextDescription="Gjennomgå eller registrere ytelsesmetrikk"
                          contextBadge="Ytelse"
                          contextSection="Leverandørytelse"
                          contextPhase="leverandor"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openPerformance ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Spor KPIer og ytelse</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><SupplierPerformance projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          {/* Phase 5 - Evaluering */}
          {project.current_phase === 'evaluering' && userId && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-semibold">Fase 5: Evaluering</h2>
              </div>
              
              <Card>
                <Collapsible open={openProjectEval} onOpenChange={setOpenProjectEval}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Prosjektevaluering</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Evaluere prosjekt"
                          contextDescription="Gjennomgå og evaluere prosjektets måloppnåelse"
                          contextBadge="Evaluering"
                          contextSection="Prosjektevaluering"
                          contextPhase="evaluering"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openProjectEval ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Evaluer prosjektets måloppnåelse</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ProjectEvaluation projectId={project.id} userId={userId} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openSupplierEval} onOpenChange={setOpenSupplierEval}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Leverandørevaluering</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Evaluere leverandør"
                          contextDescription="Gjennomgå og evaluere valgt leverandør"
                          contextBadge="Evaluering"
                          contextSection="Leverandørevaluering"
                          contextPhase="evaluering"
                          suggestedPriority="high"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openSupplierEval ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Evaluer valgt leverandør</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><SupplierEvaluation projectId={project.id} userId={userId} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openLessons} onOpenChange={setOpenLessons}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Lærdommer</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Dokumentere lærdommer"
                          contextDescription="Samle og dokumentere lærdommer fra prosjektet"
                          contextBadge="Lærdommer"
                          contextSection="Lærdommer"
                          contextPhase="evaluering"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openLessons ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Dokumenter lærdommer for fremtiden</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><LessonsLearned projectId={project.id} userId={userId} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
              
              <Card>
                <Collapsible open={openClosure} onOpenChange={setOpenClosure}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                          <CardTitle>Prosjektavslutning</CardTitle>
                        </CollapsibleTrigger>
                        <ContextTaskButton
                          entityType="project"
                          entityId={project.id}
                          contextTitle="Avslutte prosjekt"
                          contextDescription="Forberede og gjennomføre prosjektavslutning"
                          contextBadge="Avslutning"
                          contextSection="Prosjektavslutning"
                          contextPhase="evaluering"
                          suggestedPriority="medium"
                          variant="icon"
                        />
                      </div>
                      <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                        {openClosure ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CollapsibleTrigger>
                    </div>
                    <CardDescription>Avslutt og arkiver prosjektet</CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent><ProjectClosure projectId={project.id} /></CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          )}

          <Card id="dokumenter">
            <Collapsible open={openDocuments} onOpenChange={setOpenDocuments}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                      <CardTitle>Evalueringsdokumenter</CardTitle>
                    </CollapsibleTrigger>
                    <ContextTaskButton
                      entityType="project"
                      entityId={project.id}
                      contextTitle="Behandle dokumenter"
                      contextDescription="Laste opp, organisere eller analysere evalueringsdokumenter"
                      contextBadge="Dokumenter"
                      contextSection="Evalueringsdokumenter"
                      contextPhase={project.current_phase}
                      suggestedPriority="medium"
                      variant="icon"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowDocumentUpload(true)}
                      size="sm"
                    >
                      Last opp dokument
                    </Button>
                    <CollapsibleTrigger className="hover:opacity-80 transition-opacity">
                      {openDocuments ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CardDescription>
                  Last opp og administrer evalueringsdokumenter som kravspesifikasjoner, tilbud, presentasjoner og teknisk dokumentasjon
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <DocumentsList projectId={project.id} refreshTrigger={documentRefreshTrigger} />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <PhaseNavigation 
            projectId={project.id}
            currentPhase={project.current_phase}
            onPhaseChange={fetchProject}
          />
        </div>
      </main>

      <ChangeOwnerDialog
        open={showChangeOwner}
        onOpenChange={setShowChangeOwner}
        projectId={project.id}
        currentOwnerId={project.owner_id}
        companyId={project.company_id}
        onOwnerChanged={fetchProject}
      />

      {showDocumentUpload && project && (
        <DocumentUploadDialog
          open={showDocumentUpload}
          onOpenChange={setShowDocumentUpload}
          onUpload={async (file, documentType, supplierId, tags) => {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Ikke autentisert');
            
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${project.id}/${timestamp}_${sanitizedFileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('evaluation-documents')
              .upload(filePath, file, { contentType: file.type, upsert: false });
            
            if (uploadError) throw uploadError;
            
            await supabase.from('supplier_evaluation_documents').insert({
              project_id: project.id,
              supplier_id: supplierId || null,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              file_type: file.type,
              document_type: documentType,
              tags: tags || [],
              uploaded_by: user.id,
            });
            
            setShowDocumentUpload(false);
            setDocumentRefreshTrigger(prev => prev + 1);
          }}
          suppliers={projectSuppliers}
          isUploading={false}
        />
      )}
    </div>
  );
};

export default ProjectDetails;
