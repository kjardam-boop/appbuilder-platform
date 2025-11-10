import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import ProviderTypesTab from "./tabs/ProviderTypesTab";
import DeliveryMethodsTab from "./tabs/DeliveryMethodsTab";
import IntegrationDefinitionsTab from "./tabs/IntegrationDefinitionsTab";
import WorkflowsTab from "./tabs/WorkflowsTab";
import ObservabilityTab from "./tabs/ObservabilityTab";

export default function IntegrationsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "definitions";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrasjoner</h1>
        <p className="text-muted-foreground">
          Administrer integrasjonsdefinisjoner, leveringsmetoder og konfigurasjoner
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="definitions">Definisjoner</TabsTrigger>
          <TabsTrigger value="provider-types">Provider Types</TabsTrigger>
          <TabsTrigger value="delivery-methods">Leveringsmetoder</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="observability">Observability</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions">
          <IntegrationDefinitionsTab />
        </TabsContent>

        <TabsContent value="provider-types">
          <ProviderTypesTab />
        </TabsContent>

        <TabsContent value="delivery-methods">
          <DeliveryMethodsTab />
        </TabsContent>

        <TabsContent value="workflows">
          <WorkflowsTab />
        </TabsContent>

        <TabsContent value="observability">
          <ObservabilityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
