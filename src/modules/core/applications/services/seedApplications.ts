import pLimit from "p-limit";
import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContextSync } from "@/shared/lib/buildContext";
import type { AppProductInput } from "../types/application.types";

/** ---------- Datadefinisjoner ---------- */

type SeedSKU = { edition_name: string; code?: string; notes?: string };
interface SeedData {
  vendor: { 
    name: string; 
    slug: string; 
    website?: string; 
    org_number?: string;
    country?: string;
    contact_url?: string;
  };
  product: Omit<AppProductInput, "vendor_id"> & { 
    vendorSlug: string;
    app_types?: string[]; // Temporary for migration - will map to category_id
  };
  skus?: SeedSKU[];
}

// Map app_types to category_id (these match app_categories slugs in DB)
const APP_TYPE_TO_CATEGORY: Record<string, string> = {
  "ERP": "erp",
  "CRM": "crm", 
  "HRPayroll": "hr-payroll",
  "ProjectMgmt": "project-management",
  "BI": "business-intelligence",
  "IAM": "iam-identity",
  "CMS": "cms",
  "eCommerce": "ecommerce",
  "WMS": "wms",
  "TMS": "tms",
};

const SEED_PRODUCTS: SeedData[] = [
  {
    "vendor": {
      "name": "Microsoft",
      "slug": "microsoft",
      "website": null,
      "country": null
    },
    "product": {
      "name": "Dynamics 365 Business Central",
      "short_name": "D365 BC",
      "slug": "dynamics-365-business-central",
      "vendorSlug": "microsoft",
      "app_types": [
        "ERP"
      ],
      "deployment_models": [
        "SaaS"
      ],
      "target_industries": [
        "Allmenn",
        "Handel"
      ],
      "market_segments": [
        "SMB",
        "Midmarket"
      ],
      "localizations": [
        "NO",
        "SE",
        "DK",
        "GB"
      ],
      "pricing_model": "Subscription",
      "status": "Active",
      "website": "https://dynamics.microsoft.com/business-central/"
    },
    "skus": [
      {
        "edition_name": "Standard"
      },
      {
        "edition_name": "Enterprise"
      }
    ]
  },
  {
    "vendor": {
      "name": "Adobe",
      "slug": "adobe",
      "website": "https://www.adobe.com",
      "org_number": "123456789",
      "country": "USA",
      "contact_url": "https://www.adobe.com/contact"
    },
    "product": {
      "name": "Adobe Creative Cloud",
      "short_name": "CC",
      "slug": "adobe-creative-cloud",
      "vendorSlug": "adobe",
      "app_types": [
        "Creative"
      ],
      "deployment_models": [
        "Cloud"
      ],
      "target_industries": [
        "Design",
        "Marketing"
      ],
      "market_segments": [
        "Enterprise",
        "SMB"
      ],
      "localizations": [
        "EN",
        "FR",
        "DE"
      ],
      "pricing_model": "Subscription",
      "status": "Active",
      "website": "https://www.adobe.com/creativecloud.html"
    },
    "skus": [
      {
        "edition_name": "Individual"
      },
      {
        "edition_name": "Business"
      }
    ]
  },
  // ... (additional products)
];

/** ---------- Hjelpere ---------- */

function genSkuCode(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
}

/** ---------- SEED ---------- */

export async function seedApplications(tenantId?: string): Promise<void> {
  const ctx = buildClientContextSync(tenantId);
  console.log(`[seed] applications start • tenant=${ctx.tenant_id}`);

  // Prefetch for fart (unngå N+1)
  const existingProducts = await ApplicationService.listAllProducts(ctx);
  const productBySlug = new Map(existingProducts.map(p => [p.slug, p]));

  const limit = pLimit(3); // kontrollert parallellisering

  await Promise.allSettled(
    SEED_PRODUCTS.map(entry => limit(async () => {
      const v = entry.vendor;

      // 1) Company (idempotent via orgnr/slug)
      const company = await CompanyService.upsertByOrgOrSlug({
        name: v.name,
        org_number: v.org_number ?? null,
        slug: v.slug,
        website: v.website ?? null,
        company_roles: ["supplier"],
        source: v.org_number ? "brreg" : "manual",
      });

      // 2) Vendor (unik per company)
      let vendor = await VendorService.getVendorByCompanyId(ctx, company.id);
      if (!vendor) {
        vendor = await VendorService.createVendor(ctx, {
          company_id: company.id,
          name: company.name,
          org_number: company.org_number,
          website: company.website || v.website || null,
          country: v.country || null,
          contact_url: v.contact_url || null,
        });
      }

      // 3) Product (upsert by slug) - migrate app_types to category_id
      const { vendorSlug, app_types, ...productData } = entry.product;
      
      // Map app_types to category_id
      let category_id: string | undefined = undefined;
      if (app_types && app_types.length > 0) {
        const primaryType = app_types[0];
        const categorySlug = APP_TYPE_TO_CATEGORY[primaryType];
        if (categorySlug) {
          // You'll need to fetch category by slug - for now we'll skip this
          // In production, fetch from app_categories table
          console.log(`  → Map ${primaryType} to category: ${categorySlug}`);
        }
      }

      const normalized: AppProductInput = {
        ...productData,
        deployment_models: productData.deployment_models.map(m =>
          m === "On-premises" ? "OnPrem" : m
        ) as any,
        status: productData.status ?? "Active",
        vendor_id: vendor.id,
        category_id, // Will be undefined until we fetch actual category IDs
      };

      const product = await ApplicationService.upsertBySlug(ctx, productData.slug, normalized);
      productBySlug.set(product.slug, product);

      // 4) SKUs (unik på (product, edition_name))
      if (entry.skus?.length) {
        const existingSkus = await ApplicationService.getSkus(ctx, product.id) || [];
        for (const sku of entry.skus) {
          const found = existingSkus.find(s => s.edition_name === sku.edition_name);
          if (!found) {
            await ApplicationService.createSku(ctx, product.id, {
              edition_name: sku.edition_name,
              code: sku.code ?? genSkuCode(sku.edition_name),
              notes: sku.notes,
            });
            console.log(`  ✓ SKU: ${sku.edition_name}`);
          }
        }
      }

      console.log(`✓ ${entry.product.name} (${vendor.name})`);
    }))
  );

  console.log(`[seed] applications done • tenant=${ctx.tenant_id}`);
}
