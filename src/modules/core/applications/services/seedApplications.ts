import pLimit from "p-limit";
import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { AuditLogService } from "@/modules/core/compliance/services/auditLogService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput, SKUInput, AppVendor, AppProduct, SKU } from "../types/application.types";
import type { RequestContext } from "@/modules/tenant/types/tenant.types";

interface SeedData {
  vendor: {
    name: string;
    slug: string;
    website?: string;
    org_number?: string;
  };
  product: Omit<AppProductInput, "vendor_id"> & { vendorSlug: string };
  skus?: Array<{ edition_name: string; code?: string; notes?: string }>;
}

interface SeedStats {
  vendors: { created: number; updated: number; skipped: number };
  products: { created: number; updated: number; skipped: number };
  skus: { created: number; skipped: number };
  errors: Array<{ vendor: string; product: string; error: string }>;
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
      { edition_name: "Essentials", code: "D365BC-ESS", notes: "Grunnleggende funksjonalitet for små bedrifter" },
      { edition_name: "Premium", code: "D365BC-PRM", notes: "Utvidet funksjonalitet inkl. produksjon og service" },
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
      { edition_name: "Finance", code: "D365FO-FIN", notes: "Kun økonomimodul" },
      { edition_name: "Supply Chain Management", code: "D365FO-SCM", notes: "Komplett supply chain" },
      { edition_name: "Commerce", code: "D365FO-COM", notes: "Retail og e-handel" },
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
      { edition_name: "Cloud Essentials", code: "S4H-CLD-ESS", notes: "SaaS-variant for midmarket" },
      { edition_name: "Cloud Extended", code: "S4H-CLD-EXT", notes: "Utvidet SaaS med tilpasninger" },
      { edition_name: "On-Premise", code: "S4H-ONPREM", notes: "Full on-prem lisens" },
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
      { edition_name: "Standard", code: "NS-STD", notes: "Basis ERP og CRM" },
      { edition_name: "OneWorld", code: "NS-OW", notes: "Multi-entity/multi-currency" },
      { edition_name: "SuiteCommerce", code: "NS-SC", notes: "Med e-handelsplattform" },
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
      { edition_name: "Basis", code: "VNET-BAS", notes: "Regnskap og fakturering" },
      { edition_name: "Standard", code: "VNET-STD", notes: "Med lager og prosjekt" },
      { edition_name: "Premium", code: "VNET-PRM", notes: "Full funksjonalitet inkl. HR" },
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
      { edition_name: "Cloud", code: "U4BW-CLD", notes: "Full cloud-versjon" },
      { edition_name: "On-Premise", code: "U4BW-ONPREM", notes: "Tradisjonell installasjon" },
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
      { edition_name: "Core", code: "XL-CORE", notes: "Basis økonomi" },
      { edition_name: "Professional", code: "XL-PRO", notes: "Med prosjektstyring" },
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
      { edition_name: "Manufacturing", code: "IFS-MFG", notes: "Produksjonsfokus" },
      { edition_name: "Service", code: "IFS-SVC", notes: "Service management fokus" },
      { edition_name: "Complete", code: "IFS-CMP", notes: "Full suite" },
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
      { edition_name: "Standard", code: "RB-STD", notes: "Produksjon og logistikk" },
      { edition_name: "Advanced", code: "RB-ADV", notes: "Utvidet supply chain" },
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
      { edition_name: "Free", code: "HS-FREE", notes: "Gratis basis CRM" },
      { edition_name: "Starter", code: "HS-STR", notes: "Basis salg og marketing" },
      { edition_name: "Professional", code: "HS-PRO", notes: "Automatisering og rapporter" },
      { edition_name: "Enterprise", code: "HS-ENT", notes: "Full funksjonalitet" },
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
      { edition_name: "Essentials", code: "SFDC-ESS", notes: "Små team" },
      { edition_name: "Professional", code: "SFDC-PRO", notes: "Komplett CRM" },
      { edition_name: "Enterprise", code: "SFDC-ENT", notes: "Tilpasbar CRM" },
      { edition_name: "Unlimited", code: "SFDC-UNL", notes: "Premium support" },
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
      { edition_name: "Professional", code: "D365S-PRO", notes: "Salgsautomatisering" },
      { edition_name: "Enterprise", code: "D365S-ENT", notes: "Full funksjonalitet" },
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
      { edition_name: "Business Basic", code: "M365-BB", notes: "Web og mobile apps" },
      { edition_name: "Business Standard", code: "M365-BS", notes: "Desktop Office apps" },
      { edition_name: "Business Premium", code: "M365-BP", notes: "Med avansert sikkerhet" },
      { edition_name: "Enterprise E3", code: "M365-E3", notes: "Enterprise features" },
      { edition_name: "Enterprise E5", code: "M365-E5", notes: "Full suite med compliance" },
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
      { edition_name: "Business Starter", code: "GW-BS", notes: "Små bedrifter" },
      { edition_name: "Business Standard", code: "GW-BST", notes: "Medium bedrifter" },
      { edition_name: "Business Plus", code: "GW-BP", notes: "Utvidet sikkerhet" },
      { edition_name: "Enterprise", code: "GW-ENT", notes: "Full enterprise features" },
    ],
  },
];

