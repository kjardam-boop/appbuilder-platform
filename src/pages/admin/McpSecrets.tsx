import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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
  EyeOff
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface McpSecret {
  id: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  rotated_at?: string;
  expires_at?: string;
  created_by: string;
}

interface HealthData {
  active: boolean;
  expires_in_days: number | null;
  warnings: string[];
}

export default function McpSecrets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [provider] = useState("n8n");
  const [revealToken, setRevealToken] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  
  // Test states
  const [testPayload, setTestPayload] = useState("");
  const [testSignature, setTestSignature] = useState("");

  // Fetch secrets
  const { data: secretsData } = useQuery({
    queryKey: ["mcp-secrets", provider],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets?provider=${provider}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "X-Request-Id": crypto.randomUUID(),
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch secrets");
      return response.json();
    },
  });

  // Fetch health
  const { data: healthData } = useQuery({
    queryKey: ["mcp-secrets-health", provider],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/health?provider=${provider}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "X-Request-Id": crypto.randomUUID(),
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch health");
      const result = await response.json();
      return result.data as HealthData;
    },
  });

  // Create secret
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({ provider }),
        }
      );
      if (!response.ok) throw new Error("Failed to create secret");
      return response.json();
    },
    onSuccess: (data) => {
      setRevealToken(data.meta.reveal_once_token);
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets-health"] });
      toast({ title: "Secret created", description: "Reveal it now - you won't see it again!" });
    },
  });

  // Rotate secret
  const rotateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/rotate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({ provider }),
        }
      );
      if (!response.ok) throw new Error("Failed to rotate secret");
      return response.json();
    },
    onSuccess: (data) => {
      setRevealToken(data.meta.reveal_once_token);
      setShowRotateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets-health"] });
      toast({ title: "Secret rotated", description: "Old secret will expire in 60 days" });
    },
  });

  // Deactivate secret
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/${id}/deactivate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "X-Request-Id": crypto.randomUUID(),
          },
        }
      );
      if (!response.ok) throw new Error("Failed to deactivate secret");
      return response.json();
    },
    onSuccess: () => {
      setDeactivateId(null);
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets"] });
      queryClient.invalidateQueries({ queryKey: ["mcp-secrets-health"] });
      toast({ title: "Secret deactivated" });
    },
  });

  // Reveal secret
  const revealMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/reveal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({ token }),
        }
      );
      if (!response.ok) throw new Error("Token expired or invalid");
      return response.json();
    },
    onSuccess: (data) => {
      setRevealedSecret(data.data.secret);
      setTimeout(() => {
        setRevealedSecret(null);
        setRevealToken(null);
      }, 30000); // Auto-hide after 30s
    },
  });

  // Test ping
  const pingMutation = useMutation({
    mutationFn: async (workflow_key: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/test/ping`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({ provider, workflow_key }),
        }
      );
      if (!response.ok) throw new Error("Ping test failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ping successful",
        description: `HTTP ${data.data.http_status} in ${data.data.latency_ms}ms`,
      });
    },
  });

  // Test verify
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-mcp-secrets/test/verify-callback`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
            "X-Request-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({ payload: testPayload, signature: testSignature, provider }),
        }
      );
      if (!response.ok) throw new Error("Verification failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.data.valid ? "Valid signature" : "Invalid signature",
        variant: data.data.valid ? "default" : "destructive",
      });
    },
  });

  const secrets = secretsData?.data || [];
  const activeSecret = secrets.find((s: McpSecret) => s.is_active);

  const getExpiryBadge = (expiresInDays: number | null) => {
    if (expiresInDays === null) return null;
    if (expiresInDays > 30) return <Badge variant="outline" className="bg-green-500/10 text-green-700">Expires in {expiresInDays}d</Badge>;
    if (expiresInDays > 14) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Expires in {expiresInDays}d</Badge>;
    return <Badge variant="destructive">Expires in {expiresInDays}d</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">MCP Secrets</h1>
        <p className="text-muted-foreground">
          Manage HMAC signing secrets for integration webhooks
        </p>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Provider: {provider}
          </CardTitle>
          <CardDescription>Security status and warnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {healthData?.active ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Not configured
              </Badge>
            )}
            {healthData?.expires_in_days && getExpiryBadge(healthData.expires_in_days)}
          </div>

          {healthData?.warnings && healthData.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc ml-4">
                  {healthData.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)} disabled={!!activeSecret}>
              <KeyRound className="h-4 w-4 mr-2" />
              Create Secret
            </Button>
            <Button variant="outline" onClick={() => setShowRotateDialog(true)} disabled={!activeSecret}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rotate Secret
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secrets List */}
      <Card>
        <CardHeader>
          <CardTitle>Secret History</CardTitle>
          <CardDescription>Active and inactive secrets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Rotated</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((secret: McpSecret) => (
                <TableRow key={secret.id}>
                  <TableCell>{new Date(secret.created_at).toLocaleString()}</TableCell>
                  <TableCell>{secret.rotated_at ? new Date(secret.rotated_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{secret.expires_at ? new Date(secret.expires_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    {secret.is_active ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {secret.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeactivateId(secret.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Testing Tools */}
      <Tabs defaultValue="ping">
        <TabsList>
          <TabsTrigger value="ping">Signed Ping Test</TabsTrigger>
          <TabsTrigger value="verify">Callback Verifier</TabsTrigger>
        </TabsList>
        <TabsContent value="ping">
          <Card>
            <CardHeader>
              <CardTitle>Test Signed Ping</CardTitle>
              <CardDescription>Send a signed test request to verify outbound signing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => pingMutation.mutate("test")} disabled={!activeSecret}>
                Send Test Ping
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Verify Callback Signature</CardTitle>
              <CardDescription>Test inbound webhook signature validation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payload (JSON)</Label>
                <Textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  placeholder='{"result": "ok"}'
                />
              </div>
              <div>
                <Label>X-MCP-Signature</Label>
                <Input
                  value={testSignature}
                  onChange={(e) => setTestSignature(e.target.value)}
                  placeholder="hex signature"
                />
              </div>
              <Button onClick={() => verifyMutation.mutate()} disabled={!activeSecret || !testPayload || !testSignature}>
                Verify Signature
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reveal Token Dialog */}
      {revealToken && (
        <Dialog open={!!revealToken} onOpenChange={() => setRevealToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Secret Created - Reveal Once
              </DialogTitle>
              <DialogDescription>
                This is your only chance to view this secret. It will auto-hide after 30 seconds or after one view.
              </DialogDescription>
            </DialogHeader>
            {revealedSecret ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                  {revealedSecret}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedSecret);
                    toast({ title: "Copied to clipboard" });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Secret
                </Button>
              </div>
            ) : (
              <Button onClick={() => revealMutation.mutate(revealToken)}>
                <Eye className="h-4 w-4 mr-2" />
                Reveal Secret
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new HMAC signing secret for {provider}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => createMutation.mutate()}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the current secret and create a new one. The old secret will remain valid for 60 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => rotateMutation.mutate()}>Rotate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Dialog */}
      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately deactivate this secret. Any webhooks using it will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
