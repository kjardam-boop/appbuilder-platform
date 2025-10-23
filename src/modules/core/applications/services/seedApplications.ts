import pLimit from "p-limit";
import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput } from "../types/application.types";

/** ---------- Datadefinisjoner ---------- */

type SeedSKU = { edition_name: string; code?: string; notes?: string };
interface SeedData {
  vendor: { name: string; slug: string; website?: string; org_number?: string };
  product: Omit<AppProductInput, "vendor_id"> & { vendorSlug: string };
  skus?: SeedSKU[];
}

const SEED_PRODUCTS: SeedData[] = [
  // ERP Systems
  {
    vendor: { name: "Visma", slug: "visma", website: "https://www.visma.no", org_number: "932753700" },
    product: {
      name: "Visma.net ERP",
      short_name: "Visma.net",
      slug: "visma-net-erp",
      vendorSlug: "visma",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      target_industries: ["Handel", "Service", "Bygg"],
      market_segments: ["SMB", "Midmarket"],
      localizations: ["Norge", "Sverige", "Danmark"],
      status: "Active",
      website: "https://www.visma.net",
    },
    skus: [
      { edition_name: "Standard", code: "VISMA-NET-STD" },
      { edition_name: "Professional", code: "VISMA-NET-PRO" },
      { edition_name: "Enterprise", code: "VISMA-NET-ENT" },
    ],
  },
  {
    vendor: { name: "SAP", slug: "sap", website: "https://www.sap.com" },
    product: {
      name: "SAP S/4HANA Cloud",
      short_name: "S/4HANA Cloud",
      slug: "sap-s4hana-cloud",
      vendorSlug: "sap",
      app_type: "ERP",
      deployment_models: ["SaaS"],
      market_segments: ["Enterprise"],
      status: "Active",
      website: "https://www.sap.com/s4hana",
    },
    skus: [
      { edition_name: "Public Cloud", code: "SAP-S4H-PUBLIC" },
      { edition_name: "Private Cloud", code: "SAP-S4H-PRIVATE" },
    ],
  },
];

/** ---------- Hjelpere ---------- */

function genSkuCode(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
}

/** ---------- SEED ---------- */

export async function seedApplications(tenantId?: string): Promise<void> {
  const ctx = buildClientContext(tenantId);
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
        });
      }

      // 3) Product (upsert by slug)
      const { vendorSlug, ...productData } = entry.product;
      const normalized: AppProductInput = {
        ...productData,
        deployment_models: productData.deployment_models.map(m =>
          m === "On-premises" ? "OnPrem" : m
        ) as any,
        status: productData.status ?? "Active",
        vendor_id: vendor.id,
      };

      const product =
        productBySlug.get(productData.slug) ||
        await ApplicationService.upsertBySlug(ctx, productData.slug, normalized);

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
