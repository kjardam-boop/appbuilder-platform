import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deliveryMethodSchema, type DeliveryMethodInput, type DeliveryMethod } from "@/modules/core/integrations/types/deliveryMethod.types";
import { DeliveryMethodService } from "@/modules/core/integrations/services/deliveryMethodService";
import { toast } from "sonner";

interface DeliveryMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: DeliveryMethod;
  onSuccess: () => void;
}

export function DeliveryMethodDialog({ open, onOpenChange, method, onSuccess }: DeliveryMethodDialogProps) {
  const isEdit = !!method;

  const form = useForm<DeliveryMethodInput>({
    resolver: zodResolver(deliveryMethodSchema),
    defaultValues: method ? {
      key: method.key,
      name: method.name,
      description: method.description || "",
      icon_name: method.icon_name,
      requires_auth: method.requires_auth,
      supports_bidirectional: method.supports_bidirectional,
      documentation_url: method.documentation_url || "",
    } : {
      key: "",
      name: "",
      description: "",
      icon_name: "Plug",
      requires_auth: true,
      supports_bidirectional: false,
      documentation_url: "",
    },
  });

  const onSubmit = async (data: DeliveryMethodInput) => {
    try {
      if (isEdit && method) {
        await DeliveryMethodService.update(method.id, data);
        toast.success("Leveringsmetode oppdatert");
      } else {
        await DeliveryMethodService.create(data);
        toast.success("Leveringsmetode opprettet");
      }
      onSuccess();
    } catch (error) {
      toast.error(isEdit ? "Feil ved oppdatering" : "Feil ved opprettelse");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger leveringsmetode" : "Opprett leveringsmetode"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Oppdater detaljer for leveringsmetoden" : "Legg til en ny leveringsmetode"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mcp_protocol" disabled={isEdit} />
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
                    <Input {...field} placeholder="MCP Protocol" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Beskrivelse av leveringsmetoden" rows={3} />
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
                  <FormDescription>
                    Lucide ikon navn (f.eks. Plug, Webhook, Cloud)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_auth"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Krever autentisering</FormLabel>
                    <FormDescription>
                      Indikerer om denne metoden krever autentisering
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
              name="supports_bidirectional"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Støtter toveis kommunikasjon</FormLabel>
                    <FormDescription>
                      Indikerer om denne metoden støtter toveis datautveksling
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
              name="documentation_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dokumentasjons-URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://docs.example.com/method" />
                  </FormControl>
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
