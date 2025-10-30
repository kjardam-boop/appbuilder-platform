import { CompanyService } from "@/modules/core/company";
import { ERPSystemService } from "./erpSystemService";
import type { ERPSystemInput } from "../types/erpsystem.types";

interface SeedData {
  vendor: {
    name: string;
    slug: string;
    website?: string;
    roles?: string[];
    org_number?: string;
  };
  system: Omit<ERPSystemInput, "vendor_company_id"> & { vendorSlug: string };
}

const SEED_ERP_SYSTEMS: SeedData[] = [
  {
    vendor: {
      name: "Microsoft",
      slug: "microsoft",
      roles: ["supplier"],
      website: "https://dynamics.microsoft.com",
    },
    system: {
      name: "Dynamics 365 Business Central",
      short_name: "D365 BC",
      slug: "d365-business-central",
      vendorSlug: "microsoft",
      deployment_model: ["SaaS", "Hosted"],
      market_segment: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Logistics", "Projects", "CRM", "Reporting/BI", "Service"],
      localizations: ["NO", "SE", "DK", "FI", "GB", "DE", "NL"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
      website: "https://dynamics.microsoft.com/business-central/",
    },
  },
  {
    vendor: { name: "Microsoft", slug: "microsoft", roles: ["supplier"] },
    system: {
      name: "Dynamics 365 Finance & Operations",
      short_name: "D365 FO",
      slug: "d365-finance-operations",
      vendorSlug: "microsoft",
      deployment_model: ["SaaS"],
      market_segment: ["Midmarket", "Enterprise"],
      modules_supported: ["Finance", "Supply Chain", "Manufacturing", "Projects", "HR", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "FR", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "SAP",
      slug: "sap",
      roles: ["supplier"],
      website: "https://www.sap.com",
    },
    system: {
      name: "SAP S/4HANA",
      short_name: "S/4HANA",
      slug: "sap-s4hana",
      vendorSlug: "sap",
      deployment_model: ["SaaS", "Hybrid", "On-premises"],
      market_segment: ["Enterprise"],
      modules_supported: ["Finance", "Manufacturing", "Logistics", "Projects", "Procurement", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "Oracle",
      slug: "oracle",
      roles: ["supplier"],
      website: "https://www.oracle.com",
    },
    system: {
      name: "Oracle NetSuite",
      short_name: "NetSuite",
      slug: "oracle-netsuite",
      vendorSlug: "oracle",
      deployment_model: ["SaaS"],
      market_segment: ["Midmarket", "Enterprise"],
      modules_supported: ["Finance", "Projects", "CRM", "eCommerce", "Supply Chain", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "US", "DE", "NL"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "Unit4",
      slug: "unit4",
      roles: ["supplier"],
      website: "https://www.unit4.com",
    },
    system: {
      name: "Unit4 ERP",
      short_name: "Unit4",
      slug: "unit4-erp",
      vendorSlug: "unit4",
      deployment_model: ["SaaS", "Hosted"],
      market_segment: ["Midmarket", "Enterprise"],
      modules_supported: ["Finance", "Projects", "HR/Payroll", "Procurement", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "NL"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "Visma",
      slug: "visma",
      roles: ["supplier"],
      website: "https://www.visma.no",
      org_number: "995568217",
    },
    system: {
      name: "Visma.net ERP",
      short_name: "Visma.net",
      slug: "visma-net-erp",
      vendorSlug: "visma",
      deployment_model: ["SaaS"],
      market_segment: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Logistics", "Projects", "HR/Payroll", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "FI", "NL"],
      compliances: ["GDPR", "SAF-T NO", "A-melding"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "Xledger",
      slug: "xledger",
      roles: ["supplier"],
      website: "https://www.xledger.com",
      org_number: "980283954",
    },
    system: {
      name: "Xledger",
      slug: "xledger",
      vendorSlug: "xledger",
      deployment_model: ["SaaS"],
      market_segment: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Projects", "Reporting/BI", "Procurement"],
      localizations: ["NO", "SE", "DK", "GB", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "24SevenOffice",
      slug: "24sevenoffice",
      roles: ["supplier"],
      website: "https://24sevenoffice.com",
      org_number: "990912502",
    },
    system: {
      name: "24SevenOffice",
      slug: "24sevenoffice",
      vendorSlug: "24sevenoffice",
      deployment_model: ["SaaS"],
      market_segment: ["SMB"],
      modules_supported: ["Finance", "CRM", "Projects", "Reporting/BI", "eCommerce"],
      localizations: ["NO", "SE", "DK"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "IFS",
      slug: "ifs",
      roles: ["supplier"],
      website: "https://www.ifs.com",
    },
    system: {
      name: "IFS Cloud",
      slug: "ifs-cloud",
      vendorSlug: "ifs",
      deployment_model: ["SaaS", "Hosted"],
      market_segment: ["Midmarket", "Enterprise"],
      modules_supported: ["Manufacturing", "Asset Management", "Service", "Supply Chain", "Finance", "Projects"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "RamBase",
      slug: "rambase",
      roles: ["supplier"],
      website: "https://www.rambase.com",
      org_number: "971530278",
    },
    system: {
      name: "RamBase Cloud ERP",
      slug: "rambase-cloud-erp",
      vendorSlug: "rambase",
      deployment_model: ["SaaS"],
      market_segment: ["SMB", "Midmarket"],
      modules_supported: ["Manufacturing", "Supply Chain", "Finance", "Quality", "Service"],
      localizations: ["NO", "SE", "DK", "GB"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
];

export async function seedErpSystems(): Promise<void> {
  console.log("Starting ERP systems seed...");

  for (const entry of SEED_ERP_SYSTEMS) {
    try {
      // Find or create vendor company
      let vendor = await CompanyService.findByOrgNumber(entry.vendor.org_number || "");
      
      if (!vendor) {
        // Try finding by name
        const companies = await CompanyService.searchBrreg(entry.vendor.name);
        const match = companies?.find((c) => c.name.toLowerCase() === entry.vendor.name.toLowerCase());
        
        if (match) {
          vendor = await CompanyService.createCompany({
            name: match.name,
            org_number: match.orgNumber,
            org_form: match.orgForm,
            industry_code: match.industryCode,
            industry_description: match.industryDescription,
            employees: match.employees,
            founding_date: match.foundingDate,
            website: entry.vendor.website || match.website,
            company_roles: entry.vendor.roles || ["supplier"],
            is_saved: false,
          }, 'default');
        } else {
          // Create placeholder company
          vendor = await CompanyService.createCompany({
            name: entry.vendor.name,
            org_number: entry.vendor.org_number || `PLACEHOLDER-${entry.vendor.slug}`,
            website: entry.vendor.website || null,
            company_roles: entry.vendor.roles || ["supplier"],
            is_saved: false,
          }, 'default');
        }
      } else {
        // Ensure vendor has supplier role
        if (!vendor.company_roles.includes("supplier")) {
          await CompanyService.updateCompanyRoles(vendor.id, [...vendor.company_roles, "supplier"]);
        }
      }

      // Create or update ERP system
      const { vendorSlug, ...systemData } = entry.system;
      await ERPSystemService.upsertBySlug(systemData.slug, {
        ...systemData,
        vendor_company_id: vendor.id,
      });

      console.log(`✓ Seeded: ${entry.system.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${entry.system.name}:`, error);
    }
  }

  console.log("ERP systems seed completed!");
}