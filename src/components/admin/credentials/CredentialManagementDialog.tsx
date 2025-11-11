/**
 * Credential Management Dialog
 * UI for adding/editing encrypted credentials via Vault
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";
import {
  createVaultCredential,
  updateVaultCredential,
  linkCredentialToApplication,
  linkCredentialToCompanySystem,
  type CredentialMetadata,
} from "@/modules/core/integrations/services/vaultCredentialService";
import { TenantSelector } from "@/components/Admin/TenantSelector";
import { CompanySelector } from "@/components/Admin/CompanySelector";
import { ApplicationSelector } from "@/components/Admin/ApplicationSelector";
import { useTenantContext } from "@/hooks/useTenantContext";

interface CredentialManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata?: CredentialMetadata; // Optional for new credentials
  existingVaultSecretId?: string;
  onSaved: (vaultSecretId: string) => void;
  isPlatformAdmin?: boolean;
}

export function CredentialManagementDialog({
  open,
  onOpenChange,
  metadata,
  existingVaultSecretId,
  onSaved,
  isPlatformAdmin = false,
}: CredentialManagementDialogProps) {
  const context = useTenantContext();
  const [tenantId, setTenantId] = useState<string>(metadata?.tenant_id || context?.tenant_id || "");
  const [resourceType, setResourceType] = useState<'tenant_integration' | 'company_system' | 'app_integration'>(
    metadata?.resource_type || 'tenant_integration'
  );
  const [companyId, setCompanyId] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = !!existingVaultSecretId;

  // Reset form when dialog opens/closes or metadata changes
  useEffect(() => {
    if (open && metadata) {
      setTenantId(metadata.tenant_id);
      setResourceType(metadata.resource_type);
    } else if (!open) {
      // Reset form when closing
      setTenantId(context?.tenant_id || "");
      setResourceType('tenant_integration');
      setCompanyId("");
      setApplicationId("");
      setName("");
      setDescription("");
      setSecret("");
      setShowSecret(false);
    }
  }, [open, metadata, context?.tenant_id]);

  const handleSave = async () => {
    if (!name.trim() || !secret.trim()) {
      toast.error("Name and secret are required");
      return;
    }

    if (!tenantId) {
      toast.error("Tenant is required");
      return;
    }

    // Validate resource selection
    if (resourceType === 'company_system' && !companyId) {
      toast.error("Please select a company");
      return;
    }

    if (resourceType === 'app_integration' && !applicationId) {
      toast.error("Please select an application");
      return;
    }

    setIsSaving(true);
    try {
      let vaultSecretId: string;

      // Determine resource_id based on type
      let resourceId = tenantId; // Default for tenant_integration
      if (resourceType === 'company_system') {
        resourceId = companyId;
      } else if (resourceType === 'app_integration') {
        resourceId = applicationId;
      }

      const credentialMetadata: CredentialMetadata = {
        tenant_id: tenantId,
        resource_type: resourceType,
        resource_id: resourceId,
      };

      if (isEdit && existingVaultSecretId) {
        // Update existing credential
        await updateVaultCredential(existingVaultSecretId, secret, credentialMetadata);
        vaultSecretId = existingVaultSecretId;
        toast.success("Credential updated successfully");
      } else {
        // Create new credential
        vaultSecretId = await createVaultCredential(name, secret, description, credentialMetadata);
        
        // Link credential to the respective resource
        if (resourceType === 'app_integration') {
          await linkCredentialToApplication(applicationId, vaultSecretId);
        } else if (resourceType === 'company_system') {
          // Note: For company systems, we may need to find the company_external_systems record
          // For now, we just store the reference in vault_credentials
        }
        
        toast.success("Credential created successfully");
      }

      onSaved(vaultSecretId);
      onOpenChange(false);
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
              {isPlatformAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant *</Label>
                  <TenantSelector
                    value={tenantId}
                    onValueChange={setTenantId}
                    placeholder="Velg tenant..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resourceType">Credential Type *</Label>
                <Select value={resourceType} onValueChange={(v) => setResourceType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_integration">Tenant Integration</SelectItem>
                    <SelectItem value="company_system">Company System</SelectItem>
                    <SelectItem value="app_integration">App Integration</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {resourceType === 'tenant_integration' && 'Global credentials for tenant-wide integrations'}
                  {resourceType === 'company_system' && 'Company-specific system credentials'}
                  {resourceType === 'app_integration' && 'Application-specific integration credentials'}
                </p>
              </div>

              {resourceType === 'company_system' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <CompanySelector
                    value={companyId}
                    onValueChange={setCompanyId}
                    placeholder="Velg selskap..."
                  />
                </div>
              )}

              {resourceType === 'app_integration' && (
                <div className="space-y-2">
                  <Label htmlFor="application">Application *</Label>
                  <ApplicationSelector
                    tenantId={tenantId}
                    value={applicationId}
                    onValueChange={setApplicationId}
                    placeholder="Velg applikasjon..."
                  />
                </div>
              )}

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
