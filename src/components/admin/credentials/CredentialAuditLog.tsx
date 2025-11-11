/**
 * Credential Audit Log Component
 * Displays audit trail of credential operations
 */

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Eye, Edit, RefreshCw, Trash2, TestTube2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  status: string;
  error_message?: string;
  created_at: string;
  user_id?: string;
}

interface CredentialAuditLogProps {
  tenantId: string;
  resourceId?: string;
  limit?: number;
}

const ACTION_ICONS: Record<string, typeof Shield> = {
  created: Shield,
  read: Eye,
  updated: Edit,
  rotated: RefreshCw,
  deleted: Trash2,
  tested: TestTube2,
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  read: 'Accessed',
  updated: 'Updated',
  rotated: 'Rotated',
  deleted: 'Deleted',
  tested: 'Tested',
};

export function CredentialAuditLog({ tenantId, resourceId, limit = 50 }: CredentialAuditLogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['credential-audit-log', tenantId, resourceId],
    queryFn: async () => {
      let query = supabase
        .from('credential_audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading audit log...</span>
        </div>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No audit entries yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Audit Log</h3>
        <Badge variant="secondary">{logs.length} entries</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {logs.map((log) => {
            const Icon = ACTION_ICONS[log.action] || Shield;
            const statusColor =
              log.status === 'success'
                ? 'text-green-600'
                : log.status === 'failed'
                ? 'text-destructive'
                : 'text-yellow-600';

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-full bg-background ${statusColor}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                    <Badge
                      variant={
                        log.status === 'success'
                          ? 'default'
                          : log.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Type: {log.resource_type}</div>
                    {log.error_message && (
                      <div className="text-destructive">Error: {log.error_message}</div>
                    )}
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
