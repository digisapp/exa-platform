export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ActorType = 'model' | 'brand' | 'admin' | 'fan'
export type ModelLevel = 'rising' | 'verified' | 'pro' | 'elite'
export type Availability = 'available' | 'busy' | 'not_available'
export type GigType = 'show' | 'travel' | 'campaign' | 'content' | 'hosting' | 'fun' | 'other'
export type GigStatus = 'draft' | 'open' | 'closed' | 'completed' | 'cancelled'
// Backwards compatibility aliases
export type OpportunityType = GigType
export type OpportunityStatus = GigStatus
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'waitlist'
export type CompensationType = 'paid' | 'tfp' | 'perks' | 'exposure'
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type BadgeType = 'achievement' | 'event'
export type AffiliateCommissionStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      actors: {
        Row: {
          id: string
          user_id: string
          type: ActorType
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: ActorType
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: ActorType
          created_at?: string
        }
      }
      models: {
        Row: {
          id: string
          username: string
          email: string | null
          first_name: string | null
          last_name: string | null
          bio: string | null
          city: string | null
          state: string | null
          height: string | null
          bust: string | null
          waist: string | null
          hips: string | null
          hair_color: string | null
          eye_color: string | null
          dress_size: string | null
          shoe_size: string | null
          instagram_name: string | null
          instagram_followers: number
          instagram_url: string | null
          tiktok_username: string | null
          tiktok_followers: number
          snapchat_username: string | null
          snapchat_followers: number
          x_username: string | null
          youtube_username: string | null
          twitch_username: string | null
          digis_username: string | null
          affiliate_links: Json
          is_approved: boolean
          is_featured: boolean
          is_verified: boolean
          availability_status: string | null
          show_measurements: boolean
          show_location: boolean
          show_social_media: boolean
          profile_photo_url: string | null
          coin_balance: number
          profile_views: number
          points_cached: number
          level_cached: ModelLevel
          video_call_rate: number
          voice_call_rate: number
          message_rate: number
          // Booking rates
          photoshoot_hourly_rate: number
          photoshoot_half_day_rate: number
          photoshoot_full_day_rate: number
          promo_hourly_rate: number
          private_event_hourly_rate: number
          social_companion_hourly_rate: number
          brand_ambassador_daily_rate: number
          meet_greet_rate: number
          travel_fee: number
          show_booking_rates: boolean
          show_on_rates_page: boolean
          username_changed_at: string | null
          user_id: string | null
          created_at: string
          updated_at: string
          focus_tags: string[]
          affiliate_code: string | null
        }
        Insert: {
          id: string
          username: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          height?: string | null
          bust?: string | null
          waist?: string | null
          hips?: string | null
          hair_color?: string | null
          eye_color?: string | null
          dress_size?: string | null
          shoe_size?: string | null
          instagram_name?: string | null
          instagram_followers?: number
          instagram_url?: string | null
          tiktok_username?: string | null
          tiktok_followers?: number
          snapchat_username?: string | null
          snapchat_followers?: number
          x_username?: string | null
          youtube_username?: string | null
          twitch_username?: string | null
          digis_username?: string | null
          affiliate_links?: Json
          is_approved?: boolean
          is_featured?: boolean
          is_verified?: boolean
          availability_status?: string | null
          show_measurements?: boolean
          show_location?: boolean
          show_social_media?: boolean
          profile_photo_url?: string | null
          coin_balance?: number
          profile_views?: number
          points_cached?: number
          level_cached?: ModelLevel
          video_call_rate?: number
          voice_call_rate?: number
          message_rate?: number
          // Booking rates
          photoshoot_hourly_rate?: number
          photoshoot_half_day_rate?: number
          photoshoot_full_day_rate?: number
          promo_hourly_rate?: number
          private_event_hourly_rate?: number
          social_companion_hourly_rate?: number
          brand_ambassador_daily_rate?: number
          meet_greet_rate?: number
          travel_fee?: number
          show_booking_rates?: boolean
          show_on_rates_page?: boolean
          username_changed_at?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
          focus_tags?: string[]
          affiliate_code?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          height?: string | null
          bust?: string | null
          waist?: string | null
          hips?: string | null
          hair_color?: string | null
          eye_color?: string | null
          dress_size?: string | null
          shoe_size?: string | null
          instagram_name?: string | null
          instagram_followers?: number
          instagram_url?: string | null
          tiktok_username?: string | null
          tiktok_followers?: number
          snapchat_username?: string | null
          snapchat_followers?: number
          x_username?: string | null
          youtube_username?: string | null
          twitch_username?: string | null
          digis_username?: string | null
          affiliate_links?: Json
          is_approved?: boolean
          is_featured?: boolean
          is_verified?: boolean
          availability_status?: string | null
          show_measurements?: boolean
          show_location?: boolean
          show_social_media?: boolean
          profile_photo_url?: string | null
          coin_balance?: number
          profile_views?: number
          points_cached?: number
          level_cached?: ModelLevel
          video_call_rate?: number
          voice_call_rate?: number
          message_rate?: number
          // Booking rates
          photoshoot_hourly_rate?: number
          photoshoot_half_day_rate?: number
          photoshoot_full_day_rate?: number
          promo_hourly_rate?: number
          private_event_hourly_rate?: number
          social_companion_hourly_rate?: number
          brand_ambassador_daily_rate?: number
          meet_greet_rate?: number
          travel_fee?: number
          show_booking_rates?: boolean
          show_on_rates_page?: boolean
          username_changed_at?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
          focus_tags?: string[]
          affiliate_code?: string | null
        }
      }
      brands: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          username: string | null
          email: string | null
          phone: string | null
          website: string | null
          logo_url: string | null
          bio: string | null
          subscription_tier: string
          subscription_ends_at: string | null
          is_verified: boolean
          form_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          username?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          bio?: string | null
          subscription_tier?: string
          subscription_ends_at?: string | null
          is_verified?: boolean
          form_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          username?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          bio?: string | null
          subscription_tier?: string
          subscription_ends_at?: string | null
          is_verified?: boolean
          form_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      media_assets: {
        Row: {
          id: string
          owner_id: string
          type: string | null
          storage_path: string
          url: string | null
          width: number | null
          height: number | null
          size_bytes: number | null
          mime_type: string | null
          is_primary: boolean
          display_order: number
          source: string
          opportunity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          type?: string | null
          storage_path: string
          url?: string | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          mime_type?: string | null
          is_primary?: boolean
          display_order?: number
          source?: string
          opportunity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          type?: string | null
          storage_path?: string
          url?: string | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          mime_type?: string | null
          is_primary?: boolean
          display_order?: number
          source?: string
          opportunity_id?: string | null
          created_at?: string
        }
      }
      point_transactions: {
        Row: {
          id: string
          model_id: string
          action: string
          points: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          model_id: string
          action: string
          points: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          action?: string
          points?: number
          metadata?: Json
          created_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon: string | null
          points_required: number | null
          criteria: Json
          event_id: string | null
          badge_type: BadgeType
          is_active: boolean
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          icon?: string | null
          points_required?: number | null
          criteria?: Json
          event_id?: string | null
          badge_type?: BadgeType
          is_active?: boolean
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          icon?: string | null
          points_required?: number | null
          criteria?: Json
          event_id?: string | null
          badge_type?: BadgeType
          is_active?: boolean
        }
      }
      gigs: {
        Row: {
          id: string
          type: GigType
          title: string
          slug: string
          description: string | null
          cover_image_url: string | null
          location_name: string | null
          location_city: string | null
          location_state: string | null
          location_country: string | null
          start_at: string | null
          end_at: string | null
          application_deadline: string | null
          spots: number | null
          spots_filled: number
          compensation_type: CompensationType | null
          compensation_amount: number | null
          compensation_description: string | null
          requirements: Json
          visibility: string
          status: GigStatus
          points_for_completion: number
          created_by: string | null
          created_at: string
          updated_at: string
          event_id: string | null
        }
        Insert: {
          id?: string
          type: GigType
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string | null
          start_at?: string | null
          end_at?: string | null
          application_deadline?: string | null
          spots?: number | null
          spots_filled?: number
          compensation_type?: CompensationType | null
          compensation_amount?: number | null
          compensation_description?: string | null
          requirements?: Json
          visibility?: string
          status?: GigStatus
          points_for_completion?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          event_id?: string | null
        }
        Update: {
          id?: string
          type?: GigType
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string | null
          start_at?: string | null
          end_at?: string | null
          application_deadline?: string | null
          spots?: number | null
          spots_filled?: number
          compensation_type?: CompensationType | null
          compensation_amount?: number | null
          compensation_description?: string | null
          requirements?: Json
          visibility?: string
          status?: GigStatus
          points_for_completion?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          event_id?: string | null
        }
      }
      gig_applications: {
        Row: {
          id: string
          gig_id: string
          model_id: string
          status: ApplicationStatus
          note: string | null
          admin_note: string | null
          reviewed_by: string | null
          applied_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          gig_id: string
          model_id: string
          status?: ApplicationStatus
          note?: string | null
          admin_note?: string | null
          reviewed_by?: string | null
          applied_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          gig_id?: string
          model_id?: string
          status?: ApplicationStatus
          note?: string | null
          admin_note?: string | null
          reviewed_by?: string | null
          applied_at?: string
          reviewed_at?: string | null
        }
      }
      // Backwards compatibility aliases
      opportunities: {
        Row: {
          id: string
          type: GigType
          title: string
          slug: string
          description: string | null
          cover_image_url: string | null
          location_name: string | null
          location_city: string | null
          location_state: string | null
          location_country: string | null
          start_at: string | null
          end_at: string | null
          application_deadline: string | null
          spots: number | null
          spots_filled: number
          compensation_type: CompensationType | null
          compensation_amount: number | null
          compensation_description: string | null
          requirements: Json
          visibility: string
          status: GigStatus
          points_for_completion: number
          created_by: string | null
          created_at: string
          updated_at: string
          event_id: string | null
        }
        Insert: {
          id?: string
          type: GigType
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string | null
          start_at?: string | null
          end_at?: string | null
          application_deadline?: string | null
          spots?: number | null
          spots_filled?: number
          compensation_type?: CompensationType | null
          compensation_amount?: number | null
          compensation_description?: string | null
          requirements?: Json
          visibility?: string
          status?: GigStatus
          points_for_completion?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          event_id?: string | null
        }
        Update: {
          id?: string
          type?: GigType
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string | null
          start_at?: string | null
          end_at?: string | null
          application_deadline?: string | null
          spots?: number | null
          spots_filled?: number
          compensation_type?: CompensationType | null
          compensation_amount?: number | null
          compensation_description?: string | null
          requirements?: Json
          visibility?: string
          status?: GigStatus
          points_for_completion?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          event_id?: string | null
        }
      }
      opportunity_applications: {
        Row: {
          id: string
          opportunity_id: string
          model_id: string
          status: ApplicationStatus
          note: string | null
          admin_note: string | null
          reviewed_by: string | null
          applied_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          model_id: string
          status?: ApplicationStatus
          note?: string | null
          admin_note?: string | null
          reviewed_by?: string | null
          applied_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          model_id?: string
          status?: ApplicationStatus
          note?: string | null
          admin_note?: string | null
          reviewed_by?: string | null
          applied_at?: string
          reviewed_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          type: string
          title: string | null
          opportunity_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type?: string
          title?: string | null
          opportunity_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string | null
          opportunity_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          media_url: string | null
          media_type: string | null
          is_system: boolean
          created_at: string
          edited_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_system?: boolean
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: string | null
          is_system?: boolean
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          actor_id: string
          type: string
          title: string | null
          body: string | null
          data: Json
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          type: string
          title?: string | null
          body?: string | null
          data?: Json
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          type?: string
          title?: string | null
          body?: string | null
          data?: Json
          read?: boolean
          created_at?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      coin_transactions: {
        Row: {
          id: string
          actor_id: string
          amount: number
          action: string
          message_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          amount: number
          action: string
          message_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          amount?: number
          action?: string
          message_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          actor_id: string
          last_read_at: string | null
          joined_at: string
        }
        Insert: {
          conversation_id: string
          actor_id: string
          last_read_at?: string | null
          joined_at?: string
        }
        Update: {
          conversation_id?: string
          actor_id?: string
          last_read_at?: string | null
          joined_at?: string
        }
      }
      events: {
        Row: {
          id: string
          slug: string
          name: string
          short_name: string
          description: string | null
          cover_image_url: string | null
          logo_url: string | null
          badge_image_url: string | null
          location_name: string | null
          location_city: string | null
          location_state: string | null
          location_country: string
          start_date: string | null
          end_date: string | null
          year: number
          ticket_url: string | null
          ticket_price_cents: number | null
          points_awarded: number
          status: EventStatus
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_name: string
          description?: string | null
          cover_image_url?: string | null
          logo_url?: string | null
          badge_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string
          start_date?: string | null
          end_date?: string | null
          year: number
          ticket_url?: string | null
          ticket_price_cents?: number | null
          points_awarded?: number
          status?: EventStatus
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          short_name?: string
          description?: string | null
          cover_image_url?: string | null
          logo_url?: string | null
          badge_image_url?: string | null
          location_name?: string | null
          location_city?: string | null
          location_state?: string | null
          location_country?: string
          start_date?: string | null
          end_date?: string | null
          year?: number
          ticket_url?: string | null
          ticket_price_cents?: number | null
          points_awarded?: number
          status?: EventStatus
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      affiliate_clicks: {
        Row: {
          id: string
          model_id: string
          event_id: string | null
          visitor_id: string | null
          ip_hash: string | null
          user_agent: string | null
          referrer: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          model_id: string
          event_id?: string | null
          visitor_id?: string | null
          ip_hash?: string | null
          user_agent?: string | null
          referrer?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          event_id?: string | null
          visitor_id?: string | null
          ip_hash?: string | null
          user_agent?: string | null
          referrer?: string | null
          source?: string | null
          created_at?: string
        }
      }
      affiliate_commissions: {
        Row: {
          id: string
          model_id: string
          event_id: string
          click_id: string | null
          order_id: string | null
          sale_amount_cents: number
          commission_rate: number
          commission_amount_cents: number
          status: AffiliateCommissionStatus
          paid_at: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          model_id: string
          event_id: string
          click_id?: string | null
          order_id?: string | null
          sale_amount_cents: number
          commission_rate?: number
          commission_amount_cents: number
          status?: AffiliateCommissionStatus
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          event_id?: string
          click_id?: string | null
          order_id?: string | null
          sale_amount_cents?: number
          commission_rate?: number
          commission_amount_cents?: number
          status?: AffiliateCommissionStatus
          paid_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      model_badges: {
        Row: {
          model_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          model_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          model_id?: string
          badge_id?: string
          earned_at?: string
        }
      }
    }
  }
}

// Helper types
export type Model = Database['public']['Tables']['models']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Actor = Database['public']['Tables']['actors']['Row']
export type Gig = Database['public']['Tables']['gigs']['Row']
export type GigApplication = Database['public']['Tables']['gig_applications']['Row']
// Backwards compatibility aliases
export type Opportunity = Gig
export type Application = GigApplication
export type Message = Database['public']['Tables']['messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type MediaAsset = Database['public']['Tables']['media_assets']['Row']
export type PointTransaction = Database['public']['Tables']['point_transactions']['Row']
export type Badge = Database['public']['Tables']['badges']['Row']

// Extended types with relations
export type ModelWithPhotos = Model & {
  media_assets: MediaAsset[]
}

export type GigWithApplications = Gig & {
  gig_applications: GigApplication[]
}

export type GigApplicationWithDetails = GigApplication & {
  gig: Gig
  model: Model
}

// Backwards compatibility aliases
export type OpportunityWithApplications = GigWithApplications
export type ApplicationWithDetails = GigApplicationWithDetails

export type CoinTransaction = Database['public']['Tables']['coin_transactions']['Row']
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type AffiliateClick = Database['public']['Tables']['affiliate_clicks']['Row']
export type AffiliateCommission = Database['public']['Tables']['affiliate_commissions']['Row']
export type ModelBadge = Database['public']['Tables']['model_badges']['Row']

// Extended badge type with event info
export type EventBadge = Badge & {
  event?: Event
}

// Model badge with full details
export type ModelBadgeWithDetails = ModelBadge & {
  badge: Badge & { event?: Event }
}

// Fan type
export interface Fan {
  id: string
  user_id: string
  display_name: string | null
  username: string | null
  email: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  coin_balance: number
  total_coins_purchased: number
  username_changed_at: string | null
  created_at: string
  updated_at: string
}

// Extended conversation type with participants
export type ConversationWithParticipants = Conversation & {
  participants: (ConversationParticipant & { actor: Actor; model?: Model })[]
  last_message?: Message
}
