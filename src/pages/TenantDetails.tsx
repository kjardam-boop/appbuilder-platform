import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, 
  Building2, 
  Globe, 
  ExternalLink, 
  Eye,
  Loader2,
  AlertCircle,
  Users,
  Package,
  Settings,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
  settings: any;
}

interface CompanyData {
  id: string;
  name: string;
  org_number: string | null;
  website: string | null;
}

interface AppProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  subdomain: string | null;
  created_at: string;
  selected_capabilities: any;
  deployed_to_preview_at: string | null;
  deployed_to_production_at: string | null;
}

interface TenantUser {
  user_id: string;
  role: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

interface TenantApplication {
  id: string;
  app_definition_id: string;
  is_active: boolean;
  installed_at: string;
  app_definitions: {
    name: string;
    key: string;
    icon_name: string;
  };
}

export default function TenantDetails() {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [appProjects, setAppProjects] = useState<AppProject[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantApplications, setTenantApplications] = useState<TenantApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTenantDetails();
  }, [tenantId]);

  const loadTenantDetails = async () => {
    if (!tenantId) return;

    try {
      // Load tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Load company from settings if linked
      const settings = tenantData.settings as any;
      const companyId = settings?.company_id;
      if (companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, org_number, website')
          .eq('id', companyId)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);
      }

      // Load customer app projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('customer_app_projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setAppProjects(projectsData || []);

      // Load tenant users with roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('scope_type', 'tenant')
        .eq('scope_id', tenantId);

      if (rolesError) throw rolesError;

      // Get unique user IDs
      const userIds = [...new Set(rolesData?.map(r => r.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine roles with profiles
        const usersWithProfiles = rolesData?.map(role => {
          const profile = profilesData?.find(p => p.user_id === role.user_id);
          return {
            user_id: role.user_id,
            role: role.role,
            profiles: profile ? {
              email: profile.email || '',
              full_name: profile.full_name
            } : {
              email: '',
              full_name: null
            }
          };
        }) || [];
        
        setTenantUsers(usersWithProfiles);
      }

      // Load tenant applications
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          app_definition_id,
          is_active,
          installed_at,
          app_definitions (
            name,
            key,
            icon_name
          )
        `)
        .eq('tenant_id', tenantId);

      if (appsError) throw appsError;
      setTenantApplications(appsData || []);

    } catch (error: any) {
      console.error('Error loading tenant details:', error);
      toast.error("Kunne ikke laste tenant-detaljer");
    } finally {
      setIsLoading(false);
    }
  };

  const getPreviewUrl = (project: AppProject) => {
    if (project.subdomain) {
      return `https://${project.subdomain}-preview.lovableproject.com`;
    }
    return null;
  };

  const getProductionUrl = (project: AppProject) => {
    if (project.subdomain) {
      return `https://${project.subdomain}.lovableproject.com`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
      <AppBreadcrumbs customLabel={tenant.name} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/tenants">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                {tenant.status}
              </Badge>
              <Badge variant={tenant.plan === "enterprise" ? "default" : "outline"}>
                {tenant.plan}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {tenant.domain || tenant.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/admin/tenants/${tenantId}/apps`}>
              <Package className="mr-2 h-4 w-4" />
              Administrer Apps
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/admin/tenants/${tenantId}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Innstillinger
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="applications">Applikasjoner</TabsTrigger>
          <TabsTrigger value="users">Brukere</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tenant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tenant-informasjon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Slug</div>
                  <div className="mt-1">{tenant.slug}</div>
                </div>
                {tenant.domain && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Domene</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {tenant.domain}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Opprettet</div>
                  <div className="mt-1">
                    {new Date(tenant.created_at).toLocaleDateString('nb-NO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Plan</div>
                  <div className="mt-1">
                    <Badge variant={tenant.plan === "enterprise" ? "default" : "outline"}>
                      {tenant.plan}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            {company && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Tilknyttet selskap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Navn</div>
                    <div className="mt-1">
                      <Link 
                        to={`/companies/${company.id}`}
                        className="hover:underline text-primary"
                      >
                        {company.name}
                      </Link>
                    </div>
                  </div>
                  {company.org_number && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Org.nr</div>
                      <div className="mt-1">{company.org_number}</div>
                    </div>
                  )}
                  {company.website && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Nettside</div>
                      <div className="mt-1">
                        <a 
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          {company.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applikasjoner</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{appProjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  {appProjects.filter(p => p.status === 'active').length} aktive
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brukere</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenantUsers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {tenantUsers.filter(u => u.role.includes('admin')).length} administratorer
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Applikasjoner</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenantApplications.length}</div>
                <p className="text-xs text-muted-foreground">
                  {tenantApplications.filter(a => a.is_active).length} aktive globale apps
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Kundetilpassede Applikasjoner</h2>
              <p className="text-muted-foreground">Kundespesifikke applikasjoner bygget for denne tenanten (customer_app_projects)</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ny applikasjon
            </Button>
          </div>

          {appProjects.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ingen applikasjoner</h3>
                <p className="text-muted-foreground mb-4">
                  Denne tenanten har ingen applikasjoner ennå
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Opprett første applikasjon
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {appProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>
                          {project.description || "Ingen beskrivelse"}
                        </CardDescription>
                      </div>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {project.subdomain && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Subdomain</div>
                        <div className="text-sm text-muted-foreground">{project.subdomain}</div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex gap-2">
                      {project.deployed_to_preview_at && getPreviewUrl(project) && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={getPreviewUrl(project)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {project.deployed_to_production_at && getProductionUrl(project) && (
                        <Button size="sm" asChild>
                          <a
                            href={getProductionUrl(project)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <Globe className="h-4 w-4" />
                            Live
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {/* Internal preview link for POC */}
                      {project.subdomain === 'jul25-agj' && (
                        <Button size="sm" variant="secondary" asChild>
                          <Link to="/apps/jul25" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Åpne app
                          </Link>
                        </Button>
                      )}
                    </div>

                    {project.selected_capabilities && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Capabilities</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(project.selected_capabilities) 
                            ? project.selected_capabilities.map((cap: any, idx: number) => (
                                <Badge key={idx} variant="outline">
                                  {typeof cap === 'string' ? cap : cap.key || cap.name}
                                </Badge>
                              ))
                            : <span className="text-xs text-muted-foreground">Ingen capabilities valgt</span>
                          }
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Opprettet: {new Date(project.created_at).toLocaleDateString('nb-NO')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Brukere</h2>
              <p className="text-muted-foreground">Brukere med tilgang til denne tenanten</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Inviter bruker
            </Button>
          </div>

          {tenantUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ingen brukere</h3>
                <p className="text-muted-foreground mb-4">
                  Denne tenanten har ingen brukere ennå
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Inviter første bruker
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {tenantUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.profiles?.full_name || 'Ikke angitt'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.profiles?.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