/**
 * Generate SKU code from edition name if not provided
 */
function generateSkuCode(productSlug: string, editionName: string): string {
  const prefix = productSlug
    .split("-")
    .map(p => p.charAt(0).toUpperCase())
    .join("")
    .substring(0, 6);
  
  const suffix = editionName
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase();
  
  return `${prefix}-${suffix}`;
}

/**
 * Prefetch existing data for fast lookups
 */
async function prefetchData(ctx: RequestContext): Promise<{
  vendorsByCompanyId: Map<string, AppVendor>;
  productsBySlug: Map<string, AppProduct>;
  skusByProductAndEdition: Map<string, SKU>;
}> {
  // Fetch all vendors
  const vendors = await VendorService.listVendors(ctx);
  const vendorsByCompanyId = new Map(
    vendors.map(v => [v.company_id, v])
  );

  // Fetch all products with SKUs
  const { data: products } = await ApplicationService.listProducts(ctx, { limit: 1000 });
  const productsBySlug = new Map(
    products.map(p => [p.slug, p])
  );

  // Fetch all SKUs
  const skusByProductAndEdition = new Map<string, SKU>();
  for (const product of products) {
    const skus = await ApplicationService.getSkus(ctx, product.id);
    for (const sku of skus) {
      const key = `${product.id}:${sku.edition_name}`;
      skusByProductAndEdition.set(key, sku);
    }
  }

  return { vendorsByCompanyId, productsBySlug, skusByProductAndEdition };
}

/**
 * Seed applications with robust error handling and tenant isolation
 * 
 * @param concurrency Max concurrent operations (default: 3)
 */
