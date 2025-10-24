/**
 * Project Created Event Listener
 * Sends email notification when a new project is created
 */

import { eventBus } from "@/shared/events/bus";
import type { ProjectCreatedEvent } from "@/shared/events/newContracts";
import { PROJECT_EVENTS } from "@/shared/events/newContracts";
import { buildClientContext } from "@/shared/lib/buildContext";
import { sendMail } from "../services/mcpMailService";
import { ProjectService } from "@/modules/core/project";
import { CompanyService } from "@/modules/core/company";

// Store unsubscribe function
let unsubscribe: (() => void) | null = null;

/**
 * Check if feature is enabled for tenant
 */
function isFeatureEnabled(tenantId: string): boolean {
  // In production, this should check tenant config/feature flags
  // For now, we'll enable it by default
  // TODO: Implement proper feature flag check from tenant config
  return true;
}

/**
 * Get notification email address for tenant
 */
function getNotificationEmail(tenantId: string): string {
  // TODO: Fetch from tenant config
  // For now, use a default
  return "prosjektteam@dittfirma.no";
}

/**
 * Handle project created event
 */
async function handleProjectCreated(event: ProjectCreatedEvent): Promise<void> {
  try {
    console.log("[OnProjectCreated] Processing project created event", {
      projectId: event.projectId,
      projectName: event.projectName,
    });

    // Build context (in production, tenantId should come from event)
    const ctx = buildClientContext();

    // Check feature flag
    if (!isFeatureEnabled(ctx.tenant_id)) {
      console.log("[OnProjectCreated] Feature disabled for tenant", {
        tenantId: ctx.tenant_id,
      });
      return;
    }

    // Get project details
    const project = await ProjectService.getProjectById(ctx, event.projectId);
    if (!project) {
      console.warn("[OnProjectCreated] Project not found", {
        projectId: event.projectId,
      });
      return;
    }

    // Get customer details if available
    let customerName = "Ukjent";
    if (project.company_id) {
      try {
        const customer = await CompanyService.getCompanyById(project.company_id);
        if (customer) {
          customerName = customer.name;
        }
      } catch (error) {
        console.error("[OnProjectCreated] Failed to fetch customer", error);
      }
    }

    // Prepare email
    const to = getNotificationEmail(ctx.tenant_id);
    const subject = `Nytt prosjekt opprettet: ${project.title}`;
    const body = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2>Nytt ERP-prosjekt er opprettet</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 150px;">Prosjekt:</td>
            <td style="padding: 8px;">${project.title}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px; font-weight: bold;">Kunde:</td>
            <td style="padding: 8px;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Status:</td>
            <td style="padding: 8px;">${project.current_phase || 'Ukjent'}</td>
          </tr>
          ${project.description ? `
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px; font-weight: bold; vertical-align: top;">Beskrivelse:</td>
            <td style="padding: 8px;">${project.description}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; font-weight: bold;">Opprettet:</td>
            <td style="padding: 8px;">${new Date(project.created_at).toLocaleString('nb-NO')}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          <i>Tenant: ${ctx.tenant_id}</i>
        </p>
      </div>
    `;

    // Send email
    const result = await sendMail(ctx, { to, subject, body });

    if (result.success) {
      console.log("[OnProjectCreated] Email sent successfully", {
        projectId: event.projectId,
        messageId: result.messageId,
      });
    } else {
      console.error("[OnProjectCreated] Failed to send email", {
        projectId: event.projectId,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[OnProjectCreated] Error handling event", {
      event,
      error,
    });
    // Don't throw - we don't want to break the event bus
  }
}

/**
 * Register listener
 */
export function registerProjectCreatedListener(): void {
  if (unsubscribe) {
    console.warn("[OnProjectCreated] Listener already registered");
    return;
  }
  
  unsubscribe = eventBus.on(PROJECT_EVENTS.CREATED, handleProjectCreated);
  console.log("[OnProjectCreated] Listener registered");
}

/**
 * Unregister listener
 */
export function unregisterProjectCreatedListener(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    console.log("[OnProjectCreated] Listener unregistered");
  }
}
