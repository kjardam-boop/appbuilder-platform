import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Bookmark, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  org_number: string;
  industry_description: string | null;
}

interface CompanySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (companyId: string) => void;
}

const CompanySelector = ({ open, onOpenChange, onSelect }: CompanySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Load saved companies when dialog opens
  useEffect(() => {
    if (open) {
      loadSavedCompanies();
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vennligst skriv inn et søk");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("brreg-public-search", {
        body: { navn: searchQuery },
      });

      if (error) throw error;
      setSearchResults(data?.hits || []);
    } catch (error) {
      console.error("Error searching companies:", error);
      toast.error("Kunne ikke søke etter bedrifter");
    } finally {
      setIsSearching(false);
    }
  };

  const loadSavedCompanies = async () => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number, industry_description")
        .order("name");

      if (error) throw error;
      setSavedCompanies(data || []);
    } catch (error) {
      console.error("Error loading saved companies:", error);
      toast.error("Kunne ikke laste lagrede bedrifter");
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSelectFromSearch = async (company: any) => {
    try {
      // Check if company already exists
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("org_number", company.organisasjonsnummer)
        .maybeSingle();

      if (existing) {
        onSelect(existing.id);
        onOpenChange(false);
        return;
      }

      // Insert new company
      const { data: newCompany, error } = await supabase
        .from("companies")
        .insert({
          name: company.navn,
          org_number: company.organisasjonsnummer,
          org_form: company.organisasjonsform?.kode,
          industry_code: company.naeringskode1?.kode,
          industry_description: company.naeringskode1?.beskrivelse,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting company:", error);
        throw error;
      }

      // Fetch enhanced data including contact person from Brreg
      const { data: enhancedData, error: enhancedError } = await supabase.functions.invoke('brreg-enhanced-lookup', {
        body: { orgNumber: company.organisasjonsnummer },
      });

      // If we have contact person data, save it to company_metadata
      if (!enhancedError && enhancedData?.kontaktperson) {
        const contactPerson = {
          full_name: enhancedData.kontaktperson,
          title: enhancedData.kontaktpersonRolle || null,
          phone: enhancedData.kontaktpersonTelefon || null,
          email: null,
          department: null,
          is_primary: true,
          notes: `Hentet fra Brønnøysundregistrene${enhancedData.telefonnummerKilde ? ` (${enhancedData.telefonnummerKilde})` : ''}`
        };

        // Check if company_metadata exists
        const { data: existingMetadata } = await supabase
          .from("company_metadata")
          .select("id, contact_persons")
          .eq("company_id", newCompany.id)
          .maybeSingle();

        if (existingMetadata) {
          // Update existing metadata
          const updatedContacts = [...(existingMetadata.contact_persons || []), contactPerson];
          await supabase
            .from("company_metadata")
            .update({ contact_persons: updatedContacts })
            .eq("id", existingMetadata.id);
        } else {
          // Create new metadata with contact person
          await supabase
            .from("company_metadata")
            .insert({
              company_id: newCompany.id,
              contact_persons: [contactPerson]
            });
        }
      }
      
      onSelect(newCompany.id);
      onOpenChange(false);
      toast.success("Bedrift lagt til");
    } catch (error) {
      console.error("Error selecting company:", error);
      toast.error("Kunne ikke lagre bedrift");
    }
  };

  const handleSelectSaved = (companyId: string) => {
    onSelect(companyId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Velg bedrift</DialogTitle>
          <DialogDescription>
            Velg fra lagrede bedrifter eller søk etter en ny bedrift
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="saved">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved">
              <Bookmark className="mr-2 h-4 w-4" />
              Lagrede bedrifter
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="mr-2 h-4 w-4" />
              Søk i Brønnøysundregistrene
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="space-y-4">
            {isLoadingSaved ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : savedCompanies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ingen lagrede bedrifter
              </div>
            ) : (
              <div className="space-y-2">
                {savedCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectSaved(company.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.org_number}
                          {company.industry_description && ` • ${company.industry_description}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Søk etter bedriftsnavn eller org.nummer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Søker..." : "Søk"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((company: any) => (
                  <div
                    key={company.organisasjonsnummer}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectFromSearch(company)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{company.navn}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.organisasjonsnummer}
                          {company.naeringskode1?.beskrivelse && ` • ${company.naeringskode1.beskrivelse}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CompanySelector;
