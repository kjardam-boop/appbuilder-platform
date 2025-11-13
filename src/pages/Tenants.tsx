import { useState, useEffect } from "react";
import { Search, Plus, Users, Layers, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import CompanySelector from "@/modules/core/company/components/CompanySelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useAuth } from "@/modules/core/user";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
  user_count?: number;
  company_name?: string;
}

export default function Tenants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { isPlatformAdmin, isLoading: isCheckingAdmin } = usePlatformAdmin();
  const { user } = useAuth();

  useEffect(() => {
    if (isPlatformAdmin) {
      loadTenants();
    }
  }, [isPlatformAdmin]);

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants_list_view' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants((data as any[]) || []);
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      toast({
        title: "Feil ved lasting av tenants",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Velg et selskap",
        description: "Du må velge et selskap for å opprette en tenant",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', selectedCompanyId)
        .single();

      if (companyError) throw companyError;

      // Call edge function to create tenant
      const { data, error } = await supabase.functions.invoke('create-tenant-onboarding', {
        body: {
          user_id: user?.id,
          email: user?.email,
          company_name: company.name,
          company_id: company.id,
        },
      });

      if (error) throw error;

      toast({
        title: "Tenant opprettet",
        description: `Tenant for ${company.name} er nå opprettet`,
      });

      setIsDialogOpen(false);
      setSelectedCompanyId("");
      loadTenants();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Feil ved opprettelse av tenant",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCheckingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Ingen tilgang</h2>
              <p className="text-muted-foreground">
                Du har ikke tilgang til denne siden. Kun platform-administratorer kan administrere tenants.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <AppBreadcrumbs levels={[
        { label: "Admin", href: "/admin" },
        { label: "Tenant-administrasjon" }
      ]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant-administrasjon</h1>
          <p className="text-muted-foreground">Administrer alle kundetilganger i plattformen</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ny Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett ny tenant</DialogTitle>
              <DialogDescription>
                Velg et eksisterende selskap for å opprette en tenant. Tenanten vil få sin egen instans av plattformen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Velg selskap</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsCompanySelectorOpen(true)}
                >
                  {selectedCompanyId ? "Selskap valgt" : "Klikk for å velge selskap"}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreating}
              >
                Avbryt
              </Button>
              <Button
                onClick={handleCreateTenant}
                disabled={isCreating || !selectedCompanyId}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Oppretter...
                  </>
                ) : (
                  "Opprett tenant"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CompanySelector
        open={isCompanySelectorOpen}
        onOpenChange={setIsCompanySelectorOpen}
        onSelect={(companyId) => {
          setSelectedCompanyId(companyId);
          setIsCompanySelectorOpen(false);
        }}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk etter tenant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Ingen tenants funnet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <Card 
              key={tenant.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/admin/tenants/${tenant.id}`}
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{tenant.name}</h3>
                      {tenant.company_name && (
                        <p className="text-sm text-muted-foreground">{tenant.company_name}</p>
                      )}
                    </div>
                    <Badge
                      variant={tenant.status === "active" ? "default" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {tenant.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{tenant.domain || tenant.slug}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{tenant.user_count || 0} {tenant.user_count === 1 ? 'bruker' : 'brukere'}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Opprettet: {new Date(tenant.created_at).toLocaleDateString('nb-NO')}
                    </div>
                    <Badge
                      variant={tenant.plan === "enterprise" ? "default" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {tenant.plan}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
