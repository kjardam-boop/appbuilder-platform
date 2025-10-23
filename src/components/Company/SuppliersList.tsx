import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Mail, Phone, User, FolderOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  is_primary: boolean;
}

interface Project {
  id: string;
  title: string;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  org_number: string;
  industry_description?: string;
  contacts: Contact[];
  projects: Project[];
}

export default function SuppliersList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);

      // Fetch unique company IDs from project_suppliers
      const { data: projectSuppliers, error: psError } = await supabase
        .from("project_suppliers")
        .select("company_id");

      if (psError) throw psError;

      if (!projectSuppliers || projectSuppliers.length === 0) {
        setSuppliers([]);
        return;
      }

      const uniqueCompanyIds = [...new Set(projectSuppliers.map(ps => ps.company_id))];

      // Fetch companies that are suppliers
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, org_number, industry_description")
        .in("id", uniqueCompanyIds);

      if (companiesError) throw companiesError;

      if (!companies || companies.length === 0) {
        setSuppliers([]);
        return;
      }

      // Fetch contacts for all suppliers
      const { data: contacts, error: contactsError } = await supabase
        .from("supplier_contacts")
        .select("id, company_id, name, email, phone, role, is_primary")
        .in("company_id", companies.map(c => c.id));

      if (contactsError) throw contactsError;

      // Fetch projects for all suppliers
      const { data: projectSuppliersData, error: projectSuppliersError } = await supabase
        .from("project_suppliers")
        .select(`
          company_id,
          status,
          project:projects(id, title)
        `)
        .in("company_id", companies.map(c => c.id));

      if (projectSuppliersError) throw projectSuppliersError;

      // Combine data
      const suppliersData: Supplier[] = companies.map(company => ({
        id: company.id,
        name: company.name,
        org_number: company.org_number,
        industry_description: company.industry_description,
        contacts: contacts?.filter(c => c.company_id === company.id) || [],
        projects: projectSuppliersData
          ?.filter(ps => ps.company_id === company.id && ps.project)
          .map(ps => ({
            id: ps.project.id,
            title: ps.project.title,
            status: ps.status,
          })) || [],
      }));

      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Ingen selskaper registrert ennå</p>
          <p className="text-sm text-muted-foreground mb-4">
            Selskaper med roller som systemleverandør eller implementeringspartner vises her
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suppliers.map((supplier) => (
        <Collapsible key={supplier.id}>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{supplier.name}</CardTitle>
                    <Badge variant="outline">{supplier.org_number}</Badge>
                  </div>
                  {supplier.industry_description && (
                    <CardDescription className="mt-1">
                      {supplier.industry_description}
                    </CardDescription>
                  )}
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Detaljer
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Contacts Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Kontaktpersoner ({supplier.contacts.length})
                  </h4>
                  {supplier.contacts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Navn</TableHead>
                          <TableHead>E-post</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Rolle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplier.contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {contact.name}
                                {contact.is_primary && (
                                  <Badge variant="secondary" className="text-xs">
                                    Primær
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {contact.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {contact.phone}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {contact.role || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ingen kontaktpersoner registrert
                    </p>
                  )}
                </div>

                {/* Projects Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Prosjekter ({supplier.projects.length})
                  </h4>
                  {supplier.projects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {supplier.projects.map((project) => (
                        <Button
                          key={project.id}
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/project/${project.id}`)}
                          className="gap-2"
                        >
                          {project.title}
                          <Badge variant="secondary" className="text-xs">
                            {project.status}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ikke koblet til noen prosjekter
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
