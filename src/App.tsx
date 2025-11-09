import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import AppAdminSidebar from "@/components/admin/AppAdminSidebar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBootstrap from "./pages/admin/AdminBootstrap";
import ApplicationCreate from "./pages/admin/ApplicationCreate";
import UserManagement from "./pages/UserManagement";
import AdminSettings from "./pages/AdminSettings";
import AdminQuestions from "./pages/AdminQuestions";
import AdminSeed from "./pages/AdminSeed";
import AdminCompanies from "./pages/admin/AdminCompanies";
import CapabilityCatalog from "./pages/CapabilityCatalog";
import CapabilityDetailsPage from "./pages/admin/CapabilityDetailsPage";
import IndustryAdmin from "./pages/IndustryAdmin";
import ApplicationsPage from "./pages/ApplicationsPage";
import AppProductDetails from "./pages/AppProductDetails";
import AppVendorAdmin from "./pages/AppVendorAdmin";
import SystemVendorsPage from "./pages/SystemVendorsPage";
import RoleManagement from "./pages/RoleManagement";
import RoleConfiguration from "./pages/admin/RoleConfiguration";
import PermissionHealth from "./pages/admin/PermissionHealth";
import CompaniesHub from "./pages/CompaniesHub";
import CompanySearch from "./pages/CompanySearch";
import CompanyDetails from "./pages/CompanyDetails";
import SavedCompanies from "./pages/SavedCompanies";
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
import McpPolicy from "./pages/admin/McpPolicy";
import McpWorkflows from "./pages/admin/McpWorkflows";
import McpSecrets from "./pages/admin/McpSecrets";
import McpObservability from "./pages/admin/McpObservability";
import AIMcpDemo from "./pages/admin/AIMcpDemo";
import Compatibility from "./pages/admin/Compatibility";
import Categories from "./pages/admin/Categories";
import TenantSystems from "./pages/admin/TenantSystems";
import IntegrationRecommendations from "./pages/admin/IntegrationRecommendations";
import IntegrationGraph from "./pages/admin/IntegrationGraph";
import { PageBuilder } from "./platform/admin/PageBuilder";
import { DynamicPage } from "./pages/DynamicPage";
import { AkseleraDemoPage } from "./tenants/akselera/pages/DemoPage";
import { BrandPreview } from "./pages/apps/BrandPreview";
import { TenantBranding } from "./pages/admin/tenants/Branding";
import Demo from "./pages/Demo";
import LandingPage from "./pages/LandingPage";
import PlatformInvitationsPage from "./pages/admin/PlatformInvitationsPage";
import { PlatformProtectedRoute } from "./components/auth/PlatformProtectedRoute";
import { useAuth } from "@/modules/core/user/hooks/useAuth";

