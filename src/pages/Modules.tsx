import { Header } from "@/components/layout/Header";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';
  Building2, 
  FolderKanban, 
  FileText, 
  Star, 
  GitBranch, 
  Plug, 
  Search,
  Filter
} from "lucide-react";

const Modules = () => {
  const modules = [
    {
      title: "Company Management",
      description: "Core tenant and organization management with hierarchy support",
      icon: Building2,
      category: "Core" as const,
      status: "Active" as const,
    },
    {
      title: "Project Hub",
      description: "Project planning, tracking and collaboration tools",
      icon: FolderKanban,
      category: "Core" as const,
      status: "Active" as const,
    },
    {
      title: "Document Engine",
      description: "Document storage, versioning and management system",
      icon: FileText,
      category: "Core" as const,
      status: "Active" as const,
    },
    {
      title: "Scoring System",
      description: "Configurable scoring and evaluation framework",
      icon: Star,
      category: "Core" as const,
      status: "Active" as const,
    },
    {
      title: "Decision Matrix",
      description: "Multi-criteria decision analysis and comparison tools",
      icon: GitBranch,
      category: "Addon" as const,
      status: "Available" as const,
    },
    {
      title: "Integration Hub",
      description: "Connect with ERP, CRM, and external systems via adapters",
      icon: Plug,
      category: "Addon" as const,
      status: "Available" as const,
    },
  ];

  return (
    <div 
    <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Platform",
  currentPage: "Modules"
})} />
    className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Module Library</h1>
          <p className="text-muted-foreground">Browse and manage platform modules and addons</p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search modules..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Modules;
