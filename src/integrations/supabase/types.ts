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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_contact_relations: {
        Row: {
          account_id: string
          connection_role: string | null
          contact_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_direct: boolean | null
          start_date: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          connection_role?: string | null
          contact_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_direct?: boolean | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          connection_role?: string | null
          contact_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_direct?: boolean | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_contact_relations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_contact_relations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_contact_relations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number: string | null
          account_source: string | null
          account_type: string | null
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          annual_revenue: number | null
          association: string | null
          billing_address: string | null
          billing_email: string | null
          contract_status: string | null
          cost_per_student: number | null
          created_at: string
          current_energy_program_id: string | null
          description: string | null
          email: string | null
          employee_count: number | null
          est_annual_expenditures: number | null
          faith_based: boolean | null
          fax: string | null
          gl_revenue_account: string | null
          id: string
          industry: string | null
          invoice_delivery: string | null
          key_reference: boolean | null
          last_synced_at: string | null
          legal_name: string | null
          mailing_address: string | null
          membership_enrollment: number | null
          minimum_utility_spend: number | null
          name: string
          notes: string | null
          org_record_type: string | null
          org_type: string | null
          ownership: string | null
          parent_account_id: string | null
          phone: string | null
          physical_address: string | null
          po_number: string | null
          prospect_data_source: string | null
          push_to_d365: boolean | null
          rating: string | null
          sales_status: string | null
          sf_id: string | null
          sharepoint_path: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          shipping_street: string | null
          sic: string | null
          sic_desc: string | null
          site: string | null
          status: string | null
          status_reason: string | null
          tenant_id: string | null
          ticker_symbol: string | null
          total_gross_square_feet: number | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          account_source?: string | null
          account_type?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_revenue?: number | null
          association?: string | null
          billing_address?: string | null
          billing_email?: string | null
          contract_status?: string | null
          cost_per_student?: number | null
          created_at?: string
          current_energy_program_id?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          est_annual_expenditures?: number | null
          faith_based?: boolean | null
          fax?: string | null
          gl_revenue_account?: string | null
          id?: string
          industry?: string | null
          invoice_delivery?: string | null
          key_reference?: boolean | null
          last_synced_at?: string | null
          legal_name?: string | null
          mailing_address?: string | null
          membership_enrollment?: number | null
          minimum_utility_spend?: number | null
          name: string
          notes?: string | null
          org_record_type?: string | null
          org_type?: string | null
          ownership?: string | null
          parent_account_id?: string | null
          phone?: string | null
          physical_address?: string | null
          po_number?: string | null
          prospect_data_source?: string | null
          push_to_d365?: boolean | null
          rating?: string | null
          sales_status?: string | null
          sf_id?: string | null
          sharepoint_path?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          sic?: string | null
          sic_desc?: string | null
          site?: string | null
          status?: string | null
          status_reason?: string | null
          tenant_id?: string | null
          ticker_symbol?: string | null
          total_gross_square_feet?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          account_source?: string | null
          account_type?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_revenue?: number | null
          association?: string | null
          billing_address?: string | null
          billing_email?: string | null
          contract_status?: string | null
          cost_per_student?: number | null
          created_at?: string
          current_energy_program_id?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          est_annual_expenditures?: number | null
          faith_based?: boolean | null
          fax?: string | null
          gl_revenue_account?: string | null
          id?: string
          industry?: string | null
          invoice_delivery?: string | null
          key_reference?: boolean | null
          last_synced_at?: string | null
          legal_name?: string | null
          mailing_address?: string | null
          membership_enrollment?: number | null
          minimum_utility_spend?: number | null
          name?: string
          notes?: string | null
          org_record_type?: string | null
          org_type?: string | null
          ownership?: string | null
          parent_account_id?: string | null
          phone?: string | null
          physical_address?: string | null
          po_number?: string | null
          prospect_data_source?: string | null
          push_to_d365?: boolean | null
          rating?: string | null
          sales_status?: string | null
          sf_id?: string | null
          sharepoint_path?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          sic?: string | null
          sic_desc?: string | null
          site?: string | null
          status?: string | null
          status_reason?: string | null
          tenant_id?: string | null
          ticker_symbol?: string | null
          total_gross_square_feet?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_current_energy_program_id_fkey"
            columns: ["current_energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          account_id: string | null
          activity_number: string | null
          activity_type: string | null
          all_day_event: boolean | null
          completed_at: string | null
          completed_datetime: string | null
          contact_id: string | null
          contact_method: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          end_datetime: string | null
          id: string
          is_closed: boolean | null
          last_synced_at: string | null
          lead_id: string | null
          location: string | null
          notes: string | null
          number_of_attendees: number | null
          opportunity_id: string | null
          priority: string | null
          project_id: string | null
          quote_id: string | null
          sales_meeting_type: string | null
          sf_id: string | null
          start_datetime: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          visit_length: string | null
          visit_type: string | null
        }
        Insert: {
          account_id?: string | null
          activity_number?: string | null
          activity_type?: string | null
          all_day_event?: boolean | null
          completed_at?: string | null
          completed_datetime?: string | null
          contact_id?: string | null
          contact_method?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          end_datetime?: string | null
          id?: string
          is_closed?: boolean | null
          last_synced_at?: string | null
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          number_of_attendees?: number | null
          opportunity_id?: string | null
          priority?: string | null
          project_id?: string | null
          quote_id?: string | null
          sales_meeting_type?: string | null
          sf_id?: string | null
          start_datetime?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          visit_length?: string | null
          visit_type?: string | null
        }
        Update: {
          account_id?: string | null
          activity_number?: string | null
          activity_type?: string | null
          all_day_event?: boolean | null
          completed_at?: string | null
          completed_datetime?: string | null
          contact_id?: string | null
          contact_method?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          end_datetime?: string | null
          id?: string
          is_closed?: boolean | null
          last_synced_at?: string | null
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          number_of_attendees?: number | null
          opportunity_id?: string | null
          priority?: string | null
          project_id?: string | null
          quote_id?: string | null
          sales_meeting_type?: string | null
          sf_id?: string | null
          start_datetime?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          visit_length?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          audit_id: string
          category: string | null
          created_at: string
          estimated_cost: number | null
          estimated_savings: number | null
          finding: string
          id: string
          location_detail: string | null
          notes: string | null
          payback_period_months: number | null
          photo_url: string | null
          recommendation: string | null
          severity: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          audit_id: string
          category?: string | null
          created_at?: string
          estimated_cost?: number | null
          estimated_savings?: number | null
          finding: string
          id?: string
          location_detail?: string | null
          notes?: string | null
          payback_period_months?: number | null
          photo_url?: string | null
          recommendation?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          audit_id?: string
          category?: string | null
          created_at?: string
          estimated_cost?: number | null
          estimated_savings?: number | null
          finding?: string
          id?: string
          location_detail?: string | null
          notes?: string | null
          payback_period_months?: number | null
          photo_url?: string | null
          recommendation?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "energy_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          company_name: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          support_email: string | null
          support_phone: string | null
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          company_name?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          company_name?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number | null
          category: string
          created_at: string
          description: string | null
          energy_program_id: string | null
          id: string
          notes: string | null
          period: string | null
          project_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          variance: number | null
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category: string
          created_at?: string
          description?: string | null
          energy_program_id?: string | null
          id?: string
          notes?: string | null
          period?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          variance?: number | null
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category?: string
          created_at?: string
          description?: string | null
          energy_program_id?: string | null
          id?: string
          notes?: string | null
          period?: string | null
          project_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          account_id: string | null
          address_2: string | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          building_no: string | null
          building_type: string | null
          created_at: string
          energy_program_id: string | null
          energy_star_score: number | null
          exclude_from_greenx: boolean | null
          id: string
          name: string
          notes: string | null
          place_code: string | null
          place_id: string | null
          primary_use: string | null
          project_id: string | null
          square_footage: number | null
          status: string | null
          status_reason: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          year_built: number | null
        }
        Insert: {
          account_id?: string | null
          address_2?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          building_no?: string | null
          building_type?: string | null
          created_at?: string
          energy_program_id?: string | null
          energy_star_score?: number | null
          exclude_from_greenx?: boolean | null
          id?: string
          name: string
          notes?: string | null
          place_code?: string | null
          place_id?: string | null
          primary_use?: string | null
          project_id?: string | null
          square_footage?: number | null
          status?: string | null
          status_reason?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          year_built?: number | null
        }
        Update: {
          account_id?: string | null
          address_2?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          building_no?: string | null
          building_type?: string | null
          created_at?: string
          energy_program_id?: string | null
          energy_star_score?: number | null
          exclude_from_greenx?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          place_code?: string | null
          place_id?: string | null
          primary_use?: string | null
          project_id?: string | null
          square_footage?: number | null
          status?: string | null
          status_reason?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          account_id: string | null
          all_day: boolean | null
          contact_id: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string
          location: string | null
          start_time: string
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          all_day?: boolean | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          start_time: string
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          all_day?: boolean | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          actual_cost: number | null
          budget: number | null
          campaign_type: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          last_synced_at: string | null
          leads_generated: number | null
          name: string
          notes: string | null
          opportunities_created: number | null
          revenue_generated: number | null
          sf_id: string | null
          start_date: string | null
          status: string | null
          target_audience: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          campaign_type?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          last_synced_at?: string | null
          leads_generated?: number | null
          name: string
          notes?: string | null
          opportunities_created?: number | null
          revenue_generated?: number | null
          sf_id?: string | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          campaign_type?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          last_synced_at?: string | null
          leads_generated?: number | null
          name?: string
          notes?: string | null
          opportunities_created?: number | null
          revenue_generated?: number | null
          sf_id?: string | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      case_comments: {
        Row: {
          case_id: string
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_split_schedules: {
        Row: {
          commission_amount: number | null
          commission_percent: number | null
          commission_split_id: string
          created_at: string
          id: string
          name: string | null
          payment_status: string | null
          period: string | null
          scheduled_date: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_percent?: number | null
          commission_split_id: string
          created_at?: string
          id?: string
          name?: string | null
          payment_status?: string | null
          period?: string | null
          scheduled_date?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_percent?: number | null
          commission_split_id?: string
          created_at?: string
          id?: string
          name?: string | null
          payment_status?: string | null
          period?: string | null
          scheduled_date?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_split_schedules_commission_split_id_fkey"
            columns: ["commission_split_id"]
            isOneToOne: false
            referencedRelation: "commission_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_split_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_splits: {
        Row: {
          amount: number | null
          based_on_tcv_or_ncv: string | null
          commission_percent: number | null
          commission_percent_2: number | null
          commission_recipient_name: string | null
          commission_type: string | null
          commissions_approved: boolean | null
          commissions_assigned: boolean | null
          contact_id: string | null
          contract_id: string | null
          created_at: string
          customer_sign_date: string | null
          description: string | null
          energy_program_id: string | null
          first_payment_amount: number | null
          first_payment_due_date: string | null
          first_payment_override: number | null
          id: string
          last_synced_at: string | null
          ncv: number | null
          notes: string | null
          number_of_eligible_years: number | null
          number_of_payments: number | null
          opportunity_id: string | null
          over_quota_commission: boolean | null
          over_quota_commission_amt: number | null
          over_quota_scheduled_date: string | null
          percentage: number | null
          pop_payment: number | null
          project_id: string | null
          recoverable: boolean | null
          role: string | null
          sales_rep_email: string | null
          sales_rep_name: string
          sf_id: string | null
          split_percentage: number
          split_type: string | null
          status: string | null
          status_reason: string | null
          tcv: number | null
          tenant_id: string | null
          total_commission_for_contract_term: number | null
          total_commission_override: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          based_on_tcv_or_ncv?: string | null
          commission_percent?: number | null
          commission_percent_2?: number | null
          commission_recipient_name?: string | null
          commission_type?: string | null
          commissions_approved?: boolean | null
          commissions_assigned?: boolean | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          customer_sign_date?: string | null
          description?: string | null
          energy_program_id?: string | null
          first_payment_amount?: number | null
          first_payment_due_date?: string | null
          first_payment_override?: number | null
          id?: string
          last_synced_at?: string | null
          ncv?: number | null
          notes?: string | null
          number_of_eligible_years?: number | null
          number_of_payments?: number | null
          opportunity_id?: string | null
          over_quota_commission?: boolean | null
          over_quota_commission_amt?: number | null
          over_quota_scheduled_date?: string | null
          percentage?: number | null
          pop_payment?: number | null
          project_id?: string | null
          recoverable?: boolean | null
          role?: string | null
          sales_rep_email?: string | null
          sales_rep_name: string
          sf_id?: string | null
          split_percentage?: number
          split_type?: string | null
          status?: string | null
          status_reason?: string | null
          tcv?: number | null
          tenant_id?: string | null
          total_commission_for_contract_term?: number | null
          total_commission_override?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          based_on_tcv_or_ncv?: string | null
          commission_percent?: number | null
          commission_percent_2?: number | null
          commission_recipient_name?: string | null
          commission_type?: string | null
          commissions_approved?: boolean | null
          commissions_assigned?: boolean | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          customer_sign_date?: string | null
          description?: string | null
          energy_program_id?: string | null
          first_payment_amount?: number | null
          first_payment_due_date?: string | null
          first_payment_override?: number | null
          id?: string
          last_synced_at?: string | null
          ncv?: number | null
          notes?: string | null
          number_of_eligible_years?: number | null
          number_of_payments?: number | null
          opportunity_id?: string | null
          over_quota_commission?: boolean | null
          over_quota_commission_amt?: number | null
          over_quota_scheduled_date?: string | null
          percentage?: number | null
          pop_payment?: number | null
          project_id?: string | null
          recoverable?: boolean | null
          role?: string | null
          sales_rep_email?: string | null
          sales_rep_name?: string
          sf_id?: string | null
          split_percentage?: number
          split_type?: string | null
          status?: string | null
          status_reason?: string | null
          tcv?: number | null
          tenant_id?: string | null
          total_commission_for_contract_term?: number | null
          total_commission_override?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_splits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_splits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connected_contact_id: string
          contact_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          notes: string | null
          relationship_type: string | null
          sf_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          connected_contact_id: string
          contact_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          relationship_type?: string | null
          sf_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          connected_contact_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notes?: string | null
          relationship_type?: string | null
          sf_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_connected_contact_id_fkey"
            columns: ["connected_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          actual_from_goals: number | null
          additional_email: string | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          agreement_notes: string | null
          amount_over_quota: number | null
          association: string | null
          asst_email: string | null
          birthdate: string | null
          commission_notes: string | null
          commission_split_total: number | null
          contact_number: string | null
          contact_type: string | null
          created_at: string
          dallas_visit_date: string | null
          department: string | null
          description: string | null
          email: string | null
          employee_id: string | null
          fax: string | null
          first_name: string
          goes_by: string | null
          home_address_city: string | null
          home_address_country: string | null
          home_address_state: string | null
          home_address_street: string | null
          home_address_zip: string | null
          home_phone: string | null
          id: string
          internal_search_owner: string | null
          is_active: boolean | null
          is_primary: boolean | null
          job_title: string | null
          key_reference: string | null
          key_reference_date: string | null
          last_name: string
          last_synced_at: string | null
          lead_source: string | null
          mc_assigned_state: string | null
          mc_comments: string | null
          mc_commission: string | null
          mc_compensation_plan: string | null
          mc_management_notes: string | null
          mc_orientation_date: string | null
          mc_rating: string | null
          mc_recruiter: boolean | null
          mc_recruitment_stage: string | null
          mc_start_date: string | null
          mc_status: string | null
          mc_type: string | null
          middle_name: string | null
          mobile: string | null
          notes: string | null
          original_lead_id: string | null
          personal_email: string | null
          phone: string | null
          preferred_contact_method: string | null
          quota_over_goals: number | null
          recruited_by: string | null
          recruiter_commission: number | null
          reference_notes: string | null
          reports_to: string | null
          sales_role: string | null
          salutation: string | null
          sf_id: string | null
          status: string | null
          status_reason: string | null
          suffix: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          actual_from_goals?: number | null
          additional_email?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          agreement_notes?: string | null
          amount_over_quota?: number | null
          association?: string | null
          asst_email?: string | null
          birthdate?: string | null
          commission_notes?: string | null
          commission_split_total?: number | null
          contact_number?: string | null
          contact_type?: string | null
          created_at?: string
          dallas_visit_date?: string | null
          department?: string | null
          description?: string | null
          email?: string | null
          employee_id?: string | null
          fax?: string | null
          first_name: string
          goes_by?: string | null
          home_address_city?: string | null
          home_address_country?: string | null
          home_address_state?: string | null
          home_address_street?: string | null
          home_address_zip?: string | null
          home_phone?: string | null
          id?: string
          internal_search_owner?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          job_title?: string | null
          key_reference?: string | null
          key_reference_date?: string | null
          last_name: string
          last_synced_at?: string | null
          lead_source?: string | null
          mc_assigned_state?: string | null
          mc_comments?: string | null
          mc_commission?: string | null
          mc_compensation_plan?: string | null
          mc_management_notes?: string | null
          mc_orientation_date?: string | null
          mc_rating?: string | null
          mc_recruiter?: boolean | null
          mc_recruitment_stage?: string | null
          mc_start_date?: string | null
          mc_status?: string | null
          mc_type?: string | null
          middle_name?: string | null
          mobile?: string | null
          notes?: string | null
          original_lead_id?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          quota_over_goals?: number | null
          recruited_by?: string | null
          recruiter_commission?: number | null
          reference_notes?: string | null
          reports_to?: string | null
          sales_role?: string | null
          salutation?: string | null
          sf_id?: string | null
          status?: string | null
          status_reason?: string | null
          suffix?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          actual_from_goals?: number | null
          additional_email?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          agreement_notes?: string | null
          amount_over_quota?: number | null
          association?: string | null
          asst_email?: string | null
          birthdate?: string | null
          commission_notes?: string | null
          commission_split_total?: number | null
          contact_number?: string | null
          contact_type?: string | null
          created_at?: string
          dallas_visit_date?: string | null
          department?: string | null
          description?: string | null
          email?: string | null
          employee_id?: string | null
          fax?: string | null
          first_name?: string
          goes_by?: string | null
          home_address_city?: string | null
          home_address_country?: string | null
          home_address_state?: string | null
          home_address_street?: string | null
          home_address_zip?: string | null
          home_phone?: string | null
          id?: string
          internal_search_owner?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          job_title?: string | null
          key_reference?: string | null
          key_reference_date?: string | null
          last_name?: string
          last_synced_at?: string | null
          lead_source?: string | null
          mc_assigned_state?: string | null
          mc_comments?: string | null
          mc_commission?: string | null
          mc_compensation_plan?: string | null
          mc_management_notes?: string | null
          mc_orientation_date?: string | null
          mc_rating?: string | null
          mc_recruiter?: boolean | null
          mc_recruitment_stage?: string | null
          mc_start_date?: string | null
          mc_status?: string | null
          mc_type?: string | null
          middle_name?: string | null
          mobile?: string | null
          notes?: string | null
          original_lead_id?: string | null
          personal_email?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          quota_over_goals?: number | null
          recruited_by?: string | null
          recruiter_commission?: number | null
          reference_notes?: string | null
          reports_to?: string | null
          sales_role?: string | null
          salutation?: string | null
          sf_id?: string | null
          status?: string | null
          status_reason?: string | null
          suffix?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_original_lead_id_fkey"
            columns: ["original_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string | null
          accounting_changes_notes: string | null
          accounting_id: string | null
          addendum_effective_date: string | null
          addendum_type: string | null
          auto_renew: string | null
          auto_renew_declined: boolean | null
          auto_renew_trigger_date: string | null
          base_year_end: string | null
          base_year_start: string | null
          billable_term: number | null
          billing_cycle: string | null
          billing_schedule_end_date: string | null
          billing_start_date: string | null
          company_signed_date: string | null
          contract_fiscal_year: string | null
          contract_number: string | null
          contract_status: string | null
          contract_term: number | null
          contract_type: string | null
          created_at: string
          customer_signed_date: string | null
          description: string | null
          discount: number | null
          end_date: string | null
          energy_program_id: string | null
          es_employed_by: string | null
          es_ft: number | null
          es_pt: number | null
          id: string
          last_synced_at: string | null
          name: string
          notes: string | null
          opportunity_id: string | null
          parent_contract_id: string | null
          renewal: string | null
          renewal_declined: boolean | null
          sf_id: string | null
          sharepoint_path: string | null
          software_type: string | null
          special_dates_comments: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          terms: string | null
          total_ess: number | null
          type: string | null
          unique_contract_id: string | null
          unique_special_provisions: string | null
          updated_at: string
          user_id: string | null
          value: number | null
          visits_per_month: number | null
          year_1_gross_savings: number | null
          year_10_gross_savings: number | null
          year_2_gross_savings: number | null
          year_3_gross_savings: number | null
          year_4_gross_savings: number | null
          year_5_gross_savings: number | null
          year_6_gross_savings: number | null
          year_7_gross_savings: number | null
          year_8_gross_savings: number | null
          year_9_gross_savings: number | null
        }
        Insert: {
          account_id?: string | null
          accounting_changes_notes?: string | null
          accounting_id?: string | null
          addendum_effective_date?: string | null
          addendum_type?: string | null
          auto_renew?: string | null
          auto_renew_declined?: boolean | null
          auto_renew_trigger_date?: string | null
          base_year_end?: string | null
          base_year_start?: string | null
          billable_term?: number | null
          billing_cycle?: string | null
          billing_schedule_end_date?: string | null
          billing_start_date?: string | null
          company_signed_date?: string | null
          contract_fiscal_year?: string | null
          contract_number?: string | null
          contract_status?: string | null
          contract_term?: number | null
          contract_type?: string | null
          created_at?: string
          customer_signed_date?: string | null
          description?: string | null
          discount?: number | null
          end_date?: string | null
          energy_program_id?: string | null
          es_employed_by?: string | null
          es_ft?: number | null
          es_pt?: number | null
          id?: string
          last_synced_at?: string | null
          name: string
          notes?: string | null
          opportunity_id?: string | null
          parent_contract_id?: string | null
          renewal?: string | null
          renewal_declined?: boolean | null
          sf_id?: string | null
          sharepoint_path?: string | null
          software_type?: string | null
          special_dates_comments?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          terms?: string | null
          total_ess?: number | null
          type?: string | null
          unique_contract_id?: string | null
          unique_special_provisions?: string | null
          updated_at?: string
          user_id?: string | null
          value?: number | null
          visits_per_month?: number | null
          year_1_gross_savings?: number | null
          year_10_gross_savings?: number | null
          year_2_gross_savings?: number | null
          year_3_gross_savings?: number | null
          year_4_gross_savings?: number | null
          year_5_gross_savings?: number | null
          year_6_gross_savings?: number | null
          year_7_gross_savings?: number | null
          year_8_gross_savings?: number | null
          year_9_gross_savings?: number | null
        }
        Update: {
          account_id?: string | null
          accounting_changes_notes?: string | null
          accounting_id?: string | null
          addendum_effective_date?: string | null
          addendum_type?: string | null
          auto_renew?: string | null
          auto_renew_declined?: boolean | null
          auto_renew_trigger_date?: string | null
          base_year_end?: string | null
          base_year_start?: string | null
          billable_term?: number | null
          billing_cycle?: string | null
          billing_schedule_end_date?: string | null
          billing_start_date?: string | null
          company_signed_date?: string | null
          contract_fiscal_year?: string | null
          contract_number?: string | null
          contract_status?: string | null
          contract_term?: number | null
          contract_type?: string | null
          created_at?: string
          customer_signed_date?: string | null
          description?: string | null
          discount?: number | null
          end_date?: string | null
          energy_program_id?: string | null
          es_employed_by?: string | null
          es_ft?: number | null
          es_pt?: number | null
          id?: string
          last_synced_at?: string | null
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          parent_contract_id?: string | null
          renewal?: string | null
          renewal_declined?: boolean | null
          sf_id?: string | null
          sharepoint_path?: string | null
          software_type?: string | null
          special_dates_comments?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          terms?: string | null
          total_ess?: number | null
          type?: string | null
          unique_contract_id?: string | null
          unique_special_provisions?: string | null
          updated_at?: string
          user_id?: string | null
          value?: number | null
          visits_per_month?: number | null
          year_1_gross_savings?: number | null
          year_10_gross_savings?: number | null
          year_2_gross_savings?: number | null
          year_3_gross_savings?: number | null
          year_4_gross_savings?: number | null
          year_5_gross_savings?: number | null
          year_6_gross_savings?: number | null
          year_7_gross_savings?: number | null
          year_8_gross_savings?: number | null
          year_9_gross_savings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          account_id: string | null
          cert_id: string | null
          certified_date: string | null
          comments: string | null
          contact_id: string | null
          created_at: string
          credential_number: string | null
          credential_type: string | null
          credentials_description: string | null
          id: string
          included_in_resume: boolean | null
          name: string | null
          status: string | null
          status_reason: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          valid_to: string | null
        }
        Insert: {
          account_id?: string | null
          cert_id?: string | null
          certified_date?: string | null
          comments?: string | null
          contact_id?: string | null
          created_at?: string
          credential_number?: string | null
          credential_type?: string | null
          credentials_description?: string | null
          id?: string
          included_in_resume?: boolean | null
          name?: string | null
          status?: string | null
          status_reason?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          valid_to?: string | null
        }
        Update: {
          account_id?: string | null
          cert_id?: string | null
          certified_date?: string | null
          comments?: string | null
          contact_id?: string | null
          created_at?: string
          credential_number?: string | null
          credential_type?: string | null
          credentials_description?: string | null
          id?: string
          included_in_resume?: boolean | null
          name?: string | null
          status?: string | null
          status_reason?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credentials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          chart_type: string
          config: Json
          created_at: string
          description: string | null
          display_order: number
          entity: string
          id: string
          is_shared: boolean
          name: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_type?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          entity: string
          id?: string
          is_shared?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_type?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_order?: number
          entity?: string
          id?: string
          is_shared?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          enable_activity_digest: boolean | null
          enable_notifications: boolean | null
          enable_welcome_email: boolean | null
          from_email: string | null
          from_name: string | null
          id: string
          smtp_host: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enable_activity_digest?: boolean | null
          enable_notifications?: boolean | null
          enable_welcome_email?: boolean | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enable_activity_digest?: boolean | null
          enable_notifications?: boolean | null
          enable_welcome_email?: boolean | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      energy_audits: {
        Row: {
          account_id: string | null
          audit_type: string | null
          auditor_id: string | null
          auditor_name: string | null
          building_id: string | null
          carbon_reduction: number | null
          completed_date: string | null
          created_at: string
          energy_cost: number | null
          energy_usage_kwh: number | null
          id: string
          notes: string | null
          potential_savings: number | null
          project_id: string | null
          recommendations: string | null
          scheduled_date: string | null
          score: number | null
          status: string | null
          summary: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          audit_type?: string | null
          auditor_id?: string | null
          auditor_name?: string | null
          building_id?: string | null
          carbon_reduction?: number | null
          completed_date?: string | null
          created_at?: string
          energy_cost?: number | null
          energy_usage_kwh?: number | null
          id?: string
          notes?: string | null
          potential_savings?: number | null
          project_id?: string | null
          recommendations?: string | null
          scheduled_date?: string | null
          score?: number | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          audit_type?: string | null
          auditor_id?: string | null
          auditor_name?: string | null
          building_id?: string | null
          carbon_reduction?: number | null
          completed_date?: string | null
          created_at?: string
          energy_cost?: number | null
          energy_usage_kwh?: number | null
          id?: string
          notes?: string | null
          potential_savings?: number | null
          project_id?: string | null
          recommendations?: string | null
          scheduled_date?: string | null
          score?: number | null
          status?: string | null
          summary?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_audits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_audits_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_audits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_program_team_members: {
        Row: {
          contact_id: string | null
          created_at: string
          end_date: string | null
          energy_program_id: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string | null
          notes: string | null
          role: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          end_date?: string | null
          energy_program_id: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string | null
          notes?: string | null
          role?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          end_date?: string | null
          energy_program_id?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string | null
          notes?: string | null
          role?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_program_team_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_program_team_members_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_program_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_programs: {
        Row: {
          account_id: string | null
          billing_schedule_end_date: string | null
          budget: number | null
          contract_start_date: string | null
          contract_status: string | null
          contract_term: number | null
          contract_type: string | null
          created_at: string
          ct_hot_notes: string | null
          description: string | null
          end_date: string | null
          id: string
          key_reference: string | null
          key_reference_notes: string | null
          last_synced_at: string | null
          measure_id: string | null
          name: string
          notes: string | null
          opportunity_id: string | null
          pgm_id: string | null
          program_type: string | null
          push_to_d365: boolean | null
          send_contacts: boolean | null
          service_status: string | null
          sf_id: string | null
          sharepoint_path: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          utility: string | null
        }
        Insert: {
          account_id?: string | null
          billing_schedule_end_date?: string | null
          budget?: number | null
          contract_start_date?: string | null
          contract_status?: string | null
          contract_term?: number | null
          contract_type?: string | null
          created_at?: string
          ct_hot_notes?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          key_reference?: string | null
          key_reference_notes?: string | null
          last_synced_at?: string | null
          measure_id?: string | null
          name: string
          notes?: string | null
          opportunity_id?: string | null
          pgm_id?: string | null
          program_type?: string | null
          push_to_d365?: boolean | null
          send_contacts?: boolean | null
          service_status?: string | null
          sf_id?: string | null
          sharepoint_path?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          utility?: string | null
        }
        Update: {
          account_id?: string | null
          billing_schedule_end_date?: string | null
          budget?: number | null
          contract_start_date?: string | null
          contract_status?: string | null
          contract_term?: number | null
          contract_type?: string | null
          created_at?: string
          ct_hot_notes?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          key_reference?: string | null
          key_reference_notes?: string | null
          last_synced_at?: string | null
          measure_id?: string | null
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          pgm_id?: string | null
          program_type?: string | null
          push_to_d365?: boolean | null
          send_contacts?: boolean | null
          service_status?: string | null
          sf_id?: string | null
          sharepoint_path?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          utility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_programs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_programs_measure_id_fkey"
            columns: ["measure_id"]
            isOneToOne: false
            referencedRelation: "measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_programs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feature_role_access: {
        Row: {
          created_at: string
          feature_id: string
          has_access: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          feature_id: string
          has_access?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          feature_id?: string
          has_access?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "feature_role_access_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          category: string | null
          config: Json | null
          description: string | null
          icon_name: string | null
          id: string
          is_configured: boolean
          is_enabled: boolean
          name: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          config?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          name: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          config?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          name?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          credit: number | null
          current_cost_avoidance: number | null
          current_less_previous: number | null
          energy_program_id: string | null
          fee_amount: number | null
          id: string
          invoice_id: string
          invoice_item_type: string | null
          name: string | null
          period_date: string | null
          previous_cost_avoidance: number | null
          previous_special_savings: number | null
          project_id: string | null
          savings: number | null
          special_savings: number | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credit?: number | null
          current_cost_avoidance?: number | null
          current_less_previous?: number | null
          energy_program_id?: string | null
          fee_amount?: number | null
          id?: string
          invoice_id: string
          invoice_item_type?: string | null
          name?: string | null
          period_date?: string | null
          previous_cost_avoidance?: number | null
          previous_special_savings?: number | null
          project_id?: string | null
          savings?: number | null
          special_savings?: number | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credit?: number | null
          current_cost_avoidance?: number | null
          current_less_previous?: number | null
          energy_program_id?: string | null
          fee_amount?: number | null
          id?: string
          invoice_id?: string
          invoice_item_type?: string | null
          name?: string | null
          period_date?: string | null
          previous_cost_avoidance?: number | null
          previous_special_savings?: number | null
          project_id?: string | null
          savings?: number | null
          special_savings?: number | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string | null
          amount_paid: number | null
          applied_amount: number | null
          bill_month: string | null
          billing_wizard: string | null
          contract_amount: number | null
          contract_id: string | null
          created_at: string
          currency: string | null
          cycle_end_date: string | null
          date_delivered: string | null
          description: string | null
          document_type: string | null
          due_date: string | null
          energy_program_id: string | null
          id: string
          intacct_status: string | null
          invoice_name: string | null
          invoice_number: string | null
          invoice_total: number | null
          issue_date: string | null
          last_synced_at: string | null
          name: string | null
          notes: string | null
          post_date: string | null
          ready_for_billing: string | null
          scheduled_date: string | null
          sf_id: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          tenant_id: string | null
          total: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount_paid?: number | null
          applied_amount?: number | null
          bill_month?: string | null
          billing_wizard?: string | null
          contract_amount?: number | null
          contract_id?: string | null
          created_at?: string
          currency?: string | null
          cycle_end_date?: string | null
          date_delivered?: string | null
          description?: string | null
          document_type?: string | null
          due_date?: string | null
          energy_program_id?: string | null
          id?: string
          intacct_status?: string | null
          invoice_name?: string | null
          invoice_number?: string | null
          invoice_total?: number | null
          issue_date?: string | null
          last_synced_at?: string | null
          name?: string | null
          notes?: string | null
          post_date?: string | null
          ready_for_billing?: string | null
          scheduled_date?: string | null
          sf_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount_paid?: number | null
          applied_amount?: number | null
          bill_month?: string | null
          billing_wizard?: string | null
          contract_amount?: number | null
          contract_id?: string | null
          created_at?: string
          currency?: string | null
          cycle_end_date?: string | null
          date_delivered?: string | null
          description?: string | null
          document_type?: string | null
          due_date?: string | null
          energy_program_id?: string | null
          id?: string
          intacct_status?: string | null
          invoice_name?: string | null
          invoice_number?: string | null
          invoice_total?: number | null
          issue_date?: string | null
          last_synced_at?: string | null
          name?: string | null
          notes?: string | null
          post_date?: string | null
          ready_for_billing?: string | null
          scheduled_date?: string | null
          sf_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          converted_account_id: string | null
          converted_at: string | null
          converted_contact_id: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          last_synced_at: string | null
          lead_number: string | null
          lead_source: string | null
          notes: string | null
          phone: string | null
          rating: string | null
          sf_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          last_synced_at?: string | null
          lead_number?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          rating?: string | null
          sf_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          last_synced_at?: string | null
          lead_number?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          rating?: string | null
          sf_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_account_id_fkey"
            columns: ["converted_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      measures: {
        Row: {
          account_id: string | null
          actual_savings: number | null
          c360_account_id: string | null
          c360_measure_id: string | null
          conversion_bill_period: string | null
          conversion_date: string | null
          cost: number | null
          created_at: string
          energy_program_id: string | null
          estimated_savings: number | null
          id: string
          installation_date: string | null
          measure_program_id: string | null
          measure_type: string | null
          name: string
          notes: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          actual_savings?: number | null
          c360_account_id?: string | null
          c360_measure_id?: string | null
          conversion_bill_period?: string | null
          conversion_date?: string | null
          cost?: number | null
          created_at?: string
          energy_program_id?: string | null
          estimated_savings?: number | null
          id?: string
          installation_date?: string | null
          measure_program_id?: string | null
          measure_type?: string | null
          name: string
          notes?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          actual_savings?: number | null
          c360_account_id?: string | null
          c360_measure_id?: string | null
          conversion_bill_period?: string | null
          conversion_date?: string | null
          cost?: number | null
          created_at?: string
          energy_program_id?: string | null
          estimated_savings?: number | null
          id?: string
          installation_date?: string | null
          measure_program_id?: string | null
          measure_type?: string | null
          name?: string
          notes?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measures_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measures_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string | null
          amount: number | null
          close_date: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          last_synced_at: string | null
          lead_source: string | null
          name: string
          next_step: string | null
          notes: string | null
          opportunity_number: string | null
          probability: number | null
          sf_id: string | null
          stage: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          close_date?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          lead_source?: string | null
          name: string
          next_step?: string | null
          notes?: string | null
          opportunity_number?: string | null
          probability?: number | null
          sf_id?: string | null
          stage?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          close_date?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_synced_at?: string | null
          lead_source?: string | null
          name?: string
          next_step?: string | null
          notes?: string | null
          opportunity_number?: string | null
          probability?: number | null
          sf_id?: string | null
          stage?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_contact_roles: {
        Row: {
          contact_id: string
          created_at: string
          end_date: string | null
          id: string
          is_primary: boolean | null
          opportunity_id: string
          role: string | null
          start_date: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          opportunity_id: string
          role?: string | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean | null
          opportunity_id?: string
          role?: string | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_contact_roles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contact_roles_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contact_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_line_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number | null
          id: string
          list_price: number | null
          name: string | null
          opportunity_id: string
          product_code: string | null
          product_id: string | null
          quantity: number | null
          service_date: string | null
          subtotal: number | null
          tenant_id: string
          total_price: number | null
          unit_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number | null
          id?: string
          list_price?: number | null
          name?: string | null
          opportunity_id: string
          product_code?: string | null
          product_id?: string | null
          quantity?: number | null
          service_date?: string | null
          subtotal?: number | null
          tenant_id: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number | null
          id?: string
          list_price?: number | null
          name?: string | null
          opportunity_id?: string
          product_code?: string | null
          product_id?: string | null
          quantity?: number | null
          service_date?: string | null
          subtotal?: number | null
          tenant_id?: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_line_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      picklist_options: {
        Row: {
          created_at: string | null
          entity: string
          field: string
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          entity: string
          field: string
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          entity?: string
          field?: string
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "picklist_options_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      powerbi_config: {
        Row: {
          api_url: string | null
          authority_url: string | null
          client_id: string | null
          id: string
          is_configured: boolean
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_url?: string | null
          authority_url?: string | null
          client_id?: string | null
          id?: string
          is_configured?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_url?: string | null
          authority_url?: string | null
          client_id?: string | null
          id?: string
          is_configured?: boolean
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      powerbi_reports: {
        Row: {
          created_at: string
          dataset_id: string | null
          description: string | null
          display_order: number
          embed_url: string | null
          height: number
          id: string
          is_active: boolean
          name: string
          placement: string
          report_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          display_order?: number
          embed_url?: string | null
          height?: number
          id?: string
          is_active?: boolean
          name: string
          placement?: string
          report_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          description?: string | null
          display_order?: number
          embed_url?: string | null
          height?: number
          id?: string
          is_active?: boolean
          name?: string
          placement?: string
          report_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sku: string | null
          tenant_id: string | null
          type: string | null
          unit_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sku?: string | null
          tenant_id?: string | null
          type?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sku?: string | null
          tenant_id?: string | null
          type?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string
          sort_order: number | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_end_date: string | null
          actual_hours: number | null
          actual_start_date: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          created_at: string
          depends_on: string | null
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          milestone_id: string | null
          name: string
          notes: string | null
          parent_task_id: string | null
          priority: string | null
          progress_percent: number | null
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          name: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          progress_percent?: number | null
          project_id: string
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          depends_on?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          name?: string
          notes?: string | null
          parent_task_id?: string | null
          priority?: string | null
          progress_percent?: number | null
          project_id?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_id: string | null
          actual_cost: number | null
          actual_end_date: string | null
          actual_start_date: string | null
          budget: number | null
          contract_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          energy_program_id: string | null
          id: string
          name: string
          notes: string | null
          priority: string | null
          program_type: string | null
          progress_percent: number | null
          project_manager_id: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
          utility: string | null
        }
        Insert: {
          account_id?: string | null
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          budget?: number | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          energy_program_id?: string | null
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          program_type?: string | null
          progress_percent?: number | null
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          utility?: string | null
        }
        Update: {
          account_id?: string | null
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_start_date?: string | null
          budget?: number | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          energy_program_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          program_type?: string | null
          progress_percent?: number | null
          project_manager_id?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
          utility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_energy_program_id_fkey"
            columns: ["energy_program_id"]
            isOneToOne: false
            referencedRelation: "energy_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_id: string | null
          quantity: number | null
          quote_id: string
          tenant_id: string | null
          total_price: number | null
          unit_price: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quote_id: string
          tenant_id?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          quote_id?: string
          tenant_id?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          account_id: string | null
          created_at: string
          discount: number | null
          id: string
          last_synced_at: string | null
          name: string
          notes: string | null
          opportunity_id: string | null
          quote_number: string | null
          sf_id: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          tenant_id: string | null
          terms: string | null
          total: number | null
          updated_at: string
          user_id: string | null
          valid_until: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          last_synced_at?: string | null
          name: string
          notes?: string | null
          opportunity_id?: string | null
          quote_number?: string | null
          sf_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          discount?: number | null
          id?: string
          last_synced_at?: string | null
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_number?: string | null
          sf_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          tenant_id?: string | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          user_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      record_comments: {
        Row: {
          comment: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          id: string
          resource: string
          role: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource: string
          role: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          allowed_email_domains: string[] | null
          enable_audit_logging: boolean
          enable_two_factor: boolean
          id: string
          max_login_attempts: number
          password_min_length: number
          require_numbers: boolean
          require_special_chars: boolean
          require_uppercase: boolean
          session_timeout_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_email_domains?: string[] | null
          enable_audit_logging?: boolean
          enable_two_factor?: boolean
          id?: string
          max_login_attempts?: number
          password_min_length?: number
          require_numbers?: boolean
          require_special_chars?: boolean
          require_uppercase?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_email_domains?: string[] | null
          enable_audit_logging?: boolean
          enable_two_factor?: boolean
          id?: string
          max_login_attempts?: number
          password_min_length?: number
          require_numbers?: boolean
          require_special_chars?: boolean
          require_uppercase?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          case_number: string | null
          category: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          email_thread_id: string | null
          id: string
          last_synced_at: string | null
          origin: string | null
          priority: string | null
          resolution: string | null
          resolved_at: string | null
          sf_id: string | null
          source_email: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          case_number?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          email_thread_id?: string | null
          id?: string
          last_synced_at?: string | null
          origin?: string | null
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sf_id?: string | null
          source_email?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          case_number?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          email_thread_id?: string | null
          id?: string
          last_synced_at?: string | null
          origin?: string | null
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sf_id?: string | null
          source_email?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_schedules: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          interval_minutes: number
          is_active: boolean
          last_auto_sync_at: string | null
          next_sync_at: string | null
          sync_direction: string
          sync_objects: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          interval_minutes?: number
          is_active?: boolean
          last_auto_sync_at?: string | null
          next_sync_at?: string | null
          sync_direction?: string
          sync_objects?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          interval_minutes?: number
          is_active?: boolean
          last_auto_sync_at?: string | null
          next_sync_at?: string | null
          sync_direction?: string
          sync_objects?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          category: string | null
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tenant_m365_config: {
        Row: {
          client_id: string | null
          client_secret: string | null
          id: string
          is_configured: boolean
          ms_tenant_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          client_secret?: string | null
          id?: string
          is_configured?: boolean
          ms_tenant_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          client_secret?: string | null
          id?: string
          is_configured?: boolean
          ms_tenant_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_m365_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          current_users: number | null
          domain: string | null
          id: string
          max_users: number | null
          name: string
          notes: string | null
          plan: string | null
          settings: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          current_users?: number | null
          domain?: string | null
          id?: string
          max_users?: number | null
          name: string
          notes?: string | null
          plan?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          current_users?: number | null
          domain?: string | null
          id?: string
          max_users?: number | null
          name?: string
          notes?: string | null
          plan?: string | null
          settings?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          email_confirmed_at: string | null
          last_sign_in_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          email_confirmed_at?: string | null
          last_sign_in_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          email_confirmed_at?: string | null
          last_sign_in_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      workflow_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string
          description: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          trigger_event: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          trigger_event?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          trigger_event?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tenant_m365_config_safe: {
        Row: {
          client_id: string | null
          id: string | null
          is_configured: boolean | null
          ms_tenant_id: string | null
          tenant_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          client_id?: string | null
          id?: string | null
          is_configured?: boolean | null
          ms_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          client_id?: string | null
          id?: string | null
          is_configured?: boolean | null
          ms_tenant_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_m365_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          _action: string
          _changes?: Json
          _entity_id?: string
          _entity_name?: string
          _entity_type: string
          _tenant_id?: string
        }
        Returns: undefined
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "manager"
        | "sales"
        | "marketing"
        | "finance"
        | "hr"
        | "operations"
        | "contractor"
        | "basic_user"
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
        "admin",
        "moderator",
        "user",
        "manager",
        "sales",
        "marketing",
        "finance",
        "hr",
        "operations",
        "contractor",
        "basic_user",
      ],
    },
  },
} as const
