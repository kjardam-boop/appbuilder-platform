import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/modules/core/user/hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Modules from "./pages/Modules";
import Tenants from "./pages/Tenants";
import TenantDetails from "./pages/TenantDetails";
import TenantIntegrations from "./pages/admin/TenantIntegrations";
import McpActionsRegistry from "./pages/admin/McpActionsRegistry";
import TenantSettings from "./pages/admin/TenantSettings";
import PlatformIntegrations from "./pages/admin/PlatformIntegrations";
import AIProviderSettings from "./pages/admin/AIProviderSettings";
import CompanyRegistration from "./pages/onboarding/CompanyRegistration";
import ProjectCreation from "./pages/onboarding/ProjectCreation";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useHasAdminPermissions } from "@/modules/core/permissions/hooks/useHasAdminPermissions";
import AppAdminSidebar from "@/components/admin/AppAdminSidebar";
import { PermissionProtectedRoute } from "@/components/admin/PermissionProtectedRoute";
import { getRoutePermission } from "@/config/adminNavigation";
import { TenantContextIndicator } from "@/components/admin/TenantContextIndicator";
import { TenantSwitcher } from "@/components/tenant/TenantSwitcher";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBootstrap from "./pages/admin/AdminBootstrap";
import ApplicationCreate from "./pages/admin/ApplicationCreate";
import UserManagement from "./pages/UserManagement";
import AdminSettings from "./pages/AdminSettings";
import AdminQuestions from "./pages/AdminQuestions";
import AdminSeed from "./pages/AdminSeed";
import DatabaseNamingValidation from "./pages/admin/DatabaseNamingValidation";
import PlatformDocumentation from "./pages/admin/PlatformDocumentation";
import DocumentationDetail from "./pages/admin/DocumentationDetail";
import AdminCompanies from "./pages/admin/AdminCompanies";
import CapabilityCatalog from "./pages/CapabilityCatalog";
import CapabilityDetailsPage from "./pages/admin/CapabilityDetailsPage";
import CapabilityBundlesPage from "./pages/admin/CapabilityBundlesPage";
import IndustryAdmin from "./pages/IndustryAdmin";
import ApplicationsPage from "./pages/ApplicationsPage";
import ExternalSystemDetails from "./pages/ExternalSystemDetails";
import ExternalSystemVendorAdmin from "./pages/ExternalSystemVendorAdmin";
import SystemVendorsPage from "./pages/SystemVendorsPage";
import VendorDetailsPage from "./pages/VendorDetailsPage";
import RoleManagement from "./pages/RoleManagement";
import RoleConfiguration from "./pages/admin/RoleConfiguration";
import PermissionHealth from "./pages/admin/PermissionHealth";
import CompaniesHub from "./pages/CompaniesHub";
import CompanySearch from "./pages/CompanySearch";
import CompanyDetails from "./pages/CompanyDetails";
import CompanyIntegrations from "./pages/CompanyIntegrations";
import CustomersPage from "./pages/CustomersPage";
import ImplementationPartnersPage from "./pages/ImplementationPartnersPage";

