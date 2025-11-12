import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { SmartDataTable } from '@/components/DataTable/SmartDataTable';
import { ColumnDef } from '@/components/DataTable/types';
import { Badge } from '@/components/ui/badge';
import { documentationCatalog, DocumentMetadata } from '@/config/documentationCatalog';

export default function PlatformDocumentation() {
  const navigate = useNavigate();

  const columns: ColumnDef<DocumentMetadata>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Tittel',
      type: 'text',
      sortable: true,
      filterable: true,
    },
    {
      key: 'description',
      label: 'Beskrivelse',
      type: 'multiline',
      sortable: false,
    },
    {
      key: 'category',
      label: 'Kategori',
      type: 'select',
      sortable: true,
      filterable: true,
      filterOptions: [
        { value: 'Platform', label: 'Platform' },
        { value: 'Architecture', label: 'Architecture' },
        { value: 'Development', label: 'Development' },
        { value: 'Implementation', label: 'Implementation' }
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'custom',
      render: (tags: string[]) => (
        <div className="flex gap-1 flex-wrap">
          {tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
  ], []);

  const handleRowClick = (doc: DocumentMetadata) => {
    navigate(`/admin/documentation/${doc.id}`);
  };

  return (
    <div className="p-8 space-y-6">
      <AppBreadcrumbs
        levels={[
          { label: 'Admin', href: '/admin' },
          { label: 'Platform Documentation' },
        ]}
      />

      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Platform Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Tilgang til all teknisk dokumentasjon og guider
          </p>
        </div>
      </div>

      <SmartDataTable
        columns={columns}
        data={documentationCatalog}
        searchKey="title"
        initialPageSize={20}
        onRowClick={handleRowClick}
        emptyMessage="Ingen dokumentasjon funnet"
      />
    </div>
  );
}
