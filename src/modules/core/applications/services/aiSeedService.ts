/**
 * AI-powered Seed Data Generator
 * 
 * Uses AI to research and generate seed data for external systems,
 * vendors, and other platform entities.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type SeedCategory = 
  | "ERP" 
  | "CRM" 
  | "HR" 
  | "Accounting" 
  | "eCommerce" 
  | "WMS" 
  | "BI" 
  | "ProjectManagement"
  | "Marketing"
  | "CustomerService";

export type SeedRegion = "Nordic" | "Europe" | "Global" | "USA";

export interface AISeedRequest {
  category: SeedCategory;
  region: SeedRegion;
  count: number;
  includeNiche?: boolean;  // Include smaller/niche vendors
  excludeExisting?: boolean;  // Skip systems already in DB
}

export interface GeneratedVendor {
  name: string;
  slug: string;
  website: string;
  country: string;
  description?: string;
  founded_year?: number;
}

export interface GeneratedSystem {
  name: string;
  short_name: string;
  slug: string;
  vendor_name: string;
  category: string;
  description: string;
  deployment_models: string[];
  target_industries: string[];
  market_segments: string[];
  localizations: string[];
  pricing_model: string;
  website: string;
  key_features?: string[];
  typical_users?: string;
  editions?: Array<{ name: string; description?: string }>;
}

export interface AISeedResult {
  vendors: GeneratedVendor[];
  systems: GeneratedSystem[];
  metadata: {
    category: string;
    region: string;
    generated_at: string;
    ai_model: string;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

// ============================================================
// PROMPTS
// ============================================================

const SYSTEM_PROMPT = `You are an expert on enterprise software systems. 
Your task is to generate accurate, real-world data about software vendors and their products.
Always return factual information about real companies and products.
Format your response as valid JSON matching the requested schema.`;

function buildGenerationPrompt(request: AISeedRequest): string {
  const categoryDescriptions: Record<SeedCategory, string> = {
    ERP: "Enterprise Resource Planning systems (finance, inventory, manufacturing)",
    CRM: "Customer Relationship Management systems",
    HR: "Human Resources and Payroll systems",
    Accounting: "Financial accounting and bookkeeping software",
    eCommerce: "E-commerce platforms and online store solutions",
    WMS: "Warehouse Management Systems",
    BI: "Business Intelligence and Analytics platforms",
    ProjectManagement: "Project and Portfolio Management tools",
    Marketing: "Marketing Automation and Campaign Management",
    CustomerService: "Help Desk and Customer Service platforms",
  };

  const regionFocus: Record<SeedRegion, string> = {
    Nordic: "Focus on systems popular in Norway, Sweden, Denmark, and Finland. Include local vendors like Visma, Unit4, Xledger, Tripletex, PowerOffice.",
    Europe: "Include major European vendors and systems with EU localizations.",
    Global: "Include globally available enterprise systems from major vendors.",
    USA: "Focus on US-based vendors and systems popular in North America.",
  };

  return `Generate a list of ${request.count} real ${categoryDescriptions[request.category]} systems.

${regionFocus[request.region]}

${request.includeNiche ? "Include both major enterprise vendors AND smaller/niche solutions." : "Focus on well-established, widely-used systems."}

For each system, provide:
1. Vendor information (name, website, country, founding year if known)
2. Product details (name, short name, description, deployment options)
3. Target market (industries, company sizes, regions)
4. Pricing model (Subscription, Perpetual, Freemium, etc.)
5. Key editions/SKUs if applicable

Return JSON in this exact format:
{
  "vendors": [
    {
      "name": "Vendor Name",
      "slug": "vendor-slug",
      "website": "https://...",
      "country": "Norway",
      "description": "Brief vendor description",
      "founded_year": 1990
    }
  ],
  "systems": [
    {
      "name": "Product Full Name",
      "short_name": "Abbreviation",
      "slug": "product-slug",
      "vendor_name": "Vendor Name",
      "category": "${request.category}",
      "description": "What the product does",
      "deployment_models": ["SaaS", "On-premise"],
      "target_industries": ["Retail", "Manufacturing"],
      "market_segments": ["SMB", "Enterprise"],
      "localizations": ["NO", "SE", "DK"],
      "pricing_model": "Subscription",
      "website": "https://product-url",
      "key_features": ["Feature 1", "Feature 2"],
      "typical_users": "Companies with 50-500 employees",
      "editions": [
        { "name": "Standard", "description": "Basic features" },
        { "name": "Premium", "description": "Advanced features" }
      ]
    }
  ]
}

Important:
- Only include REAL products and companies
- Slugs should be lowercase with hyphens
- Include accurate websites
- Be specific about Nordic/regional availability where relevant`;
}

// ============================================================
// SERVICE
// ============================================================

export class AISeedService {
  /**
   * Generate seed data using AI
   */
  static async generate(request: AISeedRequest): Promise<AISeedResult> {
    const prompt = buildGenerationPrompt(request);

    // Call AI via Edge Function
    const { data, error } = await supabase.functions.invoke("ai-generate-seed", {
      body: {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: prompt,
        category: request.category,
        region: request.region,
      },
    });

    if (error) {
      throw new Error(`AI generation failed: ${error.message}`);
    }

    // Parse and validate response
    const result = data as AISeedResult;
    
    // Add metadata
    result.metadata = {
      category: request.category,
      region: request.region,
      generated_at: new Date().toISOString(),
      ai_model: data.model || "gpt-4",
      prompt_tokens: data.usage?.prompt_tokens,
      completion_tokens: data.usage?.completion_tokens,
    };

    return result;
  }

  /**
   * Get existing systems to avoid duplicates
   */
  static async getExistingSlugs(): Promise<Set<string>> {
    const { data } = await supabase
      .from("external_systems")
      .select("slug");
    
    return new Set((data || []).map(s => s.slug));
  }

  /**
   * Filter out systems that already exist
   */
  static filterExisting(
    result: AISeedResult, 
    existingSlugs: Set<string>
  ): AISeedResult {
    return {
      ...result,
      systems: result.systems.filter(s => !existingSlugs.has(s.slug)),
      vendors: result.vendors.filter(v => !existingSlugs.has(v.slug)),
    };
  }

  /**
   * Convert AI-generated data to seed format
   */
  static toSeedFormat(result: AISeedResult): any[] {
    return result.systems.map(system => {
      const vendor = result.vendors.find(v => v.name === system.vendor_name);
      
      return {
        vendor: {
          name: vendor?.name || system.vendor_name,
          slug: vendor?.slug || system.vendor_name.toLowerCase().replace(/\s+/g, "-"),
          website: vendor?.website,
          country: vendor?.country,
        },
        product: {
          name: system.name,
          short_name: system.short_name,
          slug: system.slug,
          vendorSlug: vendor?.slug || system.vendor_name.toLowerCase().replace(/\s+/g, "-"),
          description: system.description,
          system_types: [system.category],
          deployment_models: system.deployment_models,
          target_industries: system.target_industries,
          market_segments: system.market_segments,
          localizations: system.localizations,
          pricing_model: system.pricing_model,
          website: system.website,
          status: "Active",
        },
        skus: system.editions?.map(e => ({
          edition_name: e.name,
          notes: e.description,
        })) || [],
      };
    });
  }
}

