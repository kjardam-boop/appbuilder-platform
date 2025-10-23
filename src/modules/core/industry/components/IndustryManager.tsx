import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useIndustries, useCreateIndustry, useUpdateIndustry, useDeleteIndustry, useSeedIndustriesNew } from "../hooks/useIndustries";
import type { Industry, IndustryInput } from "../types/industry.types";

interface IndustryManagerProps {
  searchQuery?: string;
}

export const IndustryManager = ({ searchQuery = "" }: IndustryManagerProps) => {
  const { data: industries = [], isLoading } = useIndustries();
  const createMutation = useCreateIndustry();
  const updateMutation = useUpdateIndustry();
  const deleteMutation = useDeleteIndustry();
  const seedMutation = useSeedIndustriesNew();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);
  const [formData, setFormData] = useState<Partial<IndustryInput>>({
    key: "",
    name: "",
    description: "",
    nace_codes: [],
    default_modules: [],
    sort_order: 0,
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingIndustry) {
      await updateMutation.mutateAsync({
        id: editingIndustry.id,
        input: formData,
      });
    } else {
      await createMutation.mutateAsync(formData as IndustryInput);
    }

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingIndustry(null);
    setFormData({
      key: "",
      name: "",
      description: "",
      nace_codes: [],
      default_modules: [],
      sort_order: 0,
      is_active: true,
    });
  };

  const handleEdit = (industry: Industry) => {
    setEditingIndustry(industry);
    setFormData({
      key: industry.key,
      name: industry.name,
      description: industry.description || "",
      nace_codes: industry.nace_codes,
      default_modules: industry.default_modules || [],
      sort_order: industry.sort_order,
      is_active: industry.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Er du sikker på at du vil slette denne bransjen?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div>Laster...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bransjer / Industries</CardTitle>
            <CardDescription>
              Administrer bransjer med NACE-koder for automatisk klassifisering
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate(undefined)}
              disabled={seedMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              Last inn norske bransjer (NACE)
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ny bransje
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingIndustry ? "Rediger bransje" : "Ny bransje"}
                  </DialogTitle>
                  <DialogDescription>
                    Legg til NACE-koder for automatisk klassifisering av selskaper
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="key">Nøkkel *</Label>
                      <Input
                        id="key"
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        placeholder="it_teknologi"
                        required
                        disabled={!!editingIndustry}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Navn *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="IT og teknologi"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Beskrivelse</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Beskrivelse av bransjen..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="nace_codes">NACE-koder (kommaseparert)</Label>
                    <Input
                      id="nace_codes"
                      value={formData.nace_codes?.join(", ")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nace_codes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="62, 63"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Bruk 2-sifret NACE-kode for prefix-matching
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="default_modules">Standard moduler (kommaseparert)</Label>
                    <Input
                      id="default_modules"
                      value={formData.default_modules?.join(", ")}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_modules: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="crm, project_management"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sort_order">Sorteringsrekkefølge</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Avbryt
                    </Button>
                    <Button type="submit">
                      {editingIndustry ? "Oppdater" : "Opprett"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nøkkel</TableHead>
              <TableHead>Navn</TableHead>
              <TableHead>NACE-koder</TableHead>
              <TableHead>Standard moduler</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {industries?.map((industry) => (
              <TableRow key={industry.id}>
                <TableCell className="font-mono text-sm">{industry.key}</TableCell>
                <TableCell className="font-medium">{industry.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {industry.nace_codes.map((code) => (
                      <Badge key={code} variant="secondary" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {industry.default_modules?.map((module) => (
                      <Badge key={module} variant="outline" className="text-xs">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(industry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(industry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
