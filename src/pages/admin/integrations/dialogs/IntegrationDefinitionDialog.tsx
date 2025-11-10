import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { integrationDefinitionSchema, type IntegrationDefinitionInput, type IntegrationDefinition } from "@/modules/core/integrations/types/integrationDefinition.types";
import { IntegrationDefinitionService } from "@/modules/core/integrations/services/integrationDefinitionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface IntegrationDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition?: IntegrationDefinition;
  onSuccess: () => void;
}

export function IntegrationDefinitionDialog({ open, onOpenChange, definition, onSuccess }: IntegrationDefinitionDialogProps) {
  const isEdit = !!definition;
  const [deliveryMethodInput, setDeliveryMethodInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["app-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("app_categories").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("external_system_vendors").select("*");
      return data || [];
    },
  });

  const { data: systems } = useQuery({
    queryKey: ["external-systems"],
    queryFn: async () => {
      const { data } = await supabase.from("external_systems").select("*");
      return data || [];
    },
  });

  const form = useForm<IntegrationDefinitionInput>({
    resolver: zodResolver(integrationDefinitionSchema),
    defaultValues: definition ? {
      key: definition.key,
      name: definition.name,
      description: definition.description || "",
      category_id: definition.category_id || "",
      vendor_id: definition.vendor_id || "",
      external_system_id: definition.external_system_id || "",
      supported_delivery_methods: definition.supported_delivery_methods,
      default_delivery_method: definition.default_delivery_method || "",
      icon_name: definition.icon_name,
      documentation_url: definition.documentation_url || "",
      setup_guide_url: definition.setup_guide_url || "",
      requires_credentials: definition.requires_credentials,
      credential_fields: definition.credential_fields,
      default_config: definition.default_config,
      capabilities: definition.capabilities,
      tags: definition.tags,
    } : {
      key: "",
      name: "",
      description: "",
      category_id: "",
      vendor_id: "",
      external_system_id: "",
      supported_delivery_methods: [],
      default_delivery_method: "",
      icon_name: "Plug",
      documentation_url: "",
      setup_guide_url: "",
      requires_credentials: true,
      credential_fields: [],
      default_config: {},
      capabilities: {},
      tags: [],
    },
  });

  const onSubmit = async (data: IntegrationDefinitionInput) => {
    try {
      if (isEdit && definition) {
        await IntegrationDefinitionService.update(definition.id, data);
        toast.success("Integrasjonsdefinisjon oppdatert");
      } else {
        await IntegrationDefinitionService.create(data);
        toast.success("Integrasjonsdefinisjon opprettet");
      }
      onSuccess();
    } catch (error) {
      toast.error(isEdit ? "Feil ved oppdatering" : "Feil ved opprettelse");
    }
  };

  const addDeliveryMethod = () => {
    if (!deliveryMethodInput.trim()) return;
    const current = form.getValues("supported_delivery_methods");
    if (!current.includes(deliveryMethodInput.trim())) {
      form.setValue("supported_delivery_methods", [...current, deliveryMethodInput.trim()]);
    }
    setDeliveryMethodInput("");
  };

  const removeDeliveryMethod = (method: string) => {
    const current = form.getValues("supported_delivery_methods");
    form.setValue("supported_delivery_methods", current.filter(m => m !== method));
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const current = form.getValues("tags");
    if (!current.includes(tagInput.trim())) {
      form.setValue("tags", [...current, tagInput.trim()]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const current = form.getValues("tags");
    form.setValue("tags", current.filter(t => t !== tag));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger integrasjonsdefinisjon" : "Opprett integrasjonsdefinisjon"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Oppdater detaljer for integrasjonsdefinisjonen" : "Legg til en ny integrasjonsdefinisjon"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="hubspot_crm" disabled={isEdit} />
                    </FormControl>
                    <FormDescription>
                      Unik identifikator (kun små bokstaver og underscore)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Navn *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HubSpot CRM" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Beskrivelse av integrasjonen" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leverandør</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg leverandør" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="external_system_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eksternt system</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg system" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systems?.map((sys) => (
                          <SelectItem key={sys.id} value={sys.id}>{sys.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="supported_delivery_methods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Støttede leveringsmetoder *</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={deliveryMethodInput}
                      onChange={(e) => setDeliveryMethodInput(e.target.value)}
                      placeholder="mcp, webhook, rest_api"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDeliveryMethod())}
                    />
                    <Button type="button" onClick={addDeliveryMethod}>Legg til</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((method) => (
                      <Badge key={method} variant="secondary">
                        {method}
                        <button
                          type="button"
                          onClick={() => removeDeliveryMethod(method)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_delivery_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standard leveringsmetode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="mcp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ikon navn</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Plug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentation_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dokumentasjons-URL</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://docs.example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setup_guide_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oppsettguide-URL</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://docs.example.com/setup" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requires_credentials"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Krever credentials</FormLabel>
                    <FormDescription>
                      Indikerer om denne integrasjonen krever autentiseringsdetaljer
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="crm, automation"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag}>Legg til</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button type="submit">
                {isEdit ? "Oppdater" : "Opprett"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
