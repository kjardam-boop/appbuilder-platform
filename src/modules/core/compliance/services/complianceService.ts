/**
 * Compliance Service
 * 
 * Compliance and audit service.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";
import type {
  RetentionPolicy,
  RetentionPolicyInput,
  DataSubjectRequest,
  DataSubjectRequestInput,
  DataExportResult,
} from "../types/compliance.types";

export class ComplianceService {
  /**
   * Create or update retention policy
   */
  static async setRetentionPolicy(
    ctx: RequestContext,
    input: RetentionPolicyInput
  ): Promise<RetentionPolicy> {
    const { data, error } = await supabase
      .from("retention_policies")
      .upsert(
        {
          tenant_id: input.tenant_id,
          resource_type: input.resource_type,
          retention_days: input.retention_days,
          anonymize_before_delete: input.anonymize_before_delete ?? true,
          policy_config: input.policy_config || null,
        },
        { onConflict: "tenant_id,resource_type" }
      )
      .select()
      .single();

    if (error) throw error;
    return data as RetentionPolicy;
  }

  /**
   * Get retention policies for tenant
   */
  static async getRetentionPolicies(ctx: RequestContext): Promise<RetentionPolicy[]> {
    const { data, error } = await supabase
      .from("retention_policies")
      .select("*")
      .eq("tenant_id", ctx.tenant_id)
      .order("resource_type");

    if (error) throw error;
    return (data || []) as RetentionPolicy[];
  }

  /**
   * Create data subject request
   */
  static async createDataSubjectRequest(
    ctx: RequestContext,
    input: DataSubjectRequestInput
  ): Promise<DataSubjectRequest> {
    const { data, error } = await supabase
      .from("data_subject_requests")
      .insert({
        tenant_id: input.tenant_id,
        subject_email: input.subject_email,
        request_type: input.request_type,
        requested_by: input.requested_by || ctx.user_id || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data as DataSubjectRequest;
  }

  /**
   * Get data subject requests
   */
  static async getDataSubjectRequests(
    ctx: RequestContext,
    status?: string
  ): Promise<DataSubjectRequest[]> {
    let query = supabase
      .from("data_subject_requests")
      .select("*")
      .eq("tenant_id", ctx.tenant_id);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("requested_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DataSubjectRequest[];
  }

  /**
   * Update data subject request status
   */
  static async updateRequestStatus(
    ctx: RequestContext,
    requestId: string,
    status: string,
    resultData?: Record<string, any>,
    errorMessage?: string
  ): Promise<DataSubjectRequest> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    if (resultData) {
      updates.result_data = resultData;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from("data_subject_requests")
      .update(updates)
      .eq("id", requestId)
      .eq("tenant_id", ctx.tenant_id)
      .select()
      .single();

    if (error) throw error;
    return data as DataSubjectRequest;
  }

  /**
   * Export all data for a data subject (used internally by edge function)
   */
  static async exportDataForSubject(
    ctx: RequestContext,
    subjectEmail: string
  ): Promise<DataExportResult> {
    // This would need to query all relevant tables
    // For now, a basic implementation
    const result: DataExportResult = {
      subject_email: subjectEmail,
      exported_at: new Date().toISOString(),
      data: {},
      metadata: {
        total_records: 0,
        tables_included: [],
      },
    };

    // Query profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", subjectEmail);

    if (profiles && profiles.length > 0) {
      result.data.profiles = profiles;
      result.metadata.total_records += profiles.length;
      result.metadata.tables_included.push("profiles");
    }

    // Add other tables as needed (companies, projects, etc.)
    // This should be dynamic based on data mapping

    return result;
  }

  /**
   * Delete all data for a data subject (used internally by edge function)
   * CAUTION: This is destructive
   */
  static async deleteDataForSubject(
    ctx: RequestContext,
    subjectEmail: string,
    anonymize: boolean = true
  ): Promise<{ deleted_records: number; anonymized_records: number }> {
    let deleted = 0;
    let anonymized = 0;

    if (anonymize) {
      // Anonymize instead of delete (recommended for audit trail)
      const { data: profiles } = await supabase
        .from("profiles")
        .update({
          email: `anonymized_${Date.now()}@deleted.local`,
          first_name: "[DELETED]",
          last_name: "[DELETED]",
        })
        .eq("email", subjectEmail)
        .select("id");

      anonymized += profiles?.length || 0;
    } else {
      // Hard delete (be careful!)
      const { data: profiles } = await supabase
        .from("profiles")
        .delete()
        .eq("email", subjectEmail)
        .select("id");

      deleted += profiles?.length || 0;
    }

    return { deleted_records: deleted, anonymized_records: anonymized };
  }
}
