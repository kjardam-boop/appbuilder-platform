import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, CheckCircle2, XCircle, Award } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  org_number: string | null;
  website: string | null;
  industry_description: string | null;
  company_roles: string[] | null;
  is_approved_supplier: boolean | null;
  supplier_certifications: string[] | null;
  employees: number | null;
  driftsinntekter: number | null;
}

type SortField = "name" | "org_number" | "industry_description" | "employees" | "driftsinntekter";
type SortDirection = "asc" | "desc" | null;

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchOrgNumber, setSearchOrgNumber] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [filterApproved, setFilterApproved] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [suppliers, searchName, searchOrgNumber, searchIndustry, filterApproved, sortField, sortDirection]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, org_number, website, industry_description, company_roles, is_approved_supplier, supplier_certifications, employees, driftsinntekter")
        .contains("company_roles", ["supplier"])
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
      toast.error("Kunne ikke laste leverandører");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...suppliers];

    // Apply filters
    if (searchName) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (searchOrgNumber) {
      filtered = filtered.filter((s) =>
        s.org_number?.includes(searchOrgNumber)
      );
    }
    if (searchIndustry) {
      filtered = filtered.filter((s) =>
        s.industry_description?.toLowerCase().includes(searchIndustry.toLowerCase())
      );
    }
    if (filterApproved !== "all") {
      const isApproved = filterApproved === "approved";
      filtered = filtered.filter((s) => s.is_approved_supplier === isApproved);
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    }

    setFilteredSuppliers(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "N/A";
    return new Intl.NumberFormat("no-NO").format(num);
  };

  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(startIndex, startIndex + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Leverandører</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Administrer leverandører for evaluering og anbudsrunder
          </p>
        </div>
        <Button onClick={() => navigate("/companies/search")}>
          Legg til leverandør
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Søk på navn..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <Input
            placeholder="Søk på org.nr..."
            value={searchOrgNumber}
            onChange={(e) => setSearchOrgNumber(e.target.value)}
          />
          <Input
            placeholder="Søk på bransje..."
            value={searchIndustry}
            onChange={(e) => setSearchIndustry(e.target.value)}
          />
          <Select value={filterApproved} onValueChange={setFilterApproved}>
            <SelectTrigger>
              <SelectValue placeholder="Godkjenningsstatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="approved">Godkjent</SelectItem>
              <SelectItem value="not_approved">Ikke godkjent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="hover:bg-transparent"
                  >
                    Navn {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("org_number")}
                    className="hover:bg-transparent"
                  >
                    Org.nr {getSortIcon("org_number")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("industry_description")}
                    className="hover:bg-transparent"
                  >
                    Bransje {getSortIcon("industry_description")}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sertifiseringer</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("employees")}
                    className="hover:bg-transparent"
                  >
                    Ansatte {getSortIcon("employees")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("driftsinntekter")}
                    className="hover:bg-transparent"
                  >
                    Omsetning {getSortIcon("driftsinntekter")}
                  </Button>
                </TableHead>
                <TableHead>Roller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Ingen leverandører funnet
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/companies/${supplier.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {supplier.name}
                        {supplier.website && (
                          <a
                            href={supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.org_number || "N/A"}</TableCell>
                    <TableCell>{supplier.industry_description || "N/A"}</TableCell>
                    <TableCell>
                      {supplier.is_approved_supplier ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Godkjent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Ikke godkjent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.supplier_certifications && supplier.supplier_certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {supplier.supplier_certifications.map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs gap-1">
                              <Award className="h-3 w-3" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatNumber(supplier.employees)}</TableCell>
                    <TableCell>
                      {supplier.driftsinntekter
                        ? `${formatNumber(supplier.driftsinntekter)} kr`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.company_roles?.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Vis per side:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Forrige
            </Button>
            <span className="text-sm text-muted-foreground">
              Side {currentPage} av {totalPages || 1} ({filteredSuppliers.length} totalt)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Neste
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
