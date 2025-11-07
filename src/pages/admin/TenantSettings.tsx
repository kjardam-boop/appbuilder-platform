import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Navigate } from "react-router-dom";

interface TenantData {
  id: string;
  name: string;
  slug: string | null;
  domain: string | null;
  status: string;
  plan: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export default function TenantSettings() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isPlatformAdmin, isLoading: isCheckingAdmin } = usePlatformAdmin();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [slug, setSlug] = useState("");
  const [settingsJson, setSettingsJson] = useState("");

  useEffect(() => {
    loadTenant();
  }, [tenantId]);

  const loadTenant = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      setTenant(data);
      setName(data.name);
      setDomain(data.domain || "");
      setSlug(data.slug || "");
      setSettingsJson(JSON.stringify(data.settings || {}, null, 2));
    } catch (error: any) {
      console.error("Error loading tenant:", error);
      toast.error("Kunne ikke laste tenant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let settings = {};
      try {
        settings = JSON.parse(settingsJson);
      } catch {
        toast.error("Ugyldig JSON i Settings-feltet");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("tenants")
        .update({
          name,
          domain: domain.trim() || null,
          slug: slug.trim() || null,
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

      if (error) throw error;

      toast.success("Tenant oppdatert");
      navigate(`/admin/tenants/${tenantId}`);
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      toast.error("Kunne ikke oppdatere tenant");
    } finally {
      setIsSaving(false);
    }
  };

  if (isCheckingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!tenant) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tenant ikke funnet</h2>
            <p className="text-muted-foreground mb-4">
              Kunne ikke finne tenant med ID: {tenantId}
            </p>
            <Button asChild>
              <Link to="/admin/tenants">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake til oversikt
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <AppBreadcrumbs levels={[
        { label: "Admin", href: "/admin" },
        { label: "Tenants", href: "/admin/tenants" },
        { label: tenant.name, href: `/admin/tenants/${tenantId}` },
        { label: "Innstillinger" }
      ]} />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/admin/tenants/${tenantId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Tenant-innstillinger</h1>
          <p className="text-muted-foreground">{tenant.name}</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Generelle innstillinger</CardTitle>
            <CardDescription>
              Rediger tenant-detaljer, domene og konfigurasjoner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tenant navn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain (valgfri)</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="customer.com"
              />
              <p className="text-sm text-muted-foreground">
                Egendefinert domene for tenanten
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (valgfri)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="customer-slug"
              />
              <p className="text-sm text-muted-foreground">
                Brukes for subdomene (f.eks. customer-slug.lovable.app)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings">Settings (JSON)</Label>
              <Textarea
                id="settings"
                value={settingsJson}
                onChange={(e) => setSettingsJson(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder='{"key": "value"}'
              />
              <p className="text-sm text-muted-foreground">
                Avanserte innstillinger i JSON-format
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/tenants/${tenantId}`)}
                disabled={isSaving}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lagre endringer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
