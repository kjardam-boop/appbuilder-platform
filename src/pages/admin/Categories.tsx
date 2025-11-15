import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoryService } from "@/modules/core/applications/services/categoryService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appCategorySchema, type AppCategoryInput } from "@/modules/core/applications/types/category.types";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

export default function Categories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["app-categories"],
    queryFn: () => CategoryService.listCategories(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AppCategoryInput>({
    resolver: zodResolver(appCategorySchema),
  });

  const createMutation = useMutation({
    mutationFn: (input: AppCategoryInput) => CategoryService.createCategory(input),
    onSuccess: () => {
      toast({ title: "Category created successfully" });
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast({ title: "Error creating category", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AppCategoryInput> }) =>
      CategoryService.updateCategory(id, input),
    onSuccess: () => {
      toast({ title: "Category updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
      setIsDialogOpen(false);
      setEditingId(null);
      reset();
    },
    onError: (error: any) => {
      toast({ title: "Error updating category", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CategoryService.deleteCategory(id),
    onSuccess: () => {
      toast({ title: "Category deleted" });
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting category", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: AppCategoryInput) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Content",
  currentPage: "Categories"
})} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">App Categories</h1>
          <p className="text-muted-foreground">Manage external system taxonomy</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingId(null); reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Category" : "Create Category"}</DialogTitle>
              <DialogDescription>
                Define a new category for classifying external systems
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key">Key *</Label>
                  <Input id="key" {...register("key")} placeholder="crm" />
                  {errors.key && <p className="text-sm text-destructive">{errors.key.message}</p>}
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" {...register("name")} placeholder="CRM" />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" {...register("slug")} placeholder="crm" />
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                </div>
                <div>
                  <Label htmlFor="icon_name">Icon Name</Label>
                  <Input id="icon_name" {...register("icon_name")} placeholder="Users" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} placeholder="Customer Relationship Management systems" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="documentation_url">Documentation URL</Label>
                  <Input id="documentation_url" {...register("documentation_url")} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input id="sort_order" type="number" {...register("sort_order", { valueAsNumber: true })} defaultValue={0} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories?.length || 0})</CardTitle>
          <CardDescription>Hierarchical taxonomy for external system classification</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.key}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      <Badge>{category.product_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{category.parent_name || "—"}</TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingId(category.id);
                          reset(category);
                          setIsDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this category?")) {
                              deleteMutation.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
