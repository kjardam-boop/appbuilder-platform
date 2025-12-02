import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useApplicationGeneration } from "../hooks/useApplicationGeneration";
import { ExternalSystemVendorSelector } from "./ExternalSystemVendorSelector";
import { APP_TYPES, DEPLOYMENT_MODELS, MARKET_SEGMENTS } from "../types/application.types";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { UnknownTypeDialog } from "./UnknownTypeDialog";
import { EnhancedVendorDialog } from "./EnhancedVendorDialog";
import type { AppType } from "../types/application.types";
import { toast } from "sonner";
import { useExternalSystemVendors } from "../hooks/useApplications";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl } from "@/lib/utils";

const applicationFormSchema = z.object({
  website: z.string().optional().or(z.literal("")).transform(val => {
    if (!val || val.trim() === "") return "";
    return normalizeUrl(val);
  }).refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Ugyldig URL"
  }),
  vendor_id: z.string().uuid("Velg en leverandør"),
  name: z.string().min(2, "Navn må være minst 2 tegn").max(255),
  short_name: z.string().max(50, "Kort navn kan ikke være lengre enn 50 tegn").optional(),
  slug: z.string().min(2).max(255),
  system_types: z.array(z.string()).min(1, "Velg minst én applikasjonstype"),
  deployment_models: z.array(z.string()).min(1, "Velg minst én deployment modell"),
  market_segments: z.array(z.string()).optional(),
  target_industries: z.array(z.string()).optional(),
  localizations: z.array(z.string()).optional(),
  description: z.string().optional(),
  modules_supported: z.array(z.string()).optional(),
  status: z.enum(["Active", "Legacy", "Beta"]).default("Active"),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface ApplicationFormProps {
  initialData?: Partial<ApplicationFormData>;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ApplicationForm({ initialData, onSubmit, isLoading }: ApplicationFormProps) {
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.website || "");
  const [unknownTypeDialog, setUnknownTypeDialog] = useState<{
    isOpen: boolean;
    unknownType: string;
    suggestedTypes: string[];
    generatedData: any;
  } | null>(null);
  const [createVendorDialog, setCreateVendorDialog] = useState<{
    isOpen: boolean;
    suggestedName: string;
  } | null>(null);
  const [customTypeInput, setCustomTypeInput] = useState("");
  const { generate, isGenerating } = useApplicationGeneration();
  const { data: vendors = [], refetch: refetchVendors } = useExternalSystemVendors();
  
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      status: "Active",
      system_types: [],
      deployment_models: [],
      market_segments: [],
      target_industries: [],
      localizations: [],
      modules_supported: [],
      ...initialData,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const handleAIGenerate = async () => {
    if (!websiteUrl.trim()) {
      return;
    }

    const normalized = normalizeUrl(websiteUrl);
    setWebsiteUrl(normalized);
    const result = await generate(normalized);
    if (!result) return;

    // Check for generated response structure
    const response = result as any;
    const generated = response.data || result;
    const unknownTypes = response.unknownTypes || [];

    // If unknown types detected, show dialog
    if (unknownTypes.length > 0) {
      setUnknownTypeDialog({
        isOpen: true,
        unknownType: unknownTypes[0],
        suggestedTypes: generated.suggested_known_types || [],
        generatedData: generated,
      });
      return;
    }

    // No unknown types, populate directly
    populateFormFields(generated);
  };

  const populateFormFields = async (generated: any) => {
    if (generated.product_name) setValue("name", generated.product_name);
    if (generated.short_name) setValue("short_name", generated.short_name);
    
    // Handle system_types as array
    if (generated.app_type) {
      setValue("system_types", [generated.app_type]);
    } else if (generated.app_types?.length) {
      setValue("system_types", generated.app_types);
    }
    
    if (generated.deployment_models?.length) setValue("deployment_models", generated.deployment_models);
    if (generated.market_segments?.length) setValue("market_segments", generated.market_segments);
    if (generated.description) setValue("description", generated.description);
    if (generated.modules_supported?.length) setValue("modules_supported", generated.modules_supported);
    if (generated.localizations?.length) setValue("localizations", generated.localizations);
    if (generated.target_industries?.length) setValue("target_industries", generated.target_industries);
    
    // Set normalized website URL
    setValue("website", normalizeUrl(websiteUrl));
    
    // Auto-generate slug from name
    if (generated.product_name) {
      const slug = generated.product_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", slug);
    }

    // Auto-match or create vendor
    if (generated.vendor_name) {
      const vendorName = String(generated.vendor_name).toLowerCase().trim();
      // Ensure we have vendors loaded before matching
      let vendorList = vendors;
      if (!vendorList || vendorList.length === 0) {
        try {
          const refetched = await refetchVendors();
          // TanStack v5 refetch returns { data }
          vendorList = (refetched as any)?.data || vendors || [];
        } catch (e) {
          // ignore and fallback to existing list
          vendorList = vendors || [];
        }
      }

      if (vendorList.length > 0) {
        const matchedVendor = vendorList.find((v: any) => {
          const vn = v.name?.toLowerCase().trim();
          return vn && (vn.includes(vendorName) || vendorName.includes(vn));
        });

        if (matchedVendor) {
          setValue("vendor_id", matchedVendor.id);
          toast.success(`Leverandør automatisk valgt: ${matchedVendor.name}`);
        } else {
          setCreateVendorDialog({
            isOpen: true,
            suggestedName: generated.vendor_name,
          });
        }
      } else {
        // No vendors available after refetch – offer creation directly
        setCreateVendorDialog({
          isOpen: true,
          suggestedName: generated.vendor_name,
        });
      }
    }

    toast.success("Applikasjonsinformasjon hentet med AI");
  };
  const handleTypeResolved = (selectedTypes: AppType[]) => {
    if (unknownTypeDialog && selectedTypes.length > 0) {
      const generated = unknownTypeDialog.generatedData;
      // Set all selected types
      generated.app_types = selectedTypes; // AI returns app_types, we map to system_types in populateFormFields
      populateFormFields(generated);
      setUnknownTypeDialog(null);
      
      if (selectedTypes.length === 1) {
        toast.success(`Applikasjonstype satt til: ${APP_TYPES[selectedTypes[0]]}`);
      } else {
        const typeNames = selectedTypes.map(t => APP_TYPES[t]).join(", ");
        toast.success(`Applikasjonstyper valgt: ${typeNames}`);
      }
    }
  };

  const addArrayItem = (field: keyof ApplicationFormData, value: string) => {
    const current = watch(field) as string[] || [];
    if (value && !current.includes(value)) {
      setValue(field, [...current, value] as any);
    }
  };

  const removeArrayItem = (field: keyof ApplicationFormData, value: string) => {
    const current = watch(field) as string[] || [];
    setValue(field, current.filter(v => v !== value) as any);
  };

  const handleAddCustomType = () => {
    if (customTypeInput.trim()) {
      addArrayItem("system_types", customTypeInput.trim());
      setCustomTypeInput("");
      toast.success(`Applikasjonstype "${customTypeInput.trim()}" lagt til`);
    }
  };

  const handleVendorCreated = async (vendorId: string, vendorName: string) => {
    setCreateVendorDialog(null);
    await refetchVendors();
    setValue("vendor_id", vendorId);
    toast.success(`Leverandør "${vendorName}" opprettet og valgt`);
  };

  return (
    <>
      {unknownTypeDialog && (
        <UnknownTypeDialog
          open={unknownTypeDialog.isOpen}
          unknownType={unknownTypeDialog.unknownType}
          suggestedKnownTypes={unknownTypeDialog.suggestedTypes}
          onMapToExisting={handleTypeResolved}
          onCancel={() => setUnknownTypeDialog(null)}
        />
      )}

      {createVendorDialog && (
        <EnhancedVendorDialog
          open={createVendorDialog.isOpen}
          suggestedName={createVendorDialog.suggestedName}
          onCreated={handleVendorCreated}
          onCancel={() => setCreateVendorDialog(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Website URL + AI Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Nettside og AI-assistanse</CardTitle>
          <CardDescription>
            Skriv inn systemets nettside for å automatisk hente informasjon med AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="https://www.example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={handleAIGenerate}
              disabled={!websiteUrl.trim() || isGenerating}
              variant="secondary"
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
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vendor_id">Leverandør *</Label>
            <ExternalSystemVendorSelector
              value={watch("vendor_id")}
              onValueChange={(value) => setValue("vendor_id", value)}
            />
            {vendors.length === 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                Ingen leverandører funnet.
                <Button
                  type="button"
                  variant="link"
                  className="px-1"
                  onClick={() => setCreateVendorDialog({ isOpen: true, suggestedName: watch("name") || "" })}
                >
                  Opprett ny leverandør
                </Button>
              </div>
            )}
            {errors.vendor_id && (
              <p className="text-sm text-destructive mt-1">{errors.vendor_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Produktnavn *</Label>
            <Input {...register("name")} placeholder="f.eks. Visma.net ERP" />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="short_name">Kort navn</Label>
            <Input {...register("short_name")} placeholder="f.eks. Visma.net" />
            {errors.short_name && (
              <p className="text-sm text-destructive mt-1">{errors.short_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL-vennlig navn) *</Label>
            <Input {...register("slug")} placeholder="visma-net-erp" />
            {errors.slug && (
              <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <Label>Applikasjonstyper * (velg én eller flere)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(APP_TYPES).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={(watch("system_types") || []).includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = watch("system_types") || [];
                    if (current.includes(key)) {
                      removeArrayItem("system_types", key);
                    } else {
                      addArrayItem("system_types", key);
                    }
                  }}
                >
                  {label}
                </Badge>
              ))}
            </div>
            
            {/* Selected custom types */}
            {(watch("system_types") || []).filter(type => !APP_TYPES[type as AppType]).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(watch("system_types") || [])
                  .filter(type => !APP_TYPES[type as AppType])
                  .map((type) => (
                    <Badge
                      key={type}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => removeArrayItem("system_types", type)}
                    >
                      {type} ✕
                    </Badge>
                  ))}
              </div>
            )}

            {/* Custom type input */}
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Skriv egen type og trykk Enter..."
                value={customTypeInput}
                onChange={(e) => setCustomTypeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomType();
                  }
                }}
              />
              <Button type="button" onClick={handleAddCustomType} variant="outline" size="sm">
                Legg til
              </Button>
            </div>

            {errors.system_types && (
              <p className="text-sm text-destructive mt-1">{errors.system_types.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={watch("status")} onValueChange={(value) => setValue("status", value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Beta">Beta</SelectItem>
                <SelectItem value="Legacy">Legacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea 
              {...register("description")} 
              placeholder="Kort beskrivelse av applikasjonen..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deployment & Markets */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment og markeder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Deployment modeller *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(DEPLOYMENT_MODELS).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={(watch("deployment_models") || []).includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = watch("deployment_models") || [];
                    if (current.includes(key)) {
                      removeArrayItem("deployment_models", key);
                    } else {
                      addArrayItem("deployment_models", key);
                    }
                  }}
                >
                  {label}
                </Badge>
              ))}
            </div>
            {errors.deployment_models && (
              <p className="text-sm text-destructive mt-1">{errors.deployment_models.message}</p>
            )}
          </div>

          <div>
            <Label>Markedssegmenter</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(MARKET_SEGMENTS).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={(watch("market_segments") || []).includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = watch("market_segments") || [];
                    if (current.includes(key)) {
                      removeArrayItem("market_segments", key);
                    } else {
                      addArrayItem("market_segments", key);
                    }
                  }}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lagrer...
            </>
          ) : (
            "Lagre applikasjon"
          )}
        </Button>
      </div>
      </form>
    </>
  );
}
