// @ts-nocheck
// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Copy, RefreshCw, Globe, ExternalLink, Phone, Users, ChevronRight, ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { CompanyRoleEditor } from "@/components/Company/CompanyRoleEditor";
import { ContactPersonsCard } from "@/components/Company/ContactPersonsCard";
import { RoleBasedContent } from "@/components/Company/RoleBasedContent";
import type { Company } from "@/modules/core/company/types/company.types";
import type { BrregCompanySearchResult } from "@/modules/core/company/types/company.types";
interface CompanyMetadata {
  sales_assessment_score: number | null;
  priority_level: string | null;
  notes: string | null;
  in_crm: boolean;
  for_followup: boolean;
  has_potential: boolean;
}
interface FinancialData {
  organisasjonsnummer: string;
  driftsinntekter: Array<{
    ar: number;
    belop: number;
  }>;
  driftskostnader: number;
  lonnskostnader: number;
  innskuttEgenkapital: number;
  opptjentEgenkapital?: number;
  egenkapital: number;
  resultat: number;
  driftsresultat: number;
  totalkapital: number;
  totalGjeld?: number;
  antallAnsatte: number;
  konkurs: boolean;
  underAvvikling: boolean;
  underTvangsavvikling: boolean;
  valuta: string;
  regnskapsaar?: number;
}
interface EnhancedCompanyData {
  navn: string;
  organisasjonsnummer: string;
  kontaktperson: string;
  kontaktpersonRolle: string;
  kontaktpersonTelefon: string;
  telefonnummerKilde: string;
  telefonnummerAlternativer: Array<{
    telefon: string;
    adresse: string;
  }>;
  hjemmeside: string;
  forretningsadresse: {
    adresse: string;
    postnummer: string;
    poststed: string;
  } | null;
}
interface HierarchicalCompany {
  organisasjonsnummer: string;
  navn: string;
  antallAnsatte: number;
  naeringskode?: {
    kode: string;
    beskrivelse: string;
  };
  driftsinntekter?: number;
  level: number;
  type: 'parent' | 'main' | 'sibling' | 'subsidiary';
  children: HierarchicalCompany[];
  isManual?: boolean;
}
const CompanyDetails = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [metadata, setMetadata] = useState<CompanyMetadata | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [enhancedData, setEnhancedData] = useState<EnhancedCompanyData | null>(null);
  const [hierarchyData, setHierarchyData] = useState<{
    hierarchy: HierarchicalCompany;
    totals: {
      totalCompanies: number;
      totalEmployees: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingFinancials, setIsFetchingFinancials] = useState(false);
  const [isFetchingEnhanced, setIsFetchingEnhanced] = useState(false);
  const [isFetchingHierarchy, setIsFetchingHierarchy] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [searchResults, setSearchResults] = useState<BrregCompanySearchResult[]>([]);
  const [websiteInput, setWebsiteInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  useEffect(() => {
    if (id) {
      fetchCompanyDetails();
    }
  }, [id]);
  const fetchCompanyDetails = async () => {
    try {
      const {
        data: companyData,
        error: companyError
      } = await supabase.from('companies').select('*').eq('id', id).single();
      if (companyError) throw companyError;
      setCompany(companyData as Company);
      const {
        data: metadataData
      } = await supabase.from('company_metadata').select('*').eq('company_id', id).maybeSingle();
      const defaultMetadata = {
        sales_assessment_score: null,
        priority_level: null,
        notes: null,
        in_crm: false,
        for_followup: false,
        has_potential: true
      };
      setMetadata(metadataData || defaultMetadata);
      setNotesInput(metadataData?.notes || "");
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error("Kunne ikke laste bedriftsdata");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchFinancialData = async () => {
    if (!company) return;

    // Skip if org_number is missing or invalid
    const hasValidOrgNumber = company.org_number && !company.org_number.startsWith('PLACEHOLDER-') && company.org_number !== '-';
    if (!hasValidOrgNumber) return;
    console.log('fetchFinancialData called for:', company.org_number);
    setIsFetchingFinancials(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('brreg-regnskaplookup', {
        body: {
          organisasjonsnummer: company.org_number
        }
      });
      console.log('Financial data response:', {
        data,
        error
      });
      if (error) {
        console.error('Error from brreg-regnskaplookup:', error);
        throw error;
      }
      if (data?.success && data?.data) {
        console.log('Setting financial data:', data.data);
        setFinancialData(data.data);

        // Save financial data to database
        const updateResult = await supabase.from('companies').update({
          driftsinntekter: data.data.driftsinntekter?.[0]?.belop || null,
          driftsresultat: data.data.driftsresultat || null,
          egenkapital: data.data.egenkapital || null,
          totalkapital: data.data.totalkapital || null
        }).eq('id', id);
        console.log('Database update result:', updateResult);
      } else {
        console.log('No financial data available or unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsFetchingFinancials(false);
    }
  };
  const fetchEnhancedData = async () => {
    if (!company) return;

    // Skip if org_number is missing or invalid
    const hasValidOrgNumber = company.org_number && !company.org_number.startsWith('PLACEHOLDER-') && company.org_number !== '-';
    if (!hasValidOrgNumber) return;
    setIsFetchingEnhanced(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('brreg-enhanced-lookup', {
        body: {
          orgNumber: company.org_number
        }
      });
      if (error) throw error;
      if (data) {
        setEnhancedData(data);

        // Automatically create contact person from Brreg data if not exists
        if (data.kontaktperson && data.kontaktpersonRolle) {
          await createContactPersonFromBrreg(data);
        }
      }
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
    } finally {
      setIsFetchingEnhanced(false);
    }
  };
  const createContactPersonFromBrreg = async (enhancedData: EnhancedCompanyData) => {
    if (!company?.id) return;
    try {
      // Check if contact person already exists with same name and role
      const {
        data: existingContacts,
        error: checkError
      } = await supabase.from('supplier_contacts').select('id').eq('company_id', company.id).eq('name', enhancedData.kontaktperson).eq('role', enhancedData.kontaktpersonRolle).is('project_id', null);
      if (checkError) {
        console.error('Error checking existing contacts:', checkError);
        return;
      }

      // If contact already exists, skip creation
      if (existingContacts && existingContacts.length > 0) {
        console.log('Contact person already exists, skipping creation');
        return;
      }

      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Create new contact person
      const {
        error: insertError
      } = await supabase.from('supplier_contacts').insert({
        company_id: company.id,
        name: enhancedData.kontaktperson,
        role: enhancedData.kontaktpersonRolle,
        phone: enhancedData.kontaktpersonTelefon || null,
        email: '',
        // Required field but we don't have it from Brreg
        is_primary: false,
        created_by: user.id
      });
      if (insertError) {
        console.error('Error creating contact person:', insertError);
      } else {
        console.log('Contact person created from Brreg data');
      }
    } catch (error) {
      console.error('Error in createContactPersonFromBrreg:', error);
    }
  };
  const fetchHierarchyData = async () => {
    if (!company) return;

    // Skip if org_number is missing or invalid
    const hasValidOrgNumber = company.org_number && !company.org_number.startsWith('PLACEHOLDER-') && company.org_number !== '-';
    if (!hasValidOrgNumber) return;
    setIsFetchingHierarchy(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('brreg-konsern-lookup', {
        body: {
          orgNumber: company.org_number
        }
      });
      if (error) throw error;
      if (data?.hierarchy) {
        setHierarchyData(data);
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setIsFetchingHierarchy(false);
    }
  };
  useEffect(() => {
    if (company) {
      console.log('Loading financial data for company:', company.org_number);
      fetchFinancialData();
      fetchEnhancedData();
      fetchHierarchyData();
    }
  }, [company]);
  const handleUpdateData = async () => {
    if (!company) return;

    // Check if org_number is missing or is a placeholder
    const needsOrgNumberSearch = !company.org_number || company.org_number.startsWith('PLACEHOLDER-') || company.org_number === '-';
    if (needsOrgNumberSearch) {
      // Search Brreg by company name
      setIsUpdating(true);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('brreg-public-search', {
          body: {
            navn: company.name,
            size: 10
          }
        });
        if (error) throw error;
        if (data?.hits && data.hits.length > 0) {
          if (data.hits.length === 1) {
            // Only one result, use it directly
            await updateCompanyWithOrgNumber(data.hits[0].organisasjonsnummer);
          } else {
            // Multiple results, let user choose
            // Transform hits to match BrregCompanySearchResult format
            const transformedResults = data.hits.map((hit: any) => ({
              orgNumber: hit.organisasjonsnummer,
              name: hit.navn,
              orgForm: hit.organisasjonsform?.beskrivelse || '',
              industryCode: hit.naeringskode1?.kode || '',
              industryDescription: hit.naeringskode1?.beskrivelse || '',
              employees: hit.antallAnsatte || 0,
              foundingDate: hit.stiftelsesdato || '',
              website: hit.hjemmeside || ''
            }));
            setSearchResults(transformedResults);
            setShowCompanySelector(true);
          }
        } else {
          toast.error("Ingen treff i Brønnøysundregistrene for dette selskapsnavnet");
        }
      } catch (error) {
        console.error('Search error:', error);
        toast.error("Kunne ikke søke etter selskap");
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    // Normal update flow with existing org_number
    await updateCompanyWithOrgNumber(company.org_number);
  };
  const updateCompanyWithOrgNumber = async (orgNumber: string) => {
    if (!company) return;
    setIsUpdating(true);
    setShowCompanySelector(false); // Close dialog immediately

    try {
      console.log('Updating company with org number:', orgNumber);

      // Check if a company with this org_number already exists
      const {
        data: existingCompanies,
        error: checkError
      } = await supabase.from('companies').select('id, name, company_roles').eq('org_number', orgNumber);
      if (checkError) {
        console.error('Error checking for existing company:', checkError);
        throw checkError;
      }

      // If company with this org number exists and it's not the current one, we need to merge
      const existingCompany = existingCompanies?.find(c => c.id !== id);
      if (existingCompany) {
        console.log('Found existing company, merging:', existingCompany);

        // Merge company_roles from current company to existing
        const currentRoles = company.company_roles || [];
        const existingRoles = existingCompany.company_roles || [];
        const mergedRoles = Array.from(new Set([...currentRoles, ...existingRoles]));

        // Update existing company with merged roles
        const {
          error: updateExistingError
        } = await supabase.from('companies').update({
          company_roles: mergedRoles
        }).eq('id', existingCompany.id);
        if (updateExistingError) {
          console.error('Error updating existing company:', updateExistingError);
          throw updateExistingError;
        }

        // Move all ERP systems from current to existing company
        const {
          error: moveErpError
        } = await supabase.from('erp_systems').update({
          vendor_company_id: existingCompany.id
        }).eq('vendor_company_id', id);
        if (moveErpError) {
          console.error('Error moving ERP systems:', moveErpError);
        }

        // Move all partner certifications
        const {
          error: moveCertError
        } = await supabase.from('partner_certifications').update({
          partner_company_id: existingCompany.id
        }).eq('partner_company_id', id);
        if (moveCertError) {
          console.error('Error moving certifications:', moveCertError);
        }

        // Move all project associations
        const {
          error: moveProjectsError
        } = await supabase.from('project_suppliers').update({
          company_id: existingCompany.id
        }).eq('company_id', id);
        if (moveProjectsError) {
          console.error('Error moving project associations:', moveProjectsError);
        }

        // Delete the current company (with placeholder org number)
        const {
          error: deleteError
        } = await supabase.from('companies').delete().eq('id', id);
        if (deleteError) {
          console.error('Error deleting old company:', deleteError);
          throw deleteError;
        }
        toast.success(`Selskap merget med eksisterende "${existingCompany.name}"`);

        // Navigate to the existing company
        window.location.href = `/company/${existingCompany.id}`;
        return;
      }

      // No existing company found, proceed with normal update
      const {
        data,
        error
      } = await supabase.functions.invoke('brreg-company-details', {
        body: {
          orgNumber
        }
      });
      console.log('Company details response:', {
        data,
        error
      });
      if (error) {
        console.error('Error fetching company details:', error);
        throw error;
      }
      if (!data?.company) {
        throw new Error('Ingen selskapsdata returnert fra Brreg');
      }

      // Fetch financial data
      const {
        data: financialData,
        error: financialError
      } = await supabase.functions.invoke('brreg-regnskaplookup', {
        body: {
          organisasjonsnummer: orgNumber
        }
      });
      console.log('Financial data response:', {
        financialData,
        financialError
      });
      const updateData: any = {
        org_number: orgNumber,
        name: data.company.name,
        org_form: data.company.orgForm,
        industry_code: data.company.industryCode,
        industry_description: data.company.industryDescription,
        employees: data.company.employees,
        website: data.company.website,
        last_fetched_at: new Date().toISOString()
      };

      // Add financial data if available
      if (!financialError && financialData?.success && financialData?.data) {
        updateData.driftsinntekter = financialData.data.driftsinntekter?.[0]?.belop || null;
        updateData.driftsresultat = financialData.data.driftsresultat || null;
        updateData.egenkapital = financialData.data.egenkapital || null;
        updateData.totalkapital = financialData.data.totalkapital || null;
      }
      console.log('Updating company with data:', updateData);
      const {
        error: updateError
      } = await supabase.from('companies').update(updateData).eq('id', id);
      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      toast.success("Data oppdatert");
      await fetchCompanyDetails();
      await fetchFinancialData();
      await fetchEnhancedData();
      await fetchHierarchyData();
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Kunne ikke oppdatere data';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert til utklippstavle");
  };
  const updateMetadata = async (updates: Partial<CompanyMetadata>) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du må være logget inn");
        return;
      }
      const {
        data: existing
      } = await supabase.from('company_metadata').select('id').eq('company_id', id).maybeSingle();
      if (existing) {
        await supabase.from('company_metadata').update(updates).eq('company_id', id);
      } else {
        await supabase.from('company_metadata').insert({
          company_id: id,
          user_id: user.id,
          ...updates
        });
      }
      setMetadata({
        ...metadata!,
        ...updates
      });
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast.error("Kunne ikke oppdatere");
    }
  };

  const handleSaveWebsite = async () => {
    if (!company || !websiteInput.trim()) return;
    
    setIsSavingWebsite(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ website: websiteInput.trim() })
        .eq('id', company.id);
      
      if (error) throw error;
      
      setCompany({ ...company, website: websiteInput.trim() });
      toast.success("Hjemmeside lagret");
    } catch (error) {
      console.error('Error saving website:', error);
      toast.error("Kunne ikke lagre hjemmeside");
    } finally {
      setIsSavingWebsite(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!company) return;
    
    try {
      await updateMetadata({ notes: notesInput.trim() || null });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>;
  }
  if (!company) {
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Bedrift ikke funnet</p>
      </div>;
  }
  const priorityColors = {
    low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    high: "bg-red-500/10 text-red-700 dark:text-red-400"
  };
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs customLabel={company?.name} />
        
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til søkeresultat
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold">{company.name}</h1>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(company.org_number)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleUpdateData} disabled={isUpdating} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              Oppdater data
            </Button>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground mb-4">
          </div>

          <div className="mb-2">
            <p className="text-lg">
              <span className="font-semibold">{company.industry_code}</span> - {company.industry_description}
            </p>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {company.last_fetched_at && <p>Sist sett: {format(new Date(company.last_fetched_at), "d. MMMM yyyy 'kl.' HH:mm", {
              locale: nb
            })}</p>}
            {company.last_synced_at && <p>Sist oppdatert: {format(new Date(company.last_synced_at), "d. MMMM yyyy 'kl.' HH:mm", {
              locale: nb
            })}</p>}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Contact Persons Card */}
          <ContactPersonsCard companyId={company.id} companyName={company.name} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Hjemmeside og oppslag
              </CardTitle>
              <CardDescription>Lagre hjemmeside og søk i eksterne kilder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.website ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Hjemmeside</div>
                  <div className="flex items-center gap-2">
                    <Input value={company.website} readOnly className="flex-1" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(company.website)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => window.open(company.website, '_blank')}>
                    <Globe className="mr-2 h-4 w-4" />
                    Åpne hjemmeside
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="website-input">Hjemmeside</Label>
                  <Input
                    id="website-input"
                    type="url"
                    placeholder="https://www.example.com"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    onBlur={handleSaveWebsite}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Ingen hjemmeside registrert i Brønnøysundregistrene</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-3">Andre kilder</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.proff.no/bransjesøk?q=${company.name}`, '_blank')}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Åpne i Proff
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.linkedin.com/search/results/companies/?keywords=${company.name}`, '_blank')}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    LinkedIn selskap
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Roles */}
          <CompanyRoleEditor companyId={company.id} currentRoles={company.company_roles || []} onUpdate={newRoles => {
          setCompany(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              company_roles: newRoles as any
            };
          });
        }} />

          {/* Egne notater - egen blokk */}
          <Card>
            <CardHeader>
              <CardTitle>Egne notater</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <Textarea
                id="notes-input"
                placeholder="Skriv notater om selskapet her..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                onBlur={handleSaveNotes}
                className="min-h-[200px] max-h-[300px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Role-based Content */}
          {company.company_roles && company.company_roles.length > 0 && <div className="lg:col-span-2">
              <RoleBasedContent company={company} currentRoles={company.company_roles} metadata={metadata as any} onUpdateMetadata={updateMetadata} />
            </div>}

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regnskapsdata</CardTitle>
                  <CardDescription>
                    {financialData?.regnskapsaar ? `Regnskap for ${financialData.regnskapsaar}` : 'Siste tilgjengelige regnskapsdata'}
                  </CardDescription>
                </div>
                <Button onClick={fetchFinancialData} disabled={isFetchingFinancials} variant="outline" size="sm">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingFinancials ? 'animate-spin' : ''}`} />
                  Last inn
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isFetchingFinancials ? <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div> : financialData || company.driftsinntekter || company.driftsresultat || company.egenkapital || company.totalkapital ? <>
                  {(!financialData?.driftsinntekter || financialData.driftsinntekter.length === 0) && !company.driftsinntekter && !company.driftsresultat && <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Dette selskapet har ikke levert regnskapsdata til Brønnøysundregistrene
                      </p>
                    </div>}
                  <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Drift</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Driftsinntekter</div>
                        <div className="text-xl font-semibold">
                          {financialData?.driftsinntekter?.[0]?.belop ? `${(financialData.driftsinntekter[0].belop / 1000000).toFixed(1)}M kr` : company.driftsinntekter ? `${(company.driftsinntekter / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Driftskostnader</div>
                        <div className="text-xl font-semibold">
                          {financialData?.driftskostnader ? `${(financialData.driftskostnader / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Driftsresultat</div>
                        <div className={`text-xl font-semibold ${(financialData?.driftsresultat || company.driftsresultat || 0) < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {financialData?.driftsresultat ? `${(financialData.driftsresultat / 1000000).toFixed(1)}M kr` : company.driftsresultat ? `${(company.driftsresultat / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Kapital</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Totalkapital</div>
                        <div className="text-xl font-semibold">
                          {financialData?.totalkapital ? `${(financialData.totalkapital / 1000000).toFixed(1)}M kr` : company.totalkapital ? `${(company.totalkapital / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Egenkapital</div>
                        <div className="text-xl font-semibold">
                          {financialData?.egenkapital ? `${(financialData.egenkapital / 1000000).toFixed(1)}M kr` : company.egenkapital ? `${(company.egenkapital / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                      {financialData?.totalGjeld !== undefined && <div>
                          <div className="text-sm text-muted-foreground">Total gjeld</div>
                          <div className="text-xl font-semibold">
                            {`${(financialData.totalGjeld / 1000000).toFixed(1)}M kr`}
                          </div>
                        </div>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Annet</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Årsresultat</div>
                        <div className={`text-xl font-semibold ${(financialData?.resultat || 0) < 0 ? 'text-destructive' : 'text-primary'}`}>
                          {financialData?.resultat ? `${(financialData.resultat / 1000000).toFixed(1)}M kr` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Ansatte</div>
                        <div className="text-xl font-semibold">
                          {financialData?.antallAnsatte || company.employees || '-'}
                        </div>
                      </div>
                      {financialData && (financialData.konkurs || financialData.underAvvikling || financialData.underTvangsavvikling) && <div className="pt-2">
                          <Badge variant="destructive">
                            {financialData.konkurs && 'Konkurs'}
                            {financialData.underAvvikling && 'Under avvikling'}
                            {financialData.underTvangsavvikling && 'Under tvangsavvikling'}
                          </Badge>
                        </div>}
                    </div>
                  </div>
                </div>
                </> : <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Ingen regnskapsdata lastet</p>
                  <Button onClick={fetchFinancialData} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Last inn regnskapsdata
                  </Button>
                </div>}
            </CardContent>
          </Card>

          {hierarchyData && <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Konsernstruktur
                    </CardTitle>
                    <CardDescription>
                      {hierarchyData.totals.totalCompanies} selskaper med totalt {hierarchyData.totals.totalEmployees} ansatte
                      {company.founding_date && ` • Stiftet: ${format(new Date(company.founding_date), "d. MMMM yyyy", { locale: nb })}`}
                    </CardDescription>
                  </div>
                  <Button onClick={fetchHierarchyData} disabled={isFetchingHierarchy} variant="outline" size="sm">
                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingHierarchy ? 'animate-spin' : ''}`} />
                    Oppdater
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isFetchingHierarchy ? <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div> : <HierarchyTree node={hierarchyData.hierarchy} level={0} />}
              </CardContent>
            </Card>}
        </div>
      </main>

      {/* Company Selector Dialog */}
      <Dialog open={showCompanySelector} onOpenChange={setShowCompanySelector}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Velg riktig selskap</DialogTitle>
            <DialogDescription>
              Flere selskaper ble funnet med navnet "{company?.name}". Velg det riktige selskapet fra listen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {searchResults.map(result => <Card key={result.orgNumber} className="cursor-pointer hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => !isUpdating && updateCompanyWithOrgNumber(result.orgNumber)}>
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{result.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Org.nr: {result.orgNumber}</span>
                        {result.orgForm && <span>{result.orgForm}</span>}
                      </div>
                      {result.industryCode && result.industryDescription && <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {result.industryCode}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {result.industryDescription}
                          </span>
                        </div>}
                      {result.employees > 0 && <div className="text-sm text-muted-foreground">
                          Ansatte: {result.employees}
                        </div>}
                    </div>
                  </div>
                </CardHeader>
              </Card>)}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCompanySelector(false)} disabled={isUpdating}>
              Avbryt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};

// Recursive component to display hierarchy tree
const HierarchyTree = ({
  node,
  level
}: {
  node: HierarchicalCompany;
  level: number;
}) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand top 2 levels

  const typeColors = {
    parent: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    main: "bg-primary/10 text-primary",
    sibling: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    subsidiary: "bg-green-500/10 text-green-700 dark:text-green-400"
  };
  const typeLabels = {
    parent: "Morselskap",
    main: "Hovedselskap",
    sibling: "Søsterselskap",
    subsidiary: "Datterselskap"
  };
  return <div className={`${level > 0 ? 'ml-6 mt-2' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
          {node.children.length > 0 && <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{node.navn}</span>
              <Badge variant="outline" className="text-xs">{node.organisasjonsnummer}</Badge>
              <Badge className={`text-xs ${typeColors[node.type]}`}>
                {typeLabels[node.type]}
              </Badge>
              {node.isManual && <Badge variant="secondary" className="text-xs">Manuell</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {node.antallAnsatte > 0 && <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {node.antallAnsatte} ansatte
                </span>}
              {node.naeringskode && <span className="text-xs">{node.naeringskode.kode} - {node.naeringskode.beskrivelse}</span>}
              {node.driftsinntekter && <span className="text-xs">
                  Omsetning: {(node.driftsinntekter / 1000000).toFixed(1)}M kr
                </span>}
            </div>
          </div>
        </div>
        {node.children.length > 0 && <CollapsibleContent>
            <div className="border-l-2 border-muted ml-3">
              {node.children.map((child, index) => <HierarchyTree key={`${child.organisasjonsnummer}-${index}`} node={child} level={level + 1} />)}
            </div>
          </CollapsibleContent>}
      </Collapsible>
    </div>;
};
export default CompanyDetails;