/**
 * Document Management Capability
 * 
 * A reusable document management component that can be used across apps.
 * Supports upload, search, preview, and organization of documents.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Search, 
  MoreVertical, 
  Download, 
  Trash2, 
  Eye,
  Folder,
  FileImage,
  FileSpreadsheet,
  File,
  Loader2,
  Plus,
  Filter,
  Grid,
  List as ListIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CapabilityProps } from '../../schemas/capability-manifest.schema';

// ============================================================================
// TYPES
// ============================================================================

interface Document {
  id: string;
  title: string;
  category: string;
  file_type: string | null;
  file_size_bytes: number | null;
  file_storage_path: string | null;
  original_filename: string | null;
  content_markdown: string;
  extracted_text: string | null;
  keywords: string[] | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  created_by: string | null;
  tenant_id: string | null;
  project_id: string | null;
  is_active: boolean | null;
}

interface DocumentManagementConfig {
  allowUpload?: boolean;
  allowDelete?: boolean;
  categories?: string[];
  maxFileSize?: number; // in MB
  acceptedFileTypes?: string[];
  viewMode?: 'grid' | 'list';
  showSearch?: boolean;
  showFilters?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const FILE_ICONS: Record<string, React.ElementType> = {
  'application/pdf': FileText,
  'image/': FileImage,
  'application/vnd.': FileSpreadsheet,
  'text/': FileText,
};

function getFileIcon(fileType: string | null): React.ElementType {
  if (!fileType) return File;
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (fileType.startsWith(key)) return Icon;
  }
  return File;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Ukjent størrelse';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: DocumentManagementConfig = {
  allowUpload: true,
  allowDelete: true,
  categories: ['Generelt', 'Kontrakter', 'Rapporter', 'Bilder', 'Annet'],
  maxFileSize: 10,
  acceptedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'],
  viewMode: 'list',
  showSearch: true,
  showFilters: true,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentManagement({
  config = {},
  slot,
  variant = 'default',
  onAction,
  onError,
  context,
}: CapabilityProps) {
  const queryClient = useQueryClient();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config } as DocumentManagementConfig;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(mergedConfig.viewMode || 'list');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Fetch documents
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents', context.tenantId, context.appId, searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('content_library')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Filter by tenant
      if (context.tenantId) {
        query = query.eq('tenant_id', context.tenantId);
      }

      // Filter by project if available
      if (context.appId) {
        query = query.or(`project_id.eq.${context.appId},project_id.is.null`);
      }

      // Filter by category
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      // Search
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,extracted_text.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!context.tenantId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, category }: { file: File; title: string; category: string }) => {
      // Upload file to storage
      const filePath = `${context.tenantId}/${context.appId || 'general'}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('content_library')
        .insert({
          tenant_id: context.tenantId,
          project_id: context.appId || null,
          title,
          category,
          file_storage_path: filePath,
          file_type: file.type,
          file_size_bytes: file.size,
          original_filename: file.name,
          content_markdown: '', // Will be processed later
          is_active: true,
          created_by: context.userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Dokument lastet opp');
      setUploadDialogOpen(false);
      onAction?.('document_uploaded', { success: true });
    },
    onError: (error) => {
      toast.error('Kunne ikke laste opp dokument');
      onError?.(error as Error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('content_library')
        .update({ is_active: false })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Dokument slettet');
      onAction?.('document_deleted', { success: true });
    },
    onError: (error) => {
      toast.error('Kunne ikke slette dokument');
      onError?.(error as Error);
    },
  });

  // Download handler
  const handleDownload = async (doc: Document) => {
    if (!doc.file_storage_path) {
      toast.error('Ingen fil tilknyttet');
      return;
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .download(doc.file_storage_path);

    if (error) {
      toast.error('Kunne ikke laste ned dokument');
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_filename || doc.title;
    a.click();
    URL.revokeObjectURL(url);
    
    onAction?.('document_downloaded', { documentId: doc.id });
  };

  // Compact variant for sidebar
  if (variant === 'compact' || slot === 'sidebar') {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Dokumenter
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[200px]">
            {documents?.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className="w-full text-left p-2 hover:bg-muted rounded text-xs flex items-center gap-2"
              >
                {React.createElement(getFileIcon(doc.file_type), { className: 'h-3 w-3' })}
                <span className="truncate">{doc.title}</span>
              </button>
            ))}
            {!documents?.length && (
              <p className="text-xs text-muted-foreground p-2">Ingen dokumenter</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Dokumentarkiv
            </CardTitle>
            <CardDescription>
              Last opp, organiser og søk i dokumenter
            </CardDescription>
          </div>
          
          {mergedConfig.allowUpload && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Last opp
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Last opp dokument</DialogTitle>
                </DialogHeader>
                <UploadForm
                  categories={mergedConfig.categories || []}
                  acceptedTypes={mergedConfig.acceptedFileTypes || []}
                  maxSize={mergedConfig.maxFileSize || 10}
                  onSubmit={(data) => uploadMutation.mutate(data)}
                  isLoading={uploadMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and filters */}
        {(mergedConfig.showSearch || mergedConfig.showFilters) && (
          <div className="flex gap-2">
            {mergedConfig.showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søk i dokumenter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            
            {mergedConfig.showFilters && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                    Alle kategorier
                  </DropdownMenuItem>
                  {mergedConfig.categories?.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Category filter chips */}
        {selectedCategory && (
          <div className="flex gap-2">
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory(null)}>
              {selectedCategory} ✕
            </Badge>
          </div>
        )}

        {/* Documents list/grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Kunne ikke laste dokumenter</p>
          </div>
        ) : !documents?.length ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen dokumenter funnet</p>
            {mergedConfig.allowUpload && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Last opp første dokument
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => setSelectedDocument(doc)}
                onDownload={() => handleDownload(doc)}
                onDelete={mergedConfig.allowDelete ? () => deleteMutation.mutate(doc.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onView={() => setSelectedDocument(doc)}
                onDownload={() => handleDownload(doc)}
                onDelete={mergedConfig.allowDelete ? () => deleteMutation.mutate(doc.id) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Document preview dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {React.createElement(getFileIcon(selectedDocument.file_type), { className: 'h-5 w-5' })}
                  {selectedDocument.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(selectedDocument.file_size_bytes)}</span>
                  <span>{selectedDocument.category}</span>
                  <span>{formatDate(selectedDocument.created_at)}</span>
                </div>
                {selectedDocument.keywords?.length ? (
                  <div className="flex gap-1 flex-wrap">
                    {selectedDocument.keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                ) : null}
                {selectedDocument.extracted_text && (
                  <ScrollArea className="h-[300px] border rounded p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedDocument.extracted_text}</p>
                  </ScrollArea>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => handleDownload(selectedDocument)}>
                    <Download className="h-4 w-4 mr-2" />
                    Last ned
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onDownload: () => void;
  onDelete?: () => void;
}

function DocumentCard({ document, onView, onDownload, onDelete }: DocumentCardProps) {
  const Icon = getFileIcon(document.file_type);
  
  return (
    <div 
      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-primary/10 rounded">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" /> Vis
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
              <Download className="h-4 w-4 mr-2" /> Last ned
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Slett
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h4 className="font-medium text-sm truncate">{document.title}</h4>
      <p className="text-xs text-muted-foreground mt-1">
        {formatFileSize(document.file_size_bytes)}
      </p>
      <Badge variant="outline" className="mt-2 text-xs">{document.category}</Badge>
    </div>
  );
}

function DocumentRow({ document, onView, onDownload, onDelete }: DocumentCardProps) {
  const Icon = getFileIcon(document.file_type);
  
  return (
    <div 
      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onView}
    >
      <div className="p-2 bg-primary/10 rounded flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{document.title}</h4>
        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{formatFileSize(document.file_size_bytes)}</span>
          <span>•</span>
          <span>{document.category}</span>
          <span>•</span>
          <span>{formatDate(document.created_at)}</span>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          <Download className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface UploadFormProps {
  categories: string[];
  acceptedTypes: string[];
  maxSize: number;
  onSubmit: (data: { file: File; title: string; category: string }) => void;
  isLoading: boolean;
}

function UploadForm({ categories, acceptedTypes, maxSize, onSubmit, isLoading }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Generelt');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > maxSize * 1024 * 1024) {
        toast.error(`Filen er for stor. Maks ${maxSize}MB`);
        return;
      }
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Velg fil og skriv inn tittel');
      return;
    }
    onSubmit({ file, title, category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">Fil</Label>
        <Input
          id="file"
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileChange}
          className="mt-1"
        />
        {file && (
          <p className="text-xs text-muted-foreground mt-1">
            {file.name} ({formatFileSize(file.size)})
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="title">Tittel</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dokumenttittel"
          className="mt-1"
        />
      </div>
      
      <div>
        <Label htmlFor="category">Kategori</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !file}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Laster opp...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Last opp
          </>
        )}
      </Button>
    </form>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DocumentManagement;

