// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";

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

const CompanySearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<any[]>([]);

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
            is_saved: false,
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs />
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Bedriftssøk og potensiale vurdering</h1>
          </div>
          <p className="text-muted-foreground">Søk etter selskaper med potensiale</p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList>
            <TabsTrigger value="saved">Lagrede bedrifter</TabsTrigger>
            <TabsTrigger value="search">Søk på enkeltforetak</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-2">Raskt søk i Enhetsregisteret</h2>
              <p className="text-muted-foreground mb-6">Søk etter organisasjoner med navn eller organisasjonsnummer</p>

              <div className="flex gap-4">
                <Input
                  placeholder="Akseler..."
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
            </div>

            {searchResults.length > 0 && (
              <div className="bg-card rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Org.nr</TableHead>
                      <TableHead>Navn</TableHead>
                      <TableHead>Kilde</TableHead>
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
                        <TableCell className="font-mono">{company.orgNumber}</TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {company.isSaved && (
                              <Badge variant="default" className="w-fit">Lagret</Badge>
                            )}
                            <Badge variant="secondary" className="w-fit bg-green-500/10 text-green-700 dark:text-green-400">Brreg</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{company.orgForm || "-"}</TableCell>
                        <TableCell>{company.industryCode || "-"}</TableCell>
                        <TableCell>{company.employees || "-"}</TableCell>
                        <TableCell>
                          {company.foundingDate 
                            ? format(new Date(company.foundingDate), "d. MMMM yyyy", { locale: nb })
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            <div className="bg-card rounded-lg border p-6 text-center">
              <p className="text-muted-foreground">Lagrede bedrifter vises her</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CompanySearch;
