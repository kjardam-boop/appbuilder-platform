/**
 * Integration Secrets Tab
 * Manages API keys stored in mcp_tenant_secret (renamed conceptually to integration secrets)
 * Moved from /admin/mcp/secrets to consolidate credentials management
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  KeyRound, 
  RefreshCw, 
  Shield,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IntegrationSecret {
  id: string;
  key: string;
  provider: string;
  tenant_id?: string;
  is_active: boolean;
  created_at: string;
  rotated_at?: string;
  expires_at?: string;
  created_by: string;
}

interface Props {
  tenantId: string;
}

const PROVIDERS = [
  { value: 'n8n', label: 'n8n Automation' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'notion', label: 'Notion' },
  { value: 'slack', label: 'Slack' },
  { value: 'other', label: 'Other' },
];

export function IntegrationSecretsTab({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevealDialog, setShowRevealDialog] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [newSecretProvider, setNewSecretProvider] = useState("n8n");

  // Fetch secrets from mcp_tenant_secret
  const { data: secrets, isLoading } = useQuery({
    queryKey: ["integration-secrets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_secrets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as IntegrationSecret[];
    },
    enabled: !!tenantId,
  });

  // Create secret
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("integration_secrets")
        .insert({
          tenant_id: tenantId,
          key: newSecretKey,
          value: newSecretValue, // In production, this should be encrypted
          provider: newSecretProvider,
          is_active: true,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowCreateDialog(false);
      setNewSecretKey("");
      setNewSecretValue("");
      setNewSecretProvider("n8n");
      queryClient.invalidateQueries({ queryKey: ["integration-secrets"] });
      toast.success("Secret opprettet");
    },
    onError: (error) => {
      toast.error("Feil ved opprettelse", { description: (error as Error).message });
    },
  });

  // Deactivate secret
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integration_secrets")
        .update({ is_active: false })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      setDeactivateId(null);
      queryClient.invalidateQueries({ queryKey: ["integration-secrets"] });
      toast.success("Secret deaktivert");
    },
    onError: (error) => {
      toast.error("Feil", { description: (error as Error).message });
    },
  });

  // Delete secret
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integration_secrets")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-secrets"] });
      toast.success("Secret slettet");
    },
    onError: (error) => {
      toast.error("Feil", { description: (error as Error).message });
    },
  });

  const activeSecrets = secrets?.filter(s => s.is_active) || [];
  const inactiveSecrets = secrets?.filter(s => !s.is_active) || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert til utklippstavle");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integration Secrets</h3>
          <p className="text-sm text-muted-foreground">
            API-nøkler for integrasjoner (n8n, AI providers, etc.)
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ny secret
        </Button>
      </div>

      {/* Active Secrets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Aktive secrets ({activeSecrets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeSecrets.length === 0 ? (
            <div className="text-center py-8">
              <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen aktive secrets</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Opprett første secret
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSecrets.map((secret) => (
                  <TableRow key={secret.id}>
                    <TableCell className="font-mono text-sm">
                      {secret.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{secret.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(secret.created_at).toLocaleDateString('nb-NO')}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeactivateId(secret.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inactive Secrets */}
      {inactiveSecrets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Inaktive secrets ({inactiveSecrets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Deaktivert</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveSecrets.map((secret) => (
                  <TableRow key={secret.id} className="opacity-60">
                    <TableCell className="font-mono text-sm">
                      {secret.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{secret.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {secret.rotated_at 
                        ? new Date(secret.rotated_at).toLocaleDateString('nb-NO')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(secret.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opprett ny secret</DialogTitle>
            <DialogDescription>
              Legg til en ny API-nøkkel eller secret for en integrasjon
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={newSecretProvider} onValueChange={setNewSecretProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Key (navn på secret)</Label>
              <Input
                placeholder="f.eks. N8N_API_KEY_APPBUILDER_PLATFORM"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Verdi</Label>
              <div className="flex gap-2">
                <Input
                  type={secretVisible ? "text" : "password"}
                  placeholder="API key eller secret"
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSecretVisible(!secretVisible)}
                >
                  {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={!newSecretKey || !newSecretValue || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiver secret?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen vil deaktivere secret. Integrasjoner som bruker denne vil slutte å fungere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}
              className="bg-destructive text-destructive-foreground"
            >
              Deaktiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

