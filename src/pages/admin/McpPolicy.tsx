import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAdminRole } from '@/modules/core/user';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  getActivePolicy,
  listPolicies,
  upsertPolicy,
  activatePolicy,
  type TenantPolicyRow,
} from '@/modules/core/mcp/services/tenantPolicyService';
import { DEFAULT_POLICY } from '@/modules/core/mcp/policy/defaultPolicy';
import { mcpPolicySetSchema } from '@/modules/core/mcp/validation/schemas';
import type { McpPolicySet } from '@/modules/core/mcp/types/mcp.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const TENANT_ID = 'default-tenant'; // TODO: Get from context

export default function McpPolicy() {
  const { isAdmin, isLoading: isLoadingRole } = useAdminRole();
  const queryClient = useQueryClient();
  const [policyJson, setPolicyJson] = useState('');
  const [version, setVersion] = useState('1.0');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const { data: policies, isLoading } = useQuery({
    queryKey: ['mcp-policies', TENANT_ID],
    queryFn: () => listPolicies(TENANT_ID),
  });

  const { data: effectivePolicy } = useQuery({
    queryKey: ['mcp-effective-policy', TENANT_ID],
    queryFn: () => getActivePolicy(TENANT_ID),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { policy_json: McpPolicySet; version: string }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      return upsertPolicy(TENANT_ID, {
        ...payload,
        created_by: user.data.user.id,
      });
    },
    onSuccess: () => {
      toast.success('Policy saved successfully');
      queryClient.invalidateQueries({ queryKey: ['mcp-policies'] });
      queryClient.invalidateQueries({ queryKey: ['mcp-effective-policy'] });
    },
    onError: (error) => {
      toast.error(`Failed to save policy: ${error.message}`);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activatePolicy(id, TENANT_ID),
    onSuccess: () => {
      toast.success('Policy activated');
      queryClient.invalidateQueries({ queryKey: ['mcp-policies'] });
      queryClient.invalidateQueries({ queryKey: ['mcp-effective-policy'] });
    },
    onError: (error) => {
      toast.error(`Failed to activate: ${error.message}`);
    },
  });

  const activePolicy = policies?.find((p) => p.is_active);

  // Initialize editor with active policy or default
  const handleLoadActive = () => {
    const jsonToLoad = activePolicy?.policy_json || [];
    setPolicyJson(JSON.stringify(jsonToLoad, null, 2));
    setVersion(activePolicy?.version || '1.0');
  };

  const handleLoadDefault = () => {
    setPolicyJson(JSON.stringify(DEFAULT_POLICY, null, 2));
    setVersion('1.0');
  };

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(policyJson);
      mcpPolicySetSchema.parse(parsed);
      setValidationError(null);
      setIsValid(true);
      toast.success('Policy is valid');
    } catch (error: any) {
      setValidationError(error.message);
      setIsValid(false);
      toast.error('Validation failed');
    }
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(policyJson);
      mcpPolicySetSchema.parse(parsed);
      await saveMutation.mutateAsync({
        policy_json: parsed,
        version,
      });
    } catch (error: any) {
      setValidationError(error.message);
      toast.error('Invalid policy JSON');
    }
  };

  if (isLoadingRole) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="w-full px-4 lg:px-6 xl:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MCP Policy Configuration</h1>
        <p className="text-muted-foreground">
          Manage tenant-specific access control rules
        </p>
      </div>

      {/* Active Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Active Policy</CardTitle>
          <CardDescription>
            Currently active policy version for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePolicy ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default">Version {activePolicy.version}</Badge>
                <Badge variant="outline">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(activePolicy.created_at).toLocaleString()}
              </p>
              <Button onClick={handleLoadActive} variant="outline" size="sm">
                Load in Editor
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active policy. Using platform default.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Editor</CardTitle>
          <CardDescription>
            Edit and validate policy JSON (McpPolicySet format)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="policy-json">Policy JSON</Label>
              <div className="flex gap-2">
                <Button onClick={handleLoadDefault} variant="ghost" size="sm">
                  Load Default
                </Button>
                <Button onClick={handleLoadActive} variant="ghost" size="sm">
                  Load Active
                </Button>
              </div>
            </div>
            <Textarea
              id="policy-json"
              value={policyJson}
              onChange={(e) => {
                setPolicyJson(e.target.value);
                setValidationError(null);
                setIsValid(false);
              }}
              className="font-mono text-sm min-h-[300px]"
              placeholder="[]"
            />
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {isValid && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Policy JSON is valid</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={handleValidate} variant="outline">
              Validate
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || saveMutation.isPending}
            >
              Save as New Version
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Policy History</CardTitle>
          <CardDescription>All policy versions for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : policies && policies.length > 0 ? (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {policy.version}</span>
                      {policy.is_active && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(policy.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!policy.is_active && (
                    <Button
                      onClick={() => activateMutation.mutate(policy.id)}
                      variant="outline"
                      size="sm"
                      disabled={activateMutation.isPending}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No policies yet</p>
          )}
        </CardContent>
      </Card>

      {/* Effective Policy Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Effective Policy Preview</CardTitle>
          <CardDescription>
            Merged view: DEFAULT + TENANT rules (tenant rules apply last)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
            {JSON.stringify(effectivePolicy || DEFAULT_POLICY, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
