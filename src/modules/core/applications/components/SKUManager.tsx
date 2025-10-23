import { useState } from "react";
import { useSKUs, useCreateSKU, useDeleteSKU } from "../hooks/useSKUs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { SKUInput } from "../types/application.types";

interface SKUManagerProps {
  appProductId: string;
}

export const SKUManager = ({ appProductId }: SKUManagerProps) => {
  const { data: skus = [], isLoading } = useSKUs(appProductId);
  const createMutation = useCreateSKU();
  const deleteMutation = useDeleteSKU();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SKUInput>({
    edition_name: "",
    code: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ ...formData, app_product_id: appProductId });
    setDialogOpen(false);
    setFormData({
      edition_name: "",
      code: "",
      notes: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Er du sikker på at du vil slette denne varianten?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster varianter...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Produktvarianter / SKUs</CardTitle>
            <CardDescription>
              Ulike editions/versjoner av produktet
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Ny variant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny produktvariant</DialogTitle>
                <DialogDescription>
                  Legg til en ny edition/versjon av produktet
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edition_name">Edition navn *</Label>
                  <Input
                    id="edition_name"
                    value={formData.edition_name}
                    onChange={(e) => setFormData({ ...formData, edition_name: e.target.value })}
                    placeholder="Standard, Professional, Enterprise..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">SKU-kode</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VN-STD-2024"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notater</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Beskrivelse av varianten..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button type="submit">Opprett</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {skus.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen varianter registrert
          </p>
        ) : (
          <div className="space-y-2">
            {skus.map((sku) => (
              <div
                key={sku.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sku.edition_name}</span>
                    {sku.code && (
                      <Badge variant="secondary" className="text-xs">
                        {sku.code}
                      </Badge>
                    )}
                  </div>
                  {sku.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{sku.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(sku.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
