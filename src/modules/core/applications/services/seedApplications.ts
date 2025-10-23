import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput } from "../types/application.types";

interface SeedData {
  vendor: {
    name: string;
    slug: string;
    website?: string;
    org_number?: string;
  };
  product: Omit<AppProductInput, "vendor_id"> & { vendorSlug: string };
}

const SEED_PRODUCTS: SeedData[] = [
  {
    vendor: {
      name: "Microsoft",
      slug: "microsoft",
      website: "https://dynamics.microsoft.com",
    },
    product: {
      name: "Dynamics 365 Business Central",
      short_name: "D365 BC",
      slug: "d365-business-central",
      vendorSlug: "microsoft",
      app_type: "ERP",
      deployment_models: ["SaaS", "Hosted"],
      market_segments: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Logistics", "Projects", "CRM", "Reporting/BI", "Service"],
      localizations: ["NO", "SE", "DK", "FI", "GB", "DE", "NL"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
      website: "https://dynamics.microsoft.com/business-central/",
    },
  },
  {
    vendor: { name: "Microsoft", slug: "microsoft" },
    product: {
      name: "Dynamics 365 Finance & Operations",
      short_name: "D365 FO",
      slug: "d365-finance-operations",
      vendorSlug: "microsoft",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["Midmarket", "Enterprise"],
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
      website: "https://www.sap.com",
    },
    product: {
      name: "SAP S/4HANA",
      short_name: "S/4HANA",
      slug: "sap-s4hana",
      vendorSlug: "sap",
      app_type: "ERP",
      deployment_models: ["SaaS", "Hybrid", "On-premises"],
      market_segments: ["Enterprise"],
      modules_supported: ["Finance", "Manufacturing", "Logistics", "Projects", "Procurement", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
  {
    vendor: {
      name: "Visma",
      slug: "visma",
      website: "https://www.visma.no",
      org_number: "995568217",
    },
    product: {
      name: "Visma.net ERP",
      short_name: "Visma.net",
      slug: "visma-net-erp",
      vendorSlug: "visma",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Logistics", "Projects", "HR/Payroll", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "FI", "NL"],
      compliances: ["GDPR", "SAF-T NO", "A-melding"],
      pricing_model: "Subscription",
      status: "Active",
    },
  },
];

export async function seedApplications(): Promise<void> {
  console.log("Starting applications seed...");
  const ctx = buildClientContext();

  for (const entry of SEED_PRODUCTS) {
    try {
      // Find or create company
      let company = await CompanyService.findByOrgNumber(entry.vendor.org_number || "");
      
      if (!company) {
        const companies = await CompanyService.searchBrreg(entry.vendor.name);
        const match = companies?.find((c) => c.name.toLowerCase() === entry.vendor.name.toLowerCase());
        
        if (match) {
          company = await CompanyService.createCompany({
            name: match.name,
            org_number: match.orgNumber,
            org_form: match.orgForm,
            industry_code: match.industryCode,
            industry_description: match.industryDescription,
            employees: match.employees,
            founding_date: match.foundingDate,
            website: entry.vendor.website || match.website,
            company_roles: ["supplier"],
            is_saved: false,
          });
        } else {
          company = await CompanyService.createCompany({
            name: entry.vendor.name,
            org_number: entry.vendor.org_number || `PLACEHOLDER-${entry.vendor.slug}`,
            website: entry.vendor.website || null,
            company_roles: ["supplier"],
            is_saved: false,
          });
        }
      }

      // Create or get vendor
      let vendor = await VendorService.getVendorByCompanyId(ctx, company.id);
      if (!vendor) {
        vendor = await VendorService.createVendor(ctx, {
          company_id: company.id,
          name: company.name,
          org_number: company.org_number,
          website: company.website || entry.vendor.website,
        });
      }

      // Create or update product
      const { vendorSlug, ...productData } = entry.product;
      await ApplicationService.upsertBySlug(ctx, productData.slug, {
        ...productData,
        vendor_id: vendor.id,
      });

      console.log(`✓ Seeded: ${entry.product.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${entry.product.name}:`, error);
    }
  }

  console.log("Applications seed completed!");
}
