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
          app_type: string
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
          app_type: string
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
          app_type?: string
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
      tenant_users: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          roles: Database["public"]["Enums"]["app_role"][]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          roles?: Database["public"]["Enums"]["app_role"][]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          roles?: Database["public"]["Enums"]["app_role"][]
          tenant_id?: string
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
      get_user_roles: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
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
    },
  },
} as const
