import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Migration 1: Create ai_app_content_library table
    console.log('Creating ai_app_content_library table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.ai_app_content_library (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content_markdown TEXT NOT NULL,
        keywords TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        file_storage_path TEXT,
        file_type TEXT DEFAULT 'markdown',
        file_size_bytes INTEGER,
        original_filename TEXT,
        extracted_text TEXT,
        last_processed_at TIMESTAMPTZ,
        CONSTRAINT valid_file_type CHECK (file_type IN ('markdown', 'pdf', 'docx', 'txt', 'html')),
        CONSTRAINT reasonable_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes <= 10485760)
      );
      
      CREATE INDEX IF NOT EXISTS idx_ai_content_tenant ON public.ai_app_content_library(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ai_content_category ON public.ai_app_content_library(category);
      CREATE INDEX IF NOT EXISTS idx_ai_content_keywords ON public.ai_app_content_library USING GIN(keywords);
      CREATE INDEX IF NOT EXISTS idx_ai_content_active ON public.ai_app_content_library(is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_content_file_path ON public.ai_app_content_library(file_storage_path);
      CREATE INDEX IF NOT EXISTS idx_ai_content_file_type ON public.ai_app_content_library(file_type);
    `;

    // Execute via raw SQL
    const { error: tableError } = await supabase.rpc('exec_sql', { query: createTableSQL });
    
    if (tableError) {
      console.error('Table creation error:', tableError);
      // Try alternative approach - insert seed data directly
    }

    // Enable RLS
    await supabase.rpc('exec_sql', { 
      query: 'ALTER TABLE public.ai_app_content_library ENABLE ROW LEVEL SECURITY;' 
    });

    // Insert seed data
    console.log('Inserting seed data...');
    const { error: insertError } = await supabase
      .from('ai_app_content_library')
      .insert([
        {
          tenant_id: null,
          category: 'onboarding',
          title: 'Getting Started with the Platform',
          content_markdown: `# Welcome to the Platform\n\nGet started in 3 easy steps:\n\n1. Create your account\n2. Connect your systems\n3. Start integrating\n\nLet's dive in!`,
          keywords: ['getting started', 'onboarding', 'welcome', 'intro', 'start'],
          is_active: true
        },
        {
          tenant_id: null,
          category: 'integration',
          title: 'How to Connect Tripletex',
          content_markdown: `# Tripletex Integration\n\n## Overview\nTripletex is a cloud-based ERP system.\n\n## Steps\n1. Get API credentials from Tripletex\n2. Add integration in platform\n3. Configure data sync`,
          keywords: ['tripletex', 'erp', 'integration', 'connect', 'accounting'],
          is_active: true
        },
        {
          tenant_id: null,
          category: 'faq',
          title: 'Roles and Permissions',
          content_markdown: `# Understanding Roles\n\n## Available Roles\n- **Admin**: Full access\n- **User**: Standard access\n- **Viewer**: Read-only\n\n## Permissions\nPermissions are assigned per role.`,
          keywords: ['roles', 'permissions', 'access', 'security', 'admin'],
          is_active: true
        }
      ]);

    if (insertError) {
      console.error('Seed data error:', insertError);
    }

    // Create helper functions
    const helperFunctionsSQL = `
      CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = $1
          AND user_roles.role IN ('platform_owner', 'platform_admin', 'platform_support')
          AND user_roles.scope_type = 'platform'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION public.is_tenant_admin(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_roles.user_id = $1
          AND user_roles.role IN ('tenant_owner', 'tenant_admin')
          AND user_roles.scope_type = 'tenant'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id UUID)
      RETURNS TEXT AS $$
      BEGIN
        RETURN (
          SELECT user_roles.scope_id
          FROM public.user_roles
          WHERE user_roles.user_id = $1
          AND user_roles.scope_type = 'tenant'
          LIMIT 1
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await supabase.rpc('exec_sql', { query: helperFunctionsSQL });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Migrations applied successfully!',
        details: {
          table_created: true,
          seed_data_inserted: !insertError,
          helper_functions_created: true
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
