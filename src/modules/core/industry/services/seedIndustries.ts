import { buildClientContext, buildClientContextSync } from "@/shared/lib/buildContext";
import { IndustryService } from "./industryService";

type IndustrySeed = {
  key: string;                 // slug, unik
  name: string;
  naceCodes: string[];         // bruk prefix, f.eks. "41" eller "41.20"
  defaultModules?: string[];   // addons som bør aktiveres for bransjen (valgfritt)
};

// Normaliser NACE (NN | NN.N | NN.NN)
function norm(code: string): string {
  return code
    .trim()
    .replace(/\s+/g, "")
    .replace(/,$/, "")
    .replace(/^(\d{2})(\d)?(\d)?$/, (_, a, b, c) =>
      b && c ? `${a}.${b}${c}` : b ? `${a}.${b}` : a
    );
}

const INDUSTRY_SEED: IndustrySeed[] = [
  // Primærnæringer
  { key: "agriculture", name: "Jordbruk, skogbruk og fiske", naceCodes: ["01","02","03"], defaultModules: ["addons.agriculture"] },

  // Utvinning og energi
  { key: "mining_quarrying", name: "Bergverksdrift og utvinning", naceCodes: ["05","06","07","08","09"] },
  { key: "energy_utilities", name: "Elektrisitet, gass, damp", naceCodes: ["35"] },
  { key: "water_waste", name: "Vann, avløp og avfall", naceCodes: ["36","37","38","39"] },

  // Industri og bygg
  { key: "manufacturing", name: "Industri/Produksjon", naceCodes: [
      "10","11","12","13","14","15","16","17","18","19",
      "20","21","22","23","24","25","26","27","28","29",
      "30","31","32","33"
    ], defaultModules: ["addons.manufacturing"] },
  { key: "construction", name: "Bygg og anlegg", naceCodes: ["41","42","43"], defaultModules: ["addons.construction"] },

  // Handel & logistikk
  { key: "wholesale", name: "Agentur- og engroshandel", naceCodes: ["46"] },
  { key: "retail", name: "Detaljhandel", naceCodes: ["47","45"] },
  { key: "transport_storage", name: "Transport og lagring", naceCodes: ["49","50","51","52","53"], defaultModules: ["addons.logistics"] },

  // Overnatting/servering
  { key: "hospitality", name: "Overnatting og servering", naceCodes: ["55","56"] },

  // Info/IKT/Media
  { key: "information_technology", name: "Informasjon og kommunikasjon", naceCodes: ["58","59","60","61","62","63"], defaultModules: ["addons.ict"] },

  // Finans & eiendom
  { key: "finance_insurance", name: "Finans og forsikring", naceCodes: ["64","65","66"] },
  { key: "real_estate", name: "Omsetning og drift av eiendom", naceCodes: ["68"] },

  // Faglige tjenester mv.
  { key: "professional_services", name: "Faglig, vitenskapelig og teknisk tjenesteyting", naceCodes: ["69","70","71","72","73","74","75"], defaultModules: ["addons.professional"] },
  { key: "admin_support", name: "Forretningsmessig og administrativ tjenesteyting", naceCodes: ["77","78","79","80","81","82"] },

  // Offentlig, utdanning, helse, kultur
  { key: "public_admin", name: "Offentlig administrasjon og forsvar", naceCodes: ["84"] },
  { key: "education", name: "Undervisning", naceCodes: ["85"] },
  { key: "health_social", name: "Helse- og sosialtjenester", naceCodes: ["86","87","88"] },
  { key: "arts_entertainment", name: "Kultur, underholdning og fritid", naceCodes: ["90","91","92","93"] },

  // Annet
  { key: "other_services", name: "Annen tjenesteyting", naceCodes: ["94","95","96"] },
  { key: "households_extraterritorial", name: "Husholdninger/ekstraterritorielle org.", naceCodes: ["97","98","99"] }
];

/**
 * Idempotent seed:
 * - Oppdaterer eksisterende Industry ved key (merge av name/naceCodes/defaultModules)
 * - Oppretter hvis mangler
 * - Normaliserer NACE-format
 */
export async function seedIndustries(tenantId?: string) {
  const ctx = buildClientContextSync(tenantId);
  console.log(`[seed] industries start • tenant=${ctx.tenant_id}`);

  for (const item of INDUSTRY_SEED) {
    const normalizedCodes = Array.from(new Set(item.naceCodes.map(norm)));
    const existing = await IndustryService.findByKey(ctx, item.key);

    if (!existing) {
      await IndustryService.create(ctx, {
        key: item.key,
        name: item.name,
        description: "",
        nace_codes: normalizedCodes,
        default_modules: item.defaultModules ?? [],
        parent_key: "",
        sort_order: 0,
        is_active: true,
      });
      console.log(`  ✓ created: ${item.key} (${normalizedCodes.join(", ")})`);
    } else {
      // Merge/oppdater hvis nye NACE-koder eller navn/moduler har endret seg
      const mergedCodes = Array.from(new Set([...(existing.nace_codes ?? []), ...normalizedCodes]));
      const mergedModules = Array.from(new Set([...(existing.default_modules ?? []), ...(item.defaultModules ?? [])]));

      // Bare skriv hvis noe faktisk endret seg
      const changed =
        existing.name !== item.name ||
        JSON.stringify(existing.nace_codes?.sort()) !== JSON.stringify(mergedCodes.sort()) ||
        JSON.stringify((existing.default_modules ?? []).sort()) !== JSON.stringify(mergedModules.sort());

      if (changed) {
        await IndustryService.update(ctx, existing.id, {
          name: item.name,
          nace_codes: mergedCodes,
          default_modules: mergedModules,
        });
        console.log(`  ✓ updated: ${item.key}`);
      } else {
        console.log(`  = no change: ${item.key}`);
      }
    }
  }

  console.log(`[seed] industries done • tenant=${ctx.tenant_id}`);
}
