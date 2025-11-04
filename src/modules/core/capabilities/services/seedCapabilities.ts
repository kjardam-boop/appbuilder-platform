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
    scope: "platform",
    description: "Generate text with Lovable AI (Gemini/GPT models) for company descriptions, project summaries, and custom content",
    estimated_dev_hours: 0,
    price_per_month: 99,
    dependencies: [],
    tags: ["ai", "text", "automation", "gemini", "gpt"],
    icon_name: "Sparkles",
    frontend_files: [
      "src/modules/core/ai/components/AIChatInterface.tsx",
      "src/modules/core/ai/components/AIGenerationButton.tsx",
      "src/modules/core/ai/hooks/useAIGeneration.ts",
      "src/modules/core/ai/hooks/useAIChat.ts",
      "src/modules/core/ai/hooks/useFieldAssist.ts",
      "src/modules/core/ai/services/aiService.ts",
    ],
    backend_files: [
      "supabase/functions/generate-text/index.ts",
      "supabase/functions/field-chat-assist/index.ts",
      "supabase/functions/ai-assistant/index.ts",
    ],
    domain_tables: [],
    hooks: ["useAIGeneration", "useAIChat", "useFieldAssist"],
    database_migrations: [],
    documentation_url: "https://docs.lovable.dev/features/ai",
  },
  {
    key: "task-management",
    name: "Task Management",
    category: "Business Logic",
    scope: "platform",
    description: "Complete task management system with checklists, priorities, assignments, categories, and due dates",
    estimated_dev_hours: 0,
    price_per_month: 49,
    dependencies: [],
    tags: ["tasks", "productivity", "collaboration"],
    icon_name: "CheckSquare",
    frontend_files: [
      "src/modules/core/tasks/components/TaskCard.tsx",
      "src/modules/core/tasks/components/TaskDialog.tsx",
      "src/modules/core/tasks/components/ContextTaskButton.tsx",
      "src/modules/core/tasks/hooks/useTasks.ts",
      "src/modules/core/tasks/hooks/useChecklistItems.ts",
      "src/modules/core/tasks/services/taskService.ts",
    ],
    backend_files: [],
    domain_tables: ["tasks", "task_checklist_items", "task_categories"],
    hooks: ["useTasks", "useChecklistItems"],
    database_migrations: [],
  },
  {
    key: "company-management",
    name: "Company Management",
    category: "Business Logic",
    scope: "platform",
    description: "Manage companies, contact persons, roles, and organizational metadata",
    estimated_dev_hours: 0,
    price_per_month: 79,
    dependencies: [],
    tags: ["companies", "contacts", "crm"],
    icon_name: "Building2",
    frontend_files: [
      "src/modules/core/company/components/CompanyCard.tsx",
      "src/modules/core/company/components/CompanySelector.tsx",
      "src/modules/core/company/hooks/useCompany.ts",
      "src/modules/core/company/hooks/useCompanySearch.ts",
      "src/modules/core/company/services/companyService.ts",
    ],
    backend_files: [
      "supabase/functions/brreg-lookup/index.ts",
      "supabase/functions/brreg-search/index.ts",
    ],
    domain_tables: ["companies", "company_metadata", "company_interactions"],
    hooks: ["useCompany", "useCompanySearch", "useCompanyInteractions"],
    database_migrations: [],
  },
  {
    key: "invitation-system",
    name: "Invitation System",
    category: "Authentication",
    scope: "platform",
    description: "Send email invitations with token-based registration and onboarding flow",
    estimated_dev_hours: 0,
    price_per_month: 29,
    dependencies: [],
    tags: ["auth", "email", "onboarding"],
    icon_name: "Mail",
    frontend_files: [
      "src/components/Company/InviteContactDialog.tsx",
    ],
    backend_files: [
      "supabase/functions/send-user-invitation/index.ts",
      "supabase/functions/send-supplier-invitation/index.ts",
    ],
    domain_tables: ["invitations"],
    hooks: [],
    database_migrations: [],
    documentation_url: "https://docs.lovable.dev/features/authentication",
  },
  {
    key: "brreg-integration",
    name: "Brønnøysund Integration",
    category: "Integration",
    scope: "platform",
    description: "Fetch company information from Brønnøysundregisteret (Norwegian Business Registry)",
    estimated_dev_hours: 0,
    price_per_month: 149,
    dependencies: [],
    tags: ["integration", "norway", "company-data", "brreg"],
    icon_name: "Database",
    frontend_files: [
      "src/modules/core/integrations/adapters/brreg/BrregAdapter.ts",
    ],
    backend_files: [
      "supabase/functions/brreg-lookup/index.ts",
      "supabase/functions/brreg-search/index.ts",
      "supabase/functions/brreg-enhanced-lookup/index.ts",
      "supabase/functions/brreg-company-details/index.ts",
      "supabase/functions/brreg-batch-lookup/index.ts",
      "supabase/functions/sync-brreg-companies/index.ts",
    ],
    domain_tables: [],
    hooks: [],
    database_migrations: [],
    demo_url: "https://data.brreg.no/",
  },
  {
    key: "project-management",
    name: "Project Management",
    category: "Business Logic",
    scope: "platform",
    description: "Create and manage projects with timelines, milestones, and team collaboration",
    estimated_dev_hours: 0,
    price_per_month: 89,
    dependencies: ["task-management"],
    tags: ["projects", "collaboration", "planning"],
    icon_name: "FolderKanban",
    frontend_files: [
      "src/modules/core/project/components/SupplierCard.tsx",
      "src/modules/core/project/hooks/useProject.ts",
      "src/modules/core/project/hooks/useUserProjects.ts",
      "src/modules/core/project/services/projectService.ts",
    ],
    backend_files: [],
    domain_tables: ["projects", "project_suppliers", "project_members"],
    hooks: ["useProject", "useUserProjects", "useProjectSuppliers"],
    database_migrations: [],
  },
  {
    key: "opportunity-pipeline",
    name: "Opportunity Pipeline",
    category: "Business Logic",
    scope: "platform",
    description: "Sales CRM with opportunity tracking, forecasting, and conversion metrics",
    estimated_dev_hours: 0,
    price_per_month: 129,
    dependencies: ["company-management"],
    tags: ["crm", "sales", "pipeline"],
    icon_name: "TrendingUp",
    frontend_files: [
      "src/modules/core/opportunity/components/OpportunityCard.tsx",
      "src/modules/core/opportunity/components/OpportunityDialog.tsx",
      "src/modules/core/opportunity/hooks/useOpportunities.ts",
      "src/modules/core/opportunity/hooks/useSalesForecast.ts",
      "src/modules/core/opportunity/services/opportunityService.ts",
    ],
    backend_files: [],
    domain_tables: ["opportunities", "opportunity_products"],
    hooks: ["useOpportunities", "useSalesForecast"],
    database_migrations: [],
  },
  {
    key: "document-management",
    name: "Document Management",
    category: "Data Management",
    scope: "platform",
    description: "Upload, categorize, and manage documents with metadata and search",
    estimated_dev_hours: 0,
    price_per_month: 59,
    dependencies: [],
    tags: ["documents", "files", "storage"],
    icon_name: "FileText",
    frontend_files: [
      "src/modules/core/document/hooks/useProjectDocuments.ts",
      "src/modules/core/document/hooks/useEvaluationDocuments.ts",
      "src/modules/core/document/services/documentService.ts",
    ],
    backend_files: [],
    domain_tables: ["documents"],
    hooks: ["useProjectDocuments", "useEvaluationDocuments"],
    database_migrations: [],
  },
  {
    key: "calendar-view",
    name: "Calendar View Component",
    category: "UI Component",
    scope: "platform",
    description: "Visual calendar for displaying events, presence, and timelines",
    estimated_dev_hours: 8,
    price_per_month: 39,
    dependencies: [],
    tags: ["ui", "calendar", "visualization"],
    icon_name: "Calendar",
    frontend_files: [
      "src/components/ui/calendar.tsx",
    ],
    backend_files: [],
    domain_tables: [],
    hooks: [],
    database_migrations: [],
  },
  {
    key: "presence-tracking",
    name: "Presence Tracking",
    category: "Business Logic",
    scope: "platform",
    description: "Track when users arrive and depart with date/time management",
    estimated_dev_hours: 4,
    price_per_month: 29,
    dependencies: [],
    tags: ["tracking", "events", "attendance"],
    icon_name: "UserCheck",
    frontend_files: [
      "src/hooks/useJul25FamilyPeriods.ts",
      "src/hooks/useJul25MemberCustomPeriods.ts",
    ],
    backend_files: [],
    domain_tables: ["jul25_family_periods", "jul25_member_custom_periods", "jul25_member_periods"],
    hooks: ["useJul25FamilyPeriods", "useJul25MemberCustomPeriods"],
    database_migrations: [],
  },
  {
    key: "christmas-theme",
    name: "Christmas Theme",
    category: "UI Component",
    scope: "platform",
    description: "Festive Christmas theme with holiday colors, styling, and decorative elements",
    estimated_dev_hours: 6,
    price_per_month: 19,
    dependencies: [],
    tags: ["theme", "christmas", "ui", "seasonal"],
    icon_name: "Sparkles",
    frontend_files: [
      "src/pages/apps/Jul25App.tsx",
      "src/pages/apps/Jul25FamilyAdmin.tsx",
    ],
    backend_files: [],
    domain_tables: ["jul25_families", "jul25_family_members", "jul25_tasks", "jul25_christmas_words"],
    hooks: ["useJul25Families", "useJul25Tasks"],
    database_migrations: [],
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
        // Update existing with new details
        await CapabilityService.updateCapability(existing.id, cap);
        console.log(`[SeedCapabilities] Updated: ${cap.key}`);
      } else {
        // Create new capability
        await CapabilityService.createCapability(cap);
        console.log(`[SeedCapabilities] Created: ${cap.key}`);
      }
    } catch (error) {
      console.error(`[SeedCapabilities] Error with ${cap.key}:`, error);
    }
  }

  console.log("[SeedCapabilities] Seed complete!");
}
