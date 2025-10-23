import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TaskService } from '@/modules/core/tasks';
import type { TaskCategory } from '@/modules/core/tasks';

export function TaskCategoryManager() {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await TaskService.getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste kategorier',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await TaskService.updateCategory(editingCategory.id, formData);
        toast({
          title: 'Suksess',
          description: 'Kategori oppdatert',
        });
      } else {
        await TaskService.createCategory(formData);
        toast({
          title: 'Suksess',
          description: 'Kategori opprettet',
        });
      }

      setDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre kategori',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne kategorien?')) return;

    try {
      await TaskService.deleteCategory(id);
      toast({
        title: 'Suksess',
        description: 'Kategori slettet',
      });
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette kategori',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      color: '',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return <div className="p-4">Laster...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Oppgavekategorier</h2>
          <p className="text-muted-foreground">
            Administrer kategorier for oppgaver
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ny kategori
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Rediger kategori' : 'Ny kategori'}
                </DialogTitle>
                <DialogDescription>
                  Opprett eller rediger en oppgavekategori
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Ikon (Lucide navn)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="f.eks. Phone, Calendar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Farge</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="f.eks. blue, green, red"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Aktiv</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Avbryt
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Oppdater' : 'Opprett'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead>Ikon</TableHead>
              <TableHead>Farge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.description}</TableCell>
                <TableCell>{category.icon}</TableCell>
                <TableCell>{category.color}</TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? 'default' : 'secondary'}>
                    {category.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
