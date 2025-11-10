import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CategoryService } from "@/modules/core/applications/services/categoryService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";
import { ColumnDef } from "@/components/DataTable/types";
import { Plus, FolderOpen, ExternalLink } from "lucide-react";

export default function ProviderTypesTab() {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["app-categories"],
    queryFn: () => CategoryService.listCategories(),
  });

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      label: 'Navn',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
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
      key: 'slug',
      label: 'Slug',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-muted-foreground">{value}</span>,
    },
    {
      key: 'product_count',
      label: 'Produkter',
      type: 'number',
      sortable: true,
      filterable: true,
      render: (value) => <Badge>{value}</Badge>,
    },
    {
      key: 'parent_name',
      label: 'Parent',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-muted-foreground">{value || "—"}</span>,
    },
    {
      key: 'sort_order',
      label: 'Sort',
      type: 'number',
      sortable: true,
      render: (value) => value,
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
          onClick={() => navigate(`/admin/integrations/provider-types/${row.id}`)}
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
          <h2 className="text-2xl font-bold">Provider Types</h2>
          <p className="text-muted-foreground">
            Kategorier for klassifisering av integrasjoner (AI Provider, Automation Platform, ERP, etc.)
          </p>
        </div>
        <Button onClick={() => navigate("/admin/categories")}>
          <Plus className="h-4 w-4 mr-2" />
          Ny Provider Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Types ({categories?.length || 0})</CardTitle>
          <CardDescription>
            Brukes til å gruppere integrasjonsdefinisjoner etter type system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : categories && categories.length > 0 ? (
            <SmartDataTable
              columns={columns}
              data={categories}
              initialPageSize={20}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Ingen provider types lagt til ennå</p>
              <p className="text-sm text-muted-foreground">
                Opprett din første kategori for å komme i gang
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
