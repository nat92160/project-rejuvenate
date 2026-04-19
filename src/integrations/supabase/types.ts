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
      annonces: {
        Row: {
          content: string
          created_at: string
          creator_id: string
          id: string
          priority: string
          synagogue_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          creator_id: string
          id?: string
          priority?: string
          synagogue_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          priority?: string
          synagogue_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annonces_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cerfa_commission_payouts: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payout_amount: number
          period_end: string
          period_start: string
          synagogue_id: string
          total_donations_amount: number
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_amount?: number
          period_end: string
          period_start: string
          synagogue_id: string
          total_donations_amount?: number
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_amount?: number
          period_end?: string
          period_start?: string
          synagogue_id?: string
          total_donations_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cerfa_commission_payouts_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cerfa_counters: {
        Row: {
          created_at: string
          fiscal_year: number
          id: string
          last_number: number
          synagogue_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiscal_year: number
          id?: string
          last_number?: number
          synagogue_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiscal_year?: number
          id?: string
          last_number?: number
          synagogue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cerfa_counters_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cours_zoom: {
        Row: {
          address: string | null
          course_time: string
          course_type: string
          created_at: string
          creator_id: string
          day_of_week: string
          description: string
          id: string
          rav: string
          specific_date: string | null
          synagogue_id: string | null
          title: string
          zoom_link: string
        }
        Insert: {
          address?: string | null
          course_time: string
          course_type?: string
          created_at?: string
          creator_id: string
          day_of_week: string
          description?: string
          id?: string
          rav?: string
          specific_date?: string | null
          synagogue_id?: string | null
          title: string
          zoom_link?: string
        }
        Update: {
          address?: string | null
          course_time?: string
          course_type?: string
          created_at?: string
          creator_id?: string
          day_of_week?: string
          description?: string
          id?: string
          rav?: string
          specific_date?: string | null
          synagogue_id?: string | null
          title?: string
          zoom_link?: string
        }
        Relationships: [
          {
            foreignKeyName: "cours_zoom_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string
          creator_id: string
          current_amount: number
          description: string
          end_date: string | null
          goal_amount: number | null
          id: string
          is_active: boolean
          start_date: string
          synagogue_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          current_amount?: number
          description?: string
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          is_active?: boolean
          start_date?: string
          synagogue_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          current_amount?: number
          description?: string
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          is_active?: boolean
          start_date?: string
          synagogue_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_campaigns_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          cerfa_generated: boolean
          cerfa_number: string | null
          cerfa_token: string | null
          cerfa_url: string | null
          created_at: string
          donor_address: string
          donor_company_name: string | null
          donor_email: string
          donor_name: string
          donor_siret: string | null
          donor_type: string
          donor_user_id: string | null
          fiscal_year: number
          id: string
          payout_marked_at: string | null
          payout_marked_by: string | null
          payout_note: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_id: string | null
          synagogue_id: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          cerfa_generated?: boolean
          cerfa_number?: string | null
          cerfa_token?: string | null
          cerfa_url?: string | null
          created_at?: string
          donor_address?: string
          donor_company_name?: string | null
          donor_email: string
          donor_name?: string
          donor_siret?: string | null
          donor_type?: string
          donor_user_id?: string | null
          fiscal_year?: number
          id?: string
          payout_marked_at?: string | null
          payout_marked_by?: string | null
          payout_note?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_id?: string | null
          synagogue_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          cerfa_generated?: boolean
          cerfa_number?: string | null
          cerfa_token?: string | null
          cerfa_url?: string | null
          created_at?: string
          donor_address?: string
          donor_company_name?: string | null
          donor_email?: string
          donor_name?: string
          donor_siret?: string | null
          donor_type?: string
          donor_user_id?: string | null
          fiscal_year?: number
          id?: string
          payout_marked_at?: string | null
          payout_marked_by?: string | null
          payout_note?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_id?: string | null
          synagogue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evenements: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          event_date: string
          event_time: string
          event_type: string
          id: string
          location: string
          synagogue_id: string | null
          title: string
          zoom_link: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string
          event_date: string
          event_time: string
          event_type?: string
          id?: string
          location?: string
          synagogue_id?: string | null
          title: string
          zoom_link?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          event_date?: string
          event_time?: string
          event_type?: string
          id?: string
          location?: string
          synagogue_id?: string | null
          title?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evenements_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minyan_registrations: {
        Row: {
          display_name: string
          guest_count: number
          id: string
          registered_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          guest_count?: number
          id?: string
          registered_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          guest_count?: number
          id?: string
          registered_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "minyan_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "minyan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      minyan_sessions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          office_date: string
          office_time: string
          office_type: string
          synagogue_id: string | null
          target_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          office_date?: string
          office_time: string
          office_type?: string
          synagogue_id?: string | null
          target_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          office_date?: string
          office_time?: string
          office_type?: string
          synagogue_id?: string | null
          target_count?: number
        }
        Relationships: []
      }
      omer_counts: {
        Row: {
          counted_at: string
          day_number: number
          id: string
          omer_year: number
          streak: number
          user_id: string
        }
        Insert: {
          counted_at?: string
          day_number: number
          id?: string
          omer_year?: number
          streak?: number
          user_id: string
        }
        Update: {
          counted_at?: string
          day_number?: number
          id?: string
          omer_year?: number
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      omer_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          latitude: number | null
          longitude: number | null
          p256dh: string
          timezone: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          p256dh: string
          timezone?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          p256dh?: string
          timezone?: string | null
        }
        Relationships: []
      }
      omer_reminder_log: {
        Row: {
          id: string
          omer_day: number
          omer_year: number
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          omer_day: number
          omer_year?: number
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          omer_day?: number
          omer_year?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_dates: {
        Row: {
          civil_date: string | null
          created_at: string
          date_type: string
          hebrew_date_day: number | null
          hebrew_date_month: string | null
          hebrew_date_year: number | null
          hebrew_name: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          civil_date?: string | null
          created_at?: string
          date_type?: string
          hebrew_date_day?: number | null
          hebrew_date_month?: string | null
          hebrew_date_year?: number | null
          hebrew_name?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          civil_date?: string | null
          created_at?: string
          date_type?: string
          hebrew_date_day?: number | null
          hebrew_date_month?: string | null
          hebrew_date_year?: number | null
          hebrew_name?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prayer_time_suggestions: {
        Row: {
          created_at: string
          display_name: string
          id: string
          office_name: string
          place_id: string | null
          place_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          synagogue_id: string | null
          time_rule: string | null
          time_value: string | null
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          office_name: string
          place_id?: string | null
          place_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          synagogue_id?: string | null
          time_rule?: string | null
          time_value?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          office_name?: string
          place_id?: string | null
          place_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          synagogue_id?: string | null
          time_rule?: string | null
          time_value?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "prayer_time_suggestions_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      president_requests: {
        Row: {
          city: string
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          synagogue_name: string
          user_id: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          synagogue_name: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          synagogue_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          latitude: number | null
          longitude: number | null
          omer_reminders: boolean
          suspended: boolean
          synagogue: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          omer_reminders?: boolean
          suspended?: boolean
          synagogue?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          omer_reminders?: boolean
          suspended?: boolean
          synagogue?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_token: string | null
          endpoint: string | null
          id: string
          latitude: number | null
          longitude: number | null
          p256dh: string | null
          push_type: string
          synagogue_id: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          p256dh?: string | null
          push_type?: string
          synagogue_id?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          p256dh?: string | null
          push_type?: string
          synagogue_id?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refoua_chelema: {
        Row: {
          added_by: string | null
          created_at: string
          hebrew_name: string
          id: string
          mother_name: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          hebrew_name: string
          id?: string
          mother_name?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          hebrew_name?: string
          id?: string
          mother_name?: string
        }
        Relationships: []
      }
      shabbat_notification_log: {
        Row: {
          id: string
          sent_at: string
          shabbat_date: string
          synagogue_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string
          shabbat_date: string
          synagogue_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string
          shabbat_date?: string
          synagogue_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shabbat_posters: {
        Row: {
          created_at: string
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shabbat_push_log: {
        Row: {
          id: string
          recipients_count: number
          sent_at: string
          sent_date: string
        }
        Insert: {
          id?: string
          recipients_count?: number
          sent_at?: string
          sent_date?: string
        }
        Update: {
          id?: string
          recipients_count?: number
          sent_at?: string
          sent_date?: string
        }
        Relationships: []
      }
      synagogue_chat_requests: {
        Row: {
          created_at: string
          display_name: string
          id: string
          reviewed_at: string | null
          status: string
          synagogue_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          synagogue_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          synagogue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_chat_requests_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string
          id: string
          is_president: boolean
          synagogue_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string
          id?: string
          is_president?: boolean
          synagogue_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string
          id?: string
          is_president?: boolean
          synagogue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_messages_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_profiles: {
        Row: {
          address: string | null
          adjoint_id: string | null
          article_cgi: string | null
          arvit_time: string | null
          arvit_time_2: string | null
          association_legal_name: string | null
          association_object: string | null
          cerfa_counter_value: number
          cerfa_counter_year: number | null
          chat_enabled: boolean
          created_at: string
          donation_link: string | null
          donation_slug: string | null
          email: string | null
          font_family: string | null
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mikve_enabled: boolean
          mikve_maps_link: string | null
          mikve_phone: string | null
          mikve_summer_hours: string | null
          mikve_winter_hours: string | null
          minha_time: string | null
          minha_time_2: string | null
          name: string
          organism_quality: string | null
          phone: string | null
          president_first_name: string | null
          president_id: string
          president_last_name: string | null
          primary_color: string | null
          rna_number: string | null
          secondary_color: string | null
          shacharit_time: string | null
          shacharit_time_2: string | null
          signature: string | null
          signature_image_url: string | null
          siret_number: string | null
          speakers: Json | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          adjoint_id?: string | null
          article_cgi?: string | null
          arvit_time?: string | null
          arvit_time_2?: string | null
          association_legal_name?: string | null
          association_object?: string | null
          cerfa_counter_value?: number
          cerfa_counter_year?: number | null
          chat_enabled?: boolean
          created_at?: string
          donation_link?: string | null
          donation_slug?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mikve_enabled?: boolean
          mikve_maps_link?: string | null
          mikve_phone?: string | null
          mikve_summer_hours?: string | null
          mikve_winter_hours?: string | null
          minha_time?: string | null
          minha_time_2?: string | null
          name?: string
          organism_quality?: string | null
          phone?: string | null
          president_first_name?: string | null
          president_id: string
          president_last_name?: string | null
          primary_color?: string | null
          rna_number?: string | null
          secondary_color?: string | null
          shacharit_time?: string | null
          shacharit_time_2?: string | null
          signature?: string | null
          signature_image_url?: string | null
          siret_number?: string | null
          speakers?: Json | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          adjoint_id?: string | null
          article_cgi?: string | null
          arvit_time?: string | null
          arvit_time_2?: string | null
          association_legal_name?: string | null
          association_object?: string | null
          cerfa_counter_value?: number
          cerfa_counter_year?: number | null
          chat_enabled?: boolean
          created_at?: string
          donation_link?: string | null
          donation_slug?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mikve_enabled?: boolean
          mikve_maps_link?: string | null
          mikve_phone?: string | null
          mikve_summer_hours?: string | null
          mikve_winter_hours?: string | null
          minha_time?: string | null
          minha_time_2?: string | null
          name?: string
          organism_quality?: string | null
          phone?: string | null
          president_first_name?: string | null
          president_id?: string
          president_last_name?: string | null
          primary_color?: string | null
          rna_number?: string | null
          secondary_color?: string | null
          shacharit_time?: string | null
          shacharit_time_2?: string | null
          signature?: string | null
          signature_image_url?: string | null
          siret_number?: string | null
          speakers?: Json | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      synagogue_stripe_accounts: {
        Row: {
          created_at: string
          custom_donation_slug: string | null
          id: string
          is_onboarded: boolean
          stripe_account_id: string
          synagogue_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_donation_slug?: string | null
          id?: string
          is_onboarded?: boolean
          stripe_account_id: string
          synagogue_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_donation_slug?: string | null
          id?: string
          is_onboarded?: boolean
          stripe_account_id?: string
          synagogue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_stripe_accounts_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: true
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      synagogue_subscriptions: {
        Row: {
          created_at: string
          id: string
          synagogue_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          synagogue_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          synagogue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "synagogue_subscriptions_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tehilim_chains: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_id: string
          dedication: string | null
          dedication_type: string | null
          id: string
          status: string
          synagogue_id: string | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_id: string
          dedication?: string | null
          dedication_type?: string | null
          id?: string
          status?: string
          synagogue_id?: string | null
          title?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          dedication?: string | null
          dedication_type?: string | null
          id?: string
          status?: string
          synagogue_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tehilim_chains_synagogue_id_fkey"
            columns: ["synagogue_id"]
            isOneToOne: false
            referencedRelation: "synagogue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tehilim_claims: {
        Row: {
          chain_id: string
          chapter_end: number
          chapter_start: number
          claimed_at: string
          completed: boolean
          completed_at: string | null
          display_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          chain_id: string
          chapter_end: number
          chapter_start: number
          claimed_at?: string
          completed?: boolean
          completed_at?: string | null
          display_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          chain_id?: string
          chapter_end?: number
          chapter_start?: number
          claimed_at?: string
          completed?: boolean
          completed_at?: string | null
          display_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tehilim_claims_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "tehilim_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_courses_cache: {
        Row: {
          channel_id: string
          channel_name: string
          created_at: string
          description: string
          duration: string | null
          id: string
          published_at: string
          thumbnail_url: string
          title: string
          updated_at: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          channel_id: string
          channel_name: string
          created_at?: string
          description?: string
          duration?: string | null
          id?: string
          published_at: string
          thumbnail_url?: string
          title: string
          updated_at?: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          channel_id?: string
          channel_name?: string
          created_at?: string
          description?: string
          duration?: string | null
          id?: string
          published_at?: string
          thumbnail_url?: string
          title?: string
          updated_at?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      zoom_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          token_type: string
          updated_at: string
          user_id: string
          zoom_email: string | null
          zoom_user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string
          updated_at?: string
          user_id: string
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string
          updated_at?: string
          user_id?: string
          zoom_email?: string | null
          zoom_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_cerfa_number: { Args: { _donation_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_cerfa_number: {
        Args: { _fiscal_year: number; _synagogue_id: string }
        Returns: string
      }
      subscribe_to_place: {
        Args: {
          _google_place_id?: string
          _place_address?: string
          _place_lat?: number
          _place_lng?: number
          _place_name: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "fidele" | "president" | "guest" | "admin"
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
      app_role: ["fidele", "president", "guest", "admin"],
    },
  },
} as const
