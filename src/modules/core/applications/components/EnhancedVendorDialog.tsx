import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/hooks/useTenantContext";
import { VendorService } from "../services/vendorService";
import { useApplicationGeneration } from "../hooks/useApplicationGeneration";
import { fetchFromBrreg, simplifyBrregData } from "../services/brregService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const enhancedVendorSchema = z.object({
  // Company fields
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  org_number: z.string().optional(),
  description: z.string().optional(),
  industry_code: z.string().optional(),
  industry_description: z.string().optional(),
  employees: z.coerce.number().optional(),
  
  // Vendor-specific fields
  country: z.string().optional(),
  contact_url: z.string().url("Ugyldig URL").optional().or(z.literal("")),
});

type EnhancedVendorData = z.infer<typeof enhancedVendorSchema>;

interface EnhancedVendorDialogProps {
  open: boolean;
  suggestedName?: string;
  onCreated: (vendorId: string, vendorName: string) => void;
  onCancel: () => void;
}

export const EnhancedVendorDialog = ({
  open,
  suggestedName,
  onCreated,
  onCancel,
}: EnhancedVendorDialogProps) => {
  const context = useTenantContext();
  const [isCreating, setIsCreating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [canUseBrreg, setCanUseBrreg] = useState(false);
  const [isUpdatingFromBrreg, setIsUpdatingFromBrreg] = useState(false);
  const { generate, isGenerating } = useApplicationGeneration();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<EnhancedVendorData>({
    resolver: zodResolver(enhancedVendorSchema),
    defaultValues: {
      name: suggestedName || "",
      website: "",
      org_number: "",
      description: "",
      country: "NO",
    },
  });

  const orgNumber = watch("org_number");

  // Enable Brreg button when org_number has 9 digits
  const checkBrregAvailability = (orgNr: string) => {
    const cleanOrgNr = orgNr?.replace(/\D/g, '') || '';
    setCanUseBrreg(cleanOrgNr.length === 9);
  };

  const handleAIGenerate = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Skriv inn en nettside-URL først");
      return;
    }

    const result = await generate(websiteUrl);
    if (!result) return;

    const data = (result as any).data || result;

    // Populate company fields
    if (data.vendor_name) setValue("name", data.vendor_name);
    if (data.description) setValue("description", data.description);
    setValue("website", websiteUrl);

    // Check if we got any Norwegian org number from the AI
    const possibleOrgNr = data.org_number || data.organisasjonsnummer;
    if (possibleOrgNr) {
      setValue("org_number", possibleOrgNr);
      checkBrregAvailability(possibleOrgNr);
    }

    toast.success("Leverandørinformasjon hentet med AI");
  };

  const handleUpdateFromBrreg = async () => {
    if (!orgNumber) {
      toast.error("Organisasjonsnummer mangler");
      return;
    }

    setIsUpdatingFromBrreg(true);
    try {
      const brregData = await fetchFromBrreg(orgNumber);
      const simplified = simplifyBrregData(brregData);

      // Update form with Brreg data
      setValue("name", simplified.name);
      if (simplified.org_number) setValue("org_number", simplified.org_number);
      if (simplified.website) setValue("website", simplified.website);
      if (simplified.industry_code) setValue("industry_code", simplified.industry_code);
      if (simplified.industry_description) setValue("industry_description", simplified.industry_description);
      if (simplified.employees) setValue("employees", simplified.employees);

      // Build description from address if available
      if (simplified.address || simplified.city) {
        const addressParts = [simplified.address, simplified.postal_code, simplified.city].filter(Boolean);
        const addressDesc = addressParts.join(", ");
        const existingDesc = watch("description") || "";
        const newDesc = existingDesc 
          ? `${existingDesc}\n\nAdresse: ${addressDesc}`
          : `Norsk selskap registrert i Brønnøysundregistrene.\nAdresse: ${addressDesc}`;
        setValue("description", newDesc);
      }

      toast.success("Data oppdatert fra Brønnøysundregistrene");
    } catch (error) {
      console.error("Brreg update error:", error);
      toast.error(error instanceof Error ? error.message : "Kunne ikke hente data fra Brreg");
    } finally {
      setIsUpdatingFromBrreg(false);
    }
  };

  const onSubmit = async (data: EnhancedVendorData) => {
    if (!context) {
      toast.error("Ingen tenant-kontekst");
      return;
    }

    setIsCreating(true);
    try {
      const result = await VendorService.createVendorWithCompany(
        context,
        {
          name: data.name,
          org_number: data.org_number,
          website: data.website,
          description: data.description,
          industry_code: data.industry_code,
          industry_description: data.industry_description,
          employees: data.employees,
          company_roles: ['vendor'],
        },
        {
          name: data.name,
          website: data.website,
          description: data.description,
          country: data.country,
          contact_url: data.contact_url,
        }
      );

      toast.success(`Leverandør "${result.vendor.name}" opprettet`);
      onCreated(result.vendor.id, result.vendor.name);
    } catch (error) {
      console.error("Vendor creation error:", error);
      toast.error(error instanceof Error ? error.message : "Kunne ikke opprette leverandør");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Opprett ny leverandør</DialogTitle>
          <DialogDescription>
            Bruk AI til å hente informasjon fra nettsiden, eller fyll ut manuelt. For norske selskaper kan du også hente data fra Brønnøysundregistrene.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* AI Generation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Hent info med AI</CardTitle>
              <CardDescription>
                Skriv inn leverandørens nettside for å automatisk hente informasjon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !websiteUrl.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Henter...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Hent info med AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Selskapsinformasjon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Leverandørens navn"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="org_number">Organisasjonsnummer</Label>
                <div className="flex gap-2">
                  <Input
                    id="org_number"
                    {...register("org_number")}
                    placeholder="123456789"
                    onChange={(e) => {
                      setValue("org_number", e.target.value);
                      checkBrregAvailability(e.target.value);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpdateFromBrreg}
                    disabled={!canUseBrreg || isUpdatingFromBrreg}
                  >
                    {isUpdatingFromBrreg ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oppdaterer...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Oppdater Data
                      </>
                    )}
                  </Button>
                </div>
                {errors.org_number && (
                  <p className="text-sm text-destructive mt-1">{errors.org_number.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="website">Nettside</Label>
                <Input
                  id="website"
                  {...register("website")}
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Kort beskrivelse av leverandøren..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry_code">Næringskode</Label>
                  <Input
                    id="industry_code"
                    {...register("industry_code")}
                    placeholder="62.010"
                  />
                </div>
                <div>
                  <Label htmlFor="employees">Antall ansatte</Label>
                  <Input
                    id="employees"
                    type="number"
                    {...register("employees")}
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="industry_description">Næringsbeskrivelse</Label>
                <Input
                  id="industry_description"
                  {...register("industry_description")}
                  placeholder="Programmeringstjenester"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vendor-specific fields */}
          <Card>
            <CardHeader>
              <CardTitle>Leverandørspesifikke felt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    {...register("country")}
                    placeholder="NO"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_url">Kontakt-URL</Label>
                  <Input
                    id="contact_url"
                    {...register("contact_url")}
                    placeholder="https://example.com/kontakt"
                  />
                  {errors.contact_url && (
                    <p className="text-sm text-destructive mt-1">{errors.contact_url.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oppretter...
                </>
              ) : (
                "Opprett leverandør"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
