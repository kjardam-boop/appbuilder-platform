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
import { Key, RefreshCw, Trash2, TestTube2, Shield, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  deleteVaultCredential,
  rotateVaultCredential,
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

  const handleRotate = async (newSecret: string) => {
    if (!selectedCredential) return;

    setIsProcessing(true);
    try {
      await rotateVaultCredential(selectedCredential.id, newSecret, metadata);
      toast.success("Credential rotated successfully");
      onCredentialChanged();
      setRotateDialogOpen(false);
    } catch (error) {
      console.error("Failed to rotate credential:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rotate credential");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTest = async (credential: Credential) => {
    if (!onTestConnection) {
      toast.info("Connection testing not available for this integration");
      return;
    }

    setTestingCredentialId(credential.id);
    try {
      const success = await onTestConnection(credential.id);
      if (success) {
        toast.success("Connection test successful");
      } else {
        toast.error("Connection test failed");
      }
      onCredentialChanged();
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast.error(error instanceof Error ? error.message : "Failed to test connection");
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
                {onTestConnection && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(credential)}
                    disabled={testingCredentialId === credential.id}
                  >
                    <TestTube2 className="h-4 w-4" />
                    {testingCredentialId === credential.id ? 'Testing...' : 'Test'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCredential(credential);
                    setRotateDialogOpen(true);
                  }}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4" />
                  Rotate
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedCredential(credential);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={isProcessing}
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
    </>
  );
}
