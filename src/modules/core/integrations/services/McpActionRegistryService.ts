import { supabase } from "@/integrations/supabase/client";
import type { McpActionRegistry, McpActionRegistryInput } from "../types/mcpActionRegistry.types";

export class McpActionRegistryService {
  /**
   * List all MCP actions
   */
  static async listActions(adapterId?: string): Promise<McpActionRegistry[]> {
    let query = supabase
      .from("mcp_action_registry" as any)
      .select("*")
      .order("adapter_id", { ascending: true })
      .order("action_name", { ascending: true });

    if (adapterId) {
      query = query.eq("adapter_id", adapterId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as McpActionRegistry[];
  }

  /**
   * Get action by ID
   */
  static async getById(id: string): Promise<McpActionRegistry | null> {
    const { data, error } = await supabase
      .from("mcp_action_registry" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as McpActionRegistry;
  }

  /**
   * Create MCP action
   */
  static async create(input: McpActionRegistryInput): Promise<McpActionRegistry> {
    const { data, error } = await supabase
      .from("mcp_action_registry" as any)
      .insert(input as any)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as McpActionRegistry;
  }

  /**
   * Update MCP action
   */
  static async update(id: string, input: Partial<McpActionRegistryInput>): Promise<McpActionRegistry> {
    const { data, error } = await supabase
      .from("mcp_action_registry" as any)
      .update(input as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as McpActionRegistry;
  }

  /**
   * Delete MCP action
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("mcp_action_registry" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Get actions for specific adapter
   */
  static async getActionsForAdapter(adapterId: string): Promise<McpActionRegistry[]> {
    return this.listActions(adapterId);
  }
}
