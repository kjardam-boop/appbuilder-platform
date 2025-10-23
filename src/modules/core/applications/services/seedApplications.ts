import pLimit from "p-limit";
import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContext } from "@/shared/lib/buildContext";
import type { AppProductInput } from "../types/application.types";

/** ---------- Datadefinisjoner (samme som du sendte inn) ---------- */

type SeedSKU = { edition_name: string; code?: string; notes?: string };
interface SeedData {
  vendor: { name: string; slug: string; website?: string; org_number?: string };
  product: Omit<AppProductInput, "vendor_id"> & { vendorSlug: string };
  skus?: SeedSKU[];
}

const SEED_PRODUCTS: SeedData[] = [/* ... hele listen din her, uendret ... */];

/** ---------- Hjelpere ---------- */

function genSkuCode(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "");
}

/** ---------- SEED ---------- */

export async function seedApplications(tenantId?: string): Promise<void> {
  const ctx = buildClientContext(tenantId);
  console.log(`[seed] applications start • tenant=${ctx.tenantId}`);

  // Prefetch for fart (unngå N+1)
  const existingProducts = await ApplicationService.listAllProducts(ctx);
  const productBySlug = new Map(existingProducts.map((p: any) => [p.slug, p]));

  const limit = pLimit(3); // kontrollert parallellisering

  await Promise.allSettled(
    SEED_PRODUCTS.map(entry => limit(async () => {
      const v = entry.vendor;

      // 1) Company (idempotent via orgnr/slug)
      let company = null;
      if (v.org_number) {
        company = await CompanyService.findByOrgNumber(v.org_number);
      }
      if (!company) {
        const candidates = await CompanyService.searchBrreg(v.name).catch(() => []);
        const match = candidates?.find((c: any) => c.name.toLowerCase() === v.name.toLowerCase());
        if (match) {
          company = await CompanyService.upsertByOrgOrSlug({
            name: match.name,
            org_number: match.orgNumber,
            slug: v.slug,
            website: v.website || match.website,
            company_roles: ["supplier"],
            source: "brreg",
          });
        } else {
          company = await CompanyService.upsertByOrgOrSlug({
            name: v.name,
            org_number: v.org_number ?? null,
            slug: v.slug,
            website: v.website ?? null,
            company_roles: ["supplier"],
            source: "manual",
          });
        }
      }

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
          const found = existingSkus.find((s: any) => s.edition_name === sku.edition_name);
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

  console.log(`[seed] applications done • tenant=${ctx.tenantId}`);
}
