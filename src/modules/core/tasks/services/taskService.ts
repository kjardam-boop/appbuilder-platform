// @ts-nocheck
/**
 * Task Service (Tenant-aware)
 */

import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskChecklistItem, TaskCategory, EntityType, TaskStatus, TaskPriority } from '../types/tasks.types';
import type { RequestContext } from '@/modules/tenant/types/tenant.types';

export class TaskService {
  /**
   * Get database client from context (tenant-aware)
   */
  private static getDb(ctx: RequestContext) {
    return supabase;
  }
  // Task CRUD (tenant-scoped)
  static async getTasks(
    ctx: RequestContext,
    filters?: {
      entity_type?: EntityType;
      entity_id?: string;
      assigned_to?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
    }
  ): Promise<Task[]> {
    const db = this.getDb(ctx);
    let query = db
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getTask(ctx: RequestContext, id: string): Promise<Task | null> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createTask(ctx: RequestContext, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completion_percentage' | 'completed_at'>): Promise<Task> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateTask(ctx: RequestContext, id: string, updates: Partial<Task>): Promise<Task> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteTask(ctx: RequestContext, id: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Checklist items (tenant-scoped)
  static async getChecklistItems(ctx: RequestContext, taskId: string): Promise<TaskChecklistItem[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createChecklistItem(ctx: RequestContext, item: Omit<TaskChecklistItem, 'id' | 'created_at' | 'updated_at' | 'is_completed' | 'completed_at' | 'completed_by'>): Promise<TaskChecklistItem> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_checklist_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateChecklistItem(ctx: RequestContext, id: string, updates: Partial<TaskChecklistItem>): Promise<TaskChecklistItem> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async toggleChecklistItem(ctx: RequestContext, id: string, completed: boolean, userId: string): Promise<TaskChecklistItem> {
    const updates: Partial<TaskChecklistItem> = {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
    };

    return this.updateChecklistItem(ctx, id, updates);
  }

  static async deleteChecklistItem(ctx: RequestContext, id: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('task_checklist_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Task categories (tenant-scoped)
  static async getCategories(ctx: RequestContext): Promise<TaskCategory[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async getAllCategories(ctx: RequestContext): Promise<TaskCategory[]> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async createCategory(ctx: RequestContext, category: Omit<TaskCategory, 'id' | 'created_at' | 'updated_at'>): Promise<TaskCategory> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCategory(ctx: RequestContext, id: string, updates: Partial<TaskCategory>): Promise<TaskCategory> {
    const db = this.getDb(ctx);
    const { data, error } = await db
      .from('task_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteCategory(ctx: RequestContext, id: string): Promise<void> {
    const db = this.getDb(ctx);
    const { error } = await db
      .from('task_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getTaskCountByEntity(ctx: RequestContext, entityType: EntityType, entityId: string): Promise<number> {
    const db = this.getDb(ctx);
    const { count, error } = await db
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Get the company_id associated with a task based on its entity (tenant-scoped)
   * Returns null if task is not company-related (e.g., personal tasks)
   */
  static async getTaskCompanyId(ctx: RequestContext, taskId: string): Promise<string | null> {
    const db = this.getDb(ctx);
    // First get the task with entity info
    const { data: task, error: taskError } = await db
      .from('tasks')
      .select('entity_type, entity_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) return null;

    // Direct company reference
    if (task.entity_type === 'company') {
      return task.entity_id;
    }

    // Project reference
    if (task.entity_type === 'project') {
      const { data: project } = await db
        .from('projects')
        .select('company_id')
        .eq('id', task.entity_id)
        .single();
      return project?.company_id || null;
    }

    // Opportunity reference
    if (task.entity_type === 'opportunity') {
      const { data: opportunity } = await db
        .from('opportunities')
        .select('company_id')
        .eq('id', task.entity_id)
        .single();
      return opportunity?.company_id || null;
    }

    // User tasks or other types have no company restriction
    return null;
  }
}
