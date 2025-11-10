import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DeliveryMethodService } from "@/modules/core/integrations/services/deliveryMethodService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeliveryMethodDialog } from "./dialogs/DeliveryMethodDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function DeliveryMethodDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: method, isLoading, refetch } = useQuery({
    queryKey: ["delivery-method", id],
    queryFn: () => DeliveryMethodService.getById(id!),
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!id) return;
    try {
      await DeliveryMethodService.delete(id);
      toast.success("Leveringsmetode slettet");
      navigate("/admin/integrations?tab=delivery-methods");
    } catch (error) {
      toast.error("Feil ved sletting av leveringsmetode");
    }
  };

  const handleToggleActive = async () => {
    if (!id || !method) return;
    try {
      await DeliveryMethodService.toggleActive(id, !method.is_active);
      toast.success(method.is_active ? "Leveringsmetode deaktivert" : "Leveringsmetode aktivert");
      refetch();
    } catch (error) {
      toast.error("Feil ved endring av status");
    }
  };

  if (isLoading) {
    return <div className="p-6">Laster...</div>;
  }

  if (!method) {
    return <div className="p-6">Leveringsmetode ikke funnet</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/integrations?tab=delivery-methods")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{method.name}</h1>
            <p className="text-muted-foreground">Leveringsmetode detaljer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleActive}>
            {method.is_active ? "Deaktiver" : "Aktiver"}
          </Button>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Rediger
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Slett
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>Detaljer om leveringsmetoden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Key</label>
                <p className="text-sm font-mono mt-1">{method.key}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Navn</label>
                <p className="text-sm mt-1">{method.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ikon</label>
                <p className="text-sm mt-1">{method.icon_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={method.is_active ? "default" : "secondary"}>
                    {method.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </div>
            </div>
            {method.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Beskrivelse</label>
                <p className="text-sm mt-1">{method.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Egenskaper</CardTitle>
            <CardDescription>Tekniske egenskaper ved leveringsmetoden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={method.requires_auth ? "default" : "secondary"}>
                  {method.requires_auth ? "Krever autentisering" : "Ingen autentisering"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={method.supports_bidirectional ? "default" : "secondary"}>
                  {method.supports_bidirectional ? "Støtter toveis" : "Enveis"}
                </Badge>
              </div>
            </div>
            {method.documentation_url && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Dokumentasjon</label>
                <a href={method.documentation_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-1 block">
                  {method.documentation_url}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeliveryMethodDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        method={method}
        onSuccess={() => {
          refetch();
          setIsEditOpen(false);
        }}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette leveringsmetoden "{method.name}". Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