// ============================================================
// CATEGORY OPTIONS FOR UI
// ============================================================

export const SEED_CATEGORIES: Array<{ value: SeedCategory; label: string; description: string }> = [
  { value: "ERP", label: "ERP Systems", description: "Enterprise Resource Planning" },
  { value: "CRM", label: "CRM Systems", description: "Customer Relationship Management" },
  { value: "HR", label: "HR & Payroll", description: "Human Resources & Payroll" },
  { value: "Accounting", label: "Accounting", description: "Financial Software" },
  { value: "eCommerce", label: "eCommerce", description: "Online Store Platforms" },
  { value: "WMS", label: "WMS", description: "Warehouse Management" },
  { value: "BI", label: "BI & Analytics", description: "Business Intelligence" },
  { value: "ProjectManagement", label: "Project Mgmt", description: "Project Management Tools" },
  { value: "Marketing", label: "Marketing", description: "Marketing Automation" },
  { value: "CustomerService", label: "Customer Service", description: "Help Desk & Support" },
];

export const SEED_REGIONS: Array<{ value: SeedRegion; label: string }> = [
  { value: "Nordic", label: "Nordic (NO, SE, DK, FI)" },
  { value: "Europe", label: "Europe" },
  { value: "Global", label: "Global" },
  { value: "USA", label: "USA" },
];

