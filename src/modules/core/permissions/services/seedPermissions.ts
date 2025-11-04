/**
 * Seed and Sync Permissions System
 * Ensures permission_resources and permission_actions stay in sync with the application
 */

import { supabase } from "@/integrations/supabase/client";

interface ResourceDefinition {
  key: string;
  name: string;
  description: string;
}

interface ActionDefinition {
  key: string;
  name: string;
  description: string;
}

/**
 * Core system resources
 * These should match the actual modules and tables in the system
 */
const CORE_RESOURCES: ResourceDefinition[] = [
  { key: "company", name: "Selskap", description: "Bedriftsinformasjon og metadata" },
  { key: "project", name: "Prosjekt", description: "Prosjektstyring og milepæler" },
  { key: "document", name: "Dokument", description: "Filer og dokumenter" },
  { key: "tasks", name: "Oppgaver", description: "Oppgaver og sjekklister" },
  { key: "opportunity", name: "Muligheter", description: "Salgsmuligheter og pipeline" },
  { key: "supplier", name: "Leverandør", description: "Leverandørevaluering og scoring" },
  { key: "integration", name: "Integrasjon", description: "API-integrasjoner og webhooks" },
  { key: "application", name: "Applikasjon", description: "Applikasjonsprodukter og leverandører" },
  { key: "user", name: "Bruker", description: "Brukerprofiler og innstillinger" },
  { key: "tenant", name: "Tenant", description: "Tenant-administrasjon" },
  { key: "capability", name: "Capability", description: "Gjenbrukbare funksjoner og tjenester" },
  { key: "app_definition", name: "App Definition", description: "Applikasjonsdefinisjoner og metadata" },
  { key: "app_vendor", name: "App Vendor", description: "Programvareleverandører" },
  { key: "industry", name: "Bransje", description: "Bransjer og NACE-klassifisering" },
  { key: "audit_log", name: "Revisjonslogg", description: "System audit og sporbarhet" },
];

/**
 * Standard CRUD actions
 */
const CORE_ACTIONS: ActionDefinition[] = [
  { key: "create", name: "Opprett", description: "Opprette nye ressurser" },
  { key: "read", name: "Les", description: "Lese og vise ressurser" },
  { key: "update", name: "Oppdater", description: "Oppdatere eksisterende ressurser" },
  { key: "delete", name: "Slett", description: "Slette ressurser" },
  { key: "list", name: "List", description: "Liste opp ressurser" },
  { key: "admin", name: "Administrer", description: "Full administrasjonstilgang" },
  { key: "export", name: "Eksporter", description: "Eksportere data" },
  { key: "import", name: "Importer", description: "Importere data" },
];

export class PermissionSeedService {
  /**
   * Seed all core resources
   */
  static async seedResources(): Promise<void> {
    console.log("[PermissionSeed] Seeding resources...");
    
    for (const resource of CORE_RESOURCES) {
      const { error } = await supabase
        .from("permission_resources")
        .upsert(
          {
            key: resource.key,
            name: resource.name,
            description: resource.description,
            is_active: true,
          },
          {
            onConflict: "key",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error(`[PermissionSeed] Error seeding resource ${resource.key}:`, error);
      } else {
        console.log(`[PermissionSeed] ✓ Seeded resource: ${resource.key}`);
      }
    }
  }

  /**
   * Seed all core actions
   */
  static async seedActions(): Promise<void> {
    console.log("[PermissionSeed] Seeding actions...");
    
    for (const action of CORE_ACTIONS) {
      const { error } = await supabase
        .from("permission_actions")
        .upsert(
          {
            key: action.key,
            name: action.name,
            description: action.description,
            is_active: true,
          },
          {
            onConflict: "key",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error(`[PermissionSeed] Error seeding action ${action.key}:`, error);
      } else {
        console.log(`[PermissionSeed] ✓ Seeded action: ${action.key}`);
      }
    }
  }

  /**
   * Seed everything
   */
  static async seedAll(): Promise<void> {
    console.log("[PermissionSeed] Starting permission seed...");
    await this.seedResources();
    await this.seedActions();
    console.log("[PermissionSeed] Seed completed!");
  }

  /**
   * Register a new resource dynamically
   * Use this when creating new modules or capabilities
   */
  static async registerResource(
    key: string,
    name: string,
    description: string
  ): Promise<void> {
    const { error } = await supabase
      .from("permission_resources")
      .upsert(
        {
          key,
          name,
          description,
          is_active: true,
        },
        {
          onConflict: "key",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error(`[PermissionSeed] Error registering resource ${key}:`, error);
      throw error;
    }

    console.log(`[PermissionSeed] ✓ Registered resource: ${key}`);
  }

  /**
   * Sync resources from capabilities table
   * Ensures all active capabilities are registered as resources
   */
  static async syncCapabilitiesAsResources(): Promise<void> {
    console.log("[PermissionSeed] Syncing capabilities...");

    const { data: capabilities, error } = await supabase
      .from("capabilities")
      .select("key, name, description")
      .eq("is_active", true);

    if (error) {
      console.error("[PermissionSeed] Error fetching capabilities:", error);
      return;
    }

    for (const cap of capabilities || []) {
      await this.registerResource(
        `capability:${cap.key}`,
        cap.name,
        cap.description || "Capability"
      );
    }
  }

  /**
   * Sync resources from app_definitions table
   */
  static async syncAppDefinitionsAsResources(): Promise<void> {
    console.log("[PermissionSeed] Syncing app definitions...");

    const { data: apps, error } = await supabase
      .from("app_definitions")
      .select("key, name, description")
      .eq("is_active", true);

    if (error) {
      console.error("[PermissionSeed] Error fetching app definitions:", error);
      return;
    }

    for (const app of apps || []) {
      await this.registerResource(
        `app:${app.key}`,
        app.name,
        app.description || "Application"
      );
    }
  }
}
