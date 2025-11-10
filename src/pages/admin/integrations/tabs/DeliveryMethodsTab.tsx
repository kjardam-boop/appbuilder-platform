import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DeliveryMethodService } from "@/modules/core/integrations/services/deliveryMethodService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";
import { ColumnDef } from "@/components/DataTable/types";
import { Plus, Plug, ExternalLink, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { deliveryMethodSchema, type DeliveryMethodInput } from "@/modules/core/integrations/types/deliveryMethod.types";

export default function DeliveryMethodsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ["delivery-methods"],
    queryFn: () => DeliveryMethodService.list(),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<DeliveryMethodInput>({
    resolver: zodResolver(deliveryMethodSchema),
  });

  const createMutation = useMutation({
    mutationFn: (input: DeliveryMethodInput) => DeliveryMethodService.create(input),
    onSuccess: () => {
      toast.success("Leveringsmetode opprettet");
      queryClient.invalidateQueries({ queryKey: ["delivery-methods"] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error("Feil ved opprettelse", { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DeliveryMethodInput> }) =>
      DeliveryMethodService.update(id, input),
    onSuccess: () => {
      toast.success("Leveringsmetode oppdatert");
      queryClient.invalidateQueries({ queryKey: ["delivery-methods"] });
      setIsDialogOpen(false);
      setEditingId(null);
      reset();
    },
    onError: (error: any) => {
      toast.error("Feil ved oppdatering", { description: error.message });
    },
  });

  const onSubmit = (data: DeliveryMethodInput) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      label: 'Navn',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'key',
      label: 'Key',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: 'description',
      label: 'Beskrivelse',
      type: 'text',
      sortable: false,
      filterable: false,
      render: (value) => <span className="text-sm text-muted-foreground">{value || "—"}</span>,
    },
    {
      key: 'requires_auth',
      label: 'Krever Auth',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'supports_bidirectional',
      label: 'Toveis',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'actions',
      label: '',
      type: 'action',
      width: 60,
      render: (_, row) => (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => navigate(`/admin/integrations/delivery-methods/${row.id}`)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leveringsmetoder</h2>
          <p className="text-muted-foreground">
            Protokoller og metoder for hvordan integrasjoner kommuniserer (MCP, REST API, Webhook, etc.)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ny Leveringsmetode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Rediger Leveringsmetode" : "Opprett Leveringsmetode"}</DialogTitle>
              <DialogDescription>
                Definer en ny metode for hvordan integrasjoner kan kommunisere
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key">Key *</Label>
                  <Input id="key" {...register("key")} placeholder="rest_api" />
                  {errors.key && <p className="text-sm text-destructive">{errors.key.message}</p>}
                </div>
                <div>
                  <Label htmlFor="name">Navn *</Label>
                  <Input id="name" {...register("name")} placeholder="REST API" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea id="description" {...register("description")} placeholder="RESTful HTTP API with standard CRUD operations" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon_name">Ikon Navn</Label>
                  <Input id="icon_name" {...register("icon_name")} placeholder="Globe" />
                </div>
                <div>
                  <Label htmlFor="documentation_url">Dokumentasjon URL</Label>
                  <Input id="documentation_url" {...register("documentation_url")} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="requires_auth" 
                    checked={watch("requires_auth")}
                    onCheckedChange={(checked) => setValue("requires_auth", checked as boolean)}
                  />
                  <Label htmlFor="requires_auth">Krever autentisering</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="supports_bidirectional" 
                    checked={watch("supports_bidirectional")}
                    onCheckedChange={(checked) => setValue("supports_bidirectional", checked as boolean)}
                  />
                  <Label htmlFor="supports_bidirectional">Støtter toveis kommunikasjon</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit">
                  {editingId ? "Oppdater" : "Opprett"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leveringsmetoder ({methods?.length || 0})</CardTitle>
          <CardDescription>
            Protokoller som integrasjoner kan bruke for å kommunisere med eksterne systemer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : methods && methods.length > 0 ? (
            <SmartDataTable
              columns={columns}
              data={methods}
              initialPageSize={20}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Plug className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ingen leveringsmetoder lagt til ennå</p>
              <p className="text-sm text-muted-foreground">
                Opprett din første leveringsmetode for å komme i gang
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
