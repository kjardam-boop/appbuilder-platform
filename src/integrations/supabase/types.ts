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
      app_integrations: {
        Row: {
          app_product_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
          spec_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          app_product_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          spec_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          app_product_id?: string
          created_at?: string
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
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
            referencedColumns: ["id"]
          },
        ]
      }
      app_products: {
        Row: {
          app_types: string[] | null
          compliances: string[] | null
          created_at: string
          deployment_models: string[]
          description: string | null
          id: string
          localizations: string[] | null
          market_segments: string[] | null
          modules_supported: string[] | null
          name: string
          pricing_model: string | null
          short_name: string | null
          slug: string
          status: string
          target_industries: string[] | null
          updated_at: string
          vendor_id: string
          website: string | null
        }
        Insert: {
          app_types?: string[] | null
          compliances?: string[] | null
          created_at?: string
          deployment_models?: string[]
          description?: string | null
          id?: string
          localizations?: string[] | null
          market_segments?: string[] | null
          modules_supported?: string[] | null
          name: string
          pricing_model?: string | null
          short_name?: string | null
          slug: string
          status?: string
          target_industries?: string[] | null
          updated_at?: string
          vendor_id: string
          website?: string | null
        }
        Update: {
          app_types?: string[] | null
          compliances?: string[] | null
          created_at?: string
          deployment_models?: string[]
          description?: string | null
          id?: string
          localizations?: string[] | null
          market_segments?: string[] | null
          modules_supported?: string[] | null
          name?: string
          pricing_model?: string | null
          short_name?: string | null
          slug?: string
          status?: string
          target_industries?: string[] | null
          updated_at?: string
          vendor_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "app_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      app_vendors: {
        Row: {
          company_id: string
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
          category: string
          created_at: string | null
          current_version: string
          demo_url: string | null
          dependencies: string[] | null
          description: string | null
          documentation_url: string | null
          estimated_dev_hours: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          price_per_month: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_version?: string
          demo_url?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_url?: string | null
          estimated_dev_hours?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          price_per_month?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_version?: string
          demo_url?: string | null
          dependencies?: string[] | null
          description?: string | null
          documentation_url?: string | null
          estimated_dev_hours?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          price_per_month?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
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
      company_apps: {
        Row: {
          app_product_id: string
          company_id: string
          created_at: string
          environment: string | null
          id: string
          notes: string | null
          sku_id: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          app_product_id: string
          company_id: string
          created_at?: string
          environment?: string | null
          id?: string
          notes?: string | null
          sku_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          app_product_id?: string
          company_id?: string
          created_at?: string
          environment?: string | null
          id?: string
          notes?: string | null
          sku_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_apps_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
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
            referencedRelation: "skus"
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
      customer_app_projects: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branding: Json | null
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
          approved_at?: string | null
          approved_by?: string | null
          branding?: Json | null
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
          approved_at?: string | null
          approved_by?: string | null
          branding?: Json | null
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
          app_product_id: string
          certification_level: string | null
          created_at: string
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
          app_product_id: string
          certification_level?: string | null
          created_at?: string
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
          app_product_id?: string
          certification_level?: string | null
          created_at?: string
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
            columns: ["app_product_id"]
            isOneToOne: true
            referencedRelation: "app_products"
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
      partner_certifications: {
        Row: {
          app_product_id: string
          certification_date: string | null
          certification_level: string | null
          created_at: string
          id: string
          notes: string | null
          partner_company_id: string
          updated_at: string
        }
        Insert: {
          app_product_id: string
          certification_date?: string | null
          certification_level?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_company_id: string
          updated_at?: string
        }
        Update: {
          app_product_id?: string
          certification_date?: string | null
          certification_level?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_certifications_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
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
            referencedRelation: "app_products"
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
      skus: {
        Row: {
          app_product_id: string
          code: string | null
          created_at: string
          edition_name: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          app_product_id: string
          code?: string | null
          created_at?: string
          edition_name: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          app_product_id?: string
          code?: string | null
          created_at?: string
          edition_name?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skus_app_product_id_fkey"
            columns: ["app_product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
            referencedColumns: ["id"]
          },
        ]
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
          credentials: Json | null
          id: string
          is_active: boolean
          last_used_at: string | null
          rate_limit: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adapter_id: string
          config?: Json
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adapter_id?: string
          config?: Json
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          rate_limit?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_has_platform_role: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      can_manage_roles_in_scope: {
        Args: {
          _scope_id: string
          _scope_type: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
        Returns: boolean
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
      has_role_in_scope: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id?: string
          _scope_type: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
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
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { _user_id: string }; Returns: boolean }
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
      project_phase_enum:
        | "as_is"
        | "to_be"
        | "evaluation"
        | "execution"
        | "closure"
      role_scope: "platform" | "tenant" | "company" | "project"
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
      ],
      project_phase_enum: [
        "as_is",
        "to_be",
        "evaluation",
        "execution",
        "closure",
      ],
      role_scope: ["platform", "tenant", "company", "project"],
    },
  },
} as const
