// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Dashboard/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { CompanyService } from "@/modules/company/services/companyService";

interface ImplementationPartner {
  id: string;
  name: string;
  org_number: string;
  industry_description: string | null;
  employees: number | null;
  driftsinntekter: number | null;
  website: string | null;
  company_roles: string[];
  certifications?: Array<{
    erp_system_name: string;
    certification_level: string | null;
  }>;
}

type SortField = 'name' | 'org_number' | 'industry_description' | 'employees' | 'driftsinntekter';
type SortDirection = 'asc' | 'desc' | null;

const ImplementationPartnersPage = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<ImplementationPartner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<ImplementationPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchName, setSearchName] = useState("");
  const [searchOrgNr, setSearchOrgNr] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  
  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [partners, searchName, searchOrgNr, searchIndustry, sortField, sortDirection]);

  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const companies = await CompanyService.getCompaniesByRole('partner');
      
      // Enrich with certifications
      const enrichedPartners = await Promise.all(
        companies.map(async (company) => {
          const { data: certifications } = await supabase
            .from('partner_certifications')
            .select(`
              certification_level,
              erp_systems (
                name
              )
            `)
            .eq('partner_company_id', company.id);
          
          return {
            ...company,
            certifications: certifications?.map(cert => ({
              erp_system_name: (cert.erp_systems as any)?.name || 'Unknown',
              certification_level: cert.certification_level
            })) || []
          };
        })
      );
      
      setPartners(enrichedPartners as ImplementationPartner[]);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Kunne ikke laste implementeringspartnere");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...partners];

    if (searchName) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (searchOrgNr) {
      filtered = filtered.filter(p => 
        p.org_number.includes(searchOrgNr)
      );
    }
    if (searchIndustry) {
      filtered = filtered.filter(p => 
        p.industry_description?.toLowerCase().includes(searchIndustry.toLowerCase())
      );
    }

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

    setFilteredPartners(filtered);
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

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat('no-NO').format(num);
  };

  // Pagination
  const totalPages = Math.ceil(filteredPartners.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPartners = filteredPartners.slice(startIndex, endIndex);

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
      <Header />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs />
        
        <Button
          variant="ghost"
          onClick={() => navigate("/companies")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til oversikt
        </Button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Implementeringspartnere ({filteredPartners.length})</h1>
          </div>
          <p className="text-muted-foreground mb-4">
            Selskaper som implementerer ERP-systemer
          </p>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">
              Viser {startIndex + 1}-{Math.min(endIndex, filteredPartners.length)} av {filteredPartners.length} partnere
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
                  <TableHead className="min-w-[200px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                      Selskap {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('org_number')}>
                      Org.nr {getSortIcon('org_number')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[180px]">Bransje</TableHead>
                  <TableHead className="min-w-[200px]">Sertifiseringer</TableHead>
                  <TableHead className="min-w-[100px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('employees')}>
                      Ansatte {getSortIcon('employees')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[150px] text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('driftsinntekter')}>
                      Omsetning {getSortIcon('driftsinntekter')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[100px]">Roller</TableHead>
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
                    <Input
                      placeholder="Filtrer bransje..."
                      value={searchIndustry}
                      onChange={(e) => setSearchIndustry(e.target.value)}
                      className="h-8"
                    />
                  </TableHead>
                  <TableHead colSpan={4}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPartners.map((partner) => (
                  <TableRow
                    key={partner.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/company/${partner.id}`)}
                  >
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>{partner.org_number}</TableCell>
                    <TableCell>{partner.industry_description || "-"}</TableCell>
                    <TableCell>
                      {partner.certifications && partner.certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {partner.certifications.map((cert, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {cert.erp_system_name}
                              {cert.certification_level && ` (${cert.certification_level})`}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatNumber(partner.employees)}</TableCell>
                    <TableCell className="text-right">{formatNumber(partner.driftsinntekter)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {partner.company_roles.includes('partner') && (
                          <Badge variant="secondary">Partner</Badge>
                        )}
                        {partner.company_roles.includes('supplier') && (
                          <Badge variant="outline">Systemleverandør</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImplementationPartnersPage;
