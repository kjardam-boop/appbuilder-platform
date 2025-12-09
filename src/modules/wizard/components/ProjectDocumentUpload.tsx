/**
 * ProjectDocumentUpload
 * 
 * Drag-and-drop document upload component for App Wizard.
 * Uploads files to Supabase storage and saves metadata to content_library
 * for use with RAG when generating project descriptions.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  File, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Trash2,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectDocumentUploadProps {
  projectId: string | null;
  tenantId: string;
  companyId: string | null;
  onDocumentsChange?: (count: number) => void;
}

interface UploadedDocument {
  id: string;
  title: string;
  file_type: string;
  file_size_bytes: number | null;
  source_type: string;
  created_at: string;
  original_filename: string | null;
  tenant_id?: string;
}

interface UploadProgress {
  file: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  // Image types for OCR
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ProjectDocumentUpload({ 
  projectId, 
  tenantId, 
  companyId,
  onDocumentsChange 
}: ProjectDocumentUploadProps) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  // Fetch existing documents for this project
  const { data: documents, isLoading, error: documentsError } = useQuery({
    queryKey: ['project-documents', projectId, tenantId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('[ProjectDocuments] Fetching documents:', { projectId, tenantId });
      
      // First try with tenant_id filter
      let query = supabase
        .from('content_library')
        .select('id, title, file_type, file_size_bytes, source_type, created_at, original_filename, tenant_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      // Only filter by tenant if provided
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[ProjectDocuments] Error fetching:', error);
        throw error;
      }
      
      console.log('[ProjectDocuments] Fetched documents:', data?.length || 0, data);
      return data as UploadedDocument[];
    },
    enabled: !!projectId,
  });
  
  // Log if there's an error
  if (documentsError) {
    console.error('[ProjectDocuments] Query error:', documentsError);
  }

  // Extract text from file (simple approach for text files, edge function for PDFs)
  const extractText = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      return await file.text();
    }
    
    // For PDFs and DOCX, we'll extract text server-side
    // For now, return empty and let a background job handle it
    return '';
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!projectId) {
        throw new Error('Prosjekt må opprettes først');
      }

      const results = [];
      
      for (const file of files) {
        const fileId = `${projectId}/${Date.now()}-${file.name}`;
        
        setUploadProgress(prev => [
          ...prev.filter(p => p.file !== file.name),
          { file: file.name, progress: 0, status: 'uploading' }
        ]);

        try {
          // Check for duplicate - same filename in same project
          const { data: existing } = await supabase
            .from('content_library')
            .select('id, title')
            .eq('project_id', projectId)
            .eq('original_filename', file.name)
            .maybeSingle();

          if (existing) {
            console.log('Document already exists:', existing);
            toast.info(`"${file.name}" er allerede lastet opp`);
            setUploadProgress(prev => 
              prev.map(p => p.file === file.name 
                ? { ...p, progress: 100, status: 'complete' } 
                : p
              )
            );
            continue; // Skip to next file
          }

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('project-documents')
            .upload(fileId, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            // If bucket doesn't exist, try creating it via RPC or skip storage
            console.warn('Storage upload failed, continuing without file storage:', uploadError);
          }

          setUploadProgress(prev => 
            prev.map(p => p.file === file.name 
              ? { ...p, progress: 50, status: 'processing' } 
              : p
            )
          );

          // Extract text content
          const extractedText = await extractText(file);

          // Save to content_library
          // Build insert object with only non-null values
          // Valid categories: 'onboarding', 'faq', 'help', 'integration', 'product', 'guide', 'tutorial', 'general'
          const insertData: Record<string, unknown> = {
            tenant_id: tenantId,
            project_id: projectId,
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            category: 'general', // Use 'general' for project documents
            content_markdown: extractedText || '(Binærfil - tekst ikke ekstrahert)', // Required NOT NULL field
            file_type: file.type.includes('pdf') ? 'pdf' : 
                       file.type.includes('word') ? 'docx' : 
                       file.type.includes('presentation') || file.type.includes('powerpoint') ? 'pptx' :
                       file.type.includes('markdown') ? 'markdown' :
                       file.type.includes('image/jpeg') ? 'jpeg' :
                       file.type.includes('image/png') ? 'png' :
                       file.type.includes('image/gif') ? 'gif' :
                       file.type.includes('image/webp') ? 'webp' : 'txt',
            file_size_bytes: file.size,
            file_storage_path: fileId,
            original_filename: file.name,
          };
          
          // Only add optional fields if they have values
          if (companyId) insertData.company_id = companyId;
          if (extractedText) insertData.extracted_text = extractedText;

          console.log('Inserting document:', insertData);

          const { data, error } = await supabase
            .from('content_library')
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error('Database insert error:', error);
            throw error;
          }
          
          console.log('Document saved:', data);

          setUploadProgress(prev => 
            prev.map(p => p.file === file.name 
              ? { ...p, progress: 100, status: 'complete' } 
              : p
            )
          );

          results.push(data);
        } catch (error) {
          console.error('Upload failed:', error);
          setUploadProgress(prev => 
            prev.map(p => p.file === file.name 
              ? { ...p, status: 'error', error: error instanceof Error ? error.message : 'Opplasting feilet' } 
              : p
            )
          );
        }
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast.success(`${data.length} dokument(er) lastet opp`);
      onDocumentsChange?.(documents?.length ?? 0 + data.length);
      
      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.status !== 'complete'));
      }, 3000);
    },
    onError: (error) => {
      toast.error(`Opplasting feilet: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('content_library')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
      toast.success('Dokument slettet');
      onDocumentsChange?.((documents?.length ?? 1) - 1);
    },
  });


  // Dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} er for stor (maks 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      uploadMutation.mutate(validFiles);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: !projectId || uploadMutation.isPending,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf' || fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType === 'docx' || fileType.includes('word')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (fileType === 'pptx' || fileType.includes('presentation') || fileType.includes('powerpoint')) return <FileText className="h-4 w-4 text-orange-500" />;
    if (['jpeg', 'jpg', 'png', 'gif', 'webp', 'image'].some(t => fileType.toLowerCase().includes(t))) return <Image className="h-4 w-4 text-purple-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Prosjektdokumenter
        </CardTitle>
        <CardDescription>
          Last opp dokumenter som gir kontekst til prosjektet. AI vil bruke disse til å generere bedre beskrivelser.
          {!projectId && (
            <span className="block mt-1 text-amber-600">
              Prosjektet må lagres før du kan laste opp dokumenter.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive && "border-primary bg-primary/5",
            !projectId && "opacity-50 cursor-not-allowed",
            "hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn(
            "h-10 w-10 mx-auto mb-4",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          {isDragActive ? (
            <p className="text-primary font-medium">Slipp filene her...</p>
          ) : (
            <>
              <p className="font-medium mb-1">Dra og slipp filer her</p>
              <p className="text-sm text-muted-foreground">
                eller klikk for å velge filer (PDF, DOCX, PPTX, TXT, MD, bilder - maks 10MB)
              </p>
            </>
          )}
        </div>

        {/* Upload progress */}
        {uploadProgress.length > 0 && (
          <div className="space-y-2">
            {uploadProgress.map((item) => (
              <div 
                key={item.file} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  item.status === 'error' && "border-destructive bg-destructive/5",
                  item.status === 'complete' && "border-green-500 bg-green-50 dark:bg-green-950/20"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {item.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {item.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-sm font-medium truncate">{item.file}</span>
                  </div>
                  {item.status === 'uploading' && (
                    <Progress value={item.progress} className="h-1 mt-2" />
                  )}
                  {item.status === 'processing' && (
                    <p className="text-xs text-muted-foreground mt-1">Behandler innhold...</p>
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive mt-1">{item.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded documents list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {documents.length} dokument{documents.length !== 1 ? 'er' : ''} lastet opp
              </span>
            </div>
            <div className="divide-y rounded-lg border">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(doc.file_type)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_size_bytes ? formatFileSize(doc.file_size_bytes) : ''} • {new Date(doc.created_at).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : projectId ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen dokumenter lastet opp ennå
          </p>
        ) : null}

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">Tips for bedre AI-generering:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Last opp kravspesifikasjoner eller ønskelister</li>
            <li>Inkluder eksisterende prosessbeskrivelser</li>
            <li>Del relevante e-poster eller møtereferater</li>
            <li>Legg ved presentasjoner om prosjektet</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