import ProjectsHub from "./pages/ProjectsHub";
import ProjectDetails from "./pages/ProjectDetails";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetails from "./pages/OpportunityDetails";
import SupplierAuth from "./pages/SupplierAuth";
import SupplierScoringPage from "./pages/SupplierScoringPage";
import ArchivedResources from "./pages/ArchivedResources";
import NotFound from "./pages/NotFound";
import AppsPage from "./pages/AppsPage";
import AppCatalog from "./pages/admin/AppCatalog";
import AppDefinitionCreate from "./pages/admin/AppDefinitionCreate";
import AppDefinitionDetails from "./pages/admin/AppDefinitionDetails";
import AppVersionsPage from "./pages/admin/AppVersionsPage";
import TenantAppsPage from "./pages/admin/TenantAppsPage";
import TenantAppCatalog from "./pages/admin/TenantAppCatalog";
import Jul25App from "./pages/apps/Jul25App";
import Jul25FamilyAdmin from "./pages/apps/Jul25FamilyAdmin";
import Jul25MemberEdit from "./pages/apps/Jul25MemberEdit";
import InviteMembersPage from "./pages/apps/jul25/InviteMembersPage";
import AIChatApp from "./pages/apps/AIChatApp";
import McpPolicy from "./pages/admin/McpPolicy";
// N8nWorkflows removed - consolidated to /admin/integrations?tab=workflows
import McpSecrets from "./pages/admin/McpSecrets";
import McpObservability from "./pages/admin/McpObservability";
import AIMcpDemo from "./pages/admin/AIMcpDemo";
import Compatibility from "./pages/admin/Compatibility";
import Categories from "./pages/admin/Categories";
import TenantSystems from "./pages/admin/TenantSystems";
import PerformanceTest from "./pages/admin/PerformanceTest";
import IntegrationRecommendations from "./pages/admin/IntegrationRecommendations";
import IntegrationGraph from "./pages/admin/IntegrationGraph";
import IntegrationsHub from "./pages/admin/integrations/IntegrationsHub";
import OdooSync from "./pages/admin/OdooSync";
import NewAppWizard from "./pages/admin/NewAppWizard";
import AppProjects from "./pages/admin/AppProjects";
import AppPreview from "./pages/admin/AppPreview";
import DeliveryMethodDetail from "./pages/admin/integrations/DeliveryMethodDetail";
import IntegrationDefinitionDetail from "./pages/admin/integrations/IntegrationDefinitionDetail";
import WorkflowDetailPage from "./pages/admin/integrations/WorkflowDetailPage";
import { PageBuilder } from "./platform/admin/PageBuilder";
import { DynamicPage } from "./pages/DynamicPage";
import { AkseleraDemoPage } from "./tenants/akselera/pages/DemoPage";
import { BrandPreview } from "./pages/apps/BrandPreview";
import { TenantBranding } from "./pages/admin/tenants/Branding";
import Demo from "./pages/Demo";
import LandingPage from "./pages/LandingPage";
import PlatformInvitationsPage from "./pages/admin/PlatformInvitationsPage";
import CredentialsPage from "./pages/admin/CredentialsPage";
import ContentLibrary from "./pages/admin/ContentLibrary";
import RunMigrations from "./pages/admin/RunMigrations";
import { PlatformProtectedRoute } from "./components/auth/PlatformProtectedRoute";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TenantThemeProvider } from "@/modules/tenant/providers/TenantThemeProvider";

const queryClient = new QueryClient();

