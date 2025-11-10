// @ts-nocheck
import { useState, useEffect } from "react";
import { Building2, Wrench, Users, Target, ChevronDown, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SupplierERPSystems } from "./SupplierERPSystems";
import { CustomerERPUsage } from "./CustomerERPUsage";
import { Company, CompanyMetadata, EnhancedCompanyData, FinancialData, COMPANY_ROLES } from "@/modules/core/company/types/company.types";
import { useAppProducts, usePartnerCertifications } from "@/modules/core/applications";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface RoleBasedContentProps {
  company: Company;
  currentRoles: string[];
  enhancedData?: EnhancedCompanyData | null;
  financialData?: FinancialData | null;
  metadata?: CompanyMetadata | null;
  onUpdateMetadata?: (updates: Partial<CompanyMetadata>) => Promise<void>;
}

export function RoleBasedContent({ 
  company, 
  currentRoles, 
  metadata,
  onUpdateMetadata 
}: RoleBasedContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { data: appProductsData } = useAppProducts();
  const { data: certifications } = usePartnerCertifications(company.id);

  // Auto-expand if only one role
  useEffect(() => {
    if (currentRoles.length === 1) {
      setExpandedSections({ [currentRoles[0]]: true });
    }
  }, [currentRoles]);

  if (!currentRoles || currentRoles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Ingen roller definert. Legg til roller ovenfor for å se relevant innhold.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleSection = (role: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  const supplierSystemsCount = appProductsData?.data?.filter(
    product => product.vendor?.company_id === company.id
  ).length || 0;
  const certificationsCount = certifications?.length || 0;

  const roleConfigs = {
    supplier: {
      icon: Building2,
      title: "Systemleverandør",
      description: "Utvikler og lisenserer ERP-systemer",
      badge: supplierSystemsCount > 0 ? `${supplierSystemsCount} system${supplierSystemsCount !== 1 ? 'er' : ''}` : null,
      content: <SupplierERPSystems companyId={company.id} />
    },
    partner: {
      icon: Wrench,
      title: "Implementeringspartner",
      description: "Implementerer og tilpasser ERP-løsninger",
      badge: certificationsCount > 0 ? `${certificationsCount} sertifisering${certificationsCount !== 1 ? 'er' : ''}` : null,
      content: (
        <div className="space-y-3">
          {certifications && certifications.length > 0 ? (
            certifications.map((cert) => (
              <Card key={cert.id}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          <Link 
                            to={`/applications/${cert.external_system?.id}`}
                            className="hover:underline"
                          >
                            {cert.external_system?.name}
                          </Link>
                        </CardTitle>
                      {cert.certification_level && (
                        <Badge variant="secondary" className="text-xs">
                          {cert.certification_level}
                        </Badge>
                      )}
                    </div>
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                {(cert.certification_date || cert.notes) && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {cert.certification_date && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Sertifisert:</span>{" "}
                          {new Date(cert.certification_date).toLocaleDateString('nb-NO')}
                        </p>
                      )}
                      {cert.notes && (
                        <p className="text-sm text-muted-foreground">
                          {cert.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ingen partnersertifiseringer registrert
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )
    },
    customer: {
      icon: Users,
      title: "Kunde",
      description: "Bruker av ERP-systemer",
      badge: null,
      content: <CustomerERPUsage companyId={company.id} />
    },
    prospect: {
      icon: Target,
      title: "Prospekt",
      description: "Potensiell kunde",
      badge: null,
      content: (
        <div className="space-y-4">
          {/* Vurdering for innsalg */}
          <Card>
            <CardHeader>
              <CardTitle>Vurdering for innsalg</CardTitle>
              <CardDescription>Basert på nøkkelindikatorer for salgsopportunitet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Innsalg-vurdering</span>
                  {metadata?.priority_level && (
                    <Badge className={cn(
                      metadata.priority_level === 'low' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                      metadata.priority_level === 'medium' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-500/10 text-red-700 dark:text-red-400'
                    )}>
                      {metadata.priority_level === 'low' ? 'Lav prioritet' : 
                       metadata.priority_level === 'medium' ? 'Medium prioritet' :
                       'Høy prioritet'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-primary">
                    {metadata?.sales_assessment_score || 0}
                  </div>
                  <span className="text-muted-foreground">av 100 poeng</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ansatte:</span>
                  <span className="font-medium">{company.employees || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Neste steg */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Neste steg</CardTitle>
              <CardDescription>Planlegg oppfølging og aktiviteter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_potential"
                  checked={metadata?.has_potential || false}
                  onChange={(e) => onUpdateMetadata?.({ has_potential: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="has_potential" className="text-sm cursor-pointer">
                  Har potensial
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="for_followup"
                  checked={metadata?.for_followup || false}
                  onChange={(e) => onUpdateMetadata?.({ for_followup: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="for_followup" className="text-sm cursor-pointer">
                  For oppfølging
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="in_crm"
                  checked={metadata?.in_crm || false}
                  onChange={(e) => onUpdateMetadata?.({ in_crm: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="in_crm" className="text-sm cursor-pointer">
                  I CRM-system
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  };

  return (
    <div className="space-y-3">
      {currentRoles.map((role) => {
        const config = roleConfigs[role as keyof typeof roleConfigs];
        if (!config) return null;

        const Icon = config.icon;
        const isExpanded = expandedSections[role];

        return (
          <Collapsible
            key={role}
            open={isExpanded}
            onOpenChange={() => toggleSection(role)}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <CardTitle className="text-base">{config.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {config.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {config.badge}
                        </Badge>
                      )}
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "transform rotate-180"
                        )}
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {config.content}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
