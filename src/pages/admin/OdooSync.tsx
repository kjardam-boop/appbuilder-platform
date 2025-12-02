import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Check, 
  X, 
  Building2, 
  ArrowRight, 
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Company {
  id: string;
  name: string;
  org_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  odoo_partner_id: number | null;
  odoo_synced_at: string | null;
}

interface SyncResult {
  companyId: string;
  companyName: string;
  odooId: number;
  action: string;
  success: boolean;
  error?: string;
}

export default function OdooSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[] | null>(null);

  // Fetch companies
  const { data: companies, isLoading, error: fetchError } = useQuery({
    queryKey: ["companies-odoo-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number, website, odoo_partner_id, odoo_synced_at")
        .order("name");

      if (error) throw error;
      
      // Map to expected format with null defaults for missing fields
      return (data || []).map(c => ({
        ...c,
        email: null,
        phone: null,
        address: null,
        city: null,
        postal_code: null,
      })) as Company[];
    },
  });

  // n8n webhook URL for Odoo sync
  const N8N_WEBHOOK_URL = "https://jardam.app.n8n.cloud/webhook/sync-odoo";

  // Sync mutation - calls n8n via Edge Function proxy (avoids CORS)
  // Syncs companies ONE BY ONE to ensure each is processed correctly
  const syncMutation = useMutation({
    mutationFn: async (companyIds: string[]) => {
      // Fetch selected companies with extended fields
      const { data: companiesData, error: fetchError } = await supabase
        .from("companies")
        .select(`
          id, name, org_number, website, odoo_partner_id,
          slug, org_form, industry_code, industry_description,
          employees, company_roles, segment,
          company_metadata (notes, priority_level)
        `)
        .in("id", companyIds);

      if (fetchError) throw fetchError;
      if (!companiesData || companiesData.length === 0) {
        return { success: true, synced: 0, failed: 0, results: [] };
      }

      const allResults: SyncResult[] = [];
      let synced = 0;
      let failed = 0;

      // Process each company individually
      for (const company of companiesData) {
        try {
          console.log(`[OdooSync] Syncing company: ${company.name}`);
          
          // Call n8n for this single company
          const { data, error } = await supabase.functions.invoke("n8n-proxy", {
            body: {
              webhook: N8N_WEBHOOK_URL,
              data: {
                action: "sync",
                companies: [company], // Send one at a time
              },
            },
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error || "Sync failed");
          
          // Process result
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            console.log(`[OdooSync] Result for ${company.name}:`, result);
            
            if (result.success && result.odooId) {
              // Update local database with Odoo ID and CRM status
              const { error: updateError } = await supabase
                .from("companies")
                .update({ 
                  odoo_partner_id: result.odooId,
                  odoo_synced_at: new Date().toISOString(),
                  crm_status: "in_odoo"  // Mark as synced to Odoo CRM
                })
                .eq("id", company.id);
              
              if (updateError) {
                console.error(`[OdooSync] Failed to update ${company.name}:`, updateError);
                allResults.push({
                  companyId: company.id,
                  companyName: company.name,
                  odooId: result.odooId,
                  action: result.action,
                  success: false,
                  error: "Failed to update local database"
                });
                failed++;
              } else {
                allResults.push({
                  companyId: company.id,
                  companyName: company.name,
                  odooId: result.odooId,
                  action: result.action,
                  success: true
                });
                synced++;
              }
            }
          }
        } catch (err) {
          console.error(`[OdooSync] Error syncing ${company.name}:`, err);
          allResults.push({
            companyId: company.id,
            companyName: company.name,
            odooId: 0,
            action: "error",
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
          });
          failed++;
        }
      }

      return {
        success: true,
        synced,
        failed,
        results: allResults
      };
    },
    onSuccess: (data) => {
      setLastSyncResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["companies-odoo-sync"] });
      toast({
        title: "Synkronisering fullført",
        description: `${data.synced} selskaper synkronisert, ${data.failed} feilet`,
      });
      setSelectedCompanies([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Synkronisering feilet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync all unsynced mutation - syncs companies one by one
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      // Fetch unsynced companies with extended fields
      const { data: companiesData, error: fetchError } = await supabase
        .from("companies")
        .select(`
          id, name, org_number, website, odoo_partner_id,
          slug, org_form, industry_code, industry_description,
          employees, company_roles, segment,
          company_metadata (notes, priority_level)
        `)
        .is("odoo_partner_id", null)
        .limit(100);

      if (fetchError) throw fetchError;
      if (!companiesData || companiesData.length === 0) {
        return { success: true, synced: 0, failed: 0, results: [], message: "No companies to sync" };
      }

      const allResults: SyncResult[] = [];
      let synced = 0;
      let failed = 0;

      // Process each company individually
      for (const company of companiesData) {
        try {
          console.log(`[OdooSync-All] Syncing company: ${company.name}`);
          
          const { data, error } = await supabase.functions.invoke("n8n-proxy", {
            body: {
              webhook: N8N_WEBHOOK_URL,
              data: {
                action: "sync",
                companies: [company],
              },
            },
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error || "Sync failed");
          
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            
            if (result.success && result.odooId) {
              const { error: updateError } = await supabase
                .from("companies")
                .update({ 
                  odoo_partner_id: result.odooId,
                  odoo_synced_at: new Date().toISOString(),
                  crm_status: "in_odoo"  // Mark as synced to Odoo CRM
                })
                .eq("id", company.id);
              
              if (!updateError) {
                allResults.push({
                  companyId: company.id,
                  companyName: company.name,
                  odooId: result.odooId,
                  action: result.action,
                  success: true
                });
                synced++;
              } else {
                failed++;
              }
            }
          }
        } catch (err) {
          console.error(`[OdooSync-All] Error syncing ${company.name}:`, err);
          allResults.push({
            companyId: company.id,
            companyName: company.name,
            odooId: 0,
            action: "error",
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
          });
          failed++;
        }
      }

      return {
        success: true,
        synced,
        failed,
        results: allResults
      };
    },
    onSuccess: (data) => {
      setLastSyncResults(data.results);
      queryClient.invalidateQueries({ queryKey: ["companies-odoo-sync"] });
      toast({
        title: "Synkronisering fullført",
        description: `${data.synced} nye selskaper synkronisert`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Synkronisering feilet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies?.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies?.map((c) => c.id) || []);
    }
  };

  const handleToggleCompany = (id: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const syncedCount = companies?.filter((c) => c.odoo_partner_id).length || 0;
  const unsyncedCount = (companies?.length || 0) - syncedCount;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-purple-600" />
            Odoo Synkronisering
          </h1>
          <p className="text-muted-foreground mt-1">
            Synkroniser selskaper til Odoo CRM (jarconsult.odoo.com)
          </p>
        </div>
        <Button 
          variant="outline" 
          asChild
        >
          <a 
            href="https://jarconsult.odoo.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            Åpne Odoo <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt selskaper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Synkronisert til Odoo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ikke synkronisert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unsyncedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Synkroniser</CardTitle>
          <CardDescription>
            Velg selskaper å synkronisere, eller synkroniser alle nye
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => syncMutation.mutate(selectedCompanies)}
            disabled={selectedCompanies.length === 0 || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Synk valgte ({selectedCompanies.length})
          </Button>
          <Button
            variant="secondary"
            onClick={() => syncAllMutation.mutate()}
            disabled={unsyncedCount === 0 || syncAllMutation.isPending}
          >
            {syncAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Synk alle nye ({unsyncedCount})
          </Button>
        </CardContent>
      </Card>

      {/* Last Sync Results */}
      {lastSyncResults && lastSyncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Siste synkronisering
              <Badge variant="secondary">
                {lastSyncResults.filter((r) => r.success).length}/{lastSyncResults.length} OK
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lastSyncResults.map((result) => (
                <div
                  key={result.companyId}
                  className={`flex items-center justify-between p-2 rounded ${
                    result.success ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{result.companyName}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.action}
                    </Badge>
                  </div>
                  {result.success ? (
                    <span className="text-sm text-muted-foreground">
                      Odoo ID: {result.odooId}
                    </span>
                  ) : (
                    <span className="text-sm text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Selskaper</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedCompanies.length === companies?.length
                ? "Fjern alle"
                : "Velg alle"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : companies?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-2" />
              <p>Ingen selskaper funnet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {companies?.map((company) => (
                <div
                  key={company.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedCompanies.includes(company.id)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={() => handleToggleCompany(company.id)}
                    />
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {company.org_number && `Org: ${company.org_number}`}
                        {company.org_number && company.website && " • "}
                        {company.website}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {company.odoo_partner_id ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Synkronisert
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {company.odoo_partner_id}
                        </span>
                        {company.odoo_synced_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(company.odoo_synced_at), "dd.MM.yyyy HH:mm", {
                              locale: nb,
                            })}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Ikke synkronisert
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

