import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApplicationForm } from "@/modules/core/applications/components/ApplicationForm";
import { ApplicationService } from "@/modules/core/applications/services/applicationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";

export default function ApplicationCreate() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const ctx = await buildClientContext();
      
      // Create the product
      const product = await ApplicationService.createProduct(ctx, {
        vendor_id: data.vendor_id,
        name: data.name,
        short_name: data.short_name || data.name,
        slug: data.slug,
        system_types: data.system_types,
        deployment_models: data.deployment_models,
        market_segments: data.market_segments,
        target_industries: data.target_industries,
        localizations: data.localizations,
        description: data.description,
        modules_supported: data.modules_supported,
        status: data.status,
        website: data.website,
      });

      toast.success("Applikasjon opprettet!");
      navigate(`/external-systems/${product.id}`);
    } catch (error) {
      console.error("Error creating application:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Kunne ikke opprette applikasjon"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/external-systems")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Ny applikasjon</h1>
              <p className="text-muted-foreground mt-2">
                Legg til en ny applikasjon i systemet. Bruk AI-assistanse for å hente informasjon automatisk.
              </p>
            </div>
          </div>

          <ApplicationForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
