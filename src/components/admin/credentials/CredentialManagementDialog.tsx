/**
 * Credential Management Dialog
 * UI for adding/editing encrypted credentials via Vault
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";
import {
  createVaultCredential,
  updateVaultCredential,
  type CredentialMetadata,
} from "@/modules/core/integrations/services/vaultCredentialService";

interface CredentialManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: CredentialMetadata;
  existingVaultSecretId?: string;
  onSaved: (vaultSecretId: string) => void;
}

export function CredentialManagementDialog({
  open,
  onOpenChange,
  metadata,
  existingVaultSecretId,
  onSaved,
}: CredentialManagementDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = !!existingVaultSecretId;

  const handleSave = async () => {
    if (!name.trim() || !secret.trim()) {
      toast.error("Name and secret are required");
      return;
    }

    setIsSaving(true);
    try {
      let vaultSecretId: string;

      if (isEdit && existingVaultSecretId) {
        // Update existing credential
        await updateVaultCredential(existingVaultSecretId, secret, metadata);
        vaultSecretId = existingVaultSecretId;
        toast.success("Credential updated successfully");
      } else {
        // Create new credential
        vaultSecretId = await createVaultCredential(name, secret, description, metadata);
        toast.success("Credential created successfully");
      }

      onSaved(vaultSecretId);
      onOpenChange(false);
      
      // Reset form
      setName("");
      setDescription("");
      setSecret("");
    } catch (error) {
      console.error("Failed to save credential:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save credential");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {isEdit ? "Update Credential" : "Add Encrypted Credential"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., HubSpot API Key"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  disabled={isSaving}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="secret">
              {isEdit ? "New Secret Value *" : "Secret Value *"}
            </Label>
            <div className="relative">
              <Input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter API key or secret..."
                disabled={isSaving}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This value will be encrypted and stored securely in Vault
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
