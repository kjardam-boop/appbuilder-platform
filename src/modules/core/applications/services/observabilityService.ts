/**
 * Observability Service
 * App usage tracking and analytics
 */

import { supabase } from "@/integrations/supabase/client";

interface AppAccessContext {
  version?: string;
  hook?: string;
  overrideApplied?: string;
  extensionProviders?: string[];
  userId?: string;
}

interface AppUsageStats {
  totalAccess: number;
  uniqueUsers: number;
  hooksUsed: string[];
  recentAccess: any[];
}

export class ObservabilityService {
  /**
   * Log app access and usage
   */
  static async logAppAccess(
    tenantId: string,
    appKey: string,
    context: AppAccessContext
  ): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('app_usage_logs')
        .insert({
          tenant_id: tenantId,
          app_key: appKey,
          version: context.version,
          hook: context.hook,
          override_applied: context.overrideApplied,
          extension_providers: context.extensionProviders,
          user_id: context.userId,
          timestamp: new Date().toISOString(),
        });
      
      if (error) {
        console.error('[ObservabilityService] Failed to log app access:', error);
      }
    } catch (error) {
      console.error('[ObservabilityService] Exception logging app access:', error);
    }
  }
  
  /**
   * Get usage stats for app
   */
  static async getAppUsageStats(tenantId: string, appKey: string): Promise<AppUsageStats> {
    const { data, error } = await (supabase as any)
      .from('app_usage_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('app_key', appKey)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    const logs = data || [];
    
    // Calculate stats
    const totalAccess = logs.length;
    const uniqueUsers = new Set(logs.map((l: any) => l.user_id).filter(Boolean)).size;
    const hooksUsed = [...new Set(logs.map((l: any) => l.hook).filter(Boolean))] as string[];
    
    return {
      totalAccess,
      uniqueUsers,
      hooksUsed,
      recentAccess: logs.slice(0, 10),
    };
  }
}
