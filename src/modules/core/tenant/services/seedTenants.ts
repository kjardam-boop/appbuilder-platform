import { supabase } from "@/integrations/supabase/client";
import { ProjectService } from "@/modules/core/project";
import { buildClientContext } from "@/shared/lib/buildContext";

interface TestTenant {
  tenant_id: string;
  name: string;
  subdomain: string;
  domain?: string;
  user_email: string;
  user_full_name: string;
  project_title: string;
  project_description: string;
}

const TEST_TENANTS: TestTenant[] = [
  {
    tenant_id: "test-tenant-001",
    name: "Acme Corporation",
    subdomain: "acme",
    domain: "acme.example.com",
    user_email: "admin@acme.example.com",
    user_full_name: "Acme Admin",
    project_title: "ERP Replacement Project",
    project_description: "Evaluere og velge nytt ERP-system for hele organisasjonen",
  },
  {
    tenant_id: "test-tenant-002",
    name: "TechStart AS",
    subdomain: "techstart",
    user_email: "ceo@techstart.example.com",
    user_full_name: "TechStart CEO",
    project_title: "CRM Implementation",
    project_description: "Implementere CRM-system for salgsteamet",
  },
];

export async function seedTenants(): Promise<void> {
  console.log("Starting tenant seed...");
  
  for (const tenantData of TEST_TENANTS) {
    try {
      console.log(`\nSeeding tenant: ${tenantData.name}`);

      // For demo purposes, use a mock user ID
      // In production, this would integrate with proper auth
      let userId = `user-${tenantData.tenant_id}`;

      console.log(`  ✓ Using mock user: ${userId}`);

      console.log(`  ✓ Tenant membership would be created in production`);

      // Create project for this tenant
      const ctx = await buildClientContext();
      
      const project = await ProjectService.createProject(
        ctx,
        tenantData.project_title,
        tenantData.project_description,
        null,
        userId
      );

      console.log(`  ✓ Created project: ${project.title}`);
      console.log(`✓ Seeded tenant: ${tenantData.name}`);
      
    } catch (error) {
      console.error(`✗ Failed to seed tenant ${tenantData.name}:`, error);
    }
  }

  console.log("\nTenant seed completed!");
}
