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
      actors: {
        Row: {
          created_at: string | null
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          ip_hash: string | null
          model_id: string
          referrer: string | null
          source: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_hash?: string | null
          model_id: string
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          ip_hash?: string | null
          model_id?: string
          referrer?: string | null
          source?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          click_id: string | null
          commission_amount_cents: number
          commission_rate: number | null
          created_at: string | null
          event_id: string
          id: string
          model_id: string
          order_id: string | null
          paid_at: string | null
          payment_reference: string | null
          sale_amount_cents: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          click_id?: string | null
          commission_amount_cents: number
          commission_rate?: number | null
          created_at?: string | null
          event_id: string
          id?: string
          model_id: string
          order_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          sale_amount_cents: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          click_id?: string | null
          commission_amount_cents?: number
          commission_rate?: number | null
          created_at?: string | null
          event_id?: string
          id?: string
          model_id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          sale_amount_cents?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          coins_spent: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          model_id: string
          processing_time_ms: number | null
          prompt: string
          replicate_prediction_id: string | null
          result_urls: string[] | null
          scenario_id: string
          scenario_name: string
          source_image_url: string
          status: string
        }
        Insert: {
          coins_spent?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_id: string
          processing_time_ms?: number | null
          prompt: string
          replicate_prediction_id?: string | null
          result_urls?: string[] | null
          scenario_id: string
          scenario_name: string
          source_image_url: string
          status?: string
        }
        Update: {
          coins_spent?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_id?: string
          processing_time_ms?: number | null
          prompt?: string
          replicate_prediction_id?: string | null
          result_urls?: string[] | null
          scenario_id?: string
          scenario_name?: string
          source_image_url?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_saved_photos: {
        Row: {
          added_to_portfolio: boolean | null
          created_at: string | null
          generation_id: string
          id: string
          image_url: string
          model_id: string
          portfolio_media_id: string | null
          scenario_name: string
        }
        Insert: {
          added_to_portfolio?: boolean | null
          created_at?: string | null
          generation_id: string
          id?: string
          image_url: string
          model_id: string
          portfolio_media_id?: string | null
          scenario_name: string
        }
        Update: {
          added_to_portfolio?: boolean | null
          created_at?: string | null
          generation_id?: string
          id?: string
          image_url?: string
          model_id?: string
          portfolio_media_id?: string | null
          scenario_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_saved_photos_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "ai_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_saved_photos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_saved_photos_portfolio_media_id_fkey"
            columns: ["portfolio_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          booked_by: string | null
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_available: boolean | null
          notes: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          booked_by?: string | null
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          booked_by?: string | null
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "call_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_type: string | null
          criteria: Json | null
          description: string | null
          event_id: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number | null
          slug: string
        }
        Insert: {
          badge_type?: string | null
          criteria?: Json | null
          description?: string | null
          event_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required?: number | null
          slug: string
        }
        Update: {
          badge_type?: string | null
          criteria?: Json | null
          description?: string | null
          event_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number | null
          slug?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number_encrypted: string
          account_number_last4: string
          account_type: string
          bank_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          model_id: string
          routing_number: string
          updated_at: string | null
        }
        Insert: {
          account_holder_name: string
          account_number_encrypted: string
          account_number_last4: string
          account_type: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          model_id: string
          routing_number: string
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number_encrypted?: string
          account_number_last4?: string
          account_type?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          model_id?: string
          routing_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_orders: {
        Row: {
          amount: number
          created_at: string | null
          email: string
          full_name: string
          id: string
          item_name: string
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          item_name: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          item_name?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          approved_at: string | null
          booking_number: string | null
          booking_type: Database["public"]["Enums"]["booking_type"] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          client_notes: string | null
          completed_at: string | null
          confirmed_at: string | null
          counter_amount: number | null
          counter_notes: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_transaction_id: string | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          end_time: string | null
          event_date: string | null
          full_payment_paid: boolean | null
          id: string
          is_remote: boolean | null
          location_address: string | null
          location_city: string | null
          location_details: string | null
          location_name: string | null
          location_state: string | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          model_id: string | null
          model_notes: string | null
          model_response_notes: string | null
          payment_transaction_id: string | null
          quoted_rate: number | null
          rate_amount: number | null
          rate_type: Database["public"]["Enums"]["rate_type"] | null
          responded_at: string | null
          service_description: string | null
          service_type: string | null
          special_requests: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          booking_number?: string | null
          booking_type?: Database["public"]["Enums"]["booking_type"] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          counter_amount?: number | null
          counter_notes?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_transaction_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          full_payment_paid?: boolean | null
          id?: string
          is_remote?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_details?: string | null
          location_name?: string | null
          location_state?: string | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          model_id?: string | null
          model_notes?: string | null
          model_response_notes?: string | null
          payment_transaction_id?: string | null
          quoted_rate?: number | null
          rate_amount?: number | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          responded_at?: string | null
          service_description?: string | null
          service_type?: string | null
          special_requests?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          booking_number?: string | null
          booking_type?: Database["public"]["Enums"]["booking_type"] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          counter_amount?: number | null
          counter_notes?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_transaction_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          full_payment_paid?: boolean | null
          id?: string
          is_remote?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_details?: string | null
          location_name?: string | null
          location_state?: string | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          model_id?: string | null
          model_notes?: string | null
          model_response_notes?: string | null
          payment_transaction_id?: string | null
          quoted_rate?: number | null
          rate_amount?: number | null
          rate_type?: Database["public"]["Enums"]["rate_type"] | null
          responded_at?: string | null
          service_description?: string | null
          service_type?: string | null
          special_requests?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_model_notes: {
        Row: {
          brand_id: string
          created_at: string | null
          id: string
          model_id: string
          notes: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          id?: string
          model_id: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          id?: string
          model_id?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_model_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_model_notes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_model_notes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          billing_cycle: string | null
          bio: string | null
          coin_balance: number | null
          coins_granted_at: string | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          billing_cycle?: string | null
          bio?: string | null
          coin_balance?: number | null
          coins_granted_at?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_verified?: boolean | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          billing_cycle?: string | null
          bio?: string | null
          coin_balance?: number | null
          coins_granted_at?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          booking_frequency: string | null
          business_type: string | null
          city: string | null
          company_description: string | null
          company_name: string
          company_size: string | null
          country: string | null
          created_at: string | null
          email: string
          exa_coin_balance: number | null
          facebook_url: string | null
          first_name: string
          form_data: Json | null
          id: string
          industry: string | null
          instagram_followers: number | null
          instagram_url: string | null
          is_approved: boolean | null
          is_verified: boolean | null
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          model_types_needed: string[] | null
          phone: string | null
          portfolio_url: string | null
          previous_collaborations: string | null
          project_types: string[] | null
          state: string | null
          status: string | null
          tax_id: string | null
          typical_project_budget: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          address?: string | null
          booking_frequency?: string | null
          business_type?: string | null
          city?: string | null
          company_description?: string | null
          company_name: string
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          exa_coin_balance?: number | null
          facebook_url?: string | null
          first_name: string
          form_data?: Json | null
          id?: string
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          model_types_needed?: string[] | null
          phone?: string | null
          portfolio_url?: string | null
          previous_collaborations?: string | null
          project_types?: string[] | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          typical_project_budget?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          address?: string | null
          booking_frequency?: string | null
          business_type?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string
          company_size?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          exa_coin_balance?: number | null
          facebook_url?: string | null
          first_name?: string
          form_data?: Json | null
          id?: string
          industry?: string | null
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          model_types_needed?: string[] | null
          phone?: string | null
          portfolio_url?: string | null
          previous_collaborations?: string | null
          project_types?: string[] | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          typical_project_budget?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      call_notes: {
        Row: {
          call_request_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          note_type: string | null
        }
        Insert: {
          call_request_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
        }
        Update: {
          call_request_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_notes_call_request_id_fkey"
            columns: ["call_request_id"]
            isOneToOne: false
            referencedRelation: "call_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      call_request_tags: {
        Row: {
          added_at: string | null
          added_by: string | null
          call_request_id: string
          tag_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          call_request_id: string
          tag_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          call_request_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_request_tags_call_request_id_fkey"
            columns: ["call_request_id"]
            isOneToOne: false
            referencedRelation: "call_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_request_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      call_requests: {
        Row: {
          agora_token: string | null
          assigned_to: string | null
          call_duration: number | null
          call_type: string
          caller_id: string
          caller_name: string | null
          channel_name: string | null
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          message: string | null
          model_id: string
          model_name: string | null
          outcome: string | null
          priority: string | null
          responded_at: string | null
          scheduled_at: string | null
          scheduled_duration: number | null
          source: string | null
          source_detail: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agora_token?: string | null
          assigned_to?: string | null
          call_duration?: number | null
          call_type: string
          caller_id: string
          caller_name?: string | null
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          message?: string | null
          model_id: string
          model_name?: string | null
          outcome?: string | null
          priority?: string | null
          responded_at?: string | null
          scheduled_at?: string | null
          scheduled_duration?: number | null
          source?: string | null
          source_detail?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agora_token?: string | null
          assigned_to?: string | null
          call_duration?: number | null
          call_type?: string
          caller_id?: string
          caller_name?: string | null
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          message?: string | null
          model_id?: string
          model_name?: string | null
          outcome?: string | null
          priority?: string | null
          responded_at?: string | null
          scheduled_at?: string | null
          scheduled_duration?: number | null
          source?: string | null
          source_detail?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_models: {
        Row: {
          added_at: string | null
          campaign_id: string
          id: string
          model_id: string
          notes: string | null
        }
        Insert: {
          added_at?: string | null
          campaign_id: string
          id?: string
          model_id: string
          notes?: string | null
        }
        Update: {
          added_at?: string | null
          campaign_id?: string
          id?: string
          model_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_list_items_list_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_list_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_id: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_lists_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      catwalk_scores: {
        Row: {
          created_at: string | null
          gems_collected: number
          id: string
          model_id: string
          perfect_walks: number
          pose_score: number
          runway_id: string
          total_score: number
          walk_score: number
        }
        Insert: {
          created_at?: string | null
          gems_collected?: number
          id?: string
          model_id: string
          perfect_walks?: number
          pose_score?: number
          runway_id?: string
          total_score?: number
          walk_score?: number
        }
        Update: {
          created_at?: string | null
          gems_collected?: number
          id?: string
          model_id?: string
          perfect_walks?: number
          pose_score?: number
          runway_id?: string
          total_score?: number
          walk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "catwalk_scores_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      catwalk_unlocks: {
        Row: {
          id: string
          model_id: string
          runway_id: string
          unlocked_at: string | null
        }
        Insert: {
          id?: string
          model_id: string
          runway_id: string
          unlocked_at?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          runway_id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catwalk_unlocks_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_escrows: {
        Row: {
          actor_id: string
          amount: number
          booking_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          released_at: string | null
          status: string
        }
        Insert: {
          actor_id: string
          amount: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          released_at?: string | null
          status?: string
        }
        Update: {
          actor_id?: string
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_escrows_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_escrows_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_escrows_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          action: string
          actor_id: string
          amount: number
          created_at: string | null
          id: string
          message_id: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          amount: number
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_unlocks: {
        Row: {
          amount_paid: number
          buyer_id: string
          content_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          amount_paid: number
          buyer_id: string
          content_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          amount_paid?: number
          buyer_id?: string
          content_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_unlocks_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_unlocks_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_unlocks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "premium_content"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          actor_id: string
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          muted: boolean | null
          role: string | null
        }
        Insert: {
          actor_id: string
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
        }
        Update: {
          actor_id?: string
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          gig_id: string | null
          id: string
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gig_id?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gig_id?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          call_request_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          model_id: string | null
        }
        Insert: {
          activity_type: string
          call_request_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          model_id?: string | null
        }
        Update: {
          activity_type?: string
          call_request_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_call_request_id_fkey"
            columns: ["call_request_id"]
            isOneToOne: false
            referencedRelation: "call_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reminders: {
        Row: {
          call_request_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          model_id: string | null
          reminder_at: string
          title: string
        }
        Insert: {
          call_request_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          model_id?: string | null
          reminder_at: string
          title: string
        }
        Update: {
          call_request_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          model_id?: string | null
          reminder_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reminders_call_request_id_fkey"
            columns: ["call_request_id"]
            isOneToOne: false
            referencedRelation: "call_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_spin_history: {
        Row: {
          created_at: string | null
          gems_won: number
          id: string
          model_id: string
          spin_result: string
        }
        Insert: {
          created_at?: string | null
          gems_won: number
          id?: string
          model_id: string
          spin_result: string
        }
        Update: {
          created_at?: string | null
          gems_won?: number
          id?: string
          model_id?: string
          spin_result?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_spin_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      designers: {
        Row: {
          brand_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          designer_statement: string | null
          email: string
          first_name: string
          form_data: Json | null
          id: string
          instagram_followers: number | null
          instagram_url: string | null
          is_approved: boolean | null
          last_name: string
          phone: string | null
          portfolio_url: string | null
          previous_shows: string | null
          specialization: string[] | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          brand_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          designer_statement?: string | null
          email: string
          first_name: string
          form_data?: Json | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          last_name: string
          phone?: string | null
          portfolio_url?: string | null
          previous_shows?: string | null
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          brand_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          designer_statement?: string | null
          email?: string
          first_name?: string
          form_data?: Json | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          last_name?: string
          phone?: string | null
          portfolio_url?: string | null
          previous_shows?: string | null
          specialization?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      digest_tracking: {
        Row: {
          created_at: string | null
          error_message: string | null
          frequency: Database["public"]["Enums"]["digest_frequency"]
          id: string
          last_sent_at: string | null
          next_scheduled_at: string | null
          notification_count: number | null
          notifications_included: string[] | null
          sent_successfully: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          frequency: Database["public"]["Enums"]["digest_frequency"]
          id?: string
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          notification_count?: number | null
          notifications_included?: string[] | null
          sent_successfully?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          frequency?: Database["public"]["Enums"]["digest_frequency"]
          id?: string
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          notification_count?: number | null
          notifications_included?: string[] | null
          sent_successfully?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string | null
          email: string
          id: string
          marketing_emails: boolean | null
          notification_emails: boolean | null
          unsubscribe_token: string | null
          unsubscribed_all: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          marketing_emails?: boolean | null
          notification_emails?: boolean | null
          unsubscribe_token?: string | null
          unsubscribed_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          marketing_emails?: boolean | null
          notification_emails?: boolean | null
          unsubscribe_token?: string | null
          unsubscribed_all?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          model_id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          model_id: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          model_id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          badge_image_url: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          location_city: string | null
          location_country: string | null
          location_name: string | null
          location_state: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          points_awarded: number | null
          short_name: string
          slug: string
          start_date: string | null
          status: string | null
          ticket_price_cents: number | null
          ticket_url: string | null
          tickets_enabled: boolean | null
          updated_at: string | null
          year: number
        }
        Insert: {
          badge_image_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          location_state?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          points_awarded?: number | null
          short_name: string
          slug: string
          start_date?: string | null
          status?: string | null
          ticket_price_cents?: number | null
          ticket_url?: string | null
          tickets_enabled?: boolean | null
          updated_at?: string | null
          year: number
        }
        Update: {
          badge_image_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          location_state?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          points_awarded?: number | null
          short_name?: string
          slug?: string
          start_date?: string | null
          status?: string | null
          ticket_price_cents?: number | null
          ticket_url?: string | null
          tickets_enabled?: boolean | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      exa_coin_transactions: {
        Row: {
          created_at: string
          direction: string
          exa_coins: number
          id: string
          metadata: Json | null
          model_id: string | null
          model_instagram: string | null
          reason: Database["public"]["Enums"]["exa_coin_transaction_reason"]
          recipient_id: string | null
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          exa_coins: number
          id?: string
          metadata?: Json | null
          model_id?: string | null
          model_instagram?: string | null
          reason: Database["public"]["Enums"]["exa_coin_transaction_reason"]
          recipient_id?: string | null
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          exa_coins?: number
          id?: string
          metadata?: Json | null
          model_id?: string | null
          model_instagram?: string | null
          reason?: Database["public"]["Enums"]["exa_coin_transaction_reason"]
          recipient_id?: string | null
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "star_transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "star_transactions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "star_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fans: {
        Row: {
          avatar_url: string | null
          bio: string | null
          coin_balance: number | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_suspended: boolean | null
          phone: string | null
          referred_by_model_id: string | null
          state: string | null
          total_coins_purchased: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_suspended?: boolean | null
          phone?: string | null
          referred_by_model_id?: string | null
          state?: string | null
          total_coins_purchased?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_suspended?: boolean | null
          phone?: string | null
          referred_by_model_id?: string | null
          state?: string | null
          total_coins_purchased?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fans_referred_by_model_id_fkey"
            columns: ["referred_by_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_applications: {
        Row: {
          admin_note: string | null
          amount_paid: number | null
          applied_at: string | null
          digis_username: string | null
          gig_id: string
          id: string
          instagram_followers: number | null
          instagram_handle: string | null
          model_id: string
          note: string | null
          payment_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sponsorship_pitch: string | null
          spot_type: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          trip_number: number | null
        }
        Insert: {
          admin_note?: string | null
          amount_paid?: number | null
          applied_at?: string | null
          digis_username?: string | null
          gig_id: string
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          model_id: string
          note?: string | null
          payment_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sponsorship_pitch?: string | null
          spot_type?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          trip_number?: number | null
        }
        Update: {
          admin_note?: string | null
          amount_paid?: number | null
          applied_at?: string | null
          digis_username?: string | null
          gig_id?: string
          id?: string
          instagram_followers?: number | null
          instagram_handle?: string | null
          model_id?: string
          note?: string | null
          payment_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sponsorship_pitch?: string | null
          spot_type?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          trip_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          application_deadline: string | null
          compensation_amount: number | null
          compensation_description: string | null
          compensation_type: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string | null
          event_id: string | null
          gallery_images: string[] | null
          id: string
          location_city: string | null
          location_country: string | null
          location_name: string | null
          location_state: string | null
          points_for_completion: number | null
          requirements: Json | null
          slug: string
          spots: number | null
          spots_filled: number | null
          start_at: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          application_deadline?: string | null
          compensation_amount?: number | null
          compensation_description?: string | null
          compensation_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_id?: string | null
          gallery_images?: string[] | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          location_state?: string | null
          points_for_completion?: number | null
          requirements?: Json | null
          slug: string
          spots?: number | null
          spots_filled?: number | null
          start_at?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          application_deadline?: string | null
          compensation_amount?: number | null
          compensation_description?: string | null
          compensation_type?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_id?: string | null
          gallery_images?: string[] | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          location_state?: string | null
          points_for_completion?: number | null
          requirements?: Json | null
          slug?: string
          spots?: number | null
          spots_filled?: number | null
          start_at?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      lifestyle_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          gems_change: number
          id: string
          model_id: string
          streak_day: number | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          gems_change: number
          id?: string
          model_id: string
          streak_day?: number | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          gems_change?: number
          id?: string
          model_id?: string
          streak_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifestyle_activities_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      lifestyle_stats: {
        Row: {
          current_streak: number | null
          last_activity_date: string | null
          longest_streak: number | null
          model_id: string
          total_content: number | null
          total_events: number | null
          total_wellness: number | null
          total_workouts: number | null
          updated_at: string | null
        }
        Insert: {
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          model_id: string
          total_content?: number | null
          total_events?: number | null
          total_wellness?: number | null
          total_workouts?: number | null
          updated_at?: string | null
        }
        Update: {
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          model_id?: string
          total_content?: number | null
          total_events?: number | null
          total_wellness?: number | null
          total_workouts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lifestyle_stats_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      login_streaks: {
        Row: {
          current_streak: number | null
          last_login_date: string | null
          longest_streak: number | null
          model_id: string
        }
        Insert: {
          current_streak?: number | null
          last_login_date?: string | null
          longest_streak?: number | null
          model_id: string
        }
        Update: {
          current_streak?: number | null
          last_login_date?: string | null
          longest_streak?: number | null
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_streaks_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          available_for_shows: boolean | null
          city: string | null
          company_name: string | null
          created_at: string | null
          email: string
          equipment_list: string | null
          first_name: string
          form_data: Json | null
          hourly_rate_range: string | null
          id: string
          instagram_followers: number | null
          instagram_url: string | null
          is_approved: boolean | null
          last_name: string
          media_type: string
          phone: string | null
          portfolio_url: string | null
          services_offered: string[] | null
          specializations: string[] | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          available_for_shows?: boolean | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          equipment_list?: string | null
          first_name: string
          form_data?: Json | null
          hourly_rate_range?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          last_name: string
          media_type: string
          phone?: string | null
          portfolio_url?: string | null
          services_offered?: string[] | null
          specializations?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          available_for_shows?: boolean | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          equipment_list?: string | null
          first_name?: string
          form_data?: Json | null
          hourly_rate_range?: string | null
          id?: string
          instagram_followers?: number | null
          instagram_url?: string | null
          is_approved?: boolean | null
          last_name?: string
          media_type?: string
          phone?: string | null
          portfolio_url?: string | null
          services_offered?: string[] | null
          specializations?: string[] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          asset_type: string | null
          created_at: string | null
          display_order: number | null
          gig_id: string | null
          height: number | null
          id: string
          is_primary: boolean | null
          mime_type: string | null
          model_id: string | null
          owner_id: string
          photo_url: string | null
          size_bytes: number | null
          source: string | null
          storage_path: string
          title: string | null
          type: string | null
          url: string | null
          width: number | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string | null
          display_order?: number | null
          gig_id?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          model_id?: string | null
          owner_id: string
          photo_url?: string | null
          size_bytes?: number | null
          source?: string | null
          storage_path: string
          title?: string | null
          type?: string | null
          url?: string | null
          width?: number | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string | null
          display_order?: number | null
          gig_id?: string | null
          height?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          model_id?: string | null
          owner_id?: string
          photo_url?: string | null
          size_bytes?: number | null
          source?: string | null
          storage_path?: string
          title?: string | null
          type?: string | null
          url?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      media_unlocks: {
        Row: {
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          message_id: string
          stars_paid: number
          transaction_id: string | null
          unlocked_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          message_id: string
          stars_paid: number
          transaction_id?: string | null
          unlocked_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          message_id?: string
          stars_paid?: number
          transaction_id?: string | null
          unlocked_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_unlocks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_unlocks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          actor_id: string
          created_at: string | null
          emoji: string
          id: string
          message_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          actor_id: string
          message_id: string
          read_at: string | null
        }
        Insert: {
          actor_id: string
          message_id: string
          read_at?: string | null
        }
        Update: {
          actor_id?: string
          message_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          archived_by: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          model_instagram: string
          total_exa_coins_spent: number | null
          total_messages: number | null
          user_id: string
        }
        Insert: {
          archived_by?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          model_instagram: string
          total_exa_coins_spent?: number | null
          total_messages?: number | null
          user_id: string
        }
        Update: {
          archived_by?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          model_instagram?: string
          total_exa_coins_spent?: number | null
          total_messages?: number | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          is_flagged: boolean | null
          is_system: boolean | null
          media_duration: number | null
          media_expires_at: string | null
          media_file_size: number | null
          media_price: number | null
          media_thumbnail_url: string | null
          media_type: string | null
          media_url: string | null
          media_view_mode: string | null
          media_viewed_by: string[] | null
          read_at: string | null
          recipient_id: string | null
          recipient_instagram: string | null
          sender_id: string
          sender_type: string | null
          transaction_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_system?: boolean | null
          media_duration?: number | null
          media_expires_at?: string | null
          media_file_size?: number | null
          media_price?: number | null
          media_thumbnail_url?: string | null
          media_type?: string | null
          media_url?: string | null
          media_view_mode?: string | null
          media_viewed_by?: string[] | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_instagram?: string | null
          sender_id: string
          sender_type?: string | null
          transaction_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_system?: boolean | null
          media_duration?: number | null
          media_expires_at?: string | null
          media_file_size?: number | null
          media_price?: number | null
          media_thumbnail_url?: string | null
          media_type?: string | null
          media_url?: string | null
          media_view_mode?: string | null
          media_viewed_by?: string[] | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_instagram?: string | null
          sender_id?: string
          sender_type?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_applications: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          display_name: string
          email: string
          fan_id: string | null
          height: string | null
          id: string
          instagram_username: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tiktok_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          display_name: string
          email: string
          fan_id?: string | null
          height?: string | null
          id?: string
          instagram_username?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string
          email?: string
          fan_id?: string | null
          height?: string | null
          id?: string
          instagram_username?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_applications_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "fans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      model_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          model_id: string
          stars_per_minute: number | null
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          model_id: string
          stars_per_minute?: number | null
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          model_id?: string
          stars_per_minute?: number | null
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_availability_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          model_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          model_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_badges_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_client_interactions: {
        Row: {
          booking_count: number | null
          client_id: string
          created_at: string | null
          first_interaction_at: string | null
          id: string
          last_interaction_at: string | null
          message_count: number | null
          metadata: Json | null
          model_id: string
          tip_count: number | null
          total_spent: number | null
          updated_at: string | null
          video_call_count: number | null
        }
        Insert: {
          booking_count?: number | null
          client_id: string
          created_at?: string | null
          first_interaction_at?: string | null
          id?: string
          last_interaction_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          model_id: string
          tip_count?: number | null
          total_spent?: number | null
          updated_at?: string | null
          video_call_count?: number | null
        }
        Update: {
          booking_count?: number | null
          client_id?: string
          created_at?: string | null
          first_interaction_at?: string | null
          id?: string
          last_interaction_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          model_id?: string
          tip_count?: number | null
          total_spent?: number | null
          updated_at?: string | null
          video_call_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_client_interactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_earnings_daily: {
        Row: {
          booking_count: number | null
          created_at: string | null
          date: string
          id: string
          message_count: number | null
          model_id: string
          repeat_clients: number | null
          revenue_bookings: number | null
          revenue_messages: number | null
          revenue_tips: number | null
          revenue_total: number | null
          revenue_video_calls: number | null
          tip_count: number | null
          unique_clients: number | null
          updated_at: string | null
          video_call_count: number | null
          video_call_minutes: number | null
          video_call_revenue_per_minute: number | null
        }
        Insert: {
          booking_count?: number | null
          created_at?: string | null
          date: string
          id?: string
          message_count?: number | null
          model_id: string
          repeat_clients?: number | null
          revenue_bookings?: number | null
          revenue_messages?: number | null
          revenue_tips?: number | null
          revenue_total?: number | null
          revenue_video_calls?: number | null
          tip_count?: number | null
          unique_clients?: number | null
          updated_at?: string | null
          video_call_count?: number | null
          video_call_minutes?: number | null
          video_call_revenue_per_minute?: number | null
        }
        Update: {
          booking_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          message_count?: number | null
          model_id?: string
          repeat_clients?: number | null
          revenue_bookings?: number | null
          revenue_messages?: number | null
          revenue_tips?: number | null
          revenue_total?: number | null
          revenue_video_calls?: number | null
          tip_count?: number | null
          unique_clients?: number | null
          updated_at?: string | null
          video_call_count?: number | null
          video_call_minutes?: number | null
          video_call_revenue_per_minute?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_earnings_daily_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_links: {
        Row: {
          banner_image_url: string | null
          clicks: number | null
          created_at: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean | null
          model_id: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          banner_image_url?: string | null
          clicks?: number | null
          created_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          model_id: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          banner_image_url?: string | null
          clicks?: number | null
          created_at?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          model_id?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_links_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_promo_codes: {
        Row: {
          commission_percentage: number | null
          created_at: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          model_username: string
          promo_code: string
        }
        Insert: {
          commission_percentage?: number | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          model_username: string
          promo_code: string
        }
        Update: {
          commission_percentage?: number | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          model_username?: string
          promo_code?: string
        }
        Relationships: []
      }
      model_rate_cards: {
        Row: {
          advance_booking_days: number | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string | null
          deposit_percentage: number | null
          full_day_rate: number | null
          half_day_rate: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          minimum_booking_hours: number | null
          model_id: string
          notes: string | null
          per_event_rate: number | null
          updated_at: string | null
        }
        Insert: {
          advance_booking_days?: number | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at?: string | null
          deposit_percentage?: number | null
          full_day_rate?: number | null
          half_day_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          minimum_booking_hours?: number | null
          model_id: string
          notes?: string | null
          per_event_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_booking_days?: number | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string | null
          deposit_percentage?: number | null
          full_day_rate?: number | null
          half_day_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          minimum_booking_hours?: number | null
          model_id?: string
          notes?: string | null
          per_event_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_rate_cards_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_response_metrics: {
        Row: {
          avg_response_time: number | null
          booking_conversion_rate: number | null
          booking_requests_accepted: number | null
          booking_requests_received: number | null
          created_at: string | null
          date: string
          id: string
          median_response_time: number | null
          model_id: string
          responses_under_1hr: number | null
          responses_under_24hr: number | null
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          avg_response_time?: number | null
          booking_conversion_rate?: number | null
          booking_requests_accepted?: number | null
          booking_requests_received?: number | null
          created_at?: string | null
          date: string
          id?: string
          median_response_time?: number | null
          model_id: string
          responses_under_1hr?: number | null
          responses_under_24hr?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_response_time?: number | null
          booking_conversion_rate?: number | null
          booking_requests_accepted?: number | null
          booking_requests_received?: number | null
          created_at?: string | null
          date?: string
          id?: string
          median_response_time?: number | null
          model_id?: string
          responses_under_1hr?: number | null
          responses_under_24hr?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_response_metrics_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_spotlights: {
        Row: {
          created_at: string
          duration: string
          expires_at: string
          id: string
          model_id: string | null
          model_instagram: string
          stars_paid: number
          starts_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: string
          expires_at: string
          id?: string
          model_id?: string | null
          model_instagram: string
          stars_paid: number
          starts_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: string
          expires_at?: string
          id?: string
          model_id?: string | null
          model_instagram?: string
          stars_paid?: number
          starts_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_highlights_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_spotlights_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_stars: {
        Row: {
          instagram_name: string
          model_id: string | null
          star_count: number
          updated_at: string
        }
        Insert: {
          instagram_name: string
          model_id?: string | null
          star_count?: number
          updated_at?: string
        }
        Update: {
          instagram_name?: string
          model_id?: string | null
          star_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_stars_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_tags: {
        Row: {
          added_at: string | null
          id: string
          model_id: string
          tag_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          model_id: string
          tag_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          model_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_tags_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          admin_rating: number | null
          affiliate_code: string | null
          affiliate_links: Json | null
          allow_chat: boolean | null
          allow_tips: boolean | null
          allow_video_call: boolean | null
          allow_voice_call: boolean | null
          availability_status: string | null
          bio: string | null
          brand_ambassador_daily_rate: number | null
          bust: string | null
          city: string | null
          claimed_at: string | null
          coin_balance: number | null
          college: string | null
          country_code: string | null
          created_at: string | null
          date_of_birth: string | null
          digis_username: string | null
          dob: string | null
          dress_size: string | null
          email: string
          eye_color: string | null
          first_name: string | null
          focus_tags: string[] | null
          form_data: Json | null
          gem_balance: number | null
          hair_color: string | null
          height: string | null
          hips: string | null
          id: string
          instagram_engagement_rate: string | null
          instagram_followers: number | null
          instagram_gender_split: string | null
          instagram_name: string | null
          instagram_primary_age: string | null
          instagram_reach_30d: string | null
          instagram_stats_updated_at: string | null
          instagram_top_location: string | null
          instagram_url: string | null
          invite_sent_at: string | null
          invite_token: string | null
          is_approved: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          last_name: string | null
          level_cached: string | null
          meet_greet_rate: number | null
          message_rate: number | null
          new_face: boolean | null
          phone: string | null
          photoshoot_full_day_rate: number | null
          photoshoot_half_day_rate: number | null
          photoshoot_hourly_rate: number | null
          points_cached: number | null
          preferred_payout_method: string | null
          private_event_hourly_rate: number | null
          profile_completion_percent: number | null
          profile_photo_url: string | null
          profile_views: number | null
          promo_hourly_rate: number | null
          rate_max: number | null
          rate_min: number | null
          rate_type: string | null
          reliability_score: number | null
          shoe_size: string | null
          show_additional_info: boolean | null
          show_booking_rates: boolean | null
          show_instagram_stats: boolean | null
          show_links: boolean | null
          show_location: boolean | null
          show_measurements: boolean | null
          show_on_rates_page: boolean | null
          show_social_media: boolean | null
          snapchat_followers: number | null
          snapchat_username: string | null
          social_companion_hourly_rate: number | null
          specialty: string[] | null
          state: string | null
          status: string | null
          tiktok_followers: number | null
          tiktok_username: string | null
          travel_fee: number | null
          twitch_username: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          username_changed_at: string | null
          video_call_rate: number | null
          voice_call_rate: number | null
          waist: string | null
          withheld_balance: number | null
          x_username: string | null
          youtube_username: string | null
        }
        Insert: {
          admin_rating?: number | null
          affiliate_code?: string | null
          affiliate_links?: Json | null
          allow_chat?: boolean | null
          allow_tips?: boolean | null
          allow_video_call?: boolean | null
          allow_voice_call?: boolean | null
          availability_status?: string | null
          bio?: string | null
          brand_ambassador_daily_rate?: number | null
          bust?: string | null
          city?: string | null
          claimed_at?: string | null
          coin_balance?: number | null
          college?: string | null
          country_code?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          digis_username?: string | null
          dob?: string | null
          dress_size?: string | null
          email: string
          eye_color?: string | null
          first_name?: string | null
          focus_tags?: string[] | null
          form_data?: Json | null
          gem_balance?: number | null
          hair_color?: string | null
          height?: string | null
          hips?: string | null
          id?: string
          instagram_engagement_rate?: string | null
          instagram_followers?: number | null
          instagram_gender_split?: string | null
          instagram_name?: string | null
          instagram_primary_age?: string | null
          instagram_reach_30d?: string | null
          instagram_stats_updated_at?: string | null
          instagram_top_location?: string | null
          instagram_url?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          level_cached?: string | null
          meet_greet_rate?: number | null
          message_rate?: number | null
          new_face?: boolean | null
          phone?: string | null
          photoshoot_full_day_rate?: number | null
          photoshoot_half_day_rate?: number | null
          photoshoot_hourly_rate?: number | null
          points_cached?: number | null
          preferred_payout_method?: string | null
          private_event_hourly_rate?: number | null
          profile_completion_percent?: number | null
          profile_photo_url?: string | null
          profile_views?: number | null
          promo_hourly_rate?: number | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          reliability_score?: number | null
          shoe_size?: string | null
          show_additional_info?: boolean | null
          show_booking_rates?: boolean | null
          show_instagram_stats?: boolean | null
          show_links?: boolean | null
          show_location?: boolean | null
          show_measurements?: boolean | null
          show_on_rates_page?: boolean | null
          show_social_media?: boolean | null
          snapchat_followers?: number | null
          snapchat_username?: string | null
          social_companion_hourly_rate?: number | null
          specialty?: string[] | null
          state?: string | null
          status?: string | null
          tiktok_followers?: number | null
          tiktok_username?: string | null
          travel_fee?: number | null
          twitch_username?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
          video_call_rate?: number | null
          voice_call_rate?: number | null
          waist?: string | null
          withheld_balance?: number | null
          x_username?: string | null
          youtube_username?: string | null
        }
        Update: {
          admin_rating?: number | null
          affiliate_code?: string | null
          affiliate_links?: Json | null
          allow_chat?: boolean | null
          allow_tips?: boolean | null
          allow_video_call?: boolean | null
          allow_voice_call?: boolean | null
          availability_status?: string | null
          bio?: string | null
          brand_ambassador_daily_rate?: number | null
          bust?: string | null
          city?: string | null
          claimed_at?: string | null
          coin_balance?: number | null
          college?: string | null
          country_code?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          digis_username?: string | null
          dob?: string | null
          dress_size?: string | null
          email?: string
          eye_color?: string | null
          first_name?: string | null
          focus_tags?: string[] | null
          form_data?: Json | null
          gem_balance?: number | null
          hair_color?: string | null
          height?: string | null
          hips?: string | null
          id?: string
          instagram_engagement_rate?: string | null
          instagram_followers?: number | null
          instagram_gender_split?: string | null
          instagram_name?: string | null
          instagram_primary_age?: string | null
          instagram_reach_30d?: string | null
          instagram_stats_updated_at?: string | null
          instagram_top_location?: string | null
          instagram_url?: string | null
          invite_sent_at?: string | null
          invite_token?: string | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          level_cached?: string | null
          meet_greet_rate?: number | null
          message_rate?: number | null
          new_face?: boolean | null
          phone?: string | null
          photoshoot_full_day_rate?: number | null
          photoshoot_half_day_rate?: number | null
          photoshoot_hourly_rate?: number | null
          points_cached?: number | null
          preferred_payout_method?: string | null
          private_event_hourly_rate?: number | null
          profile_completion_percent?: number | null
          profile_photo_url?: string | null
          profile_views?: number | null
          promo_hourly_rate?: number | null
          rate_max?: number | null
          rate_min?: number | null
          rate_type?: string | null
          reliability_score?: number | null
          shoe_size?: string | null
          show_additional_info?: boolean | null
          show_booking_rates?: boolean | null
          show_instagram_stats?: boolean | null
          show_links?: boolean | null
          show_location?: boolean | null
          show_measurements?: boolean | null
          show_on_rates_page?: boolean | null
          show_social_media?: boolean | null
          snapchat_followers?: number | null
          snapchat_username?: string | null
          social_companion_hourly_rate?: number | null
          specialty?: string[] | null
          state?: string | null
          status?: string | null
          tiktok_followers?: number | null
          tiktok_username?: string | null
          travel_fee?: number | null
          twitch_username?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed_at?: string | null
          video_call_rate?: number | null
          voice_call_rate?: number | null
          waist?: string | null
          withheld_balance?: number | null
          x_username?: string | null
          youtube_username?: string | null
        }
        Relationships: []
      }
      mystery_box_history: {
        Row: {
          box_tier: string
          created_at: string | null
          gems_won: number
          id: string
          model_id: string
        }
        Insert: {
          box_tier: string
          created_at?: string | null
          gems_won: number
          id?: string
          model_id: string
        }
        Update: {
          box_tier?: string
          created_at?: string | null
          gems_won?: number
          id?: string
          model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mystery_box_history_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          booking_request_email: boolean | null
          booking_request_push: boolean | null
          booking_request_sms: boolean | null
          created_at: string | null
          digest_frequency:
            | Database["public"]["Enums"]["digest_frequency"]
            | null
          digest_time: string | null
          digest_timezone: string | null
          do_not_disturb_end: string | null
          do_not_disturb_start: string | null
          earnings_milestone_email: boolean | null
          earnings_milestone_push: boolean | null
          email_verified: boolean | null
          id: string
          new_message_email: boolean | null
          new_message_push: boolean | null
          new_message_sms: boolean | null
          phone_number: string | null
          phone_verified: boolean | null
          profile_viewed_email: boolean | null
          profile_viewed_push: boolean | null
          tip_received_email: boolean | null
          tip_received_push: boolean | null
          updated_at: string | null
          user_id: string
          video_call_request_email: boolean | null
          video_call_request_push: boolean | null
          video_call_request_sms: boolean | null
        }
        Insert: {
          booking_request_email?: boolean | null
          booking_request_push?: boolean | null
          booking_request_sms?: boolean | null
          created_at?: string | null
          digest_frequency?:
            | Database["public"]["Enums"]["digest_frequency"]
            | null
          digest_time?: string | null
          digest_timezone?: string | null
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          earnings_milestone_email?: boolean | null
          earnings_milestone_push?: boolean | null
          email_verified?: boolean | null
          id?: string
          new_message_email?: boolean | null
          new_message_push?: boolean | null
          new_message_sms?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          profile_viewed_email?: boolean | null
          profile_viewed_push?: boolean | null
          tip_received_email?: boolean | null
          tip_received_push?: boolean | null
          updated_at?: string | null
          user_id: string
          video_call_request_email?: boolean | null
          video_call_request_push?: boolean | null
          video_call_request_sms?: boolean | null
        }
        Update: {
          booking_request_email?: boolean | null
          booking_request_push?: boolean | null
          booking_request_sms?: boolean | null
          created_at?: string | null
          digest_frequency?:
            | Database["public"]["Enums"]["digest_frequency"]
            | null
          digest_time?: string | null
          digest_timezone?: string | null
          do_not_disturb_end?: string | null
          do_not_disturb_start?: string | null
          earnings_milestone_email?: boolean | null
          earnings_milestone_push?: boolean | null
          email_verified?: boolean | null
          id?: string
          new_message_email?: boolean | null
          new_message_push?: boolean | null
          new_message_sms?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          profile_viewed_email?: boolean | null
          profile_viewed_push?: boolean | null
          tip_received_email?: boolean | null
          tip_received_push?: boolean | null
          updated_at?: string | null
          user_id?: string
          video_call_request_email?: boolean | null
          video_call_request_push?: boolean | null
          video_call_request_sms?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          related_booking_id: string | null
          related_call_id: string | null
          related_model_id: string | null
          related_user_id: string | null
          sent_via: Database["public"]["Enums"]["notification_channel"][] | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          related_booking_id?: string | null
          related_call_id?: string | null
          related_model_id?: string | null
          related_user_id?: string | null
          sent_via?:
            | Database["public"]["Enums"]["notification_channel"][]
            | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          related_booking_id?: string | null
          related_call_id?: string | null
          related_model_id?: string | null
          related_user_id?: string | null
          sent_via?:
            | Database["public"]["Enums"]["notification_channel"][]
            | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_call_id_fkey"
            columns: ["related_call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_model_id_fkey"
            columns: ["related_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_responses: {
        Row: {
          checked_in_at: string | null
          created_at: string
          id: string
          model_id: string
          no_show: boolean | null
          notes: string | null
          offer_id: string
          reminder_sent_at: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          model_id: string
          no_show?: boolean | null
          notes?: string | null
          offer_id: string
          reminder_sent_at?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          model_id?: string
          no_show?: boolean | null
          notes?: string | null
          offer_id?: string
          reminder_sent_at?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_responses_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_responses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          brand_id: string
          campaign_id: string
          compensation_amount: number | null
          compensation_description: string | null
          compensation_type: string
          created_at: string
          description: string | null
          event_date: string | null
          event_time: string | null
          id: string
          is_recurring: boolean | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          parent_offer_id: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          spots: number
          spots_filled: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          campaign_id: string
          compensation_amount?: number | null
          compensation_description?: string | null
          compensation_type?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          parent_offer_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          spots?: number
          spots_filled?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          compensation_amount?: number | null
          compensation_description?: string | null
          compensation_type?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          parent_offer_id?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          spots?: number
          spots_filled?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_list_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          created_at: string | null
          id: string
          page_path: string
          page_url: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_path: string
          page_url: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_path?: string
          page_url?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_hash: string | null
          model_id: string | null
          model_username: string | null
          os: string | null
          page_path: string
          page_type: string | null
          referrer: string | null
          screen_width: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          model_id?: string | null
          model_username?: string | null
          os?: string | null
          page_path: string
          page_type?: string | null
          referrer?: string | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          model_id?: string | null
          model_username?: string | null
          os?: string | null
          page_path?: string
          page_type?: string | null
          referrer?: string | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      payoneer_accounts: {
        Row: {
          can_receive_payments: boolean
          country: string
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          model_id: string
          payee_id: string
          registration_completed_at: string | null
          registration_link: string | null
          status: string
          updated_at: string
        }
        Insert: {
          can_receive_payments?: boolean
          country: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          model_id: string
          payee_id: string
          registration_completed_at?: string | null
          registration_link?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          can_receive_payments?: boolean
          country?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          model_id?: string
          payee_id?: string
          registration_completed_at?: string | null
          registration_link?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payoneer_accounts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      payoneer_payouts: {
        Row: {
          amount_usd: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          payee_id: string
          payoneer_completed_at: string | null
          payoneer_created_at: string | null
          payoneer_payout_id: string
          status: string
          updated_at: string
          withdrawal_request_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payee_id: string
          payoneer_completed_at?: string | null
          payoneer_created_at?: string | null
          payoneer_payout_id: string
          status?: string
          updated_at?: string
          withdrawal_request_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payee_id?: string
          payoneer_completed_at?: string | null
          payoneer_created_at?: string | null
          payoneer_payout_id?: string
          status?: string
          updated_at?: string
          withdrawal_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payoneer_payouts_withdrawal_request_id_fkey"
            columns: ["withdrawal_request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_statistics: {
        Row: {
          active_clients: number | null
          active_models: number | null
          avg_bookings_per_day: number | null
          avg_daily_revenue: number | null
          avg_messages_per_day: number | null
          avg_video_calls_per_day: number | null
          created_at: string | null
          date: string
          id: string
          median_revenue: number | null
          top_10_percent_revenue: number | null
          top_25_percent_revenue: number | null
          total_revenue: number | null
          total_transactions: number | null
          updated_at: string | null
        }
        Insert: {
          active_clients?: number | null
          active_models?: number | null
          avg_bookings_per_day?: number | null
          avg_daily_revenue?: number | null
          avg_messages_per_day?: number | null
          avg_video_calls_per_day?: number | null
          created_at?: string | null
          date: string
          id?: string
          median_revenue?: number | null
          top_10_percent_revenue?: number | null
          top_25_percent_revenue?: number | null
          total_revenue?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Update: {
          active_clients?: number | null
          active_models?: number | null
          avg_bookings_per_day?: number | null
          avg_daily_revenue?: number | null
          avg_messages_per_day?: number | null
          avg_video_calls_per_day?: number | null
          created_at?: string | null
          date?: string
          id?: string
          median_revenue?: number | null
          top_10_percent_revenue?: number | null
          top_25_percent_revenue?: number | null
          total_revenue?: number | null
          total_transactions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          model_id: string
          points: number
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_id: string
          points: number
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_photos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          model_id: string
          photo_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          model_id: string
          photo_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          model_id?: string
          photo_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_content: {
        Row: {
          coin_price: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          model_id: string
          preview_url: string | null
          title: string | null
          unlock_count: number | null
          updated_at: string | null
        }
        Insert: {
          coin_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          media_type: string
          media_url: string
          model_id: string
          preview_url?: string | null
          title?: string | null
          unlock_count?: number | null
          updated_at?: string | null
        }
        Update: {
          coin_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          model_id?: string
          preview_url?: string | null
          title?: string | null
          unlock_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_content_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_view_stats: {
        Row: {
          last_updated: string | null
          model_id: string
          total_views: number | null
          views_this_month: number | null
          views_this_week: number | null
          views_today: number | null
        }
        Insert: {
          last_updated?: string | null
          model_id: string
          total_views?: number | null
          views_this_month?: number | null
          views_this_week?: number | null
          views_today?: number | null
        }
        Update: {
          last_updated?: string | null
          model_id?: string
          total_views?: number | null
          views_this_month?: number | null
          views_this_week?: number | null
          views_today?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_view_stats_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          ip_address: string | null
          model_id: string
          referrer: string | null
          user_agent: string | null
          view_date: string
          view_timestamp: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          model_id: string
          referrer?: string | null
          user_agent?: string | null
          view_date?: string
          view_timestamp?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          model_id?: string
          referrer?: string | null
          user_agent?: string | null
          view_date?: string
          view_timestamp?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bust: string | null
          city: string | null
          created_at: string
          display_name: string | null
          dob: string | null
          dress_size: string | null
          email: string
          exa_coin_balance: number
          eye_color: string | null
          first_name: string | null
          free_stars_reset_date: string | null
          hair_color: string | null
          height: string | null
          hips: string | null
          id: string
          instagram_avatar: string | null
          instagram_followers: number | null
          instagram_name: string | null
          instagram_url: string | null
          is_banned: boolean | null
          is_model: boolean | null
          is_vip: boolean | null
          last_login: string | null
          last_name: string | null
          model_instagram: string | null
          pending_model_approval: boolean | null
          phone: string | null
          shoe_size: string | null
          state: string | null
          total_exa_coins_purchased: number
          total_spent: number
          video_average_rating: number | null
          video_calls_enabled: boolean | null
          video_is_online: boolean | null
          video_last_online_at: string | null
          video_max_duration_minutes: number | null
          video_min_duration_minutes: number | null
          video_stars_per_minute: number | null
          video_total_calls: number | null
          video_total_earnings_stars: number | null
          vip_expires_at: string | null
          waist: string | null
        }
        Insert: {
          bust?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          dress_size?: string | null
          email: string
          exa_coin_balance?: number
          eye_color?: string | null
          first_name?: string | null
          free_stars_reset_date?: string | null
          hair_color?: string | null
          height?: string | null
          hips?: string | null
          id: string
          instagram_avatar?: string | null
          instagram_followers?: number | null
          instagram_name?: string | null
          instagram_url?: string | null
          is_banned?: boolean | null
          is_model?: boolean | null
          is_vip?: boolean | null
          last_login?: string | null
          last_name?: string | null
          model_instagram?: string | null
          pending_model_approval?: boolean | null
          phone?: string | null
          shoe_size?: string | null
          state?: string | null
          total_exa_coins_purchased?: number
          total_spent?: number
          video_average_rating?: number | null
          video_calls_enabled?: boolean | null
          video_is_online?: boolean | null
          video_last_online_at?: string | null
          video_max_duration_minutes?: number | null
          video_min_duration_minutes?: number | null
          video_stars_per_minute?: number | null
          video_total_calls?: number | null
          video_total_earnings_stars?: number | null
          vip_expires_at?: string | null
          waist?: string | null
        }
        Update: {
          bust?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          dob?: string | null
          dress_size?: string | null
          email?: string
          exa_coin_balance?: number
          eye_color?: string | null
          first_name?: string | null
          free_stars_reset_date?: string | null
          hair_color?: string | null
          height?: string | null
          hips?: string | null
          id?: string
          instagram_avatar?: string | null
          instagram_followers?: number | null
          instagram_name?: string | null
          instagram_url?: string | null
          is_banned?: boolean | null
          is_model?: boolean | null
          is_vip?: boolean | null
          last_login?: string | null
          last_name?: string | null
          model_instagram?: string | null
          pending_model_approval?: boolean | null
          phone?: string | null
          shoe_size?: string | null
          state?: string | null
          total_exa_coins_purchased?: number
          total_spent?: number
          video_average_rating?: number | null
          video_calls_enabled?: boolean | null
          video_is_online?: boolean | null
          video_last_online_at?: string | null
          video_max_duration_minutes?: number | null
          video_min_duration_minutes?: number | null
          video_stars_per_minute?: number | null
          video_total_calls?: number | null
          video_total_earnings_stars?: number | null
          vip_expires_at?: string | null
          waist?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          points_awarded: boolean | null
          referred_id: string
          referrer_id: string
          status: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_awarded?: boolean | null
          referred_id: string
          referrer_id: string
          status?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points_awarded?: boolean | null
          referred_id?: string
          referrer_id?: string
          status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_usernames: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          reason: string
          reserved_for: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reason: string
          reserved_for?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reason?: string
          reserved_for?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserved_usernames_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserved_usernames_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      runway_rush_scores: {
        Row: {
          created_at: string | null
          distance: number
          gems_collected: number
          id: string
          model_id: string
          score: number
        }
        Insert: {
          created_at?: string | null
          distance?: number
          gems_collected?: number
          id?: string
          model_id: string
          score: number
        }
        Update: {
          created_at?: string | null
          distance?: number
          gems_collected?: number
          id?: string
          model_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "runway_rush_scores_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_affiliate_codes: {
        Row: {
          click_count: number | null
          code: string
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          model_id: string
          order_count: number | null
          total_earnings: number | null
        }
        Insert: {
          click_count?: number | null
          code: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          model_id: string
          order_count?: number | null
          total_earnings?: number | null
        }
        Update: {
          click_count?: number | null
          code?: string
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          model_id?: string
          order_count?: number | null
          total_earnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_affiliate_codes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_affiliate_earnings: {
        Row: {
          available_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          model_id: string
          order_id: string
          order_item_id: string | null
          order_total: number
          paid_at: string | null
          status: string | null
        }
        Insert: {
          available_at?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          model_id: string
          order_id: string
          order_item_id?: string | null
          order_total: number
          paid_at?: string | null
          status?: string | null
        }
        Update: {
          available_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          model_id?: string
          order_id?: string
          order_item_id?: string | null
          order_total?: number
          paid_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_affiliate_earnings_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_affiliate_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_affiliate_earnings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "shop_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_brand_payouts: {
        Row: {
          affiliate_commission: number
          brand_id: string
          created_at: string | null
          gross_sales: number
          id: string
          net_payout: number
          order_count: number
          order_item_ids: string[]
          our_commission: number
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string | null
        }
        Insert: {
          affiliate_commission: number
          brand_id: string
          created_at?: string | null
          gross_sales: number
          id?: string
          net_payout: number
          order_count: number
          order_item_ids: string[]
          our_commission: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string | null
        }
        Update: {
          affiliate_commission?: number
          brand_id?: string
          created_at?: string | null
          gross_sales?: number
          id?: string
          net_payout?: number
          order_count?: number
          order_item_ids?: string[]
          our_commission?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_brand_payouts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "shop_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_brands: {
        Row: {
          avg_ship_days: number | null
          commission_rate: number | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          model_commission_rate: number | null
          name: string
          payout_email: string | null
          ships_internationally: boolean | null
          slug: string
          status: string | null
          stripe_account_id: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avg_ship_days?: number | null
          commission_rate?: number | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          model_commission_rate?: number | null
          name: string
          payout_email?: string | null
          ships_internationally?: boolean | null
          slug: string
          status?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avg_ship_days?: number | null
          commission_rate?: number | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          model_commission_rate?: number | null
          name?: string
          payout_email?: string | null
          ships_internationally?: boolean | null
          slug?: string
          status?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      shop_cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          quantity: number
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          quantity?: number
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shop_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_carts: {
        Row: {
          affiliate_code: string | null
          affiliate_model_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_model_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_model_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_carts_affiliate_model_id_fkey"
            columns: ["affiliate_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_model_products: {
        Row: {
          created_at: string | null
          id: string
          is_favorite: boolean | null
          model_id: string
          photo_urls: string[] | null
          product_id: string
          worn_at_event: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          model_id: string
          photo_urls?: string[] | null
          product_id: string
          worn_at_event?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          model_id?: string
          photo_urls?: string[] | null
          product_id?: string
          worn_at_event?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_model_products_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_model_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          brand_id: string
          created_at: string | null
          delivered_at: string | null
          fulfillment_status: string | null
          id: string
          line_total: number
          order_id: string
          product_name: string
          quantity: number
          return_reason: string | null
          return_status: string | null
          shipped_at: string | null
          store_credit_issued: number | null
          tracking_carrier: string | null
          tracking_number: string | null
          unit_price: number
          updated_at: string | null
          variant_color: string | null
          variant_id: string
          variant_size: string
          variant_sku: string
          wholesale_price: number
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          delivered_at?: string | null
          fulfillment_status?: string | null
          id?: string
          line_total: number
          order_id: string
          product_name: string
          quantity: number
          return_reason?: string | null
          return_status?: string | null
          shipped_at?: string | null
          store_credit_issued?: number | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          unit_price: number
          updated_at?: string | null
          variant_color?: string | null
          variant_id: string
          variant_size: string
          variant_sku: string
          wholesale_price: number
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          delivered_at?: string | null
          fulfillment_status?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_name?: string
          quantity?: number
          return_reason?: string | null
          return_status?: string | null
          shipped_at?: string | null
          store_credit_issued?: number | null
          tracking_carrier?: string | null
          tracking_number?: string | null
          unit_price?: number
          updated_at?: string | null
          variant_color?: string | null
          variant_id?: string
          variant_size?: string
          variant_sku?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "shop_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          affiliate_code: string | null
          affiliate_commission: number | null
          affiliate_model_id: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_same_as_shipping: boolean | null
          billing_state: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          internal_notes: string | null
          order_number: string
          paid_at: string | null
          payment_status: string | null
          shipping_address_line1: string
          shipping_address_line2: string | null
          shipping_city: string
          shipping_cost: number | null
          shipping_country: string
          shipping_postal_code: string
          shipping_state: string
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          affiliate_model_id?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_same_as_shipping?: boolean | null
          billing_state?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_number: string
          paid_at?: string | null
          payment_status?: string | null
          shipping_address_line1: string
          shipping_address_line2?: string | null
          shipping_city: string
          shipping_cost?: number | null
          shipping_country?: string
          shipping_postal_code: string
          shipping_state: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax_amount?: number | null
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          affiliate_model_id?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_same_as_shipping?: boolean | null
          billing_state?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_number?: string
          paid_at?: string | null
          payment_status?: string | null
          shipping_address_line1?: string
          shipping_address_line2?: string | null
          shipping_city?: string
          shipping_cost?: number | null
          shipping_country?: string
          shipping_postal_code?: string
          shipping_state?: string
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_affiliate_model_id_fkey"
            columns: ["affiliate_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_variants: {
        Row: {
          color: string | null
          color_hex: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          low_stock_threshold: number | null
          price_override: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          price_override?: number | null
          product_id: string
          size: string
          sku: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          price_override?: number | null
          product_id?: string
          size?: string
          sku?: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          allow_backorder: boolean | null
          brand_id: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          retail_price: number
          slug: string
          total_sold: number | null
          track_inventory: boolean | null
          updated_at: string | null
          view_count: number | null
          wholesale_price: number
        }
        Insert: {
          allow_backorder?: boolean | null
          brand_id: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          retail_price: number
          slug: string
          total_sold?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
          view_count?: number | null
          wholesale_price: number
        }
        Update: {
          allow_backorder?: boolean | null
          brand_id?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          retail_price?: number
          slug?: string
          total_sold?: number | null
          track_inventory?: boolean | null
          updated_at?: string | null
          view_count?: number | null
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "shop_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_store_credits: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          original_amount: number
          reason: string | null
          remaining_amount: number
          source_order_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_amount: number
          reason?: string | null
          remaining_amount: number
          source_order_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_amount?: number
          reason?: string | null
          remaining_amount?: number
          source_order_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_store_credits_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: Database["public"]["Enums"]["tag_category"]
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["tag_category"]
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["tag_category"]
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ticket_purchases: {
        Row: {
          affiliate_click_id: string | null
          affiliate_commission_id: string | null
          affiliate_model_id: string | null
          buyer_email: string
          buyer_name: string | null
          buyer_phone: string | null
          completed_at: string | null
          created_at: string | null
          event_id: string
          id: string
          quantity: number
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          ticket_tier_id: string
          total_price_cents: number
          unit_price_cents: number
          updated_at: string | null
        }
        Insert: {
          affiliate_click_id?: string | null
          affiliate_commission_id?: string | null
          affiliate_model_id?: string | null
          buyer_email: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          quantity?: number
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_tier_id: string
          total_price_cents: number
          unit_price_cents: number
          updated_at?: string | null
        }
        Update: {
          affiliate_click_id?: string | null
          affiliate_commission_id?: string | null
          affiliate_model_id?: string | null
          buyer_email?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          quantity?: number
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          ticket_tier_id?: string
          total_price_cents?: number
          unit_price_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_purchases_affiliate_click_id_fkey"
            columns: ["affiliate_click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_affiliate_commission_id_fkey"
            columns: ["affiliate_commission_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_affiliate_model_id_fkey"
            columns: ["affiliate_model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_purchases_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
          quantity_available: number | null
          quantity_sold: number | null
          sale_ends_at: string | null
          sale_starts_at: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
          quantity_available?: number | null
          quantity_sold?: number | null
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
          quantity_available?: number | null
          quantity_sold?: number | null
          sale_ends_at?: string | null
          sale_starts_at?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      top_model_leaderboard: {
        Row: {
          last_updated: string | null
          model_id: string
          today_points: number | null
          total_boosts: number | null
          total_likes: number | null
          total_points: number | null
          week_points: number | null
        }
        Insert: {
          last_updated?: string | null
          model_id: string
          today_points?: number | null
          total_boosts?: number | null
          total_likes?: number | null
          total_points?: number | null
          week_points?: number | null
        }
        Update: {
          last_updated?: string | null
          model_id?: string
          today_points?: number | null
          total_boosts?: number | null
          total_likes?: number | null
          total_points?: number | null
          week_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "top_model_leaderboard_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      top_model_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          fingerprint: string | null
          id: string
          models_swiped: string[] | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          fingerprint?: string | null
          id?: string
          models_swiped?: string[] | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          fingerprint?: string | null
          id?: string
          models_swiped?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      top_model_votes: {
        Row: {
          coins_spent: number | null
          created_at: string | null
          id: string
          is_boosted: boolean | null
          is_revealed: boolean | null
          model_id: string
          points: number
          vote_type: string
          voter_fingerprint: string | null
          voter_id: string | null
        }
        Insert: {
          coins_spent?: number | null
          created_at?: string | null
          id?: string
          is_boosted?: boolean | null
          is_revealed?: boolean | null
          model_id: string
          points?: number
          vote_type: string
          voter_fingerprint?: string | null
          voter_id?: string | null
        }
        Update: {
          coins_spent?: number | null
          created_at?: string | null
          id?: string
          is_boosted?: boolean | null
          is_revealed?: boolean | null
          model_id?: string
          points?: number
          vote_type?: string
          voter_fingerprint?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_model_votes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top_model_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top_model_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          last_voted_at: string
          model_id: string | null
          model_instagram: string
          stars_given: number
          user_id: string
        }
        Insert: {
          last_voted_at?: string
          model_id?: string | null
          model_instagram: string
          stars_given?: number
          user_id: string
        }
        Update: {
          last_voted_at?: string
          model_id?: string | null
          model_instagram?: string
          stars_given?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_events: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          call_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          call_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          call_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_extensions: {
        Row: {
          call_id: string
          created_at: string
          id: string
          minutes_added: number
          new_end_time: string
          previous_end_time: string
          stars_charged: number
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          minutes_added: number
          new_end_time: string
          previous_end_time: string
          stars_charged: number
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          minutes_added?: number
          new_end_time?: string
          previous_end_time?: string
          stars_charged?: number
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_extensions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_extensions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_extensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_sessions: {
        Row: {
          call_type: string | null
          coins_charged: number | null
          conversation_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string
          recipient_id: string
          room_name: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          call_type?: string | null
          coins_charged?: number | null
          conversation_id: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by: string
          recipient_id: string
          room_name: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          call_type?: string | null
          coins_charged?: number | null
          conversation_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string
          recipient_id?: string
          room_name?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_model_actors"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          accepted_at: string | null
          agora_app_id: string | null
          channel_name: string | null
          connection_quality_model: string | null
          connection_quality_user: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          extensions_count: number
          extensions_total_minutes: number
          extensions_total_stars: number
          id: string
          metadata: Json | null
          minutes_purchased: number
          model_earnings_stars: number | null
          model_feedback: string | null
          model_id: string | null
          model_instagram: string
          model_rating: number | null
          model_token_encrypted: string | null
          payment_transaction_id: string | null
          platform_fee_stars: number | null
          recording_enabled: boolean | null
          recording_url: string | null
          refund_transaction_id: string | null
          scheduled_at: string | null
          scheduled_end_at: string
          stars_per_minute: number
          started_at: string | null
          status: string
          total_stars_paid: number
          updated_at: string
          user_feedback: string | null
          user_id: string
          user_rating: number | null
          user_token_encrypted: string | null
        }
        Insert: {
          accepted_at?: string | null
          agora_app_id?: string | null
          channel_name?: string | null
          connection_quality_model?: string | null
          connection_quality_user?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          extensions_count?: number
          extensions_total_minutes?: number
          extensions_total_stars?: number
          id?: string
          metadata?: Json | null
          minutes_purchased: number
          model_earnings_stars?: number | null
          model_feedback?: string | null
          model_id?: string | null
          model_instagram: string
          model_rating?: number | null
          model_token_encrypted?: string | null
          payment_transaction_id?: string | null
          platform_fee_stars?: number | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          refund_transaction_id?: string | null
          scheduled_at?: string | null
          scheduled_end_at: string
          stars_per_minute?: number
          started_at?: string | null
          status?: string
          total_stars_paid: number
          updated_at?: string
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
          user_token_encrypted?: string | null
        }
        Update: {
          accepted_at?: string | null
          agora_app_id?: string | null
          channel_name?: string | null
          connection_quality_model?: string | null
          connection_quality_user?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          extensions_count?: number
          extensions_total_minutes?: number
          extensions_total_stars?: number
          id?: string
          metadata?: Json | null
          minutes_purchased?: number
          model_earnings_stars?: number | null
          model_feedback?: string | null
          model_id?: string | null
          model_instagram?: string
          model_rating?: number | null
          model_token_encrypted?: string | null
          payment_transaction_id?: string | null
          platform_fee_stars?: number | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          refund_transaction_id?: string | null
          scheduled_at?: string | null
          scheduled_end_at?: string
          stars_per_minute?: number
          started_at?: string | null
          status?: string
          total_stars_paid?: number
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
          user_token_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_refund_transaction_id_fkey"
            columns: ["refund_transaction_id"]
            isOneToOne: false
            referencedRelation: "exa_coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          bank_account_id: string | null
          coins: number
          completed_at: string | null
          external_reference: string | null
          failure_reason: string | null
          id: string
          model_id: string
          payoneer_account_id: string | null
          payoneer_payout_id: string | null
          payout_method: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string
          updated_at: string | null
          usd_amount: number
        }
        Insert: {
          admin_notes?: string | null
          bank_account_id?: string | null
          coins: number
          completed_at?: string | null
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          model_id: string
          payoneer_account_id?: string | null
          payoneer_payout_id?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          usd_amount: number
        }
        Update: {
          admin_notes?: string | null
          bank_account_id?: string | null
          coins?: number
          completed_at?: string | null
          external_reference?: string | null
          failure_reason?: string | null
          id?: string
          model_id?: string
          payoneer_account_id?: string | null
          payoneer_payout_id?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          updated_at?: string | null
          usd_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_payoneer_account_id_fkey"
            columns: ["payoneer_account_id"]
            isOneToOne: false
            referencedRelation: "payoneer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_registrations: {
        Row: {
          buyer_email: string
          buyer_name: string | null
          buyer_phone: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          quantity: number
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_price_cents: number
          unit_price_cents: number
          updated_at: string | null
          workshop_id: string
        }
        Insert: {
          buyer_email: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_price_cents: number
          unit_price_cents: number
          updated_at?: string | null
          workshop_id: string
        }
        Update: {
          buyer_email?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_price_cents?: number
          unit_price_cents?: number
          updated_at?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          event_id: string | null
          highlights: string[] | null
          id: string
          instructors: string[] | null
          is_featured: boolean | null
          location_address: string | null
          location_city: string | null
          location_name: string | null
          location_state: string | null
          meta_description: string | null
          meta_title: string | null
          original_price_cents: number | null
          price_cents: number
          slug: string
          spots_available: number | null
          spots_sold: number | null
          start_time: string | null
          status: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
          what_to_bring: string[] | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          event_id?: string | null
          highlights?: string[] | null
          id?: string
          instructors?: string[] | null
          is_featured?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          meta_description?: string | null
          meta_title?: string | null
          original_price_cents?: number | null
          price_cents: number
          slug: string
          spots_available?: number | null
          spots_sold?: number | null
          start_time?: string | null
          status?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          what_to_bring?: string[] | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          event_id?: string | null
          highlights?: string[] | null
          id?: string
          instructors?: string[] | null
          is_featured?: boolean | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          location_state?: string | null
          meta_description?: string | null
          meta_title?: string | null
          original_price_cents?: number | null
          price_cents?: number
          slug?: string
          spots_available?: number | null
          spots_sold?: number | null
          start_time?: string | null
          status?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          what_to_bring?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "workshops_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_model_actors: {
        Row: {
          id: string | null
          type: string | null
        }
        Insert: {
          id?: string | null
          type?: string | null
        }
        Update: {
          id?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_coins: {
        Args: {
          p_action: string
          p_actor_id: string
          p_amount: number
          p_metadata?: Json
        }
        Returns: boolean
      }
      add_gems_to_model: {
        Args: { p_gems: number; p_model_id: string }
        Returns: number
      }
      add_tag_to_model: {
        Args: { p_model_id: string; p_tag_id: string }
        Returns: boolean
      }
      award_points: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_model_id: string
          p_points: number
        }
        Returns: string
      }
      block_user: {
        Args: { p_blocked_id: string; p_blocker_id: string; p_reason?: string }
        Returns: Json
      }
      calculate_model_reliability_score: {
        Args: { p_model_id: string }
        Returns: number
      }
      calculate_profile_completion: {
        Args: { model_id: string }
        Returns: number
      }
      calculate_video_call_earnings: {
        Args: { p_total_stars: number }
        Returns: {
          model_earnings: number
          platform_fee: number
        }[]
      }
      cancel_withdrawal: { Args: { p_withdrawal_id: string }; Returns: boolean }
      cancel_withdrawal_request: {
        Args: { p_user_id: string; p_withdrawal_id: string }
        Returns: boolean
      }
      check_media_access: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: Json
      }
      claim_instagram_profile: {
        Args: { p_email: string; p_instagram_name: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_media_direct: { Args: never; Returns: undefined }
      cleanup_old_page_views: { Args: never; Returns: undefined }
      cleanup_rate_limits: {
        Args: { p_older_than_hours?: number }
        Returns: number
      }
      complete_withdrawal: {
        Args: { p_withdrawal_id: string }
        Returns: boolean
      }
      count_unique_visitors: { Args: { start_date: string }; Returns: number }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_related_booking_id?: string
          p_related_call_id?: string
          p_related_model_id?: string
          p_related_user_id?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      create_payoneer_withdrawal_request: {
        Args: {
          p_coins: number
          p_model_id: string
          p_payoneer_account_id: string
        }
        Returns: string
      }
      create_withdrawal_request: {
        Args: {
          p_bank_account_id?: string
          p_coins: number
          p_model_id: string
        }
        Returns: string
      }
      credit_exa_coins: {
        Args: {
          p_exa_coins: number
          p_metadata?: Json
          p_reason: Database["public"]["Enums"]["exa_coin_transaction_reason"]
          p_stripe_payment_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      credit_stars: {
        Args: {
          p_metadata?: Json
          p_reason: string
          p_stars: number
          p_stripe_payment_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      decrement_gig_spots_filled: {
        Args: { gig_id: string }
        Returns: undefined
      }
      decrement_offer_spots_filled: {
        Args: { p_offer_id: string }
        Returns: undefined
      }
      deduct_coins: {
        Args: {
          p_action: string
          p_actor_id: string
          p_amount: number
          p_message_id?: string
          p_metadata?: Json
        }
        Returns: boolean
      }
      generate_affiliate_code: { Args: { p_username: string }; Returns: string }
      generate_booking_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      get_active_spotlights: {
        Args: { p_model_id?: string; p_model_instagram?: string }
        Returns: {
          duration: string
          expires_at: string
          model_id: string
          model_instagram: string
          spotlight_id: string
          stars_paid: number
          starts_at: string
          user_id: string
        }[]
      }
      get_actor_id: { Args: never; Returns: string }
      get_actor_type: { Args: never; Returns: string }
      get_alltime_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          first_name: string
          last_name: string
          level_cached: string
          model_id: string
          points_cached: number
          profile_photo_url: string
          state: string
          username: string
        }[]
      }
      get_blocked_users: {
        Args: { p_actor_id: string }
        Returns: {
          block_id: string
          blocked_actor_id: string
          blocked_at: string
          reason: string
        }[]
      }
      get_browser_breakdown: {
        Args: { start_date: string }
        Returns: {
          browser: string
          count: number
        }[]
      }
      get_coin_balance: { Args: { p_actor_id: string }; Returns: number }
      get_country_breakdown: {
        Args: { limit_count: number; start_date: string }
        Returns: {
          count: number
          country: string
        }[]
      }
      get_current_actor_id: { Args: never; Returns: string }
      get_current_user_model_id: { Args: never; Returns: string }
      get_daily_views: {
        Args: { start_date: string }
        Returns: {
          date: string
          views: number
          visitors: number
        }[]
      }
      get_device_breakdown: {
        Args: { start_date: string }
        Returns: {
          count: number
          device_type: string
        }[]
      }
      get_exa_coin_balance: { Args: { p_user_id: string }; Returns: number }
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          instagram_name: string
          rank: number
          star_count: number
        }[]
      }
      get_message_cost: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: number
      }
      get_model_performance_comparison: {
        Args: { p_days?: number; p_model_id: string }
        Returns: Json
      }
      get_model_revenue_breakdown: {
        Args: { p_end_date?: string; p_model_id: string; p_start_date?: string }
        Returns: {
          bookings: number
          date: string
          messages: number
          tips: number
          total: number
          video_calls: number
        }[]
      }
      get_model_tags: {
        Args: { p_model_id: string }
        Returns: {
          tag_category: Database["public"]["Enums"]["tag_category"]
          tag_color: string
          tag_icon: string
          tag_id: string
          tag_name: string
          tag_slug: string
        }[]
      }
      get_model_top_clients: {
        Args: { p_limit?: number; p_model_id: string }
        Returns: {
          booking_count: number
          client_id: string
          client_name: string
          last_interaction: string
          message_count: number
          total_spent: number
          video_call_count: number
        }[]
      }
      get_or_create_email_preferences: {
        Args: { p_email: string; p_user_id?: string }
        Returns: {
          email: string
          id: string
          marketing_emails: boolean
          notification_emails: boolean
          unsubscribe_token: string
          unsubscribed_all: boolean
        }[]
      }
      get_or_create_top_model_session: {
        Args: { p_fingerprint: string; p_user_id: string }
        Returns: Json
      }
      get_pending_withdrawals: { Args: { p_user_id: string }; Returns: number }
      get_popular_tags: {
        Args: {
          p_category?: Database["public"]["Enums"]["tag_category"]
          p_limit?: number
        }
        Returns: {
          tag_category: Database["public"]["Enums"]["tag_category"]
          tag_color: string
          tag_id: string
          tag_name: string
          tag_slug: string
          usage_count: number
        }[]
      }
      get_profile_view_rank: {
        Args: { p_model_id: string }
        Returns: {
          rank: number
          total_models: number
        }[]
      }
      get_star_balance: { Args: { p_user_id: string }; Returns: number }
      get_ticket_availability: { Args: { tier_id: string }; Returns: number }
      get_top_model_profiles: {
        Args: { limit_count: number; start_date: string }
        Returns: {
          count: number
          model_username: string
        }[]
      }
      get_top_pages: {
        Args: { limit_count: number; start_date: string }
        Returns: {
          count: number
          page_path: string
          page_type: string
        }[]
      }
      get_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_unread_message_count: { Args: { p_user_id: string }; Returns: number }
      get_weekly_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          first_name: string
          last_name: string
          level_cached: string
          model_id: string
          points_cached: number
          profile_photo_url: string
          state: string
          username: string
          weekly_points: number
        }[]
      }
      has_blocked: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: boolean
      }
      hold_coins_for_booking: {
        Args: { p_actor_id: string; p_amount: number; p_booking_id: string }
        Returns: Json
      }
      increment_gig_spots_filled: {
        Args: { gig_id: string }
        Returns: undefined
      }
      increment_link_clicks: { Args: { link_id: string }; Returns: undefined }
      increment_offer_spots_filled: {
        Args: { p_offer_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked: {
        Args: { p_actor_id_1: string; p_actor_id_2: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_email_unsubscribed: {
        Args: { p_email: string; p_email_type?: string }
        Returns: boolean
      }
      is_model_available_now: { Args: { p_model_id: string }; Returns: boolean }
      is_model_to_model: {
        Args: { p_recipient_id: string; p_sender_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_user_id: string
          p_ip_address?: unknown
          p_new_values?: Json
          p_old_values?: Json
          p_target_id?: string
          p_target_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_message_read: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_model_swiped: {
        Args: {
          p_model_id: string
          p_session_id: string
          p_total_models: number
        }
        Returns: Json
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      purchase_model_spotlight: {
        Args: {
          p_duration: string
          p_model_id?: string
          p_model_instagram?: string
          p_stars_paid: number
          p_user_id: string
        }
        Returns: Json
      }
      record_media_view: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: Json
      }
      record_profile_view: {
        Args: {
          p_ip_address?: string
          p_model_id: string
          p_referrer?: string
          p_user_agent?: string
          p_viewer_id?: string
        }
        Returns: boolean
      }
      record_top_model_vote: {
        Args: {
          p_coins_spent: number
          p_is_boosted: boolean
          p_is_revealed: boolean
          p_model_id: string
          p_points: number
          p_vote_type: string
          p_voter_fingerprint: string
          p_voter_id: string
        }
        Returns: Json
      }
      refund_escrow: { Args: { p_escrow_id: string }; Returns: Json }
      release_escrow_to_model: {
        Args: { p_escrow_id: string; p_model_id: string }
        Returns: Json
      }
      remove_tag_from_model: {
        Args: { p_model_id: string; p_tag_id: string }
        Returns: boolean
      }
      reset_daily_top_model_leaderboard: { Args: never; Returns: undefined }
      reset_weekly_free_stars: { Args: never; Returns: number }
      reset_weekly_top_model_leaderboard: { Args: never; Returns: undefined }
      search_models_by_tags: {
        Args: {
          p_limit?: number
          p_match_all?: boolean
          p_offset?: number
          p_tag_ids: string[]
        }
        Returns: {
          display_name: string
          instagram_name: string
          location: string
          matching_tags: number
          model_id: string
        }[]
      }
      send_message: {
        Args: {
          p_content: string
          p_model_instagram: string
          p_sender_id: string
          p_thread_id?: string
        }
        Returns: Json
      }
      send_message_with_coins: {
        Args: {
          p_coin_amount?: number
          p_content: string
          p_conversation_id: string
          p_media_type?: string
          p_media_url?: string
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      send_tip: {
        Args: {
          p_amount: number
          p_recipient_model_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_exa_coins: {
        Args: {
          p_exa_coins: number
          p_metadata?: Json
          p_model_instagram?: string
          p_reason: Database["public"]["Enums"]["exa_coin_transaction_reason"]
          p_recipient_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      spend_stars: {
        Args: {
          p_metadata?: Json
          p_model_instagram?: string
          p_reason: string
          p_recipient_id?: string
          p_stars: number
          p_user_id: string
        }
        Returns: Json
      }
      track_model_interaction: {
        Args: {
          p_amount?: number
          p_client_id: string
          p_model_id: string
          p_type: string
        }
        Returns: undefined
      }
      transfer_coins: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      unblock_user: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: Json
      }
      unlock_content: {
        Args: { p_buyer_id: string; p_content_id: string }
        Returns: Json
      }
      unlock_media: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: Json
      }
      unsubscribe_email: {
        Args: { p_token: string; p_unsubscribe_all?: boolean }
        Returns: Json
      }
      update_display_name: {
        Args: { p_display_name: string; p_user_id: string }
        Returns: Json
      }
      update_model_profile: {
        Args: {
          p_bust?: string
          p_city?: string
          p_dob?: string
          p_dress_size?: string
          p_eye_color?: string
          p_first_name?: string
          p_hair_color?: string
          p_height?: string
          p_hips?: string
          p_instagram_url?: string
          p_last_name?: string
          p_phone?: string
          p_shoe_size?: string
          p_state?: string
          p_user_id: string
          p_waist?: string
        }
        Returns: Json
      }
      update_profile_view_stats: {
        Args: { p_model_id: string }
        Returns: undefined
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "approved"
        | "paid"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "accepted"
        | "declined"
        | "counter"
        | "no_show"
      booking_type:
        | "photo_shoot"
        | "video_content"
        | "fashion_show"
        | "event_appearance"
      digest_frequency: "immediate" | "daily" | "weekly" | "never"
      event_status: "draft" | "published" | "cancelled" | "completed"
      event_type:
        | "fashion_show"
        | "runway_event"
        | "casting_call"
        | "photo_shoot"
        | "video_shoot"
        | "brand_activation"
        | "networking_event"
        | "workshop"
        | "competition"
        | "other"
      exa_coin_transaction_reason:
        | "purchase"
        | "signup_bonus"
        | "free_weekly"
        | "daily_bonus"
        | "vote"
        | "message"
        | "tip"
        | "booking"
        | "booking_earned"
        | "platform_fee"
        | "refund"
        | "adjustment"
        | "video_call"
        | "video_call_earnings"
        | "video_call_refund"
      location_type: "in_person" | "virtual" | "hybrid"
      notification_channel: "in_app" | "email" | "push" | "sms"
      notification_type:
        | "new_message"
        | "message_reply"
        | "booking_request"
        | "booking_accepted"
        | "booking_declined"
        | "booking_completed"
        | "video_call_request"
        | "video_call_accepted"
        | "video_call_declined"
        | "video_call_started"
        | "video_call_ended"
        | "tip_received"
        | "earnings_milestone"
        | "coin_purchase_confirmed"
        | "profile_viewed"
        | "model_approved"
        | "model_rejected"
        | "new_follower"
        | "system_announcement"
      payout_method_type: "bank" | "payoneer" | "stripe_connect"
      rate_type: "hourly" | "half_day" | "full_day" | "per_event" | "custom"
      tag_category:
        | "specialty"
        | "skill"
        | "industry"
        | "attribute"
        | "availability"
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
      booking_status: [
        "pending",
        "approved",
        "paid",
        "confirmed",
        "completed",
        "cancelled",
        "accepted",
        "declined",
        "counter",
        "no_show",
      ],
      booking_type: [
        "photo_shoot",
        "video_content",
        "fashion_show",
        "event_appearance",
      ],
      digest_frequency: ["immediate", "daily", "weekly", "never"],
      event_status: ["draft", "published", "cancelled", "completed"],
      event_type: [
        "fashion_show",
        "runway_event",
        "casting_call",
        "photo_shoot",
        "video_shoot",
        "brand_activation",
        "networking_event",
        "workshop",
        "competition",
        "other",
      ],
      exa_coin_transaction_reason: [
        "purchase",
        "signup_bonus",
        "free_weekly",
        "daily_bonus",
        "vote",
        "message",
        "tip",
        "booking",
        "booking_earned",
        "platform_fee",
        "refund",
        "adjustment",
        "video_call",
        "video_call_earnings",
        "video_call_refund",
      ],
      location_type: ["in_person", "virtual", "hybrid"],
      notification_channel: ["in_app", "email", "push", "sms"],
      notification_type: [
        "new_message",
        "message_reply",
        "booking_request",
        "booking_accepted",
        "booking_declined",
        "booking_completed",
        "video_call_request",
        "video_call_accepted",
        "video_call_declined",
        "video_call_started",
        "video_call_ended",
        "tip_received",
        "earnings_milestone",
        "coin_purchase_confirmed",
        "profile_viewed",
        "model_approved",
        "model_rejected",
        "new_follower",
        "system_announcement",
      ],
      payout_method_type: ["bank", "payoneer", "stripe_connect"],
      rate_type: ["hourly", "half_day", "full_day", "per_event", "custom"],
      tag_category: [
        "specialty",
        "skill",
        "industry",
        "attribute",
        "availability",
      ],
    },
  },
} as const

// Type aliases for common table rows
export type Actor = Database['public']['Tables']['actors']['Row']
export type Model = Database['public']['Tables']['models']['Row']
export type Fan = Database['public']['Tables']['fans']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type MediaAsset = Database['public']['Tables']['media_assets']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type Gig = Database['public']['Tables']['gigs']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Workshop = Database['public']['Tables']['workshops']['Row']
export type AIGeneration = Database['public']['Tables']['ai_generations']['Row']
export type AISavedPhoto = Database['public']['Tables']['ai_saved_photos']['Row']
