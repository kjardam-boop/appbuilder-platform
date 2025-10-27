import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Bookmark, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

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
}

export default function AdminCompanies() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [stats, setStats] = useState({ total: 0, customers: 0, suppliers: 0 });

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
      const suppliers = data?.filter(c => c.company_roles?.includes('supplier')).length || 0;
      
      setStats({ total, customers, suppliers });
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
        navigate(`/company/${existing.id}`);
      } else {
        // Fetch enhanced data including contact person from Brreg
        const { data: enhancedData, error: enhancedError } = await supabase.functions.invoke('brreg-enhanced-lookup', {
          body: { orgNumber: company.orgNumber },
        });

        let contactPerson = null;
        let contactPersonRole = null;

        if (!enhancedError && enhancedData) {
          contactPerson = enhancedData.kontaktperson || null;
          contactPersonRole = enhancedData.kontaktpersonRolle || null;
        }

        // Save company to database first with contact person data
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert({
            org_number: company.orgNumber,
            name: company.name,
            org_form: company.orgForm,
            industry_code: company.industryCode,
            industry_description: company.industryDescription,
            employees: company.employees,
            founding_date: company.foundingDate,
            website: company.website,
            last_fetched_at: new Date().toISOString(),
            contact_person: contactPerson,
            contact_person_role: contactPersonRole,
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/company/${newCompany.id}`);
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
            <CardTitle className="text-sm font-medium">Leverandører</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suppliers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="saved" className="space-y-6">
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
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Org.nr</TableHead>
                      <TableHead>Navn</TableHead>
                      <TableHead>Org.form</TableHead>
                      <TableHead>Næring</TableHead>
                      <TableHead>Ansatte</TableHead>
                      <TableHead>Roller</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lagt til</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-mono text-xs">{company.org_number}</TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.org_form || "-"}</TableCell>
                        <TableCell className="text-sm">{company.industry_description || "-"}</TableCell>
                        <TableCell>{company.employees || "-"}</TableCell>
                        <TableCell>
                          {company.company_roles?.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {company.company_roles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {company.crm_status && (
                            <Badge variant="outline">{company.crm_status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(company.created_at), "d. MMM yyyy", { locale: nb })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/company/${company.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Org.nr</TableHead>
                      <TableHead>Navn</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Org.form</TableHead>
                      <TableHead>Næringskode</TableHead>
                      <TableHead>Ansatte</TableHead>
                      <TableHead>Stiftelsesdato</TableHead>
                      <TableHead>Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((company) => (
                      <TableRow key={company.orgNumber}>
                        <TableCell className="font-mono text-xs">{company.orgNumber}</TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {company.isSaved && (
                              <Badge variant="default" className="w-fit">Lagret</Badge>
                            )}
                            <Badge variant="secondary" className="w-fit bg-green-500/10 text-green-700 dark:text-green-400">
                              Brreg
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{company.orgForm || "-"}</TableCell>
                        <TableCell>{company.industryCode || "-"}</TableCell>
                        <TableCell>{company.employees || "-"}</TableCell>
                        <TableCell>
                          {company.foundingDate 
                            ? format(new Date(company.foundingDate), "d. MMM yyyy", { locale: nb })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button onClick={() => handleViewCompany(company)} size="sm">
                            Slå opp
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
