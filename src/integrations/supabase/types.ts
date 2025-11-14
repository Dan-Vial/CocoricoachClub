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
      awcr_tracking: {
        Row: {
          acute_load: number | null
          awcr: number | null
          category_id: string
          chronic_load: number | null
          created_at: string
          duration_minutes: number
          id: string
          player_id: string
          rpe: number
          session_date: string
          training_load: number | null
          training_session_id: string | null
        }
        Insert: {
          acute_load?: number | null
          awcr?: number | null
          category_id: string
          chronic_load?: number | null
          created_at?: string
          duration_minutes?: number
          id?: string
          player_id: string
          rpe: number
          session_date: string
          training_load?: number | null
          training_session_id?: string | null
        }
        Update: {
          acute_load?: number | null
          awcr?: number | null
          category_id?: string
          chronic_load?: number | null
          created_at?: string
          duration_minutes?: number
          id?: string
          player_id?: string
          rpe?: number
          session_date?: string
          training_load?: number | null
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awcr_tracking_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awcr_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awcr_tracking_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          club_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          club_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      injuries: {
        Row: {
          actual_return_date: string | null
          category_id: string
          created_at: string
          description: string | null
          estimated_return_date: string | null
          id: string
          injury_date: string
          injury_type: string
          player_id: string
          protocol_notes: string | null
          severity: Database["public"]["Enums"]["injury_severity"]
          status: Database["public"]["Enums"]["injury_status"]
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          estimated_return_date?: string | null
          id?: string
          injury_date?: string
          injury_type: string
          player_id: string
          protocol_notes?: string | null
          severity: Database["public"]["Enums"]["injury_severity"]
          status?: Database["public"]["Enums"]["injury_status"]
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          estimated_return_date?: string | null
          id?: string
          injury_date?: string
          injury_type?: string
          player_id?: string
          protocol_notes?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"]
          status?: Database["public"]["Enums"]["injury_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string | null
          success: boolean
          token: string
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          token: string
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category_id: string
          created_at: string
          id: string
          injury_id: string | null
          is_read: boolean
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          injury_id?: string | null
          is_read?: boolean
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          injury_id?: string | null
          is_read?: boolean
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_injury"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      player_measurements: {
        Row: {
          category_id: string
          created_at: string
          height_cm: number | null
          id: string
          measurement_date: string
          player_id: string
          weight_kg: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          height_cm?: number | null
          id?: string
          measurement_date?: string
          player_id: string
          weight_kg?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          measurement_date?: string
          player_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_measurements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_measurements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_year: number | null
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          birth_year?: number | null
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          birth_year?: number | null
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      speed_tests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          player_id: string
          speed_kmh: number | null
          speed_ms: number | null
          test_date: string
          test_type: string
          time_1600m_minutes: number | null
          time_1600m_seconds: number | null
          time_40m_seconds: number | null
          vma_kmh: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          player_id: string
          speed_kmh?: number | null
          speed_ms?: number | null
          test_date?: string
          test_type: string
          time_1600m_minutes?: number | null
          time_1600m_seconds?: number | null
          time_40m_seconds?: number | null
          vma_kmh?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          player_id?: string
          speed_kmh?: number | null
          speed_ms?: number | null
          test_date?: string
          test_type?: string
          time_1600m_minutes?: number | null
          time_1600m_seconds?: number | null
          time_40m_seconds?: number | null
          vma_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speed_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_tests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          player_id: string
          test_date: string
          test_name: string
          weight_kg: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          player_id: string
          test_date?: string
          test_name: string
          weight_kg: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          player_id?: string
          test_date?: string
          test_name?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "strength_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      training_cycles: {
        Row: {
          category_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          notes: string | null
          period_id: string | null
          start_date: string
          target_intensity: number | null
          updated_at: string
          week_number: number
        }
        Insert: {
          category_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          notes?: string | null
          period_id?: string | null
          start_date: string
          target_intensity?: number | null
          updated_at?: string
          week_number: number
        }
        Update: {
          category_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          period_id?: string | null
          start_date?: string
          target_intensity?: number | null
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_cycles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_cycles_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "training_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      training_periods: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          period_type: Database["public"]["Enums"]["period_type"]
          start_date: string
          target_load_percentage: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          period_type: Database["public"]["Enums"]["period_type"]
          start_date: string
          target_load_percentage?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          start_date?: string
          target_load_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_periods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          intensity: number | null
          notes: string | null
          session_date: string
          session_end_time: string | null
          session_start_time: string | null
          training_type: Database["public"]["Enums"]["training_type"]
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          intensity?: number | null
          notes?: string | null
          session_date: string
          session_end_time?: string | null
          session_start_time?: string | null
          training_type: Database["public"]["Enums"]["training_type"]
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          intensity?: number | null
          notes?: string | null
          session_date?: string
          session_end_time?: string | null
          session_start_time?: string | null
          training_type?: Database["public"]["Enums"]["training_type"]
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_club_invitation: { Args: { _token: string }; Returns: Json }
      can_access_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_old_invitation_attempts: { Args: never; Returns: undefined }
      has_club_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "viewer"
      injury_severity: "légère" | "modérée" | "grave"
      injury_status: "active" | "en_réathlétisation" | "guérie"
      period_type: "préparation" | "compétition" | "récupération" | "trêve"
      training_type:
        | "collectif"
        | "technique_individuelle"
        | "physique"
        | "musculation"
        | "repos"
        | "test"
        | "reathlétisation"
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
      app_role: ["admin", "coach", "viewer"],
      injury_severity: ["légère", "modérée", "grave"],
      injury_status: ["active", "en_réathlétisation", "guérie"],
      period_type: ["préparation", "compétition", "récupération", "trêve"],
      training_type: [
        "collectif",
        "technique_individuelle",
        "physique",
        "musculation",
        "repos",
        "test",
        "reathlétisation",
      ],
    },
  },
} as const
