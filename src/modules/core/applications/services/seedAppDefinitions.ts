/**
 * Seed Platform Apps (app_definitions)
 * Populates the app registry with built-in platform applications
 */

import { supabase } from "@/integrations/supabase/client";
import type { AppDefinition } from "../types/appRegistry.types";

const PLATFORM_APPS: Omit<AppDefinition, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    key: 'jul25',
    name: 'Christmas 2025 Planner',
    description: 'Family coordination app for Christmas planning with calendar, tasks, and presence tracking',
    app_type: 'addon',
    icon_name: 'Calendar',
    is_active: true,
    domain_tables: [
      'jul25_families',
      'jul25_family_members',
      'jul25_family_periods',
      'jul25_member_periods',
      'jul25_member_custom_periods',
      'jul25_tasks',
      'jul25_task_assignments',
      'jul25_christmas_words'
    ],
    shared_tables: [],
    routes: [
      '/apps/jul25',
      '/apps/jul25/admin',
      '/apps/jul25/member/:memberId',
      '/apps/jul25/invite'
    ],
    modules: ['task_management', 'calendar', 'family_coordination'],
    extension_points: {
      hooks: [
        { key: 'jul25.task.created', type: 'event', description: 'Fired when a new task is created' },
        { key: 'jul25.family.member_added', type: 'event', description: 'Fired when a member joins a family' }
      ],
      ui_components: [
        { key: 'jul25.calendar_view', path: '/apps/jul25', type: 'page' },
        { key: 'jul25.task_widget', path: 'components/TaskWidget', type: 'widget' }
      ]
    },
    hooks: [
      { key: 'jul25.task.created', type: 'event', description: 'Fired when a new task is created' },
      { key: 'jul25.family.member_added', type: 'event', description: 'Fired when a member joins a family' }
    ],
    ui_components: [
      { key: 'jul25.calendar_view', path: '/apps/jul25', type: 'page' },
      { key: 'jul25.task_widget', path: 'components/TaskWidget', type: 'widget' }
    ],
    capabilities: ['calendar_view', 'task_management', 'presence_tracking'],
    integration_requirements: {
      requires_email: false,
      requires_calendar: true,
      required_external_systems: []
    },
    schema_version: '1.0.0'
  }
];

/**
 * Seed app definitions into the database
 */
export async function seedAppDefinitions() {
  console.log('🌱 Starting Platform Apps seed...');

  try {
    for (const appDef of PLATFORM_APPS) {
      console.log(`  → Seeding app: ${appDef.name} (${appDef.key})`);

      // Check if app already exists
      const { data: existing } = await (supabase as any)
        .from('app_definitions')
        .select('id, key')
        .eq('key', appDef.key)
        .maybeSingle();

      if (existing) {
        console.log(`    ✓ App ${appDef.key} already exists, updating...`);
        
        const { error: updateError } = await (supabase as any)
          .from('app_definitions')
          .update({
            ...appDef,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`    ✗ Failed to update ${appDef.key}:`, updateError);
          throw updateError;
        }
        
        console.log(`    ✓ Updated ${appDef.key}`);
      } else {
        console.log(`    → Creating new app definition for ${appDef.key}...`);
        
        const { error: insertError } = await (supabase as any)
          .from('app_definitions')
          .insert(appDef);

        if (insertError) {
          console.error(`    ✗ Failed to create ${appDef.key}:`, insertError);
          throw insertError;
        }
        
        console.log(`    ✓ Created ${appDef.key}`);
      }
    }

    console.log('✅ Platform Apps seed completed successfully!');
  } catch (error) {
    console.error('❌ Platform Apps seed failed:', error);
    throw error;
  }
}
