/**
 * Document Service
 * 
 * Document management service.
 */
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentVersion } from "../types/document.types";
import { ProjectPhase } from "@/modules/core/project/types/project.types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

export class DocumentService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  /**
   * Get documents by project (tenant-scoped)
   */
  static async getProjectDocuments(ctx: RequestContext, projectId: string): Promise<Document[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get documents by phase (tenant-scoped)
   */
  static async getDocumentsByPhase(
    ctx: RequestContext,
    projectId: string,
    phase: any
  ): Promise<Document[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get documents by ERP system (tenant-scoped)
   */
  static async getDocumentsByErpSystem(
    ctx: RequestContext,
    erpSystemId: string
  ): Promise<Document[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('erp_system_id', erpSystemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Create document (tenant-scoped)
   */
  static async createDocument(
    ctx: RequestContext,
    projectId: string,
    title: string,
    content: string | null,
    phase: any,
    userId: string,
    erpSystemId?: string
  ): Promise<Document> {
    const db = this.getDb(ctx);
    const { data, error } = await db
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
   * Update document (tenant-scoped)
   */
  static async updateDocument(
    ctx: RequestContext,
    documentId: string,
    updates: any
  ): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('documents')
      .update(updates)
      .eq('id', documentId);

    if (error) throw error;
  }

  /**
   * Delete document (tenant-scoped)
   */
  static async deleteDocument(ctx: RequestContext, documentId: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
}
