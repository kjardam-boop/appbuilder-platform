import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Modules from "./pages/Modules";
import Tenants from "./pages/Tenants";
import Auth from "./pages/Auth";
import UserManagement from "./pages/UserManagement";
import AdminSettings from "./pages/AdminSettings";
import AdminQuestions from "./pages/AdminQuestions";
import AdminSeed from "./pages/AdminSeed";
import IndustryAdmin from "./pages/IndustryAdmin";
import ApplicationsPage from "./pages/ApplicationsPage";
import AppProductDetails from "./pages/AppProductDetails";
import AppVendorAdmin from "./pages/AppVendorAdmin";
import ERPSystemsPage from "./pages/ERPSystemsPage";
import ERPSystemDetails from "./pages/ERPSystemDetails";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/tenants" element={<Tenants />} />
          
          {/* Admin routes */}
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/questions" element={<AdminQuestions />} />
          <Route path="/admin/seed" element={<AdminSeed />} />
          <Route path="/admin/industry" element={<IndustryAdmin />} />
          <Route path="/admin/app-vendors" element={<AppVendorAdmin />} />
          
          {/* Applications & ERP Systems */}
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:id" element={<AppProductDetails />} />
          <Route path="/erp-systems" element={<ERPSystemsPage />} />
          <Route path="/erp-systems/:id" element={<ERPSystemDetails />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
