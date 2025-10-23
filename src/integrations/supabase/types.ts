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
      communication_channels: {
        Row: {
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_roles: string[] | null
          contact_person: string | null
          contact_person_role: string | null
          created_at: string | null
          crm_status: string | null
          customer_since: string | null
          description: string | null
          driftsinntekter: number | null
          driftsresultat: number | null
          egenkapital: number | null
          employees: number | null
          founding_date: string | null
          id: string
          industry_code: string | null
          industry_description: string | null
          is_approved_supplier: boolean | null
          is_saved: boolean | null
          last_fetched_at: string | null
          last_interaction_date: string | null
          last_synced_at: string | null
          name: string
          org_form: string | null
          org_number: string
          roles: string[] | null
          segment: string | null
          supplier_certifications: string[] | null
          supplier_contact_email: string | null
          totalkapital: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company_roles?: string[] | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string | null
          crm_status?: string | null
          customer_since?: string | null
          description?: string | null
          driftsinntekter?: number | null
          driftsresultat?: number | null
          egenkapital?: number | null
          employees?: number | null
          founding_date?: string | null
          id?: string
          industry_code?: string | null
          industry_description?: string | null
          is_approved_supplier?: boolean | null
          is_saved?: boolean | null
          last_fetched_at?: string | null
          last_interaction_date?: string | null
          last_synced_at?: string | null
          name: string
          org_form?: string | null
          org_number: string
          roles?: string[] | null
          segment?: string | null
          supplier_certifications?: string[] | null
          supplier_contact_email?: string | null
          totalkapital?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company_roles?: string[] | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string | null
          crm_status?: string | null
          customer_since?: string | null
          description?: string | null
          driftsinntekter?: number | null
          driftsresultat?: number | null
          egenkapital?: number | null
          employees?: number | null
          founding_date?: string | null
          id?: string
          industry_code?: string | null
          industry_description?: string | null
          is_approved_supplier?: boolean | null
          is_saved?: boolean | null
          last_fetched_at?: string | null
          last_interaction_date?: string | null
          last_synced_at?: string | null
          name?: string
          org_form?: string | null
          org_number?: string
          roles?: string[] | null
          segment?: string | null
          supplier_certifications?: string[] | null
          supplier_contact_email?: string | null
          totalkapital?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_metadata: {
        Row: {
          company_id: string
          created_at: string | null
          for_followup: boolean | null
          has_potential: boolean | null
          id: string
          in_crm: boolean | null
          last_viewed_at: string | null
          notes: string | null
          priority_level: string | null
          sales_assessment_score: number | null
          score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          for_followup?: boolean | null
          has_potential?: boolean | null
          id?: string
          in_crm?: boolean | null
          last_viewed_at?: string | null
          notes?: string | null
          priority_level?: string | null
          sales_assessment_score?: number | null
          score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          for_followup?: boolean | null
          has_potential?: boolean | null
          id?: string
          in_crm?: boolean | null
          last_viewed_at?: string | null
          notes?: string | null
          priority_level?: string | null
          sales_assessment_score?: number | null
          score?: number | null
          updated_at?: string | null
          user_id?: string
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
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_details: {
        Row: {
          contract_value: number | null
          created_at: string
          document_id: string | null
          end_date: string | null
          id: string
          project_id: string
          signed_date: string | null
          start_date: string | null
          supplier_id: string | null
          terms: string | null
          updated_at: string
        }
        Insert: {
          contract_value?: number | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          id?: string
          project_id: string
          signed_date?: string | null
          start_date?: string | null
          supplier_id?: string | null
          terms?: string | null
          updated_at?: string
        }
        Update: {
          contract_value?: number | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          id?: string
          project_id?: string
          signed_date?: string | null
          start_date?: string | null
          supplier_id?: string | null
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_details_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_details_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_details_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "project_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          outcome: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          id?: string
          interaction_date: string
          interaction_type: string
          notes?: string | null
          outcome?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          outcome?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          contract_type: string | null
          created_at: string
          erp_system_id: string | null
          file_url: string | null
          id: string
          phase: Database["public"]["Enums"]["project_phase"]
          project_id: string
          related_company_id: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          content?: string | null
          contract_type?: string | null
          created_at?: string
          erp_system_id?: string | null
          file_url?: string | null
          id?: string
          phase: Database["public"]["Enums"]["project_phase"]
          project_id: string
          related_company_id?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          content?: string | null
          contract_type?: string | null
          created_at?: string
          erp_system_id?: string | null
          file_url?: string | null
          id?: string
          phase?: Database["public"]["Enums"]["project_phase"]
          project_id?: string
          related_company_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_company_id_fkey"
            columns: ["related_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_integrations: {
        Row: {
          created_at: string | null
          erp_system_id: string
          id: string
          name: string
          notes: string | null
          spec_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          erp_system_id: string
          id?: string
          name: string
          notes?: string | null
          spec_url?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          erp_system_id?: string
          id?: string
          name?: string
          notes?: string | null
          spec_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_integrations_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_skus: {
        Row: {
          created_at: string | null
          edition_name: string
          erp_system_id: string
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          edition_name: string
          erp_system_id: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          edition_name?: string
          erp_system_id?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_skus_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_systems: {
        Row: {
          compliances: string[] | null
          created_at: string | null
          deployment_model: string[] | null
          description: string | null
          id: string
          localizations: string[] | null
          market_segment: string[] | null
          modules_supported: string[] | null
          name: string
          pricing_model: string | null
          short_name: string | null
          slug: string
          status: string
          target_industries: string[] | null
          updated_at: string | null
          vendor_company_id: string
          website: string | null
        }
        Insert: {
          compliances?: string[] | null
          created_at?: string | null
          deployment_model?: string[] | null
          description?: string | null
          id?: string
          localizations?: string[] | null
          market_segment?: string[] | null
          modules_supported?: string[] | null
          name: string
          pricing_model?: string | null
          short_name?: string | null
          slug: string
          status?: string
          target_industries?: string[] | null
          updated_at?: string | null
          vendor_company_id: string
          website?: string | null
        }
        Update: {
          compliances?: string[] | null
          created_at?: string | null
          deployment_model?: string[] | null
          description?: string | null
          id?: string
          localizations?: string[] | null
          market_segment?: string[] | null
          modules_supported?: string[] | null
          name?: string
          pricing_model?: string | null
          short_name?: string | null
          slug?: string
          status?: string
          target_industries?: string[] | null
          updated_at?: string | null
          vendor_company_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_systems_vendor_company_id_fkey"
            columns: ["vendor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      field_questions: {
        Row: {
          created_at: string | null
          display_order: number
          field_key: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          max_length: number | null
          placeholder: string | null
          question_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          field_key: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_length?: number | null
          placeholder?: string | null
          question_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          field_key?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_length?: number | null
          placeholder?: string | null
          question_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_sync_status: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error: string | null
          id: string
          integration_name: string
          last_synced_at: string | null
          next_sync_at: string | null
          status: string | null
          sync_interval: unknown | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error?: string | null
          id?: string
          integration_name: string
          last_synced_at?: string | null
          next_sync_at?: string | null
          status?: string | null
          sync_interval?: unknown | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error?: string | null
          id?: string
          integration_name?: string
          last_synced_at?: string | null
          next_sync_at?: string | null
          status?: string | null
          sync_interval?: unknown | null
          updated_at?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          actual_close_date: string | null
          company_id: string
          competitors: string[] | null
          converted_to_project_id: string | null
          created_at: string | null
          description: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          loss_reason: string | null
          next_step: string | null
          owner_id: string
          probability: number | null
          source: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_close_date?: string | null
          company_id: string
          competitors?: string[] | null
          converted_to_project_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          next_step?: string | null
          owner_id: string
          probability?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_close_date?: string | null
          company_id?: string
          competitors?: string[] | null
          converted_to_project_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          next_step?: string | null
          owner_id?: string
          probability?: number | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_converted_to_project_id_fkey"
            columns: ["converted_to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_activities: {
        Row: {
          activity_date: string | null
          activity_type: Database["public"]["Enums"]["opportunity_activity_type"]
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          opportunity_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type: Database["public"]["Enums"]["opportunity_activity_type"]
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type?: Database["public"]["Enums"]["opportunity_activity_type"]
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_products: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          id: string
          notes: string | null
          opportunity_id: string
          product_id: string
          quantity: number | null
          total_price: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          opportunity_id: string
          product_id: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          product_id?: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
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
          certification_date: string | null
          certification_level: string | null
          created_at: string | null
          erp_system_id: string
          id: string
          notes: string | null
          partner_company_id: string
          updated_at: string | null
        }
        Insert: {
          certification_date?: string | null
          certification_level?: string | null
          created_at?: string | null
          erp_system_id: string
          id?: string
          notes?: string | null
          partner_company_id: string
          updated_at?: string | null
        }
        Update: {
          certification_date?: string | null
          certification_level?: string | null
          created_at?: string | null
          erp_system_id?: string
          id?: string
          notes?: string | null
          partner_company_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_certifications_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
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
      products: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sku: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sku?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sku?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_erp_systems: {
        Row: {
          created_at: string | null
          erp_system_id: string
          id: string
          partner_company_id: string | null
          project_id: string
          rationale: string | null
          stage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          erp_system_id: string
          id?: string
          partner_company_id?: string | null
          project_id: string
          rationale?: string | null
          stage?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          erp_system_id?: string
          id?: string
          partner_company_id?: string | null
          project_id?: string
          rationale?: string | null
          stage?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_erp_systems_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_erp_systems_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_erp_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_evaluations: {
        Row: {
          created_at: string
          created_by: string
          criteria: Json | null
          evaluation_type: string
          id: string
          notes: string | null
          project_id: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria?: Json | null
          evaluation_type: string
          id?: string
          notes?: string | null
          project_id: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria?: Json | null
          evaluation_type?: string
          id?: string
          notes?: string | null
          project_id?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          phase: Database["public"]["Enums"]["project_phase"]
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          phase: Database["public"]["Enums"]["project_phase"]
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          phase?: Database["public"]["Enums"]["project_phase"]
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirements: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stakeholders: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization: string | null
          phone: string | null
          project_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization?: string | null
          phone?: string | null
          project_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization?: string | null
          phone?: string | null
          project_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_supplier_questions: {
        Row: {
          created_at: string | null
          created_by: string
          display_order: number | null
          field_key: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          max_length: number | null
          placeholder: string | null
          project_id: string
          question_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          display_order?: number | null
          field_key: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_length?: number | null
          placeholder?: string | null
          project_id: string
          question_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          display_order?: number | null
          field_key?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_length?: number | null
          placeholder?: string | null
          project_id?: string
          question_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_supplier_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_suppliers: {
        Row: {
          added_by: string
          company_id: string
          created_at: string
          id: string
          notes: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          added_by: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          current_phase: Database["public"]["Enums"]["project_phase"]
          description: string | null
          id: string
          owner_id: string
          requirements_summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          current_phase?: Database["public"]["Enums"]["project_phase"]
          description?: string | null
          id?: string
          owner_id: string
          requirements_summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          current_phase?: Database["public"]["Enums"]["project_phase"]
          description?: string | null
          id?: string
          owner_id?: string
          requirements_summary?: string | null
          title?: string
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
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          answer: string | null
          created_at: string | null
          id: string
          project_id: string
          question_id: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          question_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          question_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "field_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ai_criteria: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          source: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          source?: string
          updated_at?: string | null
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          source?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ai_criteria_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ai_follow_up_questions: {
        Row: {
          created_at: string | null
          criteria_id: string | null
          id: string
          priority: string | null
          project_id: string
          question: string
          reason: string
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          priority?: string | null
          project_id: string
          question: string
          reason: string
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          question?: string
          reason?: string
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ai_follow_up_questions_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "supplier_ai_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_follow_up_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_follow_up_questions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ai_risks: {
        Row: {
          created_at: string | null
          description: string
          id: string
          impact: string
          likelihood: string
          mitigation_suggestions: string | null
          project_id: string
          sources: Json | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          impact: string
          likelihood: string
          mitigation_suggestions?: string | null
          project_id: string
          sources?: Json | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          impact?: string
          likelihood?: string
          mitigation_suggestions?: string | null
          project_id?: string
          sources?: Json | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ai_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_risks_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ai_scores: {
        Row: {
          analyzed_at: string | null
          combined_score: number | null
          confidence_level: string | null
          created_at: string | null
          criteria_id: string
          document_score: number | null
          erp_system_id: string | null
          id: string
          justification: string
          project_id: string
          questionnaire_score: number | null
          sources: Json | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          analyzed_at?: string | null
          combined_score?: number | null
          confidence_level?: string | null
          created_at?: string | null
          criteria_id: string
          document_score?: number | null
          erp_system_id?: string | null
          id?: string
          justification: string
          project_id: string
          questionnaire_score?: number | null
          sources?: Json | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          analyzed_at?: string | null
          combined_score?: number | null
          confidence_level?: string | null
          created_at?: string | null
          criteria_id?: string
          document_score?: number | null
          erp_system_id?: string | null
          id?: string
          justification?: string
          project_id?: string
          questionnaire_score?: number | null
          sources?: Json | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ai_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "supplier_ai_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_scores_erp_system_id_fkey"
            columns: ["erp_system_id"]
            isOneToOne: false
            referencedRelation: "erp_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ai_scores_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          email: string
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          project_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          email: string
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          project_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          email?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          project_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluation_documents: {
        Row: {
          created_at: string | null
          document_type: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          language: string | null
          parsed_content: Json | null
          processed_at: string | null
          project_id: string
          status: string | null
          supplier_id: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          language?: string | null
          parsed_content?: Json | null
          processed_at?: string | null
          project_id: string
          status?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          language?: string | null
          parsed_content?: Json | null
          processed_at?: string | null
          project_id?: string
          status?: string | null
          supplier_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluation_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluation_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluation_responses: {
        Row: {
          answer: string | null
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          notes: string | null
          project_id: string
          question_id: string
          question_source: string | null
          score: number | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          question_id: string
          question_source?: string | null
          score?: number | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          question_id?: string
          question_source?: string | null
          score?: number | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluation_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluation_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "field_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluation_responses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_performance: {
        Row: {
          actual_value: number | null
          created_at: string
          id: string
          measurement_date: string
          metric_name: string
          notes: string | null
          project_id: string
          supplier_id: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          id?: string
          measurement_date: string
          metric_name: string
          notes?: string | null
          project_id: string
          supplier_id?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          metric_name?: string
          notes?: string | null
          project_id?: string
          supplier_id?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_performance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_performance_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "project_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_portal_invitations: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string
          email: string
          expires_at: string
          id: string
          project_id: string
          supplier_id: string
          token: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by: string
          email: string
          expires_at: string
          id?: string
          project_id: string
          supplier_id: string
          token: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          project_id?: string
          supplier_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_portal_invitations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "supplier_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_portal_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_portal_invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          order_index: number | null
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          category_id: string | null
          completed_at: string | null
          completion_percentage: number | null
          context_phase: string | null
          context_section: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          context_phase?: string | null
          context_section?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          context_phase?: string | null
          context_section?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_supplier_role_if_not_exists: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_supplier_user_if_not_exists: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_company_role: {
        Args: { _company_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      entity_type: "company" | "project" | "opportunity" | "user"
      opportunity_activity_type:
        | "note"
        | "call"
        | "meeting"
        | "email"
        | "stage_change"
      opportunity_stage:
        | "prospecting"
        | "qualification"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      project_phase:
        | "malbilde"
        | "markedsdialog"
        | "invitasjon"
        | "leverandor"
        | "evaluering"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "todo"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      entity_type: ["company", "project", "opportunity", "user"],
      opportunity_activity_type: [
        "note",
        "call",
        "meeting",
        "email",
        "stage_change",
      ],
      opportunity_stage: [
        "prospecting",
        "qualification",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      project_phase: [
        "malbilde",
        "markedsdialog",
        "invitasjon",
        "leverandor",
        "evaluering",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "blocked", "completed", "cancelled"],
    },
  },
} as const
