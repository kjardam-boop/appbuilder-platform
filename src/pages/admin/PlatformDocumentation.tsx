import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, FileText, Search } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { documentationCatalog, DocumentMetadata } from '@/config/documentationCatalog';
import { cn } from '@/lib/utils';

// Category icons mapping
const categoryIcons = {
  Platform: '🏢',
  Architecture: '🏗️',
  Development: '💻',
  Implementation: '🚀',
  Modules: '📦',
  Capabilities: '⚡',
  Templates: '📋',
};

export default function PlatformDocumentation() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(Object.keys(categoryIcons)));

  // Group documents by category and subcategory
  const groupedDocs = useMemo(() => {
    const filtered = documentationCatalog.filter(doc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    });

    const groups: Record<string, { docs: DocumentMetadata[]; subcategories: Record<string, DocumentMetadata[]> }> = {};

    filtered.forEach(doc => {
      if (!groups[doc.category]) {
        groups[doc.category] = { docs: [], subcategories: {} };
      }

      if (doc.subcategory) {
        if (!groups[doc.category].subcategories[doc.subcategory]) {
          groups[doc.category].subcategories[doc.subcategory] = [];
        }
        groups[doc.category].subcategories[doc.subcategory].push(doc);
      } else {
        groups[doc.category].docs.push(doc);
      }
    });

    return groups;
  }, [searchQuery]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDocClick = (doc: DocumentMetadata) => {
    navigate(`/admin/documentation/${doc.id}`);
  };

  const totalDocs = documentationCatalog.length;
  const filteredCount = Object.values(groupedDocs).reduce(
    (sum, group) => sum + group.docs.length + Object.values(group.subcategories).reduce((s, docs) => s + docs.length, 0),
    0
  );

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
            {totalDocs} dokumenter tilgjengelig på tvers av plattformen
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk i tittel, beskrivelse eller tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Viser {filteredCount} av {totalDocs} dokumenter
        </p>
      )}

      {/* Grouped documentation */}
      <div className="space-y-4">
        {Object.entries(groupedDocs).length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Ingen dokumenter funnet</h3>
            <p className="text-muted-foreground">Prøv et annet søk</p>
          </div>
        ) : (
          Object.entries(groupedDocs).map(([category, group]) => {
            const isOpen = openCategories.has(category);
            const totalInCategory = group.docs.length + Object.values(group.subcategories).reduce((s, docs) => s + docs.length, 0);

            return (
              <Collapsible
                key={category}
                open={isOpen}
                onOpenChange={() => toggleCategory(category)}
                className="border rounded-lg overflow-hidden"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold">{category}</h2>
                        <p className="text-sm text-muted-foreground">{totalInCategory} dokumenter</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4">
                    {/* Documents without subcategory */}
                    {group.docs.length > 0 && (
                      <div className="space-y-2">
                        {group.docs.map(doc => (
                          <DocumentCard key={doc.id} doc={doc} onClick={() => handleDocClick(doc)} />
                        ))}
                      </div>
                    )}

                    {/* Subcategories */}
                    {Object.entries(group.subcategories).map(([subcategory, docs]) => (
                      <div key={subcategory} className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground px-3">{subcategory}</h3>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <DocumentCard key={doc.id} doc={doc} onClick={() => handleDocClick(doc)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}

// Document card component
function DocumentCard({ doc, onClick }: { doc: DocumentMetadata; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium group-hover:text-primary transition-colors mb-1">
            {doc.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {doc.description}
          </p>
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {doc.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{doc.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}
