import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VendorService } from "@/modules/core/applications/services/vendorService";
import { buildClientContext } from "@/shared/lib/buildContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function VendorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["external-system-vendor", id],
    queryFn: async () => {
      const ctx = await buildClientContext();
      return VendorService.getVendorById(ctx, id!);
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const ctx = await buildClientContext();
      return VendorService.deleteVendor(ctx, id!);
    },
    onSuccess: () => {
      toast.success("Leverandør slettet");
      queryClient.invalidateQueries({ queryKey: ["external-system-vendors"] });
      navigate("/system-vendors");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kunne ikke slette leverandør");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Leverandør ikke funnet</h2>
          <Button onClick={() => navigate("/system-vendors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til leverandører
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/system-vendors")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            {vendor.org_number && (
              <p className="text-muted-foreground">Org.nr: {vendor.org_number}</p>
            )}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Slett leverandør
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
              <AlertDialogDescription>
                Dette vil permanent slette leverandøren "{vendor.name}". Denne handlingen kan ikke angres.
                Merk at produkter som er koblet til denne leverandøren vil miste denne koblingen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slett leverandør
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Leverandørinformasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vendor.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Beskrivelse</p>
              <p className="mt-1">{vendor.description}</p>
            </div>
          )}
          
          {vendor.org_number && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Organisasjonsnummer</p>
              <p className="mt-1">{vendor.org_number}</p>
            </div>
          )}
          
          {vendor.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nettsted</p>
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-primary hover:underline"
                >
                  {vendor.website}
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
