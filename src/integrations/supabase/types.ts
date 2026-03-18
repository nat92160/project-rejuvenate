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
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          creator_id: string
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cours_zoom: {
        Row: {
          course_time: string
          created_at: string
          creator_id: string
          day_of_week: string
          description: string
          id: string
          rav: string
          title: string
          zoom_link: string
        }
        Insert: {
          course_time: string
          created_at?: string
          creator_id: string
          day_of_week: string
          description?: string
          id?: string
          rav?: string
          title: string
          zoom_link?: string
        }
        Update: {
          course_time?: string
          created_at?: string
          creator_id?: string
          day_of_week?: string
          description?: string
          id?: string
          rav?: string
          title?: string
          zoom_link?: string
        }
        Relationships: []
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
          title?: string
          zoom_link?: string | null
        }
        Relationships: []
      }
      minyan_registrations: {
        Row: {
          display_name: string
          id: string
          registered_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          id?: string
          registered_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          display_name?: string
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
      profiles: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          synagogue: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          synagogue?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          synagogue?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      tehilim_chains: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_id: string
          dedication: string | null
          dedication_type: string | null
          id: string
          status: string
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
          title?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fidele" | "president" | "guest"
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
      app_role: ["fidele", "president", "guest"],
    },
  },
} as const
