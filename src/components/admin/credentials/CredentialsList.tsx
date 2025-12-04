/**
 * Credentials List Component
 * Displays tenant/company credentials with test, rotate, and delete actions
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, RefreshCw, Trash2, TestTube2, Shield, CheckCircle2, XCircle, Eye, Pencil, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  deleteVaultCredential,
  type CredentialMetadata,
} from "@/modules/core/integrations/services/vaultCredentialService";
import { CredentialManagementDialog } from "./CredentialManagementDialog";

interface Credential {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  test_status?: 'success' | 'failed';
}

interface CredentialsListProps {
  credentials: Credential[];
  metadata: CredentialMetadata;
  onCredentialChanged: () => void;
  onTestConnection?: (credentialId: string) => Promise<boolean>;
}

export function CredentialsList({
  credentials,
  metadata,
  onCredentialChanged,
  onTestConnection,
}: CredentialsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testingCredentialId, setTestingCredentialId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!selectedCredential) return;

    setIsProcessing(true);
    try {
      await deleteVaultCredential(selectedCredential.id, metadata);
      toast.success("Credential deleted successfully");
      onCredentialChanged();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete credential:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete credential");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTest = async (credential: Credential) => {
    setTestingCredentialId(credential.id);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Check credential type from description
      const isMcp = credential.description?.includes('[n8n-mcp]');
      const isN8nApi = credential.description?.includes('[n8n-api]') || 
                       credential.name.toLowerCase().includes('n8n');
      
      if (onTestConnection) {
        const success = await onTestConnection(credential.id);
        if (success) {
          toast.success("Tilkobling vellykket!");
        } else {
          toast.error("Tilkobling feilet");
        }
        onCredentialChanged();
      } else if (isMcp) {
        // Test MCP connection via dedicated edge function
        const { data, error } = await supabase.functions.invoke('n8n-mcp-test', {
          body: { 
            credentialId: credential.id,
            tenantId: metadata.tenant_id,
          },
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        const mcpWorkflows = data?.mcp_workflows || 0;
        toast.success(`MCP tilkobling vellykket! ${mcpWorkflows} MCP-aktiverte workflows`);
        onCredentialChanged();
      } else if (isN8nApi) {
        // For n8n API credentials, test via n8n-sync edge function
        const { data, error } = await supabase.functions.invoke('n8n-sync', {
          body: { action: 'list', tenantId: metadata.tenant_id },
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        toast.success(`API tilkobling vellykket! Fant ${data?.workflows?.length || 0} workflows`);
        onCredentialChanged();
      } else {
        toast.info("Test av tilkobling er ikke tilgjengelig for denne integrasjonen");
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast.error(error instanceof Error ? error.message : "Tilkobling feilet");
    } finally {
      setTestingCredentialId(null);
    }
  };

  if (credentials.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No encrypted credentials configured</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add credentials to securely store API keys and secrets
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {credentials.map((credential) => (
          <Card key={credential.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-primary flex-shrink-0" />
                  <h4 className="font-medium truncate">{credential.name}</h4>
                  {credential.test_status && (
                    <Badge
                      variant={credential.test_status === 'success' ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {credential.test_status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {credential.test_status === 'success' ? 'Working' : 'Failed'}
                    </Badge>
                  )}
                </div>

                {credential.description && (
                  <p className="text-sm text-muted-foreground mb-2">{credential.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Created: {new Date(credential.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(credential.updated_at).toLocaleDateString()}</span>
                  {credential.last_tested_at && (
                    <span>
                      Last tested: {new Date(credential.last_tested_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(credential)}
                  disabled={testingCredentialId === credential.id}
                  title="Test tilkobling"
                >
                  {testingCredentialId === credential.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCredential(credential);
                    setDetailsOpen(true);
                  }}
                  title="Vis detaljer"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCredential(credential);
                    setRotateDialogOpen(true);
                  }}
                  disabled={isProcessing}
                  title="Roter/oppdater secret"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedCredential(credential);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={isProcessing}
                  title="Slett"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCredential?.name}"? This action cannot be
              undone and may break integrations using this credential.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Credential Dialog */}
      {selectedCredential && (
        <CredentialManagementDialog
          open={rotateDialogOpen}
          onOpenChange={setRotateDialogOpen}
          metadata={metadata}
          existingVaultSecretId={selectedCredential.id}
          onSaved={() => {
            onCredentialChanged();
            setRotateDialogOpen(false);
          }}
        />
      )}

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {selectedCredential?.name}
            </SheetTitle>
            <SheetDescription>
              Detaljer for denne credential
            </SheetDescription>
          </SheetHeader>

          {selectedCredential && (
            <div className="mt-6 space-y-6">
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                {selectedCredential.test_status ? (
                  <Badge
                    variant={selectedCredential.test_status === 'success' ? 'default' : 'destructive'}
                    className="flex items-center gap-1 w-fit"
                  >
                    {selectedCredential.test_status === 'success' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {selectedCredential.test_status === 'success' ? 'Fungerer' : 'Feilet'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Ikke testet</Badge>
                )}
              </div>

              {/* Description */}
              {selectedCredential.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Beskrivelse</h4>
                  <p className="text-sm text-muted-foreground">{selectedCredential.description}</p>
                </div>
              )}

              {/* Parse description for template info */}
              {selectedCredential.description?.startsWith('[n8n-mcp]') && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">n8n MCP Credential</h4>
                  <p className="text-xs text-blue-700">
                    Denne credential brukes for å trigge n8n workflows via Model Context Protocol.
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Opprettet</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCredential.created_at).toLocaleString('nb-NO')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Sist oppdatert</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCredential.updated_at).toLocaleString('nb-NO')}
                  </p>
                </div>
                {selectedCredential.last_tested_at && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Sist testet</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedCredential.last_tested_at).toLocaleString('nb-NO')}
                    </p>
                  </div>
                )}
              </div>

              {/* ID (for debugging) */}
              <div>
                <h4 className="text-sm font-medium mb-1">Credential ID</h4>
                <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                  {selectedCredential.id}
                </code>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleTest(selectedCredential)}
                  disabled={testingCredentialId === selectedCredential.id}
                  className="flex-1"
                >
                  {testingCredentialId === selectedCredential.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Tester...
                    </>
                  ) : (
                    <>
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Test tilkobling
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsOpen(false);
                    setRotateDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Oppdater
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