export async function seedApplications(
  concurrency: number = 3
): Promise<SeedStats> {
  console.log("Starting applications seed...");
  
  const startTime = Date.now();
  const stats: SeedStats = {
    vendors: { created: 0, updated: 0, skipped: 0 },
    products: { created: 0, updated: 0, skipped: 0 },
    skus: { created: 0, skipped: 0 },
    errors: [],
  };

  // Build context
  const ctx = await buildClientContext();
  
  // Prefetch existing data
  console.log("Prefetching existing data...");
  const cache = await prefetchData(ctx);
  console.log(`Loaded ${cache.vendorsByCompanyId.size} vendors, ${cache.productsBySlug.size} products, ${cache.skusByProductAndEdition.size} SKUs`);

  // Setup batching with p-limit
  const limit = pLimit(concurrency);

  // Process entries with rate limiting
  const tasks = SEED_PRODUCTS.map((entry) =>
    limit(async () => {
      try {
        // Find or create company
        let company = null;
        
        if (entry.vendor.org_number && !entry.vendor.org_number.startsWith("PLACEHOLDER-")) {
          company = await CompanyService.findByOrgNumber(entry.vendor.org_number);
        }
        
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
            // Only create placeholder if absolutely necessary
            company = await CompanyService.createCompany({
              name: entry.vendor.name,
              org_number: entry.vendor.org_number || `PLACEHOLDER-${entry.vendor.slug}`,
              website: entry.vendor.website || null,
              company_roles: ["supplier"],
              is_saved: false,
            });
          }
        }

        // Create or get vendor (with unique constraint on company_id)
        let vendor = cache.vendorsByCompanyId.get(company.id);
        if (!vendor) {
          try {
            vendor = await VendorService.createVendor(ctx, {
              company_id: company.id,
              name: company.name,
              org_number: company.org_number,
              website: company.website || entry.vendor.website,
            });
            cache.vendorsByCompanyId.set(company.id, vendor);
            stats.vendors.created++;
          } catch (error: any) {
            // Handle unique constraint violation (vendor already exists)
            if (error.code === "23505") {
              vendor = await VendorService.getVendorByCompanyId(ctx, company.id);
              stats.vendors.skipped++;
            } else {
              throw error;
            }
          }
        } else {
          stats.vendors.skipped++;
        }

        // Create or update product (with unique constraint on slug)
        const { vendorSlug, ...productData } = entry.product;
        const existingProduct = cache.productsBySlug.get(productData.slug);
        
        let product: AppProduct;
        if (existingProduct) {
          product = await ApplicationService.updateProduct(ctx, existingProduct.id, {
            ...productData,
            vendor_id: vendor!.id,
          });
          cache.productsBySlug.set(product.slug, product);
          stats.products.updated++;
        } else {
          product = await ApplicationService.createProduct(ctx, {
            ...productData,
            vendor_id: vendor!.id,
          });
          cache.productsBySlug.set(product.slug, product);
          stats.products.created++;
        }

        // Create SKUs (with unique constraint on product_id + edition_name)
        if (entry.skus && entry.skus.length > 0) {
          for (const skuData of entry.skus) {
            const key = `${product.id}:${skuData.edition_name}`;
            const existingSku = cache.skusByProductAndEdition.get(key);
            
            if (!existingSku) {
              const code = skuData.code || generateSkuCode(product.slug, skuData.edition_name);
              
              try {
                const newSku = await ApplicationService.createSku(ctx, product.id, {
                  edition_name: skuData.edition_name,
                  notes: skuData.notes,
                });
                cache.skusByProductAndEdition.set(key, newSku);
                stats.skus.created++;
              } catch (error: any) {
                // Handle unique constraint violation
                if (error.code === "23505") {
                  stats.skus.skipped++;
                } else {
                  throw error;
                }
              }
            } else {
              stats.skus.skipped++;
            }
          }
        }

        console.log(`✓ Processed: ${entry.product.name}`);
      } catch (error: any) {
        console.error(`✗ Failed to seed ${entry.product.name}:`, error.message);
        stats.errors.push({
          vendor: entry.vendor.name,
          product: entry.product.name,
          error: error.message,
        });
      }
    })
  );

  await Promise.all(tasks);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Log audit entry
  try {
    await AuditLogService.log(ctx, {
      tenant_id: ctx.tenant_id,
      user_id: ctx.user_id || "system",
      resource: "applications",
      action: "seed.applications" as any,
      after_state: stats as any,
    });
  } catch (error) {
    console.warn("Failed to log audit entry:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Applications seed completed!");
  console.log("=".repeat(60));
  console.log(`Duration: ${duration}s`);
  console.log(`Vendors: ${stats.vendors.created} created, ${stats.vendors.updated} updated, ${stats.vendors.skipped} skipped`);
  console.log(`Products: ${stats.products.created} created, ${stats.products.updated} updated, ${stats.products.skipped} skipped`);
  console.log(`SKUs: ${stats.skus.created} created, ${stats.skus.skipped} skipped`);
  
  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach(err => {
      console.log(`  - ${err.vendor} / ${err.product}: ${err.error}`);
    });
  }
  
  console.log("=".repeat(60) + "\n");

  return stats;
}
