import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ExternalSystemDialogProps {
  tenantId: string;
  system: any;
  onClose: () => void;
}

export function ExternalSystemDialog({ tenantId, system, onClose }: ExternalSystemDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(system.mcp_enabled || false);
  const [selectedAdapter, setSelectedAdapter] = useState(system.mcp_adapter_id || "");

  // Fetch available MCP adapters
  const { data: mcpAdapters } = useQuery({
    queryKey: ["mcp-adapters", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_integrations")
        .select("adapter_id, is_active")
        .eq("tenant_id", tenantId)
        .like("adapter_id", "%-mcp")
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (mcpEnabled && !selectedAdapter) {
      toast.error("Velg en MCP adapter når MCP er aktivert");
      return;
    }

    setIsSaving(true);
    try {
      // Use raw query since tenant_external_systems is not in generated types yet
      const { error } = await supabase
        .rpc('execute_sql' as any, {
          query: `
            UPDATE tenant_external_systems
            SET mcp_enabled = $1, mcp_adapter_id = $2
            WHERE id = $3
          `,
          params: [mcpEnabled, mcpEnabled ? selectedAdapter : null, system.id]
        });

      if (error) {
        // Fallback: use direct query
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tenant_external_systems?id=eq.${system.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            mcp_enabled: mcpEnabled,
            mcp_adapter_id: mcpEnabled ? selectedAdapter : null,
          })
        });

        if (!response.ok) throw new Error('Failed to update');
      }

      toast.success("Eksternt system oppdatert");
      onClose();
    } catch (error: any) {
      console.error("Error updating external system:", error);
      toast.error("Kunne ikke oppdatere eksternt system");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfigurer MCP for {system.external_system?.name}</DialogTitle>
          <DialogDescription>
            Koble dette systemet til en MCP adapter for automatiseringer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mcp_enabled">Aktiver MCP</Label>
              <p className="text-xs text-muted-foreground">
                Koble til via Model Context Protocol
              </p>
            </div>
            <Switch
              id="mcp_enabled"
              checked={mcpEnabled}
              onCheckedChange={setMcpEnabled}
            />
          </div>

          {mcpEnabled && (
            <div className="space-y-2">
              <Label htmlFor="adapter">MCP Adapter</Label>
              <Select value={selectedAdapter} onValueChange={setSelectedAdapter}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg MCP adapter" />
                </SelectTrigger>
                <SelectContent>
                  {mcpAdapters?.map((adapter) => (
                    <SelectItem key={adapter.adapter_id} value={adapter.adapter_id}>
                      {adapter.adapter_id.replace("-mcp", "").toUpperCase()}
                    </SelectItem>
                  ))}
                  {(!mcpAdapters || mcpAdapters.length === 0) && (
                    <SelectItem value="none" disabled>
                      Ingen aktive MCP adapters
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Må først konfigurere en MCP adapter i MCP Providers-fanen
              </p>
            </div>
          )}
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