const queryClient = new QueryClient();

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin } = usePlatformAdmin();
  return (
    <div className="flex w-full min-h-screen">
      {isPlatformAdmin && <AppAdminSidebar />}
      <div className="flex-1">{children}</div>
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SidebarProvider defaultOpen>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<PlatformProtectedRoute><Dashboard /></PlatformProtectedRoute>} />
            <Route path="/supplier/:token" element={<SupplierAuth />} />
            
            {/* Onboarding Routes */}
            <Route path="/onboarding/company" element={<PlatformProtectedRoute><CompanyRegistration /></PlatformProtectedRoute>} />
            <Route path="/onboarding/project" element={<PlatformProtectedRoute><ProjectCreation /></PlatformProtectedRoute>} />
            <Route path="/modules" element={<PlatformProtectedRoute><Modules /></PlatformProtectedRoute>} />
            
            {/* Admin Panel with sidebar */}
            <Route path="/admin" element={<PlatformProtectedRoute><AdminLayout><Admin /></AdminLayout></PlatformProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="invitations" element={<PlatformInvitationsPage />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/:tenantId" element={<TenantDetails />} />
              <Route path="tenants/:tenantId/integrations" element={<TenantIntegrations />} />
              <Route path="tenants/:tenantId/mcp-actions" element={<McpActionsRegistry />} />
              <Route path="tenants/:tenantId/settings" element={<TenantSettings />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="roles" element={<RoleManagement />} />
              <Route path="roles/config" element={<RoleConfiguration />} />
              <Route path="permissions/health" element={<PermissionHealth />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="archived" element={<ArchivedResources />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="industries" element={<IndustryAdmin />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/new" element={<ApplicationCreate />} />
              <Route path="capabilities" element={<CapabilityCatalog />} />
              <Route path="capabilities/:capabilityId" element={<CapabilityDetailsPage />} />
              <Route path="database" element={<AdminSeed />} />
              <Route path="integrations" element={<PlatformIntegrations />} />
              <Route path="ai-providers" element={<AIProviderSettings />} />
              <Route path="security" element={<AdminSettings />} />
              <Route path="apps" element={<AppCatalog />} />
              <Route path="apps/new" element={<AppDefinitionCreate />} />
              <Route path="apps/:appKey" element={<AppDefinitionDetails />} />
              <Route path="apps/:appKey/versions" element={<AppVersionsPage />} />
              <Route path="tenants/:tenantId/apps" element={<TenantAppsPage />} />
              <Route path="tenants/:tenantId/apps/catalog" element={<TenantAppCatalog />} />
              <Route path="mcp/policy" element={<McpPolicy />} />
              <Route path="mcp/workflows" element={<McpWorkflows />} />
              <Route path="mcp/secrets" element={<McpSecrets />} />
              <Route path="mcp/observability" element={<McpObservability />} />
              <Route path="ai/mcp-demo" element={<AIMcpDemo />} />
              <Route path="compatibility" element={<Compatibility />} />
              <Route path="categories" element={<Categories />} />
              <Route path="tenant-systems" element={<TenantSystems />} />
              <Route path="integration-recommendations" element={<IntegrationRecommendations />} />
              <Route path="integration-graph" element={<IntegrationGraph />} />
            </Route>
            
            {/* Legacy admin routes - redirect to new structure */}
            <Route path="/admin/bootstrap" element={<PlatformProtectedRoute><AdminLayout><AdminBootstrap /></AdminLayout></PlatformProtectedRoute>} />
            <Route path="/admin/questions" element={<PlatformProtectedRoute><AdminLayout><AdminQuestions /></AdminLayout></PlatformProtectedRoute>} />
            <Route path="/admin/app-vendors" element={<PlatformProtectedRoute><AdminLayout><AppVendorAdmin /></AdminLayout></PlatformProtectedRoute>} />
            <Route path="/tenants" element={<PlatformProtectedRoute><Tenants /></PlatformProtectedRoute>} />
            
            {/* Applications */}
            <Route path="/applications" element={<PlatformProtectedRoute><ApplicationsPage /></PlatformProtectedRoute>} />
            <Route path="/applications/:id" element={<PlatformProtectedRoute><AppProductDetails /></PlatformProtectedRoute>} />
            <Route path="/system-vendors" element={<PlatformProtectedRoute><SystemVendorsPage /></PlatformProtectedRoute>} />
            <Route path="/capabilities" element={<PlatformProtectedRoute><CapabilityCatalog /></PlatformProtectedRoute>} />
            
            {/* Companies */}
            <Route path="/companies" element={<PlatformProtectedRoute><CompaniesHub /></PlatformProtectedRoute>} />
            <Route path="/companies/search" element={<PlatformProtectedRoute><CompanySearch /></PlatformProtectedRoute>} />
            <Route path="/companies/:id" element={<PlatformProtectedRoute><CompanyDetails /></PlatformProtectedRoute>} />
            <Route path="/saved-companies" element={<PlatformProtectedRoute><SavedCompanies /></PlatformProtectedRoute>} />
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
            
            {/* Tenant-specific demo pages */}
            <Route path="/demo" element={<Demo />} />
            <Route path="/akselera/demo" element={<AkseleraDemoPage />} />
            
            {/* Tenant branding admin */}
            <Route path="/admin/tenants/:slug/branding" element={<AdminLayout><TenantBranding /></AdminLayout>} />
            
            {/* Dynamic Pages */}
            <Route path="/page/:pageKey" element={<DynamicPage />} />
            <Route path="/admin/page-builder" element={<AdminLayout><PageBuilder /></AdminLayout>} />
            
            {/* Catch-all 404 route - MUST BE LAST */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