// Global layout that shows admin sidebar for users with admin permissions
function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { hasAdminAccess, isLoading } = useHasAdminPermissions();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  console.log('[GlobalLayout] Render state:', {
    hasAdminAccess,
    isLoading,
    userId: user?.id,
    userEmail: user?.email
  });
  
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Du er nå logget ut");
      navigate("/");
    } catch (error) {
      toast.error("Feil ved utlogging");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  if (!hasAdminAccess) {
    // Regular users see content without admin sidebar
    return <>{children}</>;
  }

  return (
    <div className="flex w-full min-h-screen">
      <AppAdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* Sticky header with sidebar toggle */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex h-14 items-center px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex items-center justify-end gap-3 px-4">
              <TenantSwitcher />
              <TenantContextIndicator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Platform Admin</span>
              </div>
              {user && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{user.email}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logg ut
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function RootRoute() {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }
  
  return session ? <Index /> : <LandingPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SidebarProvider defaultOpen>
            <BrowserRouter>
              <GlobalLayout>
                <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<PlatformProtectedRoute><Dashboard /></PlatformProtectedRoute>} />
            <Route path="/supplier/:token" element={<SupplierAuth />} />
            
            {/* Onboarding Routes */}
            <Route path="/onboarding/company" element={<PlatformProtectedRoute><CompanyRegistration /></PlatformProtectedRoute>} />
            <Route path="/onboarding/project" element={<PlatformProtectedRoute><ProjectCreation /></PlatformProtectedRoute>} />
            <Route path="/modules" element={<PlatformProtectedRoute><Modules /></PlatformProtectedRoute>} />
            
            {/* Admin Panel routes - protected by permissions */}
            <Route path="/admin" element={<Admin />}>
              <Route index element={<PermissionProtectedRoute><AdminDashboard /></PermissionProtectedRoute>} />
              <Route path="invitations" element={<PermissionProtectedRoute resource="user" action="admin"><PlatformInvitationsPage /></PermissionProtectedRoute>} />
              <Route path="tenants" element={<PermissionProtectedRoute resource="tenant" action="admin"><Tenants /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId" element={<PermissionProtectedRoute resource="tenant" action="admin"><TenantDetails /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId/integrations" element={<PermissionProtectedRoute resource="integration" action="admin"><TenantIntegrations /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId/mcp-actions" element={<PermissionProtectedRoute resource="integration" action="admin"><McpActionsRegistry /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId/settings" element={<PermissionProtectedRoute resource="tenant" action="admin"><TenantSettings /></PermissionProtectedRoute>} />
              <Route path="users" element={<PermissionProtectedRoute resource="user" action="admin"><UserManagement /></PermissionProtectedRoute>} />
              <Route path="roles" element={<PermissionProtectedRoute resource="user" action="list"><RoleManagement /></PermissionProtectedRoute>} />
              <Route path="roles/config" element={<PermissionProtectedRoute resource="user" action="admin"><RoleConfiguration /></PermissionProtectedRoute>} />
              <Route path="permissions/health" element={<PermissionProtectedRoute resource="user" action="admin"><PermissionHealth /></PermissionProtectedRoute>} />
              <Route path="companies" element={<PermissionProtectedRoute resource="company" action="admin"><AdminCompanies /></PermissionProtectedRoute>} />
              <Route path="archived" element={<PermissionProtectedRoute resource="document" action="list"><ArchivedResources /></PermissionProtectedRoute>} />
              <Route path="settings" element={<PermissionProtectedRoute resource="tenant" action="admin"><AdminSettings /></PermissionProtectedRoute>} />
              <Route path="industries" element={<PermissionProtectedRoute resource="industry" action="admin"><IndustryAdmin /></PermissionProtectedRoute>} />
              <Route path="external-systems" element={<PermissionProtectedRoute resource="application" action="admin"><ApplicationsPage /></PermissionProtectedRoute>} />
              <Route path="external-systems/new" element={<PermissionProtectedRoute resource="application" action="admin"><ApplicationCreate /></PermissionProtectedRoute>} />
              <Route path="capabilities" element={<PermissionProtectedRoute resource="capability" action="admin"><CapabilityCatalog /></PermissionProtectedRoute>} />
              <Route path="capabilities/:capabilityId" element={<PermissionProtectedRoute resource="capability" action="admin"><CapabilityDetailsPage /></PermissionProtectedRoute>} />
              <Route path="capability-bundles" element={<PermissionProtectedRoute resource="capability" action="admin"><CapabilityBundlesPage /></PermissionProtectedRoute>} />
              <Route path="documentation" element={<PermissionProtectedRoute resource="tenant" action="admin"><PlatformDocumentation /></PermissionProtectedRoute>} />
              <Route path="documentation/:docId" element={<PermissionProtectedRoute resource="tenant" action="admin"><DocumentationDetail /></PermissionProtectedRoute>} />
              <Route path="database" element={<PermissionProtectedRoute resource="tenant" action="admin"><AdminSeed /></PermissionProtectedRoute>} />
              <Route path="database/naming" element={<PermissionProtectedRoute resource="tenant" action="admin"><DatabaseNamingValidation /></PermissionProtectedRoute>} />
              <Route path="integrations" element={<PermissionProtectedRoute resource="integration" action="admin"><IntegrationsHub /></PermissionProtectedRoute>} />
              <Route path="integrations/odoo" element={<PermissionProtectedRoute resource="integration" action="admin"><OdooSync /></PermissionProtectedRoute>} />
              <Route path="integrations/delivery-methods/:id" element={<PermissionProtectedRoute resource="integration" action="admin"><DeliveryMethodDetail /></PermissionProtectedRoute>} />
              <Route path="integrations/definitions/:id" element={<PermissionProtectedRoute resource="integration" action="admin"><IntegrationDefinitionDetail /></PermissionProtectedRoute>} />
              <Route path="integrations/workflows/:workflowId" element={<PermissionProtectedRoute resource="integration" action="admin"><WorkflowDetailPage /></PermissionProtectedRoute>} />
              <Route path="integrations-old" element={<PermissionProtectedRoute resource="integration" action="admin"><PlatformIntegrations /></PermissionProtectedRoute>} />
              {/* AI Providers is now a tab under integrations */}
              <Route path="ai-providers" element={<Navigate to="/admin/integrations?tab=ai-providers" replace />} />
              <Route path="credentials" element={<PermissionProtectedRoute resource="integration" action="admin"><CredentialsPage /></PermissionProtectedRoute>} />
              <Route path="content-library" element={<PermissionProtectedRoute resource="tenant" action="admin"><ContentLibrary /></PermissionProtectedRoute>} />
              <Route path="run-migrations" element={<PermissionProtectedRoute resource="tenant" action="admin"><RunMigrations /></PermissionProtectedRoute>} />
              <Route path="security" element={<PermissionProtectedRoute resource="audit_log" action="admin"><AdminSettings /></PermissionProtectedRoute>} />
              <Route path="apps" element={<PermissionProtectedRoute resource="app_definition" action="admin"><AppCatalog /></PermissionProtectedRoute>} />
              <Route path="apps/new" element={<PermissionProtectedRoute resource="app_definition" action="admin"><AppDefinitionCreate /></PermissionProtectedRoute>} />
              <Route path="apps/wizard" element={<PermissionProtectedRoute resource="application" action="admin"><NewAppWizard /></PermissionProtectedRoute>} />
              <Route path="apps/projects" element={<PermissionProtectedRoute resource="application" action="admin"><AppProjects /></PermissionProtectedRoute>} />
              <Route path="apps/preview/:appId" element={<PermissionProtectedRoute resource="application" action="admin"><AppPreview /></PermissionProtectedRoute>} />
              <Route path="apps/:appKey" element={<PermissionProtectedRoute resource="app_definition" action="admin"><AppDefinitionDetails /></PermissionProtectedRoute>} />
              <Route path="apps/:appKey/versions" element={<PermissionProtectedRoute resource="app_definition" action="admin"><AppVersionsPage /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId/apps" element={<PermissionProtectedRoute resource="application" action="list"><TenantAppsPage /></PermissionProtectedRoute>} />
              <Route path="tenants/:tenantId/apps/catalog" element={<PermissionProtectedRoute resource="application" action="list"><TenantAppCatalog /></PermissionProtectedRoute>} />
              {/* MCP routes - only keep actual MCP functionality */}
              <Route path="mcp/policy" element={<PermissionProtectedRoute resource="mcp_secret" action="admin"><McpPolicy /></PermissionProtectedRoute>} />
              <Route path="ai/mcp-demo" element={<PermissionProtectedRoute resource="integration" action="admin"><AIMcpDemo /></PermissionProtectedRoute>} />
              
              {/* n8n Workflows - redirect to consolidated location */}
              <Route path="n8n/workflows" element={<Navigate to="/admin/integrations?tab=workflows" replace />} />
              
              {/* Redirects from old MCP URLs */}
              <Route path="mcp/workflows" element={<Navigate to="/admin/integrations?tab=workflows" replace />} />
              <Route path="mcp/secrets" element={<Navigate to="/admin/credentials" replace />} />
              <Route path="mcp/observability" element={<Navigate to="/admin/integrations?tab=observability" replace />} />
              
              <Route path="compatibility" element={<PermissionProtectedRoute resource="capability" action="admin"><Compatibility /></PermissionProtectedRoute>} />
              <Route path="categories" element={<PermissionProtectedRoute resource="capability" action="admin"><Categories /></PermissionProtectedRoute>} />
              <Route path="tenant-systems" element={<PermissionProtectedRoute resource="application" action="list"><TenantSystems /></PermissionProtectedRoute>} />
              <Route path="performance-test" element={<PermissionProtectedRoute resource="application" action="admin"><PerformanceTest /></PermissionProtectedRoute>} />
              
              {/* Integration tools - keep for now but accessible from IntegrationsHub */}
              <Route path="integration-recommendations" element={<PermissionProtectedRoute resource="integration" action="list"><IntegrationRecommendations /></PermissionProtectedRoute>} />
              <Route path="integration-graph" element={<PermissionProtectedRoute resource="integration" action="list"><IntegrationGraph /></PermissionProtectedRoute>} />
            </Route>
            
            {/* Legacy admin routes */}
            <Route path="/admin/bootstrap" element={<PlatformProtectedRoute><AdminBootstrap /></PlatformProtectedRoute>} />
            <Route path="/admin/questions" element={<PlatformProtectedRoute><AdminQuestions /></PlatformProtectedRoute>} />
            <Route path="/admin/app-vendors" element={<PlatformProtectedRoute><ExternalSystemVendorAdmin /></PlatformProtectedRoute>} />
            <Route path="/tenants" element={<PlatformProtectedRoute><Tenants /></PlatformProtectedRoute>} />
            
            {/* Applications - with redirects from old /applications routes */}
            <Route path="/external-systems" element={<PlatformProtectedRoute><ApplicationsPage /></PlatformProtectedRoute>} />
            <Route path="/external-systems/:id" element={<PlatformProtectedRoute><ExternalSystemDetails /></PlatformProtectedRoute>} />
            <Route path="/external-systems/vendors/:id" element={<PlatformProtectedRoute><VendorDetailsPage /></PlatformProtectedRoute>} />
            <Route path="/system-vendors" element={<PlatformProtectedRoute><SystemVendorsPage /></PlatformProtectedRoute>} />
            <Route path="/capabilities" element={<PlatformProtectedRoute><CapabilityCatalog /></PlatformProtectedRoute>} />
            
            {/* Redirects from old /applications routes to new /external-systems */}
            <Route path="/applications" element={<Navigate to="/external-systems" replace />} />
            <Route path="/applications/:id" element={<Navigate to="/external-systems/:id" replace />} />
            <Route path="/admin/applications" element={<Navigate to="/admin/external-systems" replace />} />
            <Route path="/admin/applications/new" element={<Navigate to="/admin/external-systems/new" replace />} />
            
            {/* Companies */}
            <Route path="/companies" element={<PlatformProtectedRoute><CompaniesHub /></PlatformProtectedRoute>} />
            <Route path="/companies/search" element={<PlatformProtectedRoute><CompanySearch /></PlatformProtectedRoute>} />
            <Route path="/companies/:id" element={<PlatformProtectedRoute><CompanyDetails /></PlatformProtectedRoute>} />
            <Route path="/companies/:id/integrations" element={<PlatformProtectedRoute><CompanyIntegrations /></PlatformProtectedRoute>} />
            <Route path="/customers" element={<PlatformProtectedRoute><CustomersPage /></PlatformProtectedRoute>} />
            <Route path="/implementation-partners" element={<PlatformProtectedRoute><ImplementationPartnersPage /></PlatformProtectedRoute>} />
            
            {/* Projects */}
            <Route path="/projects" element={<PlatformProtectedRoute><ProjectsHub /></PlatformProtectedRoute>} />
            <Route path="/projects/:id" element={<PlatformProtectedRoute><ProjectDetails /></PlatformProtectedRoute>} />
            
            {/* Opportunities */}
            <Route path="/opportunities" element={<PlatformProtectedRoute><OpportunitiesPage /></PlatformProtectedRoute>} />
            <Route path="/opportunities/:id" element={<PlatformProtectedRoute><OpportunityDetails /></PlatformProtectedRoute>} />
            
            {/* Supplier routes */}
            <Route path="/supplier/auth" element={<SupplierAuth />} />
            <Route path="/supplier/scoring/:projectId/:supplierId" element={<SupplierScoringPage />} />
            
            {/* Customer Apps */}
            <Route path="/apps" element={<PlatformProtectedRoute><AppsPage /></PlatformProtectedRoute>} />
            <Route path="/apps/:projectId/brand-preview" element={<PlatformProtectedRoute><BrandPreview /></PlatformProtectedRoute>} />
            <Route path="/apps/jul25" element={<Jul25App />} />
            <Route path="/apps/jul25/admin" element={<Jul25FamilyAdmin />} />
            <Route path="/apps/jul25/member/:memberId" element={<Jul25MemberEdit />} />
            <Route path="/apps/jul25/invite" element={<InviteMembersPage />} />
            <Route path="/apps/ai-chat" element={<AIChatApp />} />
            
            {/* Tenant-specific demo pages */}
            <Route path="/demo" element={<Demo />} />
            <Route path="/akselera/demo" element={<AkseleraDemoPage />} />
            
            {/* Tenant branding admin */}
            <Route path="/admin/tenants/:slug/branding" element={<TenantBranding />} />
            
            {/* Dynamic Pages */}
            <Route path="/page/:pageKey" element={<DynamicPage />} />
            <Route path="/admin/page-builder" element={<PageBuilder />} />
            
            {/* Catch-all 404 route - MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </GlobalLayout>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
      </TenantThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
