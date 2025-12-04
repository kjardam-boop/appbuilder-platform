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
import { Eye, EyeOff, Key, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Predefined credential templates
const CREDENTIAL_TEMPLATES = {
  'n8n-mcp': {
    name: 'n8n MCP',
    description: 'n8n Model Context Protocol credentials for AI workflow triggers',
    fields: ['server_url', 'access_token'],
    defaultUrl: 'https://jardam.app.n8n.cloud/mcp-server/http',
  },
  'n8n-api': {
    name: 'n8n API',
    description: 'n8n REST API credentials for workflow sync',
    fields: ['server_url', 'api_key'],
    defaultUrl: 'https://jardam.app.n8n.cloud',
  },
  'openai': {
    name: 'OpenAI',
    description: 'OpenAI API credentials',
    fields: ['api_key'],
  },
  'custom': {
    name: 'Custom',
    description: 'Custom API key or secret',
    fields: ['secret'],
  },
} as const;

type CredentialTemplate = keyof typeof CREDENTIAL_TEMPLATES;
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
  const [template, setTemplate] = useState<CredentialTemplate>('custom');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = !!existingVaultSecretId;
  const currentTemplate = CREDENTIAL_TEMPLATES[template];

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
      setTemplate('custom');
      setName("");
      setDescription("");
      setServerUrl("");
      setSecret("");
      setShowSecret(false);
    }
  }, [open, metadata, context?.tenant_id]);

  // Update fields when template changes
  useEffect(() => {
    if (template !== 'custom') {
      const tpl = CREDENTIAL_TEMPLATES[template];
      setName(tpl.name);
      setDescription(tpl.description);
      if ('defaultUrl' in tpl && tpl.defaultUrl) {
        setServerUrl(tpl.defaultUrl);
      }
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim() || !secret.trim()) {
      toast.error("Name and secret are required");
      return;
    }

    // Validate server URL for templates that require it
    const needsUrl = currentTemplate.fields.includes('server_url');
    if (needsUrl && !serverUrl.trim()) {
      toast.error("Server URL is required");
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

      // Build the secret value - for templates with URL, store as JSON
      let secretValue = secret;
      if (needsUrl) {
        secretValue = JSON.stringify({
          server_url: serverUrl.trim(),
          [currentTemplate.fields.includes('access_token') ? 'access_token' : 'api_key']: secret,
        });
      }

      const credentialMetadata: CredentialMetadata = {
        tenant_id: tenantId,
        resource_type: resourceType,
        resource_id: resourceId,
      };

      // Add template info to description
      const fullDescription = template !== 'custom' 
        ? `[${template}] ${description}`.trim()
        : description;

      if (isEdit && existingVaultSecretId) {
        // Update existing credential
        await updateVaultCredential(existingVaultSecretId, secretValue, credentialMetadata);
        vaultSecretId = existingVaultSecretId;
        toast.success("Credential updated successfully");
      } else {
        // Create new credential
        vaultSecretId = await createVaultCredential(name, secretValue, fullDescription, credentialMetadata);
        
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
                    tenantId={tenantId}
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
                <Label htmlFor="template">Credential Template</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as CredentialTemplate)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n8n-mcp">n8n MCP (AI workflow triggers)</SelectItem>
                    <SelectItem value="n8n-api">n8n API (workflow sync)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {template === 'n8n-mcp' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-xs">
                    <strong>n8n MCP</strong> lar AI trigge workflows via Model Context Protocol. 
                    Hent Access Token fra n8n under Settings → API → MCP Access Tokens.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., HubSpot API Key"
                  disabled={isSaving || template !== 'custom'}
                />
              </div>

              {currentTemplate.fields.includes('server_url') && (
                <div className="space-y-2">
                  <Label htmlFor="serverUrl">Server URL *</Label>
                  <Input
                    id="serverUrl"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://your-n8n.app.n8n.cloud/mcp-server/http"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">
                    {template === 'n8n-mcp' && 'Full MCP endpoint URL from n8n'}
                    {template === 'n8n-api' && 'Base URL for n8n API'}
                  </p>
                </div>
              )}

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
              {isEdit ? "New Secret Value *" : (
                currentTemplate.fields.includes('access_token') ? "Access Token *" :
                currentTemplate.fields.includes('api_key') ? "API Key *" :
                "Secret Value *"
              )}
            </Label>
            <div className="relative">
              <Input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={
                  currentTemplate.fields.includes('access_token') ? "Enter MCP access token..." :
                  currentTemplate.fields.includes('api_key') ? "Enter API key..." :
                  "Enter API key or secret..."
                }
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
