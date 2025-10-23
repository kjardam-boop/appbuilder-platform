// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Dashboard/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeft
} from "lucide-react";
import { COMPANY_ROLES } from "@/modules/company/types/company.types";
import type { CompanyRole } from "@/modules/company/types/company.types";

interface Profile {
  full_name: string;
  email: string;
}

interface SavedCompany {
  metadata_id: string;
  company_id: string;
  org_number: string;
  company_name: string;
  industry_code: string | null;
  industry_description: string | null;
  employees: number | null;
  founding_date: string | null;
  contact_person: string | null;
  contact_person_role: string | null;
  driftsinntekter: number | null;
  driftsresultat: number | null;
  egenkapital: number | null;
  company_roles: string[] | null;
  for_followup: boolean;
  has_potential: boolean;
  in_crm: boolean;
  score: number | null;
  created_at: string;
  last_viewed_at: string | null;
}

type SortField = keyof SavedCompany | null;
type SortDirection = 'asc' | 'desc' | null;

const SavedCompanies = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<SavedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchName, setSearchName] = useState("");
  const [searchOrgNr, setSearchOrgNr] = useState("");
  const [filterFollowup, setFilterFollowup] = useState<string>("all");
  const [filterPotensial, setFilterPotensial] = useState<string>("all");
  const [searchContact, setSearchContact] = useState("");
  const [searchSektor, setSearchSektor] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  
  // Sort
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSavedCompanies();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [companies, searchName, searchOrgNr, filterFollowup, filterPotensial, searchContact, searchSektor, filterRole, sortField, sortDirection]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchSavedCompanies = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("company_metadata")
        .select(`
          id,
          for_followup,
          has_potential,
          in_crm,
          score,
          last_viewed_at,
          created_at,
          companies!inner (
            id,
            org_number,
            name,
            industry_code,
            industry_description,
            employees,
            founding_date,
            contact_person,
            contact_person_role,
            driftsinntekter,
            driftsresultat,
            egenkapital,
            company_roles
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to match SavedCompany interface
      const transformedData = data?.map((item: any) => ({
        metadata_id: item.id,
        company_id: item.companies.id,
        org_number: item.companies.org_number,
        company_name: item.companies.name,
        industry_code: item.companies.industry_code,
        industry_description: item.companies.industry_description,
        employees: item.companies.employees,
        founding_date: item.companies.founding_date,
        contact_person: item.companies.contact_person,
        contact_person_role: item.companies.contact_person_role,
        driftsinntekter: item.companies.driftsinntekter,
        driftsresultat: item.companies.driftsresultat,
        egenkapital: item.companies.egenkapital,
        company_roles: item.companies.company_roles || [],
        for_followup: item.for_followup,
        has_potential: item.has_potential,
        in_crm: item.in_crm,
        score: item.score,
        last_viewed_at: item.last_viewed_at,
        created_at: item.created_at
      })) || [];
      
      setCompanies(transformedData);
    } catch (error) {
      console.error("Error fetching saved companies:", error);
      toast.error("Kunne ikke laste lagrede bedrifter");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...companies];

    // Apply filters
    if (searchName) {
      filtered = filtered.filter(c => 
        c.company_name.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (searchOrgNr) {
      filtered = filtered.filter(c => 
        c.org_number.includes(searchOrgNr)
      );
    }
    if (filterFollowup !== "all") {
      filtered = filtered.filter(c => 
        c.for_followup === (filterFollowup === "true")
      );
    }
    if (filterPotensial !== "all") {
      filtered = filtered.filter(c => 
        !c.has_potential === (filterPotensial === "true")
      );
    }
    if (searchContact) {
      filtered = filtered.filter(c => 
        c.contact_person?.toLowerCase().includes(searchContact.toLowerCase())
      );
    }
    if (searchSektor) {
      filtered = filtered.filter(c => 
        c.industry_description?.toLowerCase().includes(searchSektor.toLowerCase())
      );
    }
    if (filterRole !== "all") {
      filtered = filtered.filter(c => 
        c.company_roles?.includes(filterRole)
      );
    }

    // Apply sort
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal, 'no') 
            : bVal.localeCompare(aVal, 'no');
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    }

    setFilteredCompanies(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const toggleFollowup = async (company: SavedCompany) => {
    try {
      const { error } = await supabase
        .from("company_metadata")
        .update({ for_followup: !company.for_followup })
        .eq("id", company.metadata_id);

      if (error) throw error;
      
      setCompanies(prev => 
        prev.map(c => c.metadata_id === company.metadata_id ? { ...c, for_followup: !c.for_followup } : c)
      );
    } catch (error) {
      console.error("Error updating followup:", error);
      toast.error("Kunne ikke oppdatere oppfølging");
    }
  };

  const togglePotensial = async (company: SavedCompany) => {
    try {
      const { error } = await supabase
        .from("company_metadata")
        .update({ has_potential: !company.has_potential })
        .eq("id", company.metadata_id);

      if (error) throw error;
      
      setCompanies(prev => 
        prev.map(c => c.metadata_id === company.metadata_id ? { ...c, has_potential: !c.has_potential } : c)
      );
    } catch (error) {
      console.error("Error updating potensial:", error);
      toast.error("Kunne ikke oppdatere potensial");
    }
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat('no-NO').format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('no-NO');
  };

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userEmail={profile?.email} />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs />
        
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til dashboard
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Lagrede selskaper ({filteredCompanies.length})</h1>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">
              Viser {startIndex + 1}-{Math.min(endIndex, filteredCompanies.length)} av {filteredCompanies.length} selskap
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Vis:</span>
              <Button
                variant={pageSize === 25 ? "default" : "outline"}
                size="sm"
                onClick={() => setPageSize(25)}
              >
                25
              </Button>
              <Button
                variant={pageSize === 50 ? "default" : "outline"}
                size="sm"
                onClick={() => setPageSize(50)}
              >
                50
              </Button>
              <Button
                variant={pageSize === 100 ? "default" : "outline"}
                size="sm"
                onClick={() => setPageSize(100)}
              >
                100
              </Button>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Forrige
              </Button>
              <span className="text-sm">Side {currentPage} av {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Neste
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('company_name')}>
                      Selskap {getSortIcon('company_name')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[110px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('org_number')}>
                      Org.nr {getSortIcon('org_number')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[150px]">Roller</TableHead>
                  <TableHead className="min-w-[90px]">Oppføging</TableHead>
                  <TableHead className="min-w-[110px]">Ikke potensial</TableHead>
                  <TableHead className="min-w-[130px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('founding_date')}>
                      Stiftelsesdato {getSortIcon('founding_date')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px]">Kontaktperson</TableHead>
                  <TableHead className="min-w-[180px]">Sektor</TableHead>
                  <TableHead className="min-w-[90px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('employees')}>
                      Ansatte {getSortIcon('employees')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('driftsinntekter')}>
                      Driftsinntekter {getSortIcon('driftsinntekter')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('driftsresultat')}>
                      Driftsresultat {getSortIcon('driftsresultat')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[140px] text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('egenkapital')}>
                      Egenkapital {getSortIcon('egenkapital')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[90px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('score')}>
                      Score {getSortIcon('score')}
                    </Button>
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead>
                    <Input
                      placeholder="Filtrer selskap..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      placeholder="Filtrer org.nr..."
                      value={searchOrgNr}
                      onChange={(e) => setSearchOrgNr(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Alle roller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle roller</SelectItem>
                        <SelectItem value="supplier">Systemleverandør</SelectItem>
                        <SelectItem value="partner">Implementeringspartner</SelectItem>
                        <SelectItem value="customer">Kunde</SelectItem>
                        <SelectItem value="prospect">Prospekt</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead>
                    <Select value={filterFollowup} onValueChange={setFilterFollowup}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Alle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="true">Ja</SelectItem>
                        <SelectItem value="false">Nei</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead>
                    <Select value={filterPotensial} onValueChange={setFilterPotensial}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Alle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="true">Ja</SelectItem>
                        <SelectItem value="false">Nei</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead />
                  <TableHead>
                    <Input
                      placeholder="Filtrer kontaktpers..."
                      value={searchContact}
                      onChange={(e) => setSearchContact(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      placeholder="Filtrer sektor..."
                      value={searchSektor}
                      onChange={(e) => setSearchSektor(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead colSpan={5} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Ingen lagrede bedrifter funnet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCompanies.map((company) => (
                    <TableRow 
                      key={company.metadata_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/companies/${company.company_id}`)}
                    >
                      <TableCell className="font-medium text-primary">
                        {company.company_name}
                      </TableCell>
                      <TableCell>{company.org_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {company.company_roles && company.company_roles.length > 0 ? (
                            company.company_roles.map(role => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {COMPANY_ROLES[role as CompanyRole]}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={company.for_followup}
                          onCheckedChange={() => toggleFollowup(company)}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={!company.has_potential}
                          onCheckedChange={() => togglePotensial(company)}
                        />
                      </TableCell>
                      <TableCell>{formatDate(company.founding_date)}</TableCell>
                      <TableCell>{company.contact_person || "-"}</TableCell>
                      <TableCell>
                        {company.industry_code && (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {company.industry_code}
                            </Badge>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {company.industry_description}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatNumber(company.employees)}</TableCell>
                      <TableCell className="text-right">{formatNumber(company.driftsinntekter)}</TableCell>
                      <TableCell className="text-right">{formatNumber(company.driftsresultat)}</TableCell>
                      <TableCell className="text-right">{formatNumber(company.egenkapital)}</TableCell>
                      <TableCell>
                        {company.score && (
                          <Badge variant="destructive" className="rounded-full">
                            {company.score}p
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SavedCompanies;
