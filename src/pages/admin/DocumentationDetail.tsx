import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { documentationCatalog } from '@/config/documentationCatalog';

export default function DocumentationDetail() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  const document = documentationCatalog.find(doc => doc.id === docId);

  if (!document) {
    return (
      <div className="p-8 space-y-6">
        <AppBreadcrumbs
          levels={[
            { label: 'Admin', href: '/admin' },
            { label: 'Platform Documentation', href: '/admin/documentation' },
            { label: 'Not Found' },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Dokument ikke funnet</h2>
          <p className="text-muted-foreground mb-6">
            Dokumentet du leter etter eksisterer ikke.
          </p>
          <Button onClick={() => navigate('/admin/documentation')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til oversikt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <AppBreadcrumbs
        levels={[
          { label: 'Admin', href: '/admin' },
          { label: 'Platform Documentation', href: '/admin/documentation' },
          { label: document.title },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <p className="text-muted-foreground mt-2">{document.description}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/documentation')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til liste
        </Button>
      </div>

      <div className="flex gap-2">
        <Badge>{document.category}</Badge>
        {document.tags?.map(tag => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <MarkdownViewer markdownPath={document.path} showLoading />
    </div>
  );
}
