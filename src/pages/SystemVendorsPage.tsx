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
  Building,
  ArrowLeft
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CompanyService } from "@/modules/core/company/services/companyService";
import { EnhancedVendorDialog } from "@/modules/core/applications/components/EnhancedVendorDialog";
import { Plus } from "lucide-react";

interface SystemVendor {
  id: string;
  name: string;
  org_number: string;
  industry_description: string | null;
  employees: number | null;
  driftsinntekter: number | null;
  website: string | null;
  company_roles: string[];
  erp_count?: number;
}

type SortField = 'name' | 'org_number' | 'industry_description' | 'employees' | 'driftsinntekter' | 'erp_count';
type SortDirection = 'asc' | 'desc' | null;

const SystemVendorsPage = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<SystemVendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<SystemVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Filters
  const [searchName, setSearchName] = useState("");
  const [searchOrgNr, setSearchOrgNr] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [filterHasProducts, setFilterHasProducts] = useState<string>("all");
  
  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Pagination
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [vendors, searchName, searchOrgNr, searchIndustry, filterHasProducts, sortField, sortDirection]);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const companies = await CompanyService.getCompaniesByRole('external_system_vendor');
      
      // Enrich with ERP system count
      const enrichedVendors = await Promise.all(
        companies.map(async (company) => {
          const { count } = await supabase
            .from('erp_systems')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_company_id', company.id);
          
          return {
            ...company,
            erp_count: count || 0
          };
        })
      );
      
      setVendors(enrichedVendors as SystemVendor[]);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Kunne ikke laste systemleverandører");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...vendors];

    if (searchName) {
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (searchOrgNr) {
      filtered = filtered.filter(v => 
        v.org_number.includes(searchOrgNr)
      );
    }
    if (searchIndustry) {
      filtered = filtered.filter(v => 
        v.industry_description?.toLowerCase().includes(searchIndustry.toLowerCase())
      );
    }
    if (filterHasProducts === "with_products") {
      filtered = filtered.filter(v => (v.erp_count ?? 0) > 0);
    } else if (filterHasProducts === "without_products") {
      filtered = filtered.filter(v => (v.erp_count ?? 0) === 0);
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

    setFilteredVendors(filtered);
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
  const totalPages = Math.ceil(filteredVendors.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedVendors = filteredVendors.slice(startIndex, endIndex);

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">Systemleverandører ({filteredVendors.length})</h1>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny leverandør
            </Button>
          </div>
          <p className="text-muted-foreground mb-4">
            Selskaper som utvikler og lisenserer ERP-systemer
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Totalt antall</CardDescription>
                <CardTitle className="text-3xl">{filteredVendors.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Med ERP-produkter</CardDescription>
                <CardTitle className="text-3xl">{filteredVendors.filter(v => (v.erp_count ?? 0) > 0).length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Totalt ERP-produkter</CardDescription>
                <CardTitle className="text-3xl">{filteredVendors.reduce((sum, v) => sum + (v.erp_count ?? 0), 0)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">
              Viser {startIndex + 1}-{Math.min(endIndex, filteredVendors.length)} av {filteredVendors.length} leverandører
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
                  <TableHead className="min-w-[100px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('erp_count')}>
                      ERP-produkter {getSortIcon('erp_count')}
                    </Button>
                  </TableHead>
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
                  <TableHead className="min-w-[150px]">Handlinger</TableHead>
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
                  <TableHead>
                    <Select value={filterHasProducts} onValueChange={setFilterHasProducts}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="with_products">Med produkter</SelectItem>
                        <SelectItem value="without_products">Uten produkter</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead colSpan={2}></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.org_number}</TableCell>
                    <TableCell>{vendor.industry_description || "-"}</TableCell>
                    <TableCell>{vendor.erp_count}</TableCell>
                    <TableCell>{formatNumber(vendor.employees)}</TableCell>
                    <TableCell className="text-right">{formatNumber(vendor.driftsinntekter)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.company_roles.includes('external_system_vendor') && (
                          <Badge variant="secondary">Systemleverandør</Badge>
                        )}
                        {vendor.company_roles.includes('partner') && (
                          <Badge variant="outline">Partner</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/external-systems/vendors/${vendor.id}`);
                          }}
                        >
                          Detaljer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/external-systems?vendor=${vendor.id}`);
                          }}
                        >
                          Produkter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <EnhancedVendorDialog
        open={isCreateDialogOpen}
        suggestedName=""
        onCreated={(vendorId, vendorName) => {
          setIsCreateDialogOpen(false);
          fetchVendors();
          toast.success(`Systemleverandør "${vendorName}" opprettet`);
        }}
        onCancel={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
};

export default SystemVendorsPage;
