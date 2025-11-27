import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export interface EvaluationDocument {
  id: string;
  project_id: string;
  supplier_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  document_type: string;
  version: number;
  language: string;
  tags: string[];
  status: string;
  parsed_content: any;
  error_message: string | null;
  uploaded_by: string;
  uploaded_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPES = [
  { value: 'kravspec', label: 'Kravspesifikasjon' },
  { value: 'tilbud', label: 'Tilbud' },
  { value: 'presentasjon', label: 'Presentasjon' },
  { value: 'referanse', label: 'Referanse' },
  { value: 'kontrakt', label: 'Kontraktutkast' },
  { value: 'teknisk', label: 'Teknisk dokumentasjon' },
  { value: 'sikkerhet', label: 'Sikkerhet/Arkitektur' },
  { value: 'annet', label: 'Annet' },
] as const;

export const useEvaluationDocuments = (projectId: string) => {
  const [documents, setDocuments] = useState<EvaluationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_evaluation_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Kunne ikke laste dokumenter');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: string,
    supplierId?: string,
    tags: string[] = []
  ) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke autentisert');

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${projectId}/${timestamp}_${sanitizedFileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('evaluation-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from('supplier_evaluation_documents')
        .insert({
          project_id: projectId,
          supplier_id: supplierId || null,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          document_type: documentType,
          tags,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Dokument lastet opp');
      await fetchDocuments();
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Kunne ikke laste opp dokument');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('evaluation-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('supplier_evaluation_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast.success('Dokument slettet');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Kunne ikke slette dokument');
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('evaluation-documents')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Kunne ikke laste ned dokument');
    }
  };

  return {
    documents,
    isLoading,
    isUploading,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
};
