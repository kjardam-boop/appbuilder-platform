import pLimit from "p-limit";
import { CompanyService } from "@/modules/core/company";
import { VendorService } from "./vendorService";
import { ApplicationService } from "./applicationService";
import { buildClientContext, buildClientContextSync } from "@/shared/lib/buildContext";
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
      app_types: ["ERP"],
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
      app_types: ["ERP"],
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
  {
    vendor: { name: "Tripletex", slug: "tripletex", website: "https://www.tripletex.no" },
    product: {
      name: "Tripletex ERP",
      short_name: "Tripletex",
      slug: "tripletex-erp",
      vendorSlug: "tripletex",
      app_types: ["ERP"],
      deployment_models: ["SaaS"],
      target_industries: ["Byrå", "Håndverk", "Service"],
      market_segments: ["SMB"],
      localizations: ["Norge"],
      status: "Active",
      website: "https://www.tripletex.no",
    },
    skus: [
      { edition_name: "Basis" },
      { edition_name: "Standard" },
      { edition_name: "Pluss" },
    ],
  },
  {
    vendor: { name: "Xledger", slug: "xledger", website: "https://www.xledger.no" },
    product: {
      name: "Xledger ERP",
      short_name: "Xledger",
      slug: "xledger-erp",
      vendorSlug: "xledger",
      app_types: ["ERP"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      localizations: ["Norge", "Sverige", "Danmark"],
      status: "Active",
      website: "https://www.xledger.no",
    },
    skus: [
      { edition_name: "Standard" },
      { edition_name: "Enterprise" },
    ],
  },
  {
    vendor: { name: "PowerOffice", slug: "poweroffice", website: "https://www.poweroffice.no" },
    product: {
      name: "PowerOffice Go",
      short_name: "PowerOffice Go",
      slug: "poweroffice-go",
      vendorSlug: "poweroffice",
      app_types: ["ERP"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB"],
      localizations: ["Norge"],
      status: "Active",
      website: "https://www.poweroffice.no",
    },
    skus: [
      { edition_name: "Standard" },
    ],
  },
  {
    vendor: { name: "24SevenOffice", slug: "24sevenoffice", website: "https://www.24sevenoffice.com" },
    product: {
      name: "24SevenOffice ERP",
      short_name: "24SevenOffice",
      slug: "24sevenoffice-erp",
      vendorSlug: "24sevenoffice",
      app_types: ["ERP"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      localizations: ["Norge", "Sverige"],
      status: "Active",
      website: "https://www.24sevenoffice.com",
    },
  },

  // CRM-systemer
  {
    vendor: { name: "SuperOffice", slug: "superoffice", website: "https://www.superoffice.no" },
    product: {
      name: "SuperOffice CRM",
      short_name: "SuperOffice",
      slug: "superoffice-crm",
      vendorSlug: "superoffice",
      app_types: ["CRM"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      status: "Active",
      website: "https://www.superoffice.no",
    },
  },
  {
    vendor: { name: "HubSpot", slug: "hubspot", website: "https://www.hubspot.com" },
    product: {
      name: "HubSpot CRM",
      short_name: "HubSpot",
      slug: "hubspot-crm",
      vendorSlug: "hubspot",
      app_types: ["CRM"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Enterprise"],
      status: "Active",
      website: "https://www.hubspot.com",
    },
  },
  {
    vendor: { name: "Salesforce", slug: "salesforce", website: "https://www.salesforce.com" },
    product: {
      name: "Salesforce Sales Cloud",
      short_name: "Sales Cloud",
      slug: "salesforce-sales-cloud",
      vendorSlug: "salesforce",
      app_types: ["CRM"],
      deployment_models: ["SaaS"],
      market_segments: ["Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.salesforce.com",
    },
  },
  {
    vendor: { name: "Lime Technologies", slug: "lime", website: "https://www.lime-technologies.no" },
    product: {
      name: "Lime CRM",
      short_name: "Lime",
      slug: "lime-crm",
      vendorSlug: "lime",
      app_types: ["CRM"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      status: "Active",
      website: "https://www.lime-technologies.no",
    },
  },

  // Lønn og HR
  {
    vendor: { name: "CatalystOne", slug: "catalystone", website: "https://www.catalystone.com" },
    product: {
      name: "CatalystOne HR",
      short_name: "CatalystOne",
      slug: "catalystone-hr",
      vendorSlug: "catalystone",
      app_types: ["HRPayroll"],
      deployment_models: ["SaaS"],
      market_segments: ["Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.catalystone.com",
    },
  },
  {
    vendor: { name: "Sympa", slug: "sympa", website: "https://www.sympa.com/no" },
    product: {
      name: "Sympa HR",
      short_name: "Sympa",
      slug: "sympa-hr",
      vendorSlug: "sympa",
      app_types: ["HRPayroll"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket"],
      status: "Active",
      website: "https://www.sympa.com/no",
    },
  },

  // Prosjekt og timeføring
  {
    vendor: { name: "Moment Team", slug: "moment", website: "https://www.moment.team" },
    product: {
      name: "Moment Prosjektstyring",
      short_name: "Moment",
      slug: "moment-prosjektstyring",
      vendorSlug: "moment",
      app_types: ["ProjectMgmt"],
      deployment_models: ["SaaS"],
      target_industries: ["Byrå", "Konsulent"],
      market_segments: ["SMB", "Midmarket"],
      status: "Active",
      website: "https://www.moment.team",
    },
  },
  {
    vendor: { name: "Atlassian", slug: "atlassian", website: "https://www.atlassian.com" },
    product: {
      name: "Jira Software",
      short_name: "Jira",
      slug: "jira-software",
      vendorSlug: "atlassian",
      app_types: ["ProjectMgmt"],
      deployment_models: ["SaaS"],
      target_industries: ["IT", "Konsulent"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.atlassian.com/software/jira",
    },
  },

  // Analyse og BI
  {
    vendor: { name: "Microsoft", slug: "microsoft", website: "https://powerbi.microsoft.com" },
    product: {
      name: "Power BI",
      short_name: "Power BI",
      slug: "microsoft-power-bi",
      vendorSlug: "microsoft",
      app_types: ["BI"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      status: "Active",
      website: "https://powerbi.microsoft.com",
    },
  },
  {
    vendor: { name: "Qlik", slug: "qlik", website: "https://www.qlik.com/no" },
    product: {
      name: "Qlik Sense",
      short_name: "Qlik Sense",
      slug: "qlik-sense",
      vendorSlug: "qlik",
      app_types: ["BI"],
      deployment_models: ["SaaS"],
      market_segments: ["Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.qlik.com/no",
    },
  },

  // Signering / dokument
  {
    vendor: { name: "Signicat", slug: "signicat", website: "https://www.signicat.com" },
    product: {
      name: "Signicat Identity Platform",
      short_name: "Signicat",
      slug: "signicat-idp",
      vendorSlug: "signicat",
      app_types: ["IAM"],
      deployment_models: ["SaaS"],
      target_industries: ["Bank", "Finans", "Offentlig"],
      market_segments: ["Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.signicat.com",
    },
  },
  {
    vendor: { name: "DocuSign", slug: "docusign", website: "https://www.docusign.com" },
    product: {
      name: "DocuSign eSignature",
      short_name: "DocuSign",
      slug: "docusign-esignature",
      vendorSlug: "docusign",
      app_types: ["IAM"],
      deployment_models: ["SaaS"],
      market_segments: ["SMB", "Midmarket", "Enterprise"],
      status: "Active",
      website: "https://www.docusign.com",
    },
  },
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
        });
      }

      // 3) Product (upsert by slug) - always upsert to update existing products
      const { vendorSlug, ...productData } = entry.product;
      const normalized: AppProductInput = {
        ...productData,
        deployment_models: productData.deployment_models.map(m =>
          m === "On-premises" ? "OnPrem" : m
        ) as any,
        status: productData.status ?? "Active",
        vendor_id: vendor.id,
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
