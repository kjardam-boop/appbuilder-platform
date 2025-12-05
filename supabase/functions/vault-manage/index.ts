/**
 * Vault Management Edge Function
 * Provides CRUD operations for Supabase Vault secrets
 * 
 * Actions:
 * - create: Create a new secret
 * - read: Read a secret by credential ID
 * - update: Update an existing secret
 * - delete: Delete a secret
 * - list: List all secrets for a tenant
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import * as VaultService from '../_shared/vaultService.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, tenantId, ...params } = body;

    if (!action || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'action and tenantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to tenant (check user_roles)
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: userRole } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .or(`scope_id.eq.${tenantId},scope_type.eq.platform`)
      .in('role', ['platform_owner', 'platform_support', 'tenant_owner', 'tenant_admin'])
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[vault-manage] Action: ${action}, Tenant: ${tenantId}, User: ${user.id}`);

    let result: any;

    switch (action) {
      case 'create': {
        const { name, secret, description, resourceType, resourceId } = params;
        
        if (!name || !secret || !resourceType || !resourceId) {
          return new Response(
            JSON.stringify({ error: 'name, secret, resourceType, and resourceId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const secretId = await VaultService.createSecret(
          { name, secret, description },
          { tenant_id: tenantId, resource_type: resourceType, resource_id: resourceId }
        );

        result = { success: true, secretId };
        break;
      }

      case 'read': {
        const { credentialId } = params;
        
        if (!credentialId) {
          return new Response(
            JSON.stringify({ error: 'credentialId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const credential = await VaultService.getCredentialSecret(credentialId, tenantId);
        
        if (!credential) {
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Don't return the actual secret to frontend - just metadata
        result = { 
          success: true, 
          metadata: credential.metadata,
          hasSecret: !!credential.secret,
        };
        break;
      }

      case 'update': {
        const { credentialId, newSecret, newName, newDescription } = params;
        
        if (!credentialId || !newSecret) {
          return new Response(
            JSON.stringify({ error: 'credentialId and newSecret are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the credential to find the vault secret ID
        const credential = await VaultService.getCredentialSecret(credentialId, tenantId);
        
        if (!credential) {
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the vault_credentials record to get key_id
        const { data: credRecord } = await supabaseService
          .from('vault_credentials')
          .select('key_id, encrypted_value')
          .eq('id', credentialId)
          .single();

        if (credRecord?.key_id && credRecord?.encrypted_value?.startsWith('vault:')) {
          // Update in Vault
          const success = await VaultService.updateSecret(
            credRecord.key_id,
            newSecret,
            newName,
            newDescription
          );
          result = { success };
        } else {
          // Legacy: update directly in vault_credentials
          const { error } = await supabaseService
            .from('vault_credentials')
            .update({
              encrypted_value: newSecret,
              updated_at: new Date().toISOString(),
            })
            .eq('id', credentialId);

          result = { success: !error };
        }
        break;
      }

      case 'delete': {
        const { credentialId } = params;
        
        if (!credentialId) {
          return new Response(
            JSON.stringify({ error: 'credentialId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the credential record
        const { data: credRecord } = await supabaseService
          .from('vault_credentials')
          .select('key_id, encrypted_value')
          .eq('id', credentialId)
          .eq('tenant_id', tenantId)
          .single();

        if (!credRecord) {
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (credRecord.key_id && credRecord.encrypted_value?.startsWith('vault:')) {
          // Delete from Vault (also deletes vault_credentials reference)
          await VaultService.deleteSecret(credRecord.key_id);
        } else {
          // Legacy: delete from vault_credentials only
          await supabaseService
            .from('vault_credentials')
            .delete()
            .eq('id', credentialId);
        }

        result = { success: true };
        break;
      }

      case 'list': {
        const secrets = await VaultService.listTenantSecrets(tenantId);
        result = { success: true, secrets };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vault-manage] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


