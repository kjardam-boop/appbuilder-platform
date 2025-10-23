import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput, SKUInput } from "../types/application.types";

interface SeedData {
  vendor: {
    name: string;
    slug: string;
    website?: string;
    org_number?: string;
  };
  product: Omit<AppProductInput, "vendor_id"> & { vendorSlug: string };
  skus?: { edition_name: string; notes?: string }[];
}

const SEED_PRODUCTS: SeedData[] = [
  // Microsoft ERP
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
    skus: [
      { edition_name: "Essentials", notes: "Grunnleggende funksjonalitet for små bedrifter" },
      { edition_name: "Premium", notes: "Utvidet funksjonalitet inkl. produksjon og service" },
    ],
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
    skus: [
      { edition_name: "Finance", notes: "Kun økonomimodul" },
      { edition_name: "Supply Chain Management", notes: "Komplett supply chain" },
      { edition_name: "Commerce", notes: "Retail og e-handel" },
    ],
  },
  // SAP ERP
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
    skus: [
      { edition_name: "Cloud Essentials", notes: "SaaS-variant for midmarket" },
      { edition_name: "Cloud Extended", notes: "Utvidet SaaS med tilpasninger" },
      { edition_name: "On-Premise", notes: "Full on-prem lisens" },
    ],
  },
  // Oracle ERP
  {
    vendor: {
      name: "Oracle",
      slug: "oracle",
      website: "https://www.oracle.com",
    },
    product: {
      name: "Oracle NetSuite",
      short_name: "NetSuite",
      slug: "oracle-netsuite",
      vendorSlug: "oracle",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      modules_supported: ["Finance", "CRM", "eCommerce", "PSA", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR"],
      pricing_model: "Subscription",
      status: "Active",
      website: "https://www.netsuite.com",
    },
    skus: [
      { edition_name: "Standard", notes: "Basis ERP og CRM" },
      { edition_name: "OneWorld", notes: "Multi-entity/multi-currency" },
      { edition_name: "SuiteCommerce", notes: "Med e-handelsplattform" },
    ],
  },
  // Visma ERP
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
    skus: [
      { edition_name: "Basis", notes: "Regnskap og fakturering" },
      { edition_name: "Standard", notes: "Med lager og prosjekt" },
      { edition_name: "Premium", notes: "Full funksjonalitet inkl. HR" },
    ],
  },
  // Unit4 ERP
  {
    vendor: {
      name: "Unit4",
      slug: "unit4",
      website: "https://www.unit4.com",
    },
    product: {
      name: "Unit4 Business World",
      short_name: "U4BW",
      slug: "unit4-business-world",
      vendorSlug: "unit4",
      app_type: "ERP",
      deployment_models: ["SaaS", "On-premises"],
      market_segments: ["Midmarket", "Enterprise"],
      modules_supported: ["Finance", "Projects", "HR/Payroll", "Procurement"],
      localizations: ["NO", "SE", "DK", "GB", "NL"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Cloud", notes: "Full cloud-versjon" },
      { edition_name: "On-Premise", notes: "Tradisjonell installasjon" },
    ],
  },
  // Xledger ERP
  {
    vendor: {
      name: "Xledger",
      slug: "xledger",
      website: "https://www.xledger.com",
    },
    product: {
      name: "Xledger ERP",
      short_name: "Xledger",
      slug: "xledger-erp",
      vendorSlug: "xledger",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Projects", "Reporting/BI"],
      localizations: ["NO", "SE", "DK", "GB", "US"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Core", notes: "Basis økonomi" },
      { edition_name: "Professional", notes: "Med prosjektstyring" },
    ],
  },
  // IFS ERP
  {
    vendor: {
      name: "IFS",
      slug: "ifs",
      website: "https://www.ifs.com",
    },
    product: {
      name: "IFS Cloud",
      short_name: "IFS Cloud",
      slug: "ifs-cloud",
      vendorSlug: "ifs",
      app_type: "ERP",
      deployment_models: ["SaaS", "On-premises"],
      market_segments: ["Midmarket", "Enterprise"],
      modules_supported: ["Finance", "Manufacturing", "Service", "Projects", "Supply Chain"],
      localizations: ["NO", "SE", "DK", "GB"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Manufacturing", notes: "Produksjonsfokus" },
      { edition_name: "Service", notes: "Service management fokus" },
      { edition_name: "Complete", notes: "Full suite" },
    ],
  },
  // RamBase ERP
  {
    vendor: {
      name: "RamBase",
      slug: "rambase",
      website: "https://www.rambase.com",
    },
    product: {
      name: "RamBase ERP",
      short_name: "RamBase",
      slug: "rambase-erp",
      vendorSlug: "rambase",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      modules_supported: ["Finance", "Manufacturing", "Supply Chain", "Logistics"],
      localizations: ["NO", "SE", "DK"],
      compliances: ["GDPR", "SAF-T NO"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Standard", notes: "Produksjon og logistikk" },
      { edition_name: "Advanced", notes: "Utvidet supply chain" },
    ],
  },
  // CRM Systems
  {
    vendor: {
      name: "HubSpot",
      slug: "hubspot",
      website: "https://www.hubspot.com",
    },
    product: {
      name: "HubSpot CRM",
      short_name: "HubSpot",
      slug: "hubspot-crm",
      vendorSlug: "hubspot",
      app_type: "CRM",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      modules_supported: ["Sales", "Marketing", "Service", "CMS"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR"],
      pricing_model: "Freemium + Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Free", notes: "Gratis basis CRM" },
      { edition_name: "Starter", notes: "Basis salg og marketing" },
      { edition_name: "Professional", notes: "Automatisering og rapporter" },
      { edition_name: "Enterprise", notes: "Full funksjonalitet" },
    ],
  },
  {
    vendor: {
      name: "Salesforce",
      slug: "salesforce",
      website: "https://www.salesforce.com",
    },
    product: {
      name: "Salesforce Sales Cloud",
      short_name: "Sales Cloud",
      slug: "salesforce-sales-cloud",
      vendorSlug: "salesforce",
      app_type: "CRM",
      deployment_models: ["SaaS"],
      market_segments: ["Midmarket", "Enterprise"],
      modules_supported: ["Sales", "Service", "Marketing", "Analytics"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Essentials", notes: "Små team" },
      { edition_name: "Professional", notes: "Komplett CRM" },
      { edition_name: "Enterprise", notes: "Tilpasbar CRM" },
      { edition_name: "Unlimited", notes: "Premium support" },
    ],
  },
  {
    vendor: { name: "Microsoft", slug: "microsoft" },
    product: {
      name: "Dynamics 365 Sales",
      short_name: "D365 Sales",
      slug: "d365-sales",
      vendorSlug: "microsoft",
      app_type: "CRM",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      modules_supported: ["Sales", "Marketing", "Service"],
      localizations: ["NO", "SE", "DK", "GB", "US"],
      compliances: ["GDPR"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Professional", notes: "Salgsautomatisering" },
      { edition_name: "Enterprise", notes: "Full funksjonalitet" },
    ],
  },
  // Email Suites
  {
    vendor: { name: "Microsoft", slug: "microsoft" },
    product: {
      name: "Microsoft 365",
      short_name: "M365",
      slug: "microsoft-365",
      vendorSlug: "microsoft",
      app_type: "EmailSuite",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      modules_supported: ["Email", "Calendar", "Office Apps", "Teams", "OneDrive"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR"],
      pricing_model: "Subscription",
      status: "Active",
      website: "https://www.microsoft365.com",
    },
    skus: [
      { edition_name: "Business Basic", notes: "Web og mobile apps" },
      { edition_name: "Business Standard", notes: "Desktop Office apps" },
      { edition_name: "Business Premium", notes: "Med avansert sikkerhet" },
      { edition_name: "Enterprise E3", notes: "Enterprise features" },
      { edition_name: "Enterprise E5", notes: "Full suite med compliance" },
    ],
  },
  {
    vendor: {
      name: "Google",
      slug: "google",
      website: "https://workspace.google.com",
    },
    product: {
      name: "Google Workspace",
      short_name: "Workspace",
      slug: "google-workspace",
      vendorSlug: "google",
      app_type: "EmailSuite",
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      modules_supported: ["Gmail", "Calendar", "Drive", "Meet", "Docs"],
      localizations: ["NO", "SE", "DK", "GB", "DE", "US"],
      compliances: ["GDPR"],
      pricing_model: "Subscription",
      status: "Active",
    },
    skus: [
      { edition_name: "Business Starter", notes: "Små bedrifter" },
      { edition_name: "Business Standard", notes: "Medium bedrifter" },
      { edition_name: "Business Plus", notes: "Utvidet sikkerhet" },
      { edition_name: "Enterprise", notes: "Full enterprise features" },
    ],
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
      const product = await ApplicationService.upsertBySlug(ctx, productData.slug, {
        ...productData,
        vendor_id: vendor.id,
      });

      // Create SKUs if provided
      if (entry.skus && entry.skus.length > 0) {
        const existingSkus = await ApplicationService.getSkus(ctx, product.id);
        
        for (const skuData of entry.skus) {
          const existingSku = existingSkus.find(s => s.edition_name === skuData.edition_name);
          if (!existingSku) {
            await ApplicationService.createSku(ctx, product.id, skuData);
            console.log(`  ✓ Created SKU: ${skuData.edition_name}`);
          }
        }
      }

      console.log(`✓ Seeded: ${entry.product.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed ${entry.product.name}:`, error);
    }
  }

  console.log("Applications seed completed!");
}
