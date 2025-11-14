import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCategoryManager } from '@/modules/core/admin';
import { IndustryManager } from '@/modules/core/industry/components/IndustryManager';
import AIProviderSettings from '@/pages/admin/AIProviderSettings';
import AIUsageDashboard from '@/pages/admin/AIUsageDashboard';
import AIPolicySettings from '@/pages/admin/AIPolicySettings';
import AIProviderHealth from '@/pages/admin/AIProviderHealth';
import { useAdminRole } from '@/modules/core/user';
import { Navigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function AdminSettings() {
  const { isAdmin, isLoading } = useAdminRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Laster...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="w-full px-4 lg:px-6 xl:px-8 py-8">
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
        category: "Platform",
        currentPage: "Settings"
      })} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administrasjon</h1>
        <p className="text-muted-foreground">
          Administrer systeminnstillinger og kategorier
        </p>
      </div>

      <Tabs defaultValue="task-categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="task-categories">Oppgavekategorier</TabsTrigger>
          <TabsTrigger value="industries">Bransjer</TabsTrigger>
          <TabsTrigger value="products">Produkter</TabsTrigger>
          <TabsTrigger value="ai-providers">AI Providers</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="ai-policy">AI Policy</TabsTrigger>
          <TabsTrigger value="ai-health">AI Health</TabsTrigger>
          <TabsTrigger value="settings">Innstillinger</TabsTrigger>
        </TabsList>

        <TabsContent value="task-categories">
          <TaskCategoryManager />
        </TabsContent>

        <TabsContent value="industries">
          <IndustryManager />
        </TabsContent>

        <TabsContent value="products">
          <div className="p-8 text-center text-muted-foreground">
            Produktadministrasjon kommer snart...
          </div>
        </TabsContent>

        <TabsContent value="ai-providers">
          <AIProviderSettings />
        </TabsContent>

        <TabsContent value="ai-usage">
          <AIUsageDashboard />
        </TabsContent>

        <TabsContent value="ai-policy">
          <AIPolicySettings />
        </TabsContent>

        <TabsContent value="ai-health">
          <AIProviderHealth />
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-8 text-center text-muted-foreground">
            Systeminnstillinger kommer snart...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
