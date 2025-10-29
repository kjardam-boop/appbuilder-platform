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
import CompanyRegistration from "./pages/onboarding/CompanyRegistration";
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
import IndustryAdmin from "./pages/IndustryAdmin";
import ApplicationsPage from "./pages/ApplicationsPage";
import AppProductDetails from "./pages/AppProductDetails";
import AppVendorAdmin from "./pages/AppVendorAdmin";
import SystemVendorsPage from "./pages/SystemVendorsPage";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminShell({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin } = usePlatformAdmin();
  return (
    <SidebarProvider defaultOpen>
      <div className="flex w-full">
        {isPlatformAdmin && <AppAdminSidebar />}
        <div className="flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AdminShell>
            <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/supplier/:token" element={<SupplierAuth />} />
            
            {/* Onboarding Routes */}
            <Route path="/onboarding/company" element={<CompanyRegistration />} />
              <Route path="/modules" element={<Modules />} />
              
              {/* Admin Panel (content only; sidebar is global now) */}
              <Route path="/admin" element={<Admin />}>
                <Route index element={<AdminDashboard />} />
                <Route path="tenants" element={<Tenants />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="industries" element={<IndustryAdmin />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="applications/new" element={<ApplicationCreate />} />
                <Route path="database" element={<AdminSeed />} />
                <Route path="integrations" element={<AdminSettings />} />
                <Route path="security" element={<AdminSettings />} />
              </Route>
              
              {/* Legacy admin routes - redirect to new structure */}
              <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
              <Route path="/admin/questions" element={<AdminQuestions />} />
              <Route path="/admin/app-vendors" element={<AppVendorAdmin />} />
              <Route path="/tenants" element={<Tenants />} />
              
              {/* Applications */}
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/applications/:id" element={<AppProductDetails />} />
              <Route path="/system-vendors" element={<SystemVendorsPage />} />
              
              {/* Companies */}
              <Route path="/companies" element={<CompaniesHub />} />
              <Route path="/companies/search" element={<CompanySearch />} />
              <Route path="/companies/:id" element={<CompanyDetails />} />
              <Route path="/saved-companies" element={<SavedCompanies />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/implementation-partners" element={<ImplementationPartnersPage />} />
              
              {/* Projects */}
              <Route path="/projects" element={<ProjectsHub />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              
              {/* Opportunities */}
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/opportunities/:id" element={<OpportunityDetails />} />
              
              {/* Supplier routes */}
              <Route path="/supplier/auth" element={<SupplierAuth />} />
              <Route path="/supplier/scoring/:projectId/:supplierId" element={<SupplierScoringPage />} />
              
              {/* Catch-all 404 route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
