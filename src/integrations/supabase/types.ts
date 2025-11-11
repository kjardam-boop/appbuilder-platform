export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_policies: {
        Row: {
          alert_threshold_percent: number | null
          blocked_keywords: string[] | null
          created_at: string
          enable_content_filter: boolean | null
          enable_failover: boolean | null
          failover_on_error: boolean | null
          failover_on_rate_limit: boolean | null
          id: string
          max_cost_per_day: number | null
          max_cost_per_month: number | null
          max_requests_per_day: number | null
          max_requests_per_hour: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          alert_threshold_percent?: number | null
          blocked_keywords?: string[] | null
          created_at?: string
          enable_content_filter?: boolean | null
          enable_failover?: boolean | null
          failover_on_error?: boolean | null
          failover_on_rate_limit?: boolean | null
          id?: string
          max_cost_per_day?: number | null
          max_cost_per_month?: number | null
          max_requests_per_day?: number | null
          max_requests_per_hour?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          alert_threshold_percent?: number | null
          blocked_keywords?: string[] | null
          created_at?: string
          enable_content_filter?: boolean | null
          enable_failover?: boolean | null
          failover_on_error?: boolean | null
          failover_on_rate_limit?: boolean | null
          id?: string
          max_cost_per_day?: number | null
          max_cost_per_month?: number | null
          max_requests_per_day?: number | null
          max_requests_per_hour?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_provider_health: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_check_at: string
          metadata: Json | null
          provider: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_check_at?: string
          metadata?: Json | null
          provider: string
          response_time_ms?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_check_at?: string
          metadata?: Json | null
          provider?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          cost_estimate: number | null
          created_at: string
          endpoint: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number | null
          provider: string
          request_duration_ms: number | null
          status: string | null
          tenant_id: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number | null
          provider: string
          request_duration_ms?: number | null
          status?: string | null
          tenant_id: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number | null
          provider?: string
          request_duration_ms?: number | null
          status?: string | null
          tenant_id?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_capability_usage: {
        Row: {
          app_definition_id: string
          capability_id: string
          config_schema: Json | null
          created_at: string
          id: string
          is_required: boolean
          updated_at: string
        }
        Insert: {
          app_definition_id: string
          capability_id: string
          config_schema?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean
          updated_at?: string
        }
        Update: {
          app_definition_id?: string
          capability_id?: string
          config_schema?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_capability_usage_app_definition_id_fkey"
            columns: ["app_definition_id"]
            isOneToOne: false
            referencedRelation: "app_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_capability_usage_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      app_categories: {
        Row: {
          created_at: string
          description: string | null
          documentation_url: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          parent_key: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          parent_key?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          parent_key?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_categories_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "app_categories_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "app_categories_tree"
            referencedColumns: ["key"]
          },
        ]
      }
      app_definitions: {
        Row: {
          app_type: string
          capabilities: string[] | null
          created_at: string
          description: string | null
          domain_tables: string[]
          extension_points: Json | null
          hooks: Json | null
          icon_name: string
          id: string
          integration_requirements: Json | null
          is_active: boolean
          key: string
          modules: string[] | null
          name: string
          routes: string[] | null
          schema_version: string
          shared_tables: string[] | null
          ui_components: Json | null
          updated_at: string
        }
        Insert: {
          app_type: string
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          domain_tables?: string[]
          extension_points?: Json | null
          hooks?: Json | null
          icon_name?: string
          id?: string
          integration_requirements?: Json | null
          is_active?: boolean
          key: string
          modules?: string[] | null
          name: string
          routes?: string[] | null
          schema_version?: string
          shared_tables?: string[] | null
          ui_components?: Json | null
          updated_at?: string
        }
        Update: {
          app_type?: string
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          domain_tables?: string[]
          extension_points?: Json | null
          hooks?: Json | null
          icon_name?: string
          id?: string
          integration_requirements?: Json | null
          is_active?: boolean
          key?: string
          modules?: string[] | null
          name?: string
          routes?: string[] | null
          schema_version?: string
          shared_tables?: string[] | null
          ui_components?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          app_definition_id: string
          breaking_changes: boolean | null
          changelog: string | null
          deprecated_at: string | null
          end_of_life_at: string | null
          id: string
          manifest_url: string | null
          migrations: Json | null
          released_at: string
          version: string
        }
        Insert: {
          app_definition_id: string
          breaking_changes?: boolean | null
          changelog?: string | null
          deprecated_at?: string | null
          end_of_life_at?: string | null
          id?: string
          manifest_url?: string | null
          migrations?: Json | null
          released_at?: string
          version: string
        }
        Update: {
          app_definition_id?: string
          breaking_changes?: boolean | null
          changelog?: string | null
          deprecated_at?: string | null
          end_of_life_at?: string | null
          id?: string
          manifest_url?: string | null
          migrations?: Json | null
          released_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_app_definition_id_fkey"
            columns: ["app_definition_id"]
            isOneToOne: false
            referencedRelation: "app_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          app_definition_id: string | null
          app_type: string | null
          channel: string
          config: Json | null
          created_at: string
          deployed_at: string | null
          id: string
          installed_at: string
          installed_version: string
          is_active: boolean
          last_migration_at: string | null
          last_migration_version: string | null
          last_updated_at: string | null
          migration_status: string | null
          overrides: Json | null
          source_project_id: string | null
          status: string
          subdomain: string | null
          tenant_id: string
          updated_at: string
          vault_credential_id: string | null
        }
        Insert: {
          app_definition_id?: string | null
          app_type?: string | null
          channel?: string
          config?: Json | null
          created_at?: string
          deployed_at?: string | null
          id?: string
          installed_at?: string
          installed_version: string
          is_active?: boolean
          last_migration_at?: string | null
          last_migration_version?: string | null
          last_updated_at?: string | null
          migration_status?: string | null
          overrides?: Json | null
          source_project_id?: string | null
          status?: string
          subdomain?: string | null
          tenant_id: string
          updated_at?: string
          vault_credential_id?: string | null
        }
        Update: {
          app_definition_id?: string | null
          app_type?: string | null
          channel?: string
          config?: Json | null
          created_at?: string
          deployed_at?: string | null
          id?: string
          installed_at?: string
          installed_version?: string
          is_active?: boolean
          last_migration_at?: string | null
          last_migration_version?: string | null
          last_updated_at?: string | null
          migration_status?: string | null
          overrides?: Json | null
          source_project_id?: string | null
          status?: string
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string
          vault_credential_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_app_definition_id_fkey"
            columns: ["app_definition_id"]
            isOneToOne: false
            referencedRelation: "app_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "customer_app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_vault_credential_id_fkey"
            columns: ["vault_credential_id"]
            isOneToOne: false
            referencedRelation: "vault_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip_address: unknown
          resource: string
          tenant_id: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource: string
          tenant_id: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          resource?: string
          tenant_id?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      capabilities: {
        Row: {
          app_definition_id: string | null
          backend_files: string[] | null
          category: string
          created_at: string | null
          current_version: string
          database_migrations: string[] | null
          demo_url: string | null
          dependencies: string[] | null
          description: string | null
          documentation_path: string | null
          documentation_url: string | null
          domain_tables: string[] | null
          estimated_dev_hours: number | null
          frontend_files: string[] | null
          hooks: string[] | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          price_per_month: number | null
          scope: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          app_definition_id?: string | null
          backend_files?: string[] | null
          category: string
          created_at?: string | null
          current_version?: string
          database_migrations?: string[] | null
          demo_url?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_path?: string | null
          documentation_url?: string | null
          domain_tables?: string[] | null
          estimated_dev_hours?: number | null
          frontend_files?: string[] | null
          hooks?: string[] | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          price_per_month?: number | null
          scope?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          app_definition_id?: string | null
          backend_files?: string[] | null
          category?: string
          created_at?: string | null
          current_version?: string
          database_migrations?: string[] | null
          demo_url?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_path?: string | null
          documentation_url?: string | null
          domain_tables?: string[] | null
          estimated_dev_hours?: number | null
          frontend_files?: string[] | null
          hooks?: string[] | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          price_per_month?: number | null
          scope?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capabilities_app_definition_id_fkey"
            columns: ["app_definition_id"]
            isOneToOne: false
            referencedRelation: "app_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_versions: {
        Row: {
          breaking_changes: boolean | null
          capability_id: string
          changelog: string | null
          code_reference: string | null
          database_migrations: string[] | null
          deprecated_at: string | null
          edge_functions: string[] | null
          end_of_life_at: string | null
          id: string
          released_at: string | null
          version: string
        }
        Insert: {
          breaking_changes?: boolean | null
          capability_id: string
          changelog?: string | null
          code_reference?: string | null
          database_migrations?: string[] | null
          deprecated_at?: string | null
          edge_functions?: string[] | null
          end_of_life_at?: string | null
          id?: string
          released_at?: string | null
          version: string
        }
        Update: {
          breaking_changes?: boolean | null
          capability_id?: string
          changelog?: string | null
          code_reference?: string | null
          database_migrations?: string[] | null
          deprecated_at?: string | null
          edge_functions?: string[] | null
          end_of_life_at?: string | null
          id?: string
          released_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_versions_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_roles: string[] | null
          created_at: string
          crm_status: string | null
          customer_since: string | null
          driftsinntekter: number | null
          driftsresultat: number | null
          egenkapital: number | null
          employees: number | null
          id: string
          industry_code: string | null
          industry_description: string | null
          industry_keys: string[] | null
          is_approved_supplier: boolean | null
          last_fetched_at: string | null
          last_interaction_date: string | null
          name: string
          org_form: string | null
          org_number: string | null
          segment: string | null
          slug: string | null
          source: string | null
          supplier_certifications: string[] | null
          totalkapital: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_roles?: string[] | null
          created_at?: string
          crm_status?: string | null
          customer_since?: string | null
          driftsinntekter?: number | null
          driftsresultat?: number | null
          egenkapital?: number | null
          employees?: number | null
          id?: string
          industry_code?: string | null
          industry_description?: string | null
          industry_keys?: string[] | null
          is_approved_supplier?: boolean | null
          last_fetched_at?: string | null
          last_interaction_date?: string | null
          name: string
          org_form?: string | null
          org_number?: string | null
          segment?: string | null
          slug?: string | null
          source?: string | null
          supplier_certifications?: string[] | null
          totalkapital?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_roles?: string[] | null
          created_at?: string
          crm_status?: string | null
          customer_since?: string | null
          driftsinntekter?: number | null
          driftsresultat?: number | null
          egenkapital?: number | null
          employees?: number | null
          id?: string
          industry_code?: string | null
          industry_description?: string | null
          industry_keys?: string[] | null
          is_approved_supplier?: boolean | null
          last_fetched_at?: string | null
          last_interaction_date?: string | null
          name?: string
          org_form?: string | null
          org_number?: string | null
          segment?: string | null
          slug?: string | null
          source?: string | null
          supplier_certifications?: string[] | null
          totalkapital?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_external_systems: {
        Row: {
          company_id: string
          config: Json | null
          created_at: string
          credential_expires_at: string | null
          credentials: Json | null
          environment: string | null
          external_system_id: string
          id: string
          last_tested_at: string | null
          notes: string | null
          sku_id: string | null
          test_status: string | null
          updated_at: string
          vault_credential_id: string | null
          version: string | null
        }
        Insert: {
          company_id: string
          config?: Json | null
          created_at?: string
          credential_expires_at?: string | null
          credentials?: Json | null
          environment?: string | null
          external_system_id: string
          id?: string
          last_tested_at?: string | null
          notes?: string | null
          sku_id?: string | null
          test_status?: string | null
          updated_at?: string
          vault_credential_id?: string | null
          version?: string | null
        }
        Update: {
          company_id?: string
          config?: Json | null
          created_at?: string
          credential_expires_at?: string | null
          credentials?: Json | null
          environment?: string | null
          external_system_id?: string
          id?: string
          last_tested_at?: string | null
          notes?: string | null
          sku_id?: string | null
          test_status?: string | null
          updated_at?: string
          vault_credential_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_apps_app_product_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_apps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_apps_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "external_system_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_external_systems_vault_credential_id_fkey"
            columns: ["vault_credential_id"]
            isOneToOne: false
            referencedRelation: "vault_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      company_interactions: {
        Row: {
          company_id: string
          contact_person_id: string | null
          created_at: string
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          contact_person_id?: string | null
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type: string
          notes?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          contact_person_id?: string | null
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_metadata: {
        Row: {
          company_id: string
          contact_persons: Json | null
          created_at: string | null
          for_followup: boolean | null
          has_potential: boolean | null
          id: string
          in_crm: boolean | null
          logo_url: string | null
          notes: string | null
          priority_level: string | null
          sales_assessment_score: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          contact_persons?: Json | null
          created_at?: string | null
          for_followup?: boolean | null
          has_potential?: boolean | null
          id?: string
          in_crm?: boolean | null
          logo_url?: string | null
          notes?: string | null
          priority_level?: string | null
          sales_assessment_score?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          contact_persons?: Json | null
          created_at?: string | null
          for_followup?: boolean | null
          has_potential?: boolean | null
          id?: string
          in_crm?: boolean | null
          logo_url?: string | null
          notes?: string | null
          priority_level?: string | null
          sales_assessment_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_metadata_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_audit_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown
          resource_id: string
          resource_type: string
          status: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
          vault_secret_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource_id: string
          resource_type: string
          status?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
          vault_secret_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string
          resource_type?: string
          status?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
          vault_secret_id?: string | null
        }
        Relationships: []
      }
      customer_app_projects: {
        Row: {
          app_key: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          deployed_to_preview_at: string | null
          deployed_to_production_at: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          name: string
          selected_capabilities: Json | null
          status: string | null
          subdomain: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          app_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_to_preview_at?: string | null
          deployed_to_production_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          name: string
          selected_capabilities?: Json | null
          status?: string | null
          subdomain?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          app_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deployed_to_preview_at?: string | null
          deployed_to_production_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          name?: string
          selected_capabilities?: Json | null
          status?: string | null
          subdomain?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_app_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          request_type: string
          requested_at: string
          requested_by: string | null
          result_data: Json | null
          status: string
          subject_email: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_type: string
          requested_at?: string
          requested_by?: string | null
          result_data?: Json | null
          status?: string
          subject_email: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_type?: string
          requested_at?: string
          requested_by?: string | null
          result_data?: Json | null
          status?: string
          subject_email?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          metadata: Json | null
          name: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          name: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      erp_extensions: {
        Row: {
          certification_level: string | null
          created_at: string
          external_system_id: string
          id: string
          implementation_time_weeks: number | null
          industries_served: string[]
          localizations: string[]
          modules: string[]
          notes: string | null
          partner_count: number
          updated_at: string
        }
        Insert: {
          certification_level?: string | null
          created_at?: string
          external_system_id: string
          id?: string
          implementation_time_weeks?: number | null
          industries_served?: string[]
          localizations?: string[]
          modules?: string[]
          notes?: string | null
          partner_count?: number
          updated_at?: string
        }
        Update: {
          certification_level?: string | null
          created_at?: string
          external_system_id?: string
          id?: string
          implementation_time_weeks?: number | null
          industries_served?: string[]
          localizations?: string[]
          modules?: string[]
          notes?: string | null
          partner_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_extensions_app_product_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: true
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_responses: {
        Row: {
          created_at: string
          evaluation_id: string
          id: string
          notes: string | null
          question_id: string
          response_text: string | null
          score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          id?: string
          notes?: string | null
          question_id: string
          response_text?: string | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          question_id?: string
          response_text?: string | null
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_responses_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "supplier_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_system_integration_patterns: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          documentation_url: string | null
          estimated_setup_minutes: number | null
          id: string
          is_featured: boolean | null
          key: string
          name: string
          pattern_type: string
          required_capabilities: string[] | null
          source_system_id: string | null
          target_system_id: string | null
          trigger_event: string | null
          updated_at: string
          usage_count: number | null
          workflow_template: Json | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          documentation_url?: string | null
          estimated_setup_minutes?: number | null
          id?: string
          is_featured?: boolean | null
          key: string
          name: string
          pattern_type: string
          required_capabilities?: string[] | null
          source_system_id?: string | null
          target_system_id?: string | null
          trigger_event?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow_template?: Json | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          documentation_url?: string | null
          estimated_setup_minutes?: number | null
          id?: string
          is_featured?: boolean | null
          key?: string
          name?: string
          pattern_type?: string
          required_capabilities?: string[] | null
          source_system_id?: string | null
          target_system_id?: string | null
          trigger_event?: string | null
          updated_at?: string
          usage_count?: number | null
          workflow_template?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_integration_patterns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_integration_patterns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_integration_patterns_source_product_id_fkey"
            columns: ["source_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_integration_patterns_target_product_id_fkey"
            columns: ["target_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      external_system_integrations: {
        Row: {
          created_at: string
          external_system_id: string
          id: string
          name: string
          notes: string | null
          spec_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_system_id: string
          id?: string
          name: string
          notes?: string | null
          spec_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_system_id?: string
          id?: string
          name?: string
          notes?: string | null
          spec_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_integrations_app_product_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      external_system_mcp_actions: {
        Row: {
          created_at: string
          documentation_url: string | null
          example_payload: Json | null
          external_system_id: string
          id: string
          is_active: boolean | null
          mcp_action_key: string
          operation: string
          required_scopes: string[] | null
          requires_auth: boolean | null
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documentation_url?: string | null
          example_payload?: Json | null
          external_system_id: string
          id?: string
          is_active?: boolean | null
          mcp_action_key: string
          operation: string
          required_scopes?: string[] | null
          requires_auth?: boolean | null
          resource_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documentation_url?: string | null
          example_payload?: Json | null
          external_system_id?: string
          id?: string
          is_active?: boolean | null
          mcp_action_key?: string
          operation?: string
          required_scopes?: string[] | null
          requires_auth?: boolean | null
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_product_mcp_actions_app_product_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      external_system_skus: {
        Row: {
          code: string | null
          created_at: string
          edition_name: string
          external_system_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          edition_name: string
          external_system_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          edition_name?: string
          external_system_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skus_app_product_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      external_system_vendors: {
        Row: {
          company_id: string
          contact_url: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          org_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_id: string
          contact_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_id?: string
          contact_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      external_systems: {
        Row: {
          ai_plugins: boolean | null
          api_docs_url: string | null
          api_keys: boolean | null
          category_id: string | null
          compliances: string[] | null
          created_at: string
          deployment_models: string[]
          description: string | null
          dual_region: boolean | null
          email_parse: boolean | null
          eu_data_residency: boolean | null
          event_subscriptions: boolean | null
          file_export: boolean | null
          gdpr_statement_url: string | null
          graphql: boolean | null
          id: string
          ip_allowlist: boolean | null
          localizations: string[] | null
          market_segments: string[] | null
          mcp_connector: boolean | null
          modules_supported: string[] | null
          n8n_node: boolean | null
          name: string
          oauth2: boolean | null
          pipedream_support: boolean | null
          pricing_model: string | null
          privacy_risk_level: string | null
          rate_limits: Json | null
          rest_api: boolean | null
          scim: boolean | null
          short_name: string | null
          slug: string
          sso: boolean | null
          status: string
          system_types: string[] | null
          target_industries: string[] | null
          updated_at: string
          vendor_id: string
          webhooks: boolean | null
          website: string | null
          zapier_app: boolean | null
        }
        Insert: {
          ai_plugins?: boolean | null
          api_docs_url?: string | null
          api_keys?: boolean | null
          category_id?: string | null
          compliances?: string[] | null
          created_at?: string
          deployment_models?: string[]
          description?: string | null
          dual_region?: boolean | null
          email_parse?: boolean | null
          eu_data_residency?: boolean | null
          event_subscriptions?: boolean | null
          file_export?: boolean | null
          gdpr_statement_url?: string | null
          graphql?: boolean | null
          id?: string
          ip_allowlist?: boolean | null
          localizations?: string[] | null
          market_segments?: string[] | null
          mcp_connector?: boolean | null
          modules_supported?: string[] | null
          n8n_node?: boolean | null
          name: string
          oauth2?: boolean | null
          pipedream_support?: boolean | null
          pricing_model?: string | null
          privacy_risk_level?: string | null
          rate_limits?: Json | null
          rest_api?: boolean | null
          scim?: boolean | null
          short_name?: string | null
          slug: string
          sso?: boolean | null
          status?: string
          system_types?: string[] | null
          target_industries?: string[] | null
          updated_at?: string
          vendor_id: string
          webhooks?: boolean | null
          website?: string | null
          zapier_app?: boolean | null
        }
        Update: {
          ai_plugins?: boolean | null
          api_docs_url?: string | null
          api_keys?: boolean | null
          category_id?: string | null
          compliances?: string[] | null
          created_at?: string
          deployment_models?: string[]
          description?: string | null
          dual_region?: boolean | null
          email_parse?: boolean | null
          eu_data_residency?: boolean | null
          event_subscriptions?: boolean | null
          file_export?: boolean | null
          gdpr_statement_url?: string | null
          graphql?: boolean | null
          id?: string
          ip_allowlist?: boolean | null
          localizations?: string[] | null
          market_segments?: string[] | null
          mcp_connector?: boolean | null
          modules_supported?: string[] | null
          n8n_node?: boolean | null
          name?: string
          oauth2?: boolean | null
          pipedream_support?: boolean | null
          pricing_model?: string | null
          privacy_risk_level?: string | null
          rate_limits?: Json | null
          rest_api?: boolean | null
          scim?: boolean | null
          short_name?: string | null
          slug?: string
          sso?: boolean | null
          status?: string
          system_types?: string[] | null
          target_industries?: string[] | null
          updated_at?: string
          vendor_id?: string
          webhooks?: boolean | null
          website?: string | null
          zapier_app?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "app_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "external_system_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string
          default_modules: string[] | null
          description: string | null
          id: string
          is_active: boolean
          key: string
          nace_codes: string[]
          name: string
          parent_key: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_modules?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          nace_codes?: string[]
          name: string
          parent_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_modules?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          nace_codes?: string[]
          name?: string
          parent_key?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      integration_definitions: {
        Row: {
          capabilities: Json | null
          category_id: string | null
          created_at: string | null
          credential_fields: Json | null
          default_config: Json | null
          default_delivery_method: string | null
          description: string | null
          documentation_url: string | null
          external_system_id: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          requires_credentials: boolean | null
          setup_guide_url: string | null
          supported_delivery_methods: string[]
          tags: string[] | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          capabilities?: Json | null
          category_id?: string | null
          created_at?: string | null
          credential_fields?: Json | null
          default_config?: Json | null
          default_delivery_method?: string | null
          description?: string | null
          documentation_url?: string | null
          external_system_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          requires_credentials?: boolean | null
          setup_guide_url?: string | null
          supported_delivery_methods?: string[]
          tags?: string[] | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          capabilities?: Json | null
          category_id?: string | null
          created_at?: string | null
          credential_fields?: Json | null
          default_config?: Json | null
          default_delivery_method?: string | null
          description?: string | null
          documentation_url?: string | null
          external_system_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          requires_credentials?: boolean | null
          setup_guide_url?: string | null
          supported_delivery_methods?: string[]
          tags?: string[] | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories_tree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_definitions_external_system_id_fkey"
            columns: ["external_system_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_definitions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "external_system_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_delivery_methods: {
        Row: {
          created_at: string | null
          description: string | null
          documentation_url: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          requires_credentials: boolean | null
          requires_server: boolean | null
          sort_order: number | null
          typical_use_cases: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          requires_credentials?: boolean | null
          requires_server?: boolean | null
          sort_order?: number | null
          typical_use_cases?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          requires_credentials?: boolean | null
          requires_server?: boolean | null
          sort_order?: number | null
          typical_use_cases?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_recommendation: {
        Row: {
          app_key: string
          breakdown: Json
          created_at: string
          explain: Json
          id: string
          provider: string
          score: number
          suggestions: Json | null
          system_product_id: string
          tenant_id: string
          updated_at: string
          workflow_key: string | null
        }
        Insert: {
          app_key: string
          breakdown: Json
          created_at?: string
          explain: Json
          id?: string
          provider: string
          score: number
          suggestions?: Json | null
          system_product_id: string
          tenant_id: string
          updated_at?: string
          workflow_key?: string | null
        }
        Update: {
          app_key?: string
          breakdown?: Json
          created_at?: string
          explain?: Json
          id?: string
          provider?: string
          score?: number
          suggestions?: Json | null
          system_product_id?: string
          tenant_id?: string
          updated_at?: string
          workflow_key?: string | null
        }
        Relationships: []
      }
      integration_run: {
        Row: {
          action_name: string | null
          error_message: string | null
          external_run_id: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          idempotency_key: string | null
          provider: string
          request_id: string | null
          response_json: Json | null
          started_at: string
          status: string
          tenant_id: string
          workflow_key: string
        }
        Insert: {
          action_name?: string | null
          error_message?: string | null
          external_run_id?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          provider: string
          request_id?: string | null
          response_json?: Json | null
          started_at?: string
          status?: string
          tenant_id: string
          workflow_key: string
        }
        Update: {
          action_name?: string | null
          error_message?: string | null
          external_run_id?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          idempotency_key?: string | null
          provider?: string
          request_id?: string | null
          response_json?: Json | null
          started_at?: string
          status?: string
          tenant_id?: string
          workflow_key?: string
        }
        Relationships: []
      }
      integration_usage_logs: {
        Row: {
          action: string
          adapter_id: string
          created_at: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_status: number
          response_time_ms: number
          tenant_id: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          adapter_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_status: number
          response_time_ms: number
          tenant_id: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          adapter_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_status?: number
          response_time_ms?: number
          tenant_id?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          contact_person_name: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          intended_role: Database["public"]["Enums"]["app_role"] | null
          invited_by: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          contact_person_name?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          intended_role?: Database["public"]["Enums"]["app_role"] | null
          invited_by?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          contact_person_name?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          intended_role?: Database["public"]["Enums"]["app_role"] | null
          invited_by?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_christmas_words: {
        Row: {
          day: number
          generated_at: string
          id: string
          word: string
        }
        Insert: {
          day: number
          generated_at?: string
          id?: string
          word: string
        }
        Update: {
          day?: number
          generated_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      jul25_door_content: {
        Row: {
          content: string
          created_at: string | null
          door_number: number
          id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          door_number: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          door_number?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jul25_families: {
        Row: {
          created_at: string
          id: string
          name: string
          number_of_people: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          number_of_people?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          number_of_people?: number
          updated_at?: string
        }
        Relationships: []
      }
      jul25_family_members: {
        Row: {
          arrival_date: string | null
          created_at: string
          custom_period_location: string | null
          departure_date: string | null
          family_id: string
          id: string
          is_admin: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          arrival_date?: string | null
          created_at?: string
          custom_period_location?: string | null
          departure_date?: string | null
          family_id: string
          id?: string
          is_admin?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          arrival_date?: string | null
          created_at?: string
          custom_period_location?: string | null
          departure_date?: string | null
          family_id?: string
          id?: string
          is_admin?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jul25_family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "jul25_families"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_family_periods: {
        Row: {
          arrival_date: string
          created_at: string | null
          departure_date: string
          family_id: string
          id: string
          location: string
          updated_at: string | null
        }
        Insert: {
          arrival_date: string
          created_at?: string | null
          departure_date: string
          family_id: string
          id?: string
          location: string
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string
          created_at?: string | null
          departure_date?: string
          family_id?: string
          id?: string
          location?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jul25_family_periods_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "jul25_families"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string | null
          expires_at: string
          family_id: string | null
          id: string
          invited_by: string | null
          phone: string | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string | null
          expires_at: string
          family_id?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          family_id?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jul25_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "jul25_families"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_member_custom_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          location: string
          member_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          location: string
          member_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          location?: string
          member_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jul25_member_custom_periods_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "jul25_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_member_periods: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          period_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          period_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jul25_member_periods_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "jul25_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jul25_member_periods_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "jul25_family_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_task_assignments: {
        Row: {
          created_at: string
          family_member_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          family_member_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          family_member_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jul25_task_assignments_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "jul25_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jul25_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "jul25_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      jul25_tasks: {
        Row: {
          assigned_family_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          done: boolean | null
          id: string
          text: string
          updated_at: string
        }
        Insert: {
          assigned_family_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          done?: boolean | null
          id?: string
          text: string
          updated_at?: string
        }
        Update: {
          assigned_family_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          done?: boolean | null
          id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jul25_tasks_assigned_family_id_fkey"
            columns: ["assigned_family_id"]
            isOneToOne: false
            referencedRelation: "jul25_families"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_action_log: {
        Row: {
          action_name: string
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          http_method: string | null
          id: string
          idempotency_key: string | null
          integration_run_id: string | null
          payload_json: Json | null
          policy_result: Json | null
          registry_fq_action: string | null
          request_id: string | null
          resource_id: string | null
          resource_type: string | null
          result_json: Json | null
          status: string
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_name: string
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          idempotency_key?: string | null
          integration_run_id?: string | null
          payload_json?: Json | null
          policy_result?: Json | null
          registry_fq_action?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          result_json?: Json | null
          status: string
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_name?: string
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          http_method?: string | null
          id?: string
          idempotency_key?: string | null
          integration_run_id?: string | null
          payload_json?: Json | null
          policy_result?: Json | null
          registry_fq_action?: string | null
          request_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          result_json?: Json | null
          status?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_action_log_integration_run_id_fkey"
            columns: ["integration_run_id"]
            isOneToOne: false
            referencedRelation: "integration_run"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_action_registry: {
        Row: {
          action_key: string
          app_key: string
          created_at: string
          created_by: string
          description: string | null
          enabled: boolean
          fq_action: string
          id: string
          input_schema: Json | null
          output_schema: Json | null
          tenant_id: string
          version: string
        }
        Insert: {
          action_key: string
          app_key: string
          created_at?: string
          created_by: string
          description?: string | null
          enabled?: boolean
          fq_action: string
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
          tenant_id: string
          version: string
        }
        Update: {
          action_key?: string
          app_key?: string
          created_at?: string
          created_by?: string
          description?: string | null
          enabled?: boolean
          fq_action?: string
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
          tenant_id?: string
          version?: string
        }
        Relationships: []
      }
      mcp_rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          request_count: number
          tenant_id: string
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          request_count?: number
          tenant_id: string
          updated_at?: string
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          request_count?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      mcp_reveal_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_used_at: string | null
          max_uses: number
          purpose: string
          secret_id: string
          tenant_id: string
          token_hash: string
          user_id: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          max_uses?: number
          purpose: string
          secret_id: string
          tenant_id: string
          token_hash: string
          user_id: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          max_uses?: number
          purpose?: string
          secret_id?: string
          tenant_id?: string
          token_hash?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "mcp_reveal_tokens_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "mcp_tenant_secret"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_secret_audit: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          provider: string
          request_id: string
          secret_id: string | null
          success: boolean
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          provider: string
          request_id: string
          secret_id?: string | null
          success: boolean
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          provider?: string
          request_id?: string
          secret_id?: string | null
          success?: boolean
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mcp_tenant_policy: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          policy_json: Json
          source: string
          tenant_id: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          policy_json: Json
          source?: string
          tenant_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          policy_json?: Json
          source?: string
          tenant_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      mcp_tenant_secret: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          provider: string
          rotated_at: string | null
          secret: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider: string
          rotated_at?: string | null
          secret: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          rotated_at?: string | null
          secret?: string
          tenant_id?: string
        }
        Relationships: []
      }
      mcp_tenant_workflow_map: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          provider: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          webhook_path: string
          workflow_key: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          webhook_path: string
          workflow_key: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          webhook_path?: string
          workflow_key?: string
        }
        Relationships: []
      }
      mcp_tool_registry: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          input_schema: Json
          is_active: boolean | null
          is_platform_tool: boolean | null
          required_adapter_id: string | null
          requires_integration: boolean | null
          tool_key: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          input_schema: Json
          is_active?: boolean | null
          is_platform_tool?: boolean | null
          required_adapter_id?: string | null
          requires_integration?: boolean | null
          tool_key: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          is_platform_tool?: boolean | null
          required_adapter_id?: string | null
          requires_integration?: boolean | null
          tool_key?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          actual_close_date: string | null
          company_id: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          probability: number | null
          source: string | null
          stage: string
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          status?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_products: {
        Row: {
          created_at: string
          discount: number | null
          id: string
          opportunity_id: string
          product_id: string
          quantity: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount?: number | null
          id?: string
          opportunity_id: string
          product_id: string
          quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount?: number | null
          id?: string
          opportunity_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_products_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      page_generation_sessions: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          generated_experience: Json | null
          id: string
          questionnaire_responses: Json | null
          status: string | null
          tenant_id: string
          theme_used: string | null
          tokens_used: number | null
          tools_called: Json | null
          user_prompt: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          generated_experience?: Json | null
          id?: string
          questionnaire_responses?: Json | null
          status?: string | null
          tenant_id: string
          theme_used?: string | null
          tokens_used?: number | null
          tools_called?: Json | null
          user_prompt: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          generated_experience?: Json | null
          id?: string
          questionnaire_responses?: Json | null
          status?: string | null
          tenant_id?: string
          theme_used?: string | null
          tokens_used?: number | null
          tools_called?: Json | null
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_generation_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_certifications: {
        Row: {
          app_product_id: string
          badge_url: string | null
          certification_date: string | null
          certification_level: string | null
          certification_url: string | null
          competency_level: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          partner_company_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          app_product_id: string
          badge_url?: string | null
          certification_date?: string | null
          certification_level?: string | null
          certification_url?: string | null
          competency_level?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          partner_company_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          app_product_id?: string
          badge_url?: string | null
          certification_date?: string | null
          certification_level?: string | null
          certification_url?: string | null
          competency_level?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          partner_company_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_certifications_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_certifications_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_actions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_resources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed_at: string | null
          onboarding_step: string | null
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_app_products: {
        Row: {
          app_product_id: string
          created_at: string
          id: string
          partner_company_id: string | null
          project_id: string
          rationale: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          app_product_id: string
          created_at?: string
          id?: string
          partner_company_id?: string | null
          project_id: string
          rationale?: string | null
          stage: string
          updated_at?: string
        }
        Update: {
          app_product_id?: string
          created_at?: string
          id?: string
          partner_company_id?: string | null
          project_id?: string
          rationale?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_app_products_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "external_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_app_products_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_app_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          company_id: string | null
          created_at: string
          current_phase:
            | Database["public"]["Enums"]["project_phase_enum"]
            | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          current_phase?:
            | Database["public"]["Enums"]["project_phase_enum"]
            | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          current_phase?:
            | Database["public"]["Enums"]["project_phase_enum"]
            | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          evaluation_type: string
          id: string
          is_active: boolean
          sort_order: number
          text: string
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          evaluation_type: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          evaluation_type?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          anonymize_before_delete: boolean | null
          created_at: string
          id: string
          policy_config: Json | null
          resource_type: string
          retention_days: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anonymize_before_delete?: boolean | null
          created_at?: string
          id?: string
          policy_config?: Json | null
          resource_type: string
          retention_days: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anonymize_before_delete?: boolean | null
          created_at?: string
          id?: string
          policy_config?: Json | null
          resource_type?: string
          retention_days?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          scope_type: Database["public"]["Enums"]["role_scope"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          scope_type: Database["public"]["Enums"]["role_scope"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_type?: Database["public"]["Enums"]["role_scope"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action_key: string
          allowed: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          resource_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          action_key: string
          allowed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          resource_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          action_key?: string
          allowed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          resource_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      supplier_evaluations: {
        Row: {
          created_at: string
          evaluated_at: string | null
          evaluated_by: string | null
          evaluation_type: string
          id: string
          max_score: number | null
          notes: string | null
          percentage_score: number | null
          project_id: string
          ranking: number | null
          status: string
          supplier_id: string
          target_id: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_type?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          percentage_score?: number | null
          project_id: string
          ranking?: number | null
          status?: string
          supplier_id: string
          target_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          evaluation_type?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          percentage_score?: number | null
          project_id?: string
          ranking?: number | null
          status?: string
          supplier_id?: string
          target_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_references: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          evaluation_id: string
          id: string
          notes: string | null
          project_description: string | null
          satisfaction_rating: number | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          evaluation_id: string
          id?: string
          notes?: string | null
          project_description?: string | null
          satisfaction_rating?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          project_description?: string | null
          satisfaction_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_references_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "supplier_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_capabilities: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          auto_update: boolean | null
          capability_id: string
          config: Json | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          tenant_id: string
          version_locked: string | null
          version_locked_until: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          auto_update?: boolean | null
          capability_id: string
          config?: Json | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          tenant_id: string
          version_locked?: string | null
          version_locked_until?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          auto_update?: boolean | null
          capability_id?: string
          config?: Json | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          tenant_id?: string
          version_locked?: string | null
          version_locked_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_capabilities_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_capabilities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_company_access: {
        Row: {
          access_type: string
          company_id: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          company_id: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          company_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_company_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          adapter_id: string
          config: Json
          created_at: string
          credential_expires_at: string | null
          credentials: Json | null
          id: string
          is_active: boolean
          last_tested_at: string | null
          last_used_at: string | null
          rate_limit: Json | null
          tenant_id: string
          test_status: string | null
          updated_at: string
          vault_credential_id: string | null
        }
        Insert: {
          adapter_id: string
          config?: Json
          created_at?: string
          credential_expires_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          last_used_at?: string | null
          rate_limit?: Json | null
          tenant_id: string
          test_status?: string | null
          updated_at?: string
          vault_credential_id?: string | null
        }
        Update: {
          adapter_id?: string
          config?: Json
          created_at?: string
          credential_expires_at?: string | null
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          last_used_at?: string | null
          rate_limit?: Json | null
          tenant_id?: string
          test_status?: string | null
          updated_at?: string
          vault_credential_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_vault_credential_id_fkey"
            columns: ["vault_credential_id"]
            isOneToOne: false
            referencedRelation: "vault_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_pages: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          experience_json: Json
          id: string
          metadata: Json | null
          page_key: string
          published: boolean | null
          published_at: string | null
          tenant_id: string
          theme_key: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          experience_json: Json
          id?: string
          metadata?: Json | null
          page_key: string
          published?: boolean | null
          published_at?: string | null
          tenant_id: string
          theme_key?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          experience_json?: Json
          id?: string
          metadata?: Json | null
          page_key?: string
          published?: boolean | null
          published_at?: string | null
          tenant_id?: string
          theme_key?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_themes: {
        Row: {
          created_at: string | null
          extracted_from_url: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          theme_key: string
          tokens: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extracted_from_url?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id: string
          theme_key?: string
          tokens: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extracted_from_url?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          theme_key?: string
          tokens?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_platform_tenant: boolean | null
          name: string
          plan: string
          settings: Json | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_platform_tenant?: boolean | null
          name: string
          plan?: string
          settings?: Json | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_platform_tenant?: boolean | null
          name?: string
          plan?: string
          settings?: Json | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["role_scope"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          encrypted_value: string
          id: string
          key_id: string | null
          last_rotated_at: string | null
          last_tested_at: string | null
          metadata: Json | null
          name: string
          resource_id: string
          resource_type: string
          tenant_id: string
          test_error_message: string | null
          test_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          encrypted_value: string
          id?: string
          key_id?: string | null
          last_rotated_at?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          name: string
          resource_id: string
          resource_type: string
          tenant_id: string
          test_error_message?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          encrypted_value?: string
          id?: string
          key_id?: string | null
          last_rotated_at?: string | null
          last_tested_at?: string | null
          metadata?: Json | null
          name?: string
          resource_id?: string
          resource_type?: string
          tenant_id?: string
          test_error_message?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_partnerships: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          partner_vendor_id: string
          partnership_type: string
          started_at: string
          status: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          partner_vendor_id: string
          partnership_type: string
          started_at?: string
          status?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          partner_vendor_id?: string
          partnership_type?: string
          started_at?: string
          status?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_partnerships_partner_vendor_id_fkey"
            columns: ["partner_vendor_id"]
            isOneToOne: false
            referencedRelation: "external_system_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_partnerships_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "external_system_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      app_categories_tree: {
        Row: {
          description: string | null
          icon_name: string | null
          id: string | null
          is_active: boolean | null
          key: string | null
          name: string | null
          parent_key: string | null
          parent_name: string | null
          product_count: number | null
          slug: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_categories_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "app_categories_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "app_categories_tree"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { _email: string; _token: string }
        Returns: Json
      }
      accept_jul25_invitation: {
        Args: { _identifier: string; _token: string }
        Returns: Json
      }
      admin_has_platform_role: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      calculate_ai_cost: {
        Args: {
          p_completion_tokens: number
          p_model: string
          p_prompt_tokens: number
          p_provider: string
        }
        Returns: number
      }
      can_manage_roles_in_scope: {
        Args: {
          _scope_id: string
          _scope_type: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
        Returns: boolean
      }
      can_manage_workflows: { Args: { _tenant_id: string }; Returns: boolean }
      check_ai_rate_limit: {
        Args: { p_current_time?: string; p_tenant_id: string }
        Returns: Json
      }
      get_app_names: {
        Args: { p_app_ids: string[] }
        Returns: {
          id: string
          name: string
          tenant_name: string
        }[]
      }
      get_platform_tenant: { Args: never; Returns: string }
      get_provider_health: {
        Args: { p_provider: string }
        Returns: {
          error_message: string
          last_check_at: string
          response_time_ms: number
          status: string
        }[]
      }
      get_user_roles: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_roles_for_scope: {
        Args: {
          _scope_id?: string
          _scope_type: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_app_role: {
        Args: { _app_key: string; _user_id: string }
        Returns: boolean
      }
      has_role_in_scope: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id?: string
          _scope_type: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
        Returns: boolean
      }
      is_app_admin: {
        Args: { _app_key: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_jul25_app_admin: { Args: { _user_id: string }; Returns: boolean }
      is_jul25_can_manage_family: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_jul25_can_manage_member: {
        Args: { _member_id: string; _user_id: string }
        Returns: boolean
      }
      is_jul25_can_manage_period: {
        Args: { _period_id: string; _user_id: string }
        Returns: boolean
      }
      is_jul25_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_jul25_family_admin_for_member: {
        Args: { _member_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { _user_id: string }; Returns: boolean }
      log_credential_operation: {
        Args: {
          p_action: string
          p_error_message?: string
          p_resource_id: string
          p_resource_type: string
          p_status?: string
          p_tenant_id: string
          p_vault_secret_id?: string
        }
        Returns: undefined
      }
      user_has_admin_access: { Args: { p_user_id: string }; Returns: boolean }
      user_has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { _email: string; _token: string }
        Returns: Json
      }
      validate_jul25_invitation_token: {
        Args: { _identifier: string; _token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "platform_owner"
        | "platform_support"
        | "tenant_owner"
        | "tenant_admin"
        | "security_admin"
        | "compliance_officer"
        | "project_owner"
        | "analyst"
        | "contributor"
        | "viewer"
        | "app_admin"
        | "app_user"
        | "supplier"
        | "external_partner"
      project_phase_enum:
        | "as_is"
        | "to_be"
        | "evaluation"
        | "execution"
        | "closure"
      role_scope: "platform" | "tenant" | "company" | "project" | "app"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "platform_owner",
        "platform_support",
        "tenant_owner",
        "tenant_admin",
        "security_admin",
        "compliance_officer",
        "project_owner",
        "analyst",
        "contributor",
        "viewer",
        "app_admin",
        "app_user",
        "supplier",
        "external_partner",
      ],
      project_phase_enum: [
        "as_is",
        "to_be",
        "evaluation",
        "execution",
        "closure",
      ],
      role_scope: ["platform", "tenant", "company", "project", "app"],
    },
  },
} as const
