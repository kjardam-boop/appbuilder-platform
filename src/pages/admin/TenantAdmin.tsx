import { useState } from "react";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  slug: string | null;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export default function TenantAdmin() {
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isPlatformAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async (tenant: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update({
          name: tenant.name,
          domain: tenant.domain,
          slug: tenant.slug,
          settings: tenant.settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast({ title: "Tenant oppdatert" });
      setEditingId(null);
    },
    onError: (error) => {
      toast({ 
        title: "Feil ved oppdatering", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tenant: Omit<Tenant, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          name: tenant.name,
          domain: tenant.domain,
          slug: tenant.slug,
          settings: tenant.settings || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast({ title: "Tenant opprettet" });
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Feil ved opprettelse", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Laster...</div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Admin</h1>
          <p className="text-muted-foreground">Administrer tenants, domener og innstillinger</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ny Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett ny tenant</DialogTitle>
              <DialogDescription>
                Fyll inn informasjon for den nye tenanten
              </DialogDescription>
            </DialogHeader>
            <TenantForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {tenantsLoading ? (
        <div className="text-center py-8">Laster tenants...</div>
      ) : (
        <div className="grid gap-4">
          {tenants?.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tenant.name}</CardTitle>
                    <CardDescription>
                      ID: {tenant.id}
                    </CardDescription>
                  </div>
                  {editingId === tenant.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(tenant.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingId === tenant.id ? (
                  <TenantForm
                    tenant={tenant}
                    onSubmit={(data) => updateMutation.mutate({ ...data, id: tenant.id })}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="space-y-2">
                    <div>
                      <strong>Domain:</strong> {tenant.domain || <em>Ikke satt</em>}
                    </div>
                    <div>
                      <strong>Slug:</strong> {tenant.slug || <em>Ikke satt</em>}
                    </div>
                    <div>
                      <strong>Opprettet:</strong>{" "}
                      {new Date(tenant.created_at).toLocaleString("nb-NO")}
                    </div>
                    <div>
                      <strong>Oppdatert:</strong>{" "}
                      {new Date(tenant.updated_at).toLocaleString("nb-NO")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function TenantForm({ tenant, onSubmit, onCancel }: TenantFormProps) {
  const [name, setName] = useState(tenant?.name || "");
  const [domain, setDomain] = useState(tenant?.domain || "");
  const [slug, setSlug] = useState(tenant?.slug || "");
  const [settingsJson, setSettingsJson] = useState(
    JSON.stringify(tenant?.settings || {}, null, 2)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let settings = {};
    try {
      settings = JSON.parse(settingsJson);
    } catch {
      settings = {};
    }

    onSubmit({
      name,
      domain: domain.trim() || null,
      slug: slug.trim() || null,
      settings,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="domain">Domain (valgfri)</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="customer.com"
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug (valgfri)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="customer-slug"
        />
      </div>
      <div>
        <Label htmlFor="settings">Settings (JSON)</Label>
        <Textarea
          id="settings"
          value={settingsJson}
          onChange={(e) => setSettingsJson(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Lagre
        </Button>
      </div>
    </form>
  );
}
