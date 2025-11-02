/**
 * Seed Initial Capabilities
 * Populates catalog with existing platform features
 */

import { CapabilityService } from "./capabilityService";
import type { CapabilityInput } from "../types/capability.types";

const initialCapabilities: CapabilityInput[] = [
  {
    key: "ai-text-generation",
    name: "AI Text Generation",
    category: "AI",
    description: "Generate text with Lovable AI (Gemini/GPT models) for company descriptions, project summaries, and custom content",
    estimated_dev_hours: 0,
    price_per_month: 99,
    dependencies: [],
    tags: ["ai", "text", "automation", "gemini", "gpt"],
    icon_name: "Sparkles",
    code_reference: "src/modules/core/ai",
  },
  {
    key: "task-management",
    name: "Task Management",
    category: "Business Logic",
    description: "Complete task management system with checklists, priorities, assignments, categories, and due dates",
    estimated_dev_hours: 0,
    price_per_month: 49,
    dependencies: [],
    tags: ["tasks", "productivity", "collaboration"],
    icon_name: "CheckSquare",
    code_reference: "src/modules/core/tasks",
  },
  {
    key: "company-management",
    name: "Company Management",
    category: "Business Logic",
    description: "Manage companies, contact persons, roles, and organizational metadata",
    estimated_dev_hours: 0,
    price_per_month: 79,
    dependencies: [],
    tags: ["companies", "contacts", "crm"],
    icon_name: "Building2",
    code_reference: "src/modules/core/company",
  },
  {
    key: "invitation-system",
    name: "Invitation System",
    category: "Authentication",
    description: "Send email invitations with token-based registration and onboarding flow",
    estimated_dev_hours: 0,
    price_per_month: 29,
    dependencies: [],
    tags: ["auth", "email", "onboarding"],
    icon_name: "Mail",
    code_reference: "supabase/functions/send-user-invitation",
  },
  {
    key: "brreg-integration",
    name: "Brønnøysund Integration",
    category: "Integration",
    description: "Fetch company information from Brønnøysundregisteret (Norwegian Business Registry)",
    estimated_dev_hours: 0,
    price_per_month: 149,
    dependencies: [],
    tags: ["integration", "norway", "company-data", "brreg"],
    icon_name: "Database",
    code_reference: "src/modules/core/integrations/adapters/brreg",
  },
  {
    key: "project-management",
    name: "Project Management",
    category: "Business Logic",
    description: "Create and manage projects with timelines, milestones, and team collaboration",
    estimated_dev_hours: 0,
    price_per_month: 89,
    dependencies: ["task-management"],
    tags: ["projects", "collaboration", "planning"],
    icon_name: "FolderKanban",
    code_reference: "src/modules/core/project",
  },
  {
    key: "opportunity-pipeline",
    name: "Opportunity Pipeline",
    category: "Business Logic",
    description: "Sales CRM with opportunity tracking, forecasting, and conversion metrics",
    estimated_dev_hours: 0,
    price_per_month: 129,
    dependencies: ["company-management"],
    tags: ["crm", "sales", "pipeline"],
    icon_name: "TrendingUp",
    code_reference: "src/modules/core/opportunity",
  },
  {
    key: "document-management",
    name: "Document Management",
    category: "Data Management",
    description: "Upload, categorize, and manage documents with metadata and search",
    estimated_dev_hours: 0,
    price_per_month: 59,
    dependencies: [],
    tags: ["documents", "files", "storage"],
    icon_name: "FileText",
    code_reference: "src/modules/core/document",
  },
  // New capabilities for Christmas app
  {
    key: "calendar-view",
    name: "Calendar View Component",
    category: "UI Component",
    description: "Visual calendar for displaying events, presence, and timelines",
    estimated_dev_hours: 8,
    price_per_month: 39,
    dependencies: [],
    tags: ["ui", "calendar", "visualization"],
    icon_name: "Calendar",
  },
  {
    key: "presence-tracking",
    name: "Presence Tracking",
    category: "Business Logic",
    description: "Track when users arrive and depart with date/time management",
    estimated_dev_hours: 4,
    price_per_month: 29,
    dependencies: [],
    tags: ["tracking", "events", "attendance"],
    icon_name: "UserCheck",
  },
  {
    key: "christmas-theme",
    name: "Christmas Theme",
    category: "UI Component",
    description: "Festive Christmas theme with holiday colors, styling, and decorative elements",
    estimated_dev_hours: 6,
    price_per_month: 19,
    dependencies: [],
    tags: ["theme", "christmas", "ui", "seasonal"],
    icon_name: "Sparkles",
  },
];

/**
 * Seed capabilities into database
 */
export async function seedCapabilities(): Promise<void> {
  console.log("[SeedCapabilities] Starting seed...");

  for (const cap of initialCapabilities) {
    try {
      // Check if already exists
      const existing = await CapabilityService.getCapability(cap.key);
      
      if (existing) {
        console.log(`[SeedCapabilities] Skipping existing: ${cap.key}`);
        continue;
      }

      await CapabilityService.createCapability(cap);
      console.log(`[SeedCapabilities] Created: ${cap.key}`);
    } catch (error) {
      console.error(`[SeedCapabilities] Error creating ${cap.key}:`, error);
    }
  }

  console.log("[SeedCapabilities] Seed complete!");
}
