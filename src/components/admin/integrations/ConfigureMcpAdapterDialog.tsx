import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ConfigureMcpAdapterDialogProps {
  tenantId: string;
  adapter: any;
  onClose: () => void;
}

export function ConfigureMcpAdapterDialog({ tenantId, adapter, onClose }: ConfigureMcpAdapterDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    adapter_id: adapter.adapter_id || "",
    baseUrl: adapter.credentials?.baseUrl || "",
    apiKey: adapter.credentials?.apiKey || "",
    webhookSecret: adapter.credentials?.webhookSecret || "",
    requestsPerMinute: adapter.rate_limit?.requests_per_minute || 60,
    requestsPerHour: adapter.rate_limit?.requests_per_hour || 1000,
    is_active: adapter.is_active ?? true,
  });

  const handleSave = async () => {
    if (!formData.adapter_id.endsWith("-mcp")) {
      toast.error("Adapter ID må ende med '-mcp'");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        adapter_id: formData.adapter_id,
        config: {
          description: `MCP adapter for ${formData.adapter_id.replace("-mcp", "")}`,
        },
        credentials: {
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          webhookSecret: formData.webhookSecret,
        },
        rate_limit: {
          requests_per_minute: formData.requestsPerMinute,
          requests_per_hour: formData.requestsPerHour,
        },
        is_active: formData.is_active,
      };

      const { error } = await supabase
        .from("tenant_integrations")
        .upsert(payload, { onConflict: "tenant_id,adapter_id" });

      if (error) throw error;

      toast.success("MCP adapter lagret");
      onClose();
    } catch (error: any) {
      console.error("Error saving MCP adapter:", error);
      toast.error("Kunne ikke lagre MCP adapter");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {adapter.id ? "Rediger MCP Adapter" : "Ny MCP Adapter"}
          </DialogTitle>
          <DialogDescription>
            Konfigurer MCP adapter for integrasjon med eksterne workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="adapter_id">Adapter ID</Label>
            <Input
              id="adapter_id"
              placeholder="n8n-mcp"
              value={formData.adapter_id}
              onChange={(e) => setFormData({ ...formData, adapter_id: e.target.value })}
              disabled={!!adapter.id}
            />
            <p className="text-xs text-muted-foreground">
              Må ende med '-mcp' (f.eks. n8n-mcp, make-mcp)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://n8n.example.com"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="••••••••"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Signing Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder="••••••••"
              value={formData.webhookSecret}
              onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestsPerMinute">Requests per minute</Label>
              <Input
                id="requestsPerMinute"
                type="number"
                value={formData.requestsPerMinute}
                onChange={(e) => setFormData({ ...formData, requestsPerMinute: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestsPerHour">Requests per hour</Label>
              <Input
                id="requestsPerHour"
                type="number"
                value={formData.requestsPerHour}
                onChange={(e) => setFormData({ ...formData, requestsPerHour: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Aktiv</Label>
              <p className="text-xs text-muted-foreground">
                Aktiver eller deaktiver denne adapteren
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
