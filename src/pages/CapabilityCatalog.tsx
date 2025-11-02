/**
 * Capability Catalog Page
 * Browse and manage platform capabilities
 */

import { useState } from "react";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { Button } from "@/components/ui/button";
import { CapabilityBrowser } from "@/modules/core/capabilities";
import { seedCapabilities } from "@/modules/core/capabilities";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CapabilityCatalog() {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedCapabilities();
      toast.success("Capabilities seeded successfully");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to seed capabilities");
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs customLabel="Capability Catalog" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capability Catalog</h1>
          <p className="text-muted-foreground mt-1">
            Browse reusable platform features and services
          </p>
        </div>
        <Button onClick={handleSeed} disabled={isSeeding} variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          {isSeeding ? "Seeding..." : "Seed Capabilities"}
        </Button>
      </div>

      <CapabilityBrowser />
    </div>
  );
}
