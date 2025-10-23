// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentVersion } from "../types/document.types";
import { ProjectPhase } from "@/modules/core/project/types/project.types";

export class DocumentService {
  /**
   * Get documents by project
   */
  static async getProjectDocuments(projectId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get documents by phase
   */
  static async getDocumentsByPhase(
    projectId: string,
    phase: any
  ): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get documents by ERP system
   */
  static async getDocumentsByErpSystem(
    erpSystemId: string
  ): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('erp_system_id', erpSystemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Create document
   */
  static async createDocument(
    projectId: string,
    title: string,
    content: string | null,
    phase: any,
    userId: string,
    erpSystemId?: string
  ): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        project_id: projectId,
        title,
        content,
        phase,
        uploaded_by: userId,
        erp_system_id: erpSystemId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  }

  /**
   * Update document
   */
  static async updateDocument(
    documentId: string,
    updates: any
  ): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId);

    if (error) throw error;
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
}
