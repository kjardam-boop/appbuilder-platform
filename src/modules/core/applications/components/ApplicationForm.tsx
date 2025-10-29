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
import { AppVendorSelector } from "./AppVendorSelector";
import { APP_TYPES, DEPLOYMENT_MODELS, MARKET_SEGMENTS } from "../types/application.types";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const applicationFormSchema = z.object({
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  vendor_id: z.string().uuid("Velg en leverandør"),
  name: z.string().min(2, "Navn må være minst 2 tegn").max(255),
  short_name: z.string().max(50, "Kort navn kan ikke være lengre enn 50 tegn").optional(),
  slug: z.string().min(2).max(255),
  app_type: z.string().min(1, "Velg applikasjonstype"),
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
  const { generate, isGenerating } = useApplicationGeneration();
  
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      status: "Active",
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

    const generated = await generate(websiteUrl);
    if (generated) {
      // Populate form with AI-generated data
      if (generated.product_name) setValue("name", generated.product_name);
      if (generated.short_name) setValue("short_name", generated.short_name);
      if (generated.app_type) setValue("app_type", generated.app_type);
      if (generated.deployment_models?.length) setValue("deployment_models", generated.deployment_models);
      if (generated.market_segments?.length) setValue("market_segments", generated.market_segments);
      if (generated.description) setValue("description", generated.description);
      if (generated.modules_supported?.length) setValue("modules_supported", generated.modules_supported);
      if (generated.localizations?.length) setValue("localizations", generated.localizations);
      if (generated.target_industries?.length) setValue("target_industries", generated.target_industries);
      
      // Auto-generate slug from name
      const slug = generated.product_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setValue("slug", slug);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Website URL + AI Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Nettside og AI-assistanse</CardTitle>
          <CardDescription>
            Skriv inn applikasjonens nettside for å automatisk hente informasjon med AI
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
            <AppVendorSelector
              value={watch("vendor_id")}
              onValueChange={(value) => setValue("vendor_id", value)}
            />
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
            <Label htmlFor="app_type">Applikasjonstype *</Label>
            <Select value={watch("app_type")} onValueChange={(value) => setValue("app_type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Velg type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APP_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.app_type && (
              <p className="text-sm text-destructive mt-1">{errors.app_type.message}</p>
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
  );
}
