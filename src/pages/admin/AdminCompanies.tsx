import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Building2, Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ColumnDef } from "@/components/DataTable/types";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";

interface Company {
  orgNumber: string;
  name: string;
  orgForm: string;
  industryCode: string;
  industryDescription: string;
  employees: number;
  foundingDate: string;
  website: string;
  isSaved: boolean;
}

interface SavedCompany {
  id: string;
  org_number: string;
  name: string;
  org_form: string;
  industry_code: string;
  industry_description: string;
  employees: number;
  crm_status: string;
  company_roles: string[];
  created_at: string;
  for_followup?: boolean;
  has_potential?: boolean;
  score?: number;
}

export default function AdminCompanies() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'search' ? 'search' : 'saved';
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [stats, setStats] = useState({ total: 0, customers: 0, systemVendors: 0 });

  // Column definitions for saved companies
  const savedCompaniesColumns: ColumnDef<SavedCompany>[] = [
    {
      key: 'org_number',
      label: 'Org.nr',
      type: 'text',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'name',
      label: 'Navn',
      type: 'text',
      sortable: true,
      filterable: true,
    },
    {
      key: 'org_form',
      label: 'Org.form',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'industry_description',
      label: 'Næring',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => <span className="text-sm">{value || '-'}</span>,
    },
    {
      key: 'employees',
      label: 'Ansatte',
      type: 'number',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'company_roles',
      label: 'Roller',
      type: 'custom',
      render: (value) => {
        if (!value || value.length === 0) return '-';
        return (
          <div className="flex gap-1 flex-wrap">
            {value.map((role: string) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'crm_status',
      label: 'Status',
      type: 'select',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Badge variant="outline">{value}</Badge> : null,
    },
    {
      key: 'score',
      label: 'Score',
      type: 'number',
      sortable: true,
      filterable: true,
      render: (value) => value ? <Badge variant="secondary">{value}</Badge> : '-',
    },
    {
      key: 'for_followup',
      label: 'Oppfølging',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="text-sm">{value ? '✓' : '-'}</span>
      ),
    },
    {
      key: 'has_potential',
      label: 'Potensial',
      type: 'boolean',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="text-sm">{value ? '✓' : '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Lagt til',
      type: 'date',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(value), "d. MMM yyyy", { locale: nb })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      type: 'action',
      width: 60,
      render: (_, row) => (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => navigate(`/companies/${row.id}`)}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Column definitions for search results
  const searchResultsColumns: ColumnDef<Company>[] = [
    {
      key: 'orgNumber',
      label: 'Org.nr',
      type: 'text',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      key: 'name',
      label: 'Navn',
      type: 'text',
      sortable: true,
      filterable: true,
    },
    {
      key: 'isSaved',
      label: 'Status',
      type: 'custom',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col gap-1">
          {value && (
            <Badge variant="default" className="w-fit">Lagret</Badge>
          )}
          <Badge variant="secondary" className="w-fit bg-green-500/10 text-green-700 dark:text-green-400">
            Brreg
          </Badge>
        </div>
      ),
    },
    {
      key: 'orgForm',
      label: 'Org.form',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'industryCode',
      label: 'Næringskode',
      type: 'text',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'employees',
      label: 'Ansatte',
      type: 'number',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'foundingDate',
      label: 'Stiftelsesdato',
      type: 'date',
      sortable: true,
      filterable: true,
      render: (value) => value ? format(new Date(value), "d. MMM yyyy", { locale: nb }) : '-',
    },
    {
      key: 'actions',
      label: 'Handlinger',
      type: 'action',
      width: 120,
      render: (_, row) => (
        <Button onClick={() => handleViewCompany(row)} size="sm">
          Slå opp
        </Button>
      ),
    },
  ];

  useEffect(() => {
    loadSavedCompanies();
  }, []);

  const loadSavedCompanies = async () => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedCompanies(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const customers = data?.filter(c => c.crm_status).length || 0;
      const systemVendors = data?.filter(c => c.company_roles?.includes('external_system_vendor')).length || 0;
      
      setStats({ total, customers, systemVendors });
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error("Kunne ikke laste bedrifter");
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vennligst skriv inn søkeord");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('brreg-lookup', {
        body: { query: searchQuery },
      });

      if (error) throw error;

      // Check which companies are already saved
      const { data: saved } = await supabase
        .from('companies')
        .select('org_number')
        .in('org_number', data.companies.map((c: Company) => c.orgNumber));

      const savedOrgNumbers = new Set(saved?.map(s => s.org_number) || []);
      
      const companiesWithSavedStatus = data.companies.map((c: Company) => ({
        ...c,
        isSaved: savedOrgNumbers.has(c.orgNumber),
      }));

      setSearchResults(companiesWithSavedStatus);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error("Kunne ikke søke i Enhetsregisteret");
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewCompany = async (company: Company) => {
    try {
      // Check if company exists in database
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('org_number', company.orgNumber)
        .maybeSingle();

      if (existing) {
        navigate(`/companies/${existing.id}`);
      } else {
        // Save company to database
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert({
            org_number: company.orgNumber,
            name: company.name,
            org_form: company.orgForm,
            industry_code: company.industryCode,
            industry_description: company.industryDescription,
            employees: company.employees,
            website: company.website,
            last_fetched_at: new Date().toISOString(),
            source: 'brreg',
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/companies/${newCompany.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Kunne ikke åpne bedrift");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Selskaper</h1>
          <p className="text-muted-foreground">
            Administrer bedrifter og søk i Brønnøysundregistrene
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt bedrifter</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kunder</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Systemleverandører</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemVendors}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved">Lagrede bedrifter ({savedCompanies.length})</TabsTrigger>
          <TabsTrigger value="search">Søk i Brreg</TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="space-y-6">
          {isLoadingSaved ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : savedCompanies.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <SmartDataTable
                  columns={savedCompaniesColumns}
                  data={savedCompanies}
                  initialPageSize={20}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Ingen bedrifter lagt til ennå</p>
                <p className="text-sm text-muted-foreground">
                  Søk etter bedrifter i Brønnøysundregistrene for å komme i gang
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Søk i Brønnøysundregistrene</CardTitle>
              <CardDescription>
                Søk etter organisasjoner med navn eller organisasjonsnummer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Skriv inn navn eller org.nr..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isSearching} className="min-w-[120px]">
                  <Search className="mr-2 h-4 w-4" />
                  {isSearching ? "Søker..." : "Søk"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <SmartDataTable
                  columns={searchResultsColumns}
                  data={searchResults}
                  initialPageSize={20}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
