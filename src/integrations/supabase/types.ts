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
      academic_absences: {
        Row: {
          absence_date: string
          absence_type: string
          category_id: string
          created_at: string
          duration_hours: number | null
          id: string
          justified: boolean | null
          player_id: string
          reason: string | null
        }
        Insert: {
          absence_date: string
          absence_type?: string
          category_id: string
          created_at?: string
          duration_hours?: number | null
          id?: string
          justified?: boolean | null
          player_id: string
          reason?: string | null
        }
        Update: {
          absence_date?: string
          absence_type?: string
          category_id?: string
          created_at?: string
          duration_hours?: number | null
          id?: string
          justified?: boolean | null
          player_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_absences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_absences_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_absences_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_grades: {
        Row: {
          category_id: string
          created_at: string
          grade: number | null
          grade_date: string
          id: string
          max_grade: number | null
          notes: string | null
          player_id: string
          subject: string
          term: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          grade?: number | null
          grade_date?: string
          id?: string
          max_grade?: number | null
          notes?: string | null
          player_id: string
          subject: string
          term?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          grade?: number | null
          grade_date?: string
          id?: string
          max_grade?: number | null
          notes?: string | null
          player_id?: string
          subject?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_grades_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_grades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_grades_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_documents: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          document_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          notes: string | null
          player_id: string | null
          status: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          document_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          status?: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_documents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_documents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          name: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          name?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          name?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      approved_users: {
        Row: {
          approved_at: string
          approved_by: string | null
          id: string
          is_free_user: boolean | null
          notes: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          is_free_user?: boolean | null
          notes?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          is_free_user?: boolean | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      athlete_access_tokens: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          player_id: string
          token: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          player_id: string
          token?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          player_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_access_tokens_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_access_tokens_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_access_tokens_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_exercise_logs: {
        Row: {
          actual_reps: number | null
          actual_sets: number | null
          actual_weight_kg: number
          category_id: string
          created_at: string | null
          exercise_category: string | null
          exercise_name: string
          gym_exercise_id: string | null
          id: string
          notes: string | null
          player_id: string
          prescribed_percentage_1rm: number | null
          prescribed_reps: number | null
          prescribed_sets: number | null
          tonnage: number | null
          training_session_id: string
        }
        Insert: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight_kg: number
          category_id: string
          created_at?: string | null
          exercise_category?: string | null
          exercise_name: string
          gym_exercise_id?: string | null
          id?: string
          notes?: string | null
          player_id: string
          prescribed_percentage_1rm?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          tonnage?: number | null
          training_session_id: string
        }
        Update: {
          actual_reps?: number | null
          actual_sets?: number | null
          actual_weight_kg?: number
          category_id?: string
          created_at?: string | null
          exercise_category?: string | null
          exercise_name?: string
          gym_exercise_id?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          prescribed_percentage_1rm?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          tonnage?: number | null
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_exercise_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_exercise_logs_gym_exercise_id_fkey"
            columns: ["gym_exercise_id"]
            isOneToOne: false
            referencedRelation: "gym_session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_exercise_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_exercise_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_exercise_logs_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_invitations: {
        Row: {
          accepted_at: string | null
          category_id: string
          club_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          phone: string | null
          player_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          category_id: string
          club_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          player_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          category_id?: string
          club_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          phone?: string | null
          player_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_invitations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_invitations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_invitations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      athletics_minimas: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          discipline: string
          id: string
          label: string
          level: string
          lower_is_better: boolean
          notes: string | null
          specialty: string | null
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          discipline: string
          id?: string
          label?: string
          level?: string
          lower_is_better?: boolean
          notes?: string | null
          specialty?: string | null
          target_value: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          discipline?: string
          id?: string
          label?: string
          level?: string
          lower_is_better?: boolean
          notes?: string | null
          specialty?: string | null
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletics_minimas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      athletics_records: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          discipline: string
          id: string
          lower_is_better: boolean
          notes: string | null
          personal_best: number | null
          personal_best_date: string | null
          personal_best_location: string | null
          player_id: string
          season_best: number | null
          season_best_date: string | null
          season_best_location: string | null
          season_year: number
          specialty: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          discipline: string
          id?: string
          lower_is_better?: boolean
          notes?: string | null
          personal_best?: number | null
          personal_best_date?: string | null
          personal_best_location?: string | null
          player_id: string
          season_best?: number | null
          season_best_date?: string | null
          season_best_location?: string | null
          season_year?: number
          specialty?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          discipline?: string
          id?: string
          lower_is_better?: boolean
          notes?: string | null
          personal_best?: number | null
          personal_best_date?: string | null
          personal_best_location?: string | null
          player_id?: string
          season_best?: number | null
          season_best_date?: string | null
          season_best_location?: string | null
          season_year?: number
          specialty?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletics_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletics_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletics_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      awcr_tracking: {
        Row: {
          acute_load: number | null
          awcr: number | null
          category_id: string
          chronic_load: number | null
          created_at: string
          duration_minutes: number
          gps_player_load: number | null
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
          gps_player_load?: number | null
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
          gps_player_load?: number | null
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
            foreignKeyName: "awcr_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
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
      benchmarks: {
        Row: {
          applies_to: string | null
          body_weight_multiplier: number | null
          category_id: string
          created_at: string | null
          created_by: string | null
          filter_type: string | null
          filter_value: string | null
          id: string
          level_1_label: string
          level_1_max: number | null
          level_2_label: string
          level_2_max: number | null
          level_3_label: string
          level_3_max: number | null
          level_4_label: string
          level_4_max: number | null
          levels: Json | null
          lower_is_better: boolean
          name: string
          test_category: string
          test_type: string
          unit: string | null
          updated_at: string | null
          use_body_weight_ratio: boolean | null
        }
        Insert: {
          applies_to?: string | null
          body_weight_multiplier?: number | null
          category_id: string
          created_at?: string | null
          created_by?: string | null
          filter_type?: string | null
          filter_value?: string | null
          id?: string
          level_1_label?: string
          level_1_max?: number | null
          level_2_label?: string
          level_2_max?: number | null
          level_3_label?: string
          level_3_max?: number | null
          level_4_label?: string
          level_4_max?: number | null
          levels?: Json | null
          lower_is_better?: boolean
          name: string
          test_category: string
          test_type: string
          unit?: string | null
          updated_at?: string | null
          use_body_weight_ratio?: boolean | null
        }
        Update: {
          applies_to?: string | null
          body_weight_multiplier?: number | null
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          filter_type?: string | null
          filter_value?: string | null
          id?: string
          level_1_label?: string
          level_1_max?: number | null
          level_2_label?: string
          level_2_max?: number | null
          level_3_label?: string
          level_3_max?: number | null
          level_4_label?: string
          level_4_max?: number | null
          levels?: Json | null
          lower_is_better?: boolean
          name?: string
          test_category?: string
          test_type?: string
          unit?: string | null
          updated_at?: string | null
          use_body_weight_ratio?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmarks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      body_composition: {
        Row: {
          bmi: number | null
          body_fat_percentage: number | null
          category_id: string
          created_at: string
          height_cm: number | null
          id: string
          measurement_date: string
          muscle_mass_kg: number | null
          notes: string | null
          player_id: string
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          body_fat_percentage?: number | null
          category_id: string
          created_at?: string
          height_cm?: number | null
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          player_id: string
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          body_fat_percentage?: number | null
          category_id?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          player_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_composition_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_composition_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_composition_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_ball_catalog: {
        Row: {
          brand: string
          core_type: string
          cover_type: string
          created_at: string
          created_by: string | null
          differential: number | null
          factory_surface: string | null
          id: string
          image_url: string | null
          intermediate_diff: number | null
          is_system: boolean
          model: string
          rg: number | null
        }
        Insert: {
          brand: string
          core_type?: string
          cover_type?: string
          created_at?: string
          created_by?: string | null
          differential?: number | null
          factory_surface?: string | null
          id?: string
          image_url?: string | null
          intermediate_diff?: number | null
          is_system?: boolean
          model: string
          rg?: number | null
        }
        Update: {
          brand?: string
          core_type?: string
          cover_type?: string
          created_at?: string
          created_by?: string | null
          differential?: number | null
          factory_surface?: string | null
          id?: string
          image_url?: string | null
          intermediate_diff?: number | null
          is_system?: boolean
          model?: string
          rg?: number | null
        }
        Relationships: []
      }
      bowling_oil_pattern_players: {
        Row: {
          created_at: string
          id: string
          oil_pattern_id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          oil_pattern_id: string
          player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          oil_pattern_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bowling_oil_pattern_players_oil_pattern_id_fkey"
            columns: ["oil_pattern_id"]
            isOneToOne: false
            referencedRelation: "bowling_oil_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_oil_pattern_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_oil_pattern_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_oil_patterns: {
        Row: {
          buff_distance_feet: number | null
          category_id: string
          created_at: string
          forward_oil: boolean | null
          gender: string | null
          id: string
          image_url_female: string | null
          image_url_male: string | null
          is_preset: boolean | null
          length_feet: number | null
          match_id: string | null
          name: string
          notes: string | null
          oil_ratio: string | null
          outside_friction: string | null
          profile_type: string | null
          reverse_oil: boolean | null
          total_volume_ml: number | null
          updated_at: string
          width_boards: number | null
        }
        Insert: {
          buff_distance_feet?: number | null
          category_id: string
          created_at?: string
          forward_oil?: boolean | null
          gender?: string | null
          id?: string
          image_url_female?: string | null
          image_url_male?: string | null
          is_preset?: boolean | null
          length_feet?: number | null
          match_id?: string | null
          name: string
          notes?: string | null
          oil_ratio?: string | null
          outside_friction?: string | null
          profile_type?: string | null
          reverse_oil?: boolean | null
          total_volume_ml?: number | null
          updated_at?: string
          width_boards?: number | null
        }
        Update: {
          buff_distance_feet?: number | null
          category_id?: string
          created_at?: string
          forward_oil?: boolean | null
          gender?: string | null
          id?: string
          image_url_female?: string | null
          image_url_male?: string | null
          is_preset?: boolean | null
          length_feet?: number | null
          match_id?: string | null
          name?: string
          notes?: string | null
          oil_ratio?: string | null
          outside_friction?: string | null
          profile_type?: string | null
          reverse_oil?: boolean | null
          total_volume_ml?: number | null
          updated_at?: string
          width_boards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bowling_oil_patterns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_oil_patterns_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_spare_training: {
        Row: {
          attempts: number
          ball_arsenal_id: string | null
          category_id: string
          created_at: string
          exercise_type: string
          id: string
          notes: string | null
          player_id: string
          session_date: string
          success_rate: number | null
          successes: number
          training_session_id: string | null
        }
        Insert: {
          attempts?: number
          ball_arsenal_id?: string | null
          category_id: string
          created_at?: string
          exercise_type: string
          id?: string
          notes?: string | null
          player_id: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
        }
        Update: {
          attempts?: number
          ball_arsenal_id?: string | null
          category_id?: string
          created_at?: string
          exercise_type?: string
          id?: string
          notes?: string | null
          player_id?: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bowling_spare_training_ball_arsenal_id_fkey"
            columns: ["ball_arsenal_id"]
            isOneToOne: false
            referencedRelation: "player_bowling_arsenal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_spare_training_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_spare_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_spare_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_spare_training_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          academy_enabled: boolean | null
          club_id: string
          cover_image_url: string | null
          created_at: string
          gender: string
          gps_enabled: boolean | null
          id: string
          name: string
          rugby_type: string
          video_enabled: boolean | null
        }
        Insert: {
          academy_enabled?: boolean | null
          club_id: string
          cover_image_url?: string | null
          created_at?: string
          gender?: string
          gps_enabled?: boolean | null
          id?: string
          name: string
          rugby_type?: string
          video_enabled?: boolean | null
        }
        Update: {
          academy_enabled?: boolean | null
          club_id?: string
          cover_image_url?: string | null
          created_at?: string
          gender?: string
          gps_enabled?: boolean | null
          id?: string
          name?: string
          rugby_type?: string
          video_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      category_invitations: {
        Row: {
          category_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          category_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_invitations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_members: {
        Row: {
          category_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_photos: {
        Row: {
          caption: string | null
          category_id: string
          created_at: string
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          category_id: string
          created_at?: string
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          category_id?: string
          created_at?: string
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_photos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_stat_preferences: {
        Row: {
          category_id: string
          enabled_custom_stats: string[] | null
          enabled_stats: string[]
          id: string
          sport_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id: string
          enabled_custom_stats?: string[] | null
          enabled_stats?: string[]
          id?: string
          sport_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string
          enabled_custom_stats?: string[] | null
          enabled_stats?: string[]
          id?: string
          sport_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_stat_preferences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          amount: number | null
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          plan_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          academy_enabled: boolean | null
          address: string | null
          created_at: string
          email: string | null
          gps_data_enabled: boolean | null
          id: string
          max_athletes: number
          max_categories_per_club: number
          max_clubs: number
          max_staff_per_category: number | null
          max_staff_users: number
          name: string
          notes: string | null
          phone: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
          video_enabled: boolean | null
        }
        Insert: {
          academy_enabled?: boolean | null
          address?: string | null
          created_at?: string
          email?: string | null
          gps_data_enabled?: boolean | null
          id?: string
          max_athletes?: number
          max_categories_per_club?: number
          max_clubs?: number
          max_staff_per_category?: number | null
          max_staff_users?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          video_enabled?: boolean | null
        }
        Update: {
          academy_enabled?: boolean | null
          address?: string | null
          created_at?: string
          email?: string | null
          gps_data_enabled?: boolean | null
          id?: string
          max_athletes?: number
          max_categories_per_club?: number
          max_clubs?: number
          max_staff_per_category?: number | null
          max_staff_users?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          video_enabled?: boolean | null
        }
        Relationships: []
      }
      clip_player_associations: {
        Row: {
          clip_id: string
          created_at: string
          id: string
          player_id: string
          role: string | null
        }
        Insert: {
          clip_id: string
          created_at?: string
          id?: string
          player_id: string
          role?: string | null
        }
        Update: {
          clip_id?: string
          created_at?: string
          id?: string
          player_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_player_associations_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "video_clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_player_associations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_player_associations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          assigned_categories: string[] | null
          club_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          assigned_categories?: string[] | null
          club_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          assigned_categories?: string[] | null
          club_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
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
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
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
          assigned_categories: string[] | null
          club_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_categories?: string[] | null
          club_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_categories?: string[] | null
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
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
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
          client_id: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sport: string
          timezone: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sport?: string
          timezone?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sport?: string
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_round_stats: {
        Row: {
          created_at: string
          id: string
          round_id: string
          stat_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_id: string
          stat_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          round_id?: string
          stat_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_round_stats_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_rounds: {
        Row: {
          created_at: string
          current_conditions: string | null
          final_time_seconds: number | null
          gap_to_first: string | null
          id: string
          lane: number | null
          match_id: string
          notes: string | null
          opponent_name: string | null
          phase: string | null
          player_id: string
          ranking: number | null
          result: string | null
          round_number: number
          temperature_celsius: number | null
          updated_at: string
          wind_conditions: string | null
        }
        Insert: {
          created_at?: string
          current_conditions?: string | null
          final_time_seconds?: number | null
          gap_to_first?: string | null
          id?: string
          lane?: number | null
          match_id: string
          notes?: string | null
          opponent_name?: string | null
          phase?: string | null
          player_id: string
          ranking?: number | null
          result?: string | null
          round_number?: number
          temperature_celsius?: number | null
          updated_at?: string
          wind_conditions?: string | null
        }
        Update: {
          created_at?: string
          current_conditions?: string | null
          final_time_seconds?: number | null
          gap_to_first?: string | null
          id?: string
          lane?: number | null
          match_id?: string
          notes?: string | null
          opponent_name?: string | null
          phase?: string | null
          player_id?: string
          ranking?: number | null
          result?: string | null
          round_number?: number
          temperature_celsius?: number | null
          updated_at?: string
          wind_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_rounds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_rounds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      concussion_protocols: {
        Row: {
          category_id: string
          clearance_date: string | null
          created_at: string
          id: string
          incident_date: string
          incident_description: string | null
          medical_notes: string | null
          player_id: string
          return_to_play_phase: number | null
          status: string
          symptoms: string[] | null
          updated_at: string
        }
        Insert: {
          category_id: string
          clearance_date?: string | null
          created_at?: string
          id?: string
          incident_date?: string
          incident_description?: string | null
          medical_notes?: string | null
          player_id: string
          return_to_play_phase?: number | null
          status?: string
          symptoms?: string[] | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          clearance_date?: string | null
          created_at?: string
          id?: string
          incident_date?: string
          incident_description?: string | null
          medical_notes?: string | null
          player_id?: string
          return_to_play_phase?: number | null
          status?: string
          symptoms?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean | null
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
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
          category_id: string | null
          conversation_type: string
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          conversation_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      convocation_recipients: {
        Row: {
          convocation_id: string
          created_at: string
          id: string
          notified_at: string | null
          player_id: string
          response: string | null
          response_date: string | null
          response_reason: string | null
        }
        Insert: {
          convocation_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          player_id: string
          response?: string | null
          response_date?: string | null
          response_reason?: string | null
        }
        Update: {
          convocation_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          player_id?: string
          response?: string | null
          response_date?: string | null
          response_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convocation_recipients_convocation_id_fkey"
            columns: ["convocation_id"]
            isOneToOne: false
            referencedRelation: "convocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocation_recipients_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocation_recipients_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      convocations: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          location: string | null
          match_id: string | null
          name: string
          response_deadline: string | null
          status: string | null
          training_session_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          location?: string | null
          match_id?: string | null
          name: string
          response_deadline?: string | null
          status?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          match_id?: string | null
          name?: string
          response_deadline?: string | null
          status?: string | null
          training_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocations_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_athletic_profiles: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          profile_types: Json
          tests: Json
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          profile_types?: Json
          tests?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          profile_types?: Json
          tests?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_athletic_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_stats: {
        Row: {
          category_id: string
          category_type: string
          created_at: string
          created_by: string | null
          id: string
          key: string
          label: string
          max_value: number | null
          measurement_type: string
          min_value: number | null
          short_label: string
          unit: string | null
        }
        Insert: {
          category_id: string
          category_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          label: string
          max_value?: number | null
          measurement_type?: string
          min_value?: number | null
          short_label: string
          unit?: string | null
        }
        Update: {
          category_id?: string
          category_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          label?: string
          max_value?: number | null
          measurement_type?: string
          min_value?: number | null
          short_label?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_stats_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_test_categories: {
        Row: {
          category_id: string
          created_at: string | null
          custom_test_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          custom_test_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          custom_test_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_test_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_test_categories_custom_test_id_fkey"
            columns: ["custom_test_id"]
            isOneToOne: false
            referencedRelation: "custom_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tests: {
        Row: {
          club_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_time: boolean | null
          name: string
          test_category: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          club_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_time?: boolean | null
          name: string
          test_category: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_time?: boolean | null
          name?: string
          test_category?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_tests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_tests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_training_types: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_training_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_video_action_types: {
        Row: {
          action_category: string
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          value: string
        }
        Insert: {
          action_category?: string
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          value: string
        }
        Update: {
          action_category?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_video_action_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inventory: {
        Row: {
          available_quantity: number
          category: string
          category_id: string
          condition: string
          created_at: string
          id: string
          last_maintenance: string | null
          location: string | null
          name: string
          notes: string | null
          quantity: number
        }
        Insert: {
          available_quantity?: number
          category?: string
          category_id: string
          condition?: string
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          available_quantity?: number
          category?: string
          category_id?: string
          condition?: string
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          id: string
          player_id: string
          training_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          training_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string[] | null
          id: string
          image_url: string | null
          is_system: boolean | null
          muscle_groups: string[] | null
          name: string
          subcategory: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          muscle_groups?: string[] | null
          name: string
          subcategory?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          id?: string
          image_url?: string | null
          is_system?: boolean | null
          muscle_groups?: string[] | null
          name?: string
          subcategory?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          capacity: number | null
          category_id: string
          created_at: string
          id: string
          location: string | null
          name: string
          type: string
        }
        Insert: {
          capacity?: number | null
          category_id: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          type?: string
        }
        Update: {
          capacity?: number | null
          category_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_bookings: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          date: string
          end_time: string
          facility_id: string
          id: string
          start_time: string
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          date: string
          end_time: string
          facility_id: string
          id?: string
          start_time: string
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          end_time?: string
          facility_id?: string
          id?: string
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_bookings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_calendar_events: {
        Row: {
          category_id: string
          competition_level: string | null
          created_at: string
          discipline: string | null
          end_date: string | null
          event_date: string
          event_name: string
          feed_id: string | null
          fis_race_id: string | null
          fis_results_url: string | null
          fis_sector_code: string | null
          fis_uid: string
          gender: string | null
          id: string
          location: string | null
          match_id: string | null
          raw_description: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          competition_level?: string | null
          created_at?: string
          discipline?: string | null
          end_date?: string | null
          event_date: string
          event_name: string
          feed_id?: string | null
          fis_race_id?: string | null
          fis_results_url?: string | null
          fis_sector_code?: string | null
          fis_uid: string
          gender?: string | null
          id?: string
          location?: string | null
          match_id?: string | null
          raw_description?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          competition_level?: string | null
          created_at?: string
          discipline?: string | null
          end_date?: string | null
          event_date?: string
          event_name?: string
          feed_id?: string | null
          fis_race_id?: string | null
          fis_results_url?: string | null
          fis_sector_code?: string | null
          fis_uid?: string
          gender?: string | null
          id?: string
          location?: string | null
          match_id?: string | null
          raw_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fis_calendar_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_calendar_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "fis_calendar_feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_calendar_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_calendar_feeds: {
        Row: {
          category_id: string
          created_at: string
          discipline_codes: string[] | null
          feed_url: string
          id: string
          last_synced_at: string | null
          season_code: string | null
          sector_code: string | null
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          discipline_codes?: string[] | null
          feed_url: string
          id?: string
          last_synced_at?: string | null
          season_code?: string | null
          sector_code?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          discipline_codes?: string[] | null
          feed_url?: string
          id?: string
          last_synced_at?: string | null
          season_code?: string | null
          sector_code?: string | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fis_calendar_feeds_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_competitions: {
        Row: {
          category_id: string
          competition_date: string
          country: string | null
          created_at: string
          discipline: string
          end_date: string | null
          f_value: number | null
          id: string
          level: string
          location: string | null
          name: string
          notes: string | null
          race_penalty: number | null
          top_classified_1_pts: number | null
          top_classified_2_pts: number | null
          top_classified_3_pts: number | null
          top_classified_4_pts: number | null
          top_classified_5_pts: number | null
          top_rider_1_pts: number | null
          top_rider_2_pts: number | null
          top_rider_3_pts: number | null
          top_rider_4_pts: number | null
          top_rider_5_pts: number | null
          total_participants: number | null
          updated_at: string
          wspl_pl: number | null
          wspl_stars: number | null
        }
        Insert: {
          category_id: string
          competition_date: string
          country?: string | null
          created_at?: string
          discipline?: string
          end_date?: string | null
          f_value?: number | null
          id?: string
          level?: string
          location?: string | null
          name: string
          notes?: string | null
          race_penalty?: number | null
          top_classified_1_pts?: number | null
          top_classified_2_pts?: number | null
          top_classified_3_pts?: number | null
          top_classified_4_pts?: number | null
          top_classified_5_pts?: number | null
          top_rider_1_pts?: number | null
          top_rider_2_pts?: number | null
          top_rider_3_pts?: number | null
          top_rider_4_pts?: number | null
          top_rider_5_pts?: number | null
          total_participants?: number | null
          updated_at?: string
          wspl_pl?: number | null
          wspl_stars?: number | null
        }
        Update: {
          category_id?: string
          competition_date?: string
          country?: string | null
          created_at?: string
          discipline?: string
          end_date?: string | null
          f_value?: number | null
          id?: string
          level?: string
          location?: string | null
          name?: string
          notes?: string | null
          race_penalty?: number | null
          top_classified_1_pts?: number | null
          top_classified_2_pts?: number | null
          top_classified_3_pts?: number | null
          top_classified_4_pts?: number | null
          top_classified_5_pts?: number | null
          top_rider_1_pts?: number | null
          top_rider_2_pts?: number | null
          top_rider_3_pts?: number | null
          top_rider_4_pts?: number | null
          top_rider_5_pts?: number | null
          total_participants?: number | null
          updated_at?: string
          wspl_pl?: number | null
          wspl_stars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fis_competitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_objectives: {
        Row: {
          category_id: string
          created_at: string
          deadline: string | null
          discipline: string | null
          id: string
          is_active: boolean
          label: string
          location: string | null
          player_id: string
          points_required: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          deadline?: string | null
          discipline?: string | null
          id?: string
          is_active?: boolean
          label: string
          location?: string | null
          player_id: string
          points_required: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          deadline?: string | null
          discipline?: string | null
          id?: string
          is_active?: boolean
          label?: string
          location?: string | null
          player_id?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fis_objectives_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_objectives_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_objectives_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_points_reference: {
        Row: {
          base_points: number
          category_id: string | null
          created_at: string
          id: string
          position: number
        }
        Insert: {
          base_points: number
          category_id?: string | null
          created_at?: string
          id?: string
          position: number
        }
        Update: {
          base_points?: number
          category_id?: string | null
          created_at?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "fis_points_reference_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_ranking_settings: {
        Row: {
          category_id: string
          created_at: string
          id: string
          max_counting_results: number
          point_multipliers: Json | null
          rolling_weeks: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          max_counting_results?: number
          point_multipliers?: Json | null
          rolling_weeks?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          max_counting_results?: number
          point_multipliers?: Json | null
          rolling_weeks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fis_ranking_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fis_results: {
        Row: {
          base_points: number | null
          calculated_points: number | null
          category_id: string
          competition_id: string
          created_at: string
          expires_at: string | null
          fis_points: number
          id: string
          is_counting: boolean | null
          notes: string | null
          player_id: string
          ranking: number | null
          score: number | null
          total_riders: number | null
          updated_at: string
          wspl_pl: number | null
          wspl_points: number | null
          wspl_stars: number | null
        }
        Insert: {
          base_points?: number | null
          calculated_points?: number | null
          category_id: string
          competition_id: string
          created_at?: string
          expires_at?: string | null
          fis_points?: number
          id?: string
          is_counting?: boolean | null
          notes?: string | null
          player_id: string
          ranking?: number | null
          score?: number | null
          total_riders?: number | null
          updated_at?: string
          wspl_pl?: number | null
          wspl_points?: number | null
          wspl_stars?: number | null
        }
        Update: {
          base_points?: number | null
          calculated_points?: number | null
          category_id?: string
          competition_id?: string
          created_at?: string
          expires_at?: string | null
          fis_points?: number
          id?: string
          is_counting?: boolean | null
          notes?: string | null
          player_id?: string
          ranking?: number | null
          score?: number | null
          total_riders?: number | null
          updated_at?: string
          wspl_pl?: number | null
          wspl_points?: number | null
          wspl_stars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fis_results_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_results_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "fis_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fis_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      gathering_wellness_assessments: {
        Row: {
          appetite_level: number | null
          assessment_date: string
          assessment_type: string
          category_id: string
          club_staff_comments: string | null
          created_at: string
          current_awcr: number | null
          current_limitations: string | null
          event_id: string | null
          fatigue_level: number | null
          filled_by: string | null
          filled_by_role: string | null
          has_pain: boolean | null
          hydration_level: number | null
          id: string
          linked_assessment_id: string | null
          matches_played_last_14_days: number | null
          mood_level: number | null
          motivation_level: number | null
          muscle_soreness: number | null
          national_staff_comments: string | null
          pain_description: string | null
          pain_intensity: number | null
          pain_locations: string[] | null
          player_comments: string | null
          player_id: string
          recent_injuries: string | null
          recommended_load: string | null
          sleep_duration_hours: number | null
          sleep_quality: number | null
          specific_recommendations: string | null
          stress_level: number | null
          total_minutes_last_14_days: number | null
          training_load_last_14_days: number | null
          training_load_last_7_days: number | null
          updated_at: string
        }
        Insert: {
          appetite_level?: number | null
          assessment_date?: string
          assessment_type: string
          category_id: string
          club_staff_comments?: string | null
          created_at?: string
          current_awcr?: number | null
          current_limitations?: string | null
          event_id?: string | null
          fatigue_level?: number | null
          filled_by?: string | null
          filled_by_role?: string | null
          has_pain?: boolean | null
          hydration_level?: number | null
          id?: string
          linked_assessment_id?: string | null
          matches_played_last_14_days?: number | null
          mood_level?: number | null
          motivation_level?: number | null
          muscle_soreness?: number | null
          national_staff_comments?: string | null
          pain_description?: string | null
          pain_intensity?: number | null
          pain_locations?: string[] | null
          player_comments?: string | null
          player_id: string
          recent_injuries?: string | null
          recommended_load?: string | null
          sleep_duration_hours?: number | null
          sleep_quality?: number | null
          specific_recommendations?: string | null
          stress_level?: number | null
          total_minutes_last_14_days?: number | null
          training_load_last_14_days?: number | null
          training_load_last_7_days?: number | null
          updated_at?: string
        }
        Update: {
          appetite_level?: number | null
          assessment_date?: string
          assessment_type?: string
          category_id?: string
          club_staff_comments?: string | null
          created_at?: string
          current_awcr?: number | null
          current_limitations?: string | null
          event_id?: string | null
          fatigue_level?: number | null
          filled_by?: string | null
          filled_by_role?: string | null
          has_pain?: boolean | null
          hydration_level?: number | null
          id?: string
          linked_assessment_id?: string | null
          matches_played_last_14_days?: number | null
          mood_level?: number | null
          motivation_level?: number | null
          muscle_soreness?: number | null
          national_staff_comments?: string | null
          pain_description?: string | null
          pain_intensity?: number | null
          pain_locations?: string[] | null
          player_comments?: string | null
          player_id?: string
          recent_injuries?: string | null
          recommended_load?: string | null
          sleep_duration_hours?: number | null
          sleep_quality?: number | null
          specific_recommendations?: string | null
          stress_level?: number | null
          total_minutes_last_14_days?: number | null
          training_load_last_14_days?: number | null
          training_load_last_7_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gathering_wellness_assessments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_wellness_assessments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "national_team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_wellness_assessments_linked_assessment_id_fkey"
            columns: ["linked_assessment_id"]
            isOneToOne: false
            referencedRelation: "gathering_wellness_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_wellness_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gathering_wellness_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_tests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          notes: string | null
          player_id: string
          result_unit: string | null
          result_value: number
          secondary_unit: string | null
          secondary_value: number | null
          test_category: string
          test_date: string
          test_type: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          result_unit?: string | null
          result_value: number
          secondary_unit?: string | null
          secondary_value?: number | null
          test_category: string
          test_date?: string
          test_type: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          result_unit?: string | null
          result_value?: number
          secondary_unit?: string | null
          secondary_value?: number | null
          test_category?: string
          test_date?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "generic_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      global_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_email: boolean | null
          is_push: boolean | null
          message: string
          notification_type: string
          sent_at: string | null
          target_ids: string[] | null
          target_roles: string[] | null
          target_type: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_email?: boolean | null
          is_push?: boolean | null
          message: string
          notification_type?: string
          sent_at?: string | null
          target_ids?: string[] | null
          target_roles?: string[] | null
          target_type?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_email?: boolean | null
          is_push?: boolean | null
          message?: string
          notification_type?: string
          sent_at?: string | null
          target_ids?: string[] | null
          target_roles?: string[] | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      gps_objective_templates: {
        Row: {
          calendar_context: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_system: boolean | null
          name: string
          session_type: string | null
          sport_type: string
          template_data: Json
        }
        Insert: {
          calendar_context?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          session_type?: string | null
          sport_type?: string
          template_data?: Json
        }
        Update: {
          calendar_context?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          session_type?: string | null
          sport_type?: string
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gps_objective_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_session_objectives: {
        Row: {
          additional_kpis: Json | null
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          position_group: string
          target_high_speed_distance_m: number | null
          target_sprint_count: number | null
          target_total_distance_m: number | null
          target_vmax_percentage: number | null
          tolerance_green: number | null
          tolerance_orange: number | null
          training_session_id: string
        }
        Insert: {
          additional_kpis?: Json | null
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          position_group: string
          target_high_speed_distance_m?: number | null
          target_sprint_count?: number | null
          target_total_distance_m?: number | null
          target_vmax_percentage?: number | null
          tolerance_green?: number | null
          tolerance_orange?: number | null
          training_session_id: string
        }
        Update: {
          additional_kpis?: Json | null
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          position_group?: string
          target_high_speed_distance_m?: number | null
          target_sprint_count?: number | null
          target_total_distance_m?: number | null
          target_vmax_percentage?: number | null
          tolerance_green?: number | null
          tolerance_orange?: number | null
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_session_objectives_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_session_objectives_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_sessions: {
        Row: {
          accelerations: number | null
          avg_speed_ms: number | null
          category_id: string
          created_at: string
          decelerations: number | null
          duration_minutes: number | null
          high_intensity_accelerations: number | null
          high_intensity_decelerations: number | null
          high_speed_distance_m: number | null
          id: string
          match_id: string | null
          max_speed_ms: number | null
          max_sprint_distance_m: number | null
          notes: string | null
          player_id: string
          player_load: number | null
          raw_data: Json | null
          session_date: string
          session_name: string | null
          source: string | null
          sprint_count: number | null
          sprint_distance_m: number | null
          time_zone_1_min: number | null
          time_zone_2_min: number | null
          time_zone_3_min: number | null
          time_zone_4_min: number | null
          time_zone_5_min: number | null
          total_distance_m: number | null
          training_session_id: string | null
          updated_at: string
        }
        Insert: {
          accelerations?: number | null
          avg_speed_ms?: number | null
          category_id: string
          created_at?: string
          decelerations?: number | null
          duration_minutes?: number | null
          high_intensity_accelerations?: number | null
          high_intensity_decelerations?: number | null
          high_speed_distance_m?: number | null
          id?: string
          match_id?: string | null
          max_speed_ms?: number | null
          max_sprint_distance_m?: number | null
          notes?: string | null
          player_id: string
          player_load?: number | null
          raw_data?: Json | null
          session_date: string
          session_name?: string | null
          source?: string | null
          sprint_count?: number | null
          sprint_distance_m?: number | null
          time_zone_1_min?: number | null
          time_zone_2_min?: number | null
          time_zone_3_min?: number | null
          time_zone_4_min?: number | null
          time_zone_5_min?: number | null
          total_distance_m?: number | null
          training_session_id?: string | null
          updated_at?: string
        }
        Update: {
          accelerations?: number | null
          avg_speed_ms?: number | null
          category_id?: string
          created_at?: string
          decelerations?: number | null
          duration_minutes?: number | null
          high_intensity_accelerations?: number | null
          high_intensity_decelerations?: number | null
          high_speed_distance_m?: number | null
          id?: string
          match_id?: string | null
          max_speed_ms?: number | null
          max_sprint_distance_m?: number | null
          notes?: string | null
          player_id?: string
          player_load?: number | null
          raw_data?: Json | null
          session_date?: string
          session_name?: string | null
          source?: string | null
          sprint_count?: number | null
          sprint_distance_m?: number | null
          time_zone_1_min?: number | null
          time_zone_2_min?: number | null
          time_zone_3_min?: number | null
          time_zone_4_min?: number | null
          time_zone_5_min?: number | null
          total_distance_m?: number | null
          training_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_sessions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_sessions_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_session_exercises: {
        Row: {
          category_id: string
          cluster_sets: Json | null
          contraction_regime: string | null
          created_at: string
          drop_sets: Json | null
          duration_seconds: number | null
          exercise_category: string | null
          exercise_name: string
          group_id: string | null
          group_order: number | null
          id: string
          library_exercise_id: string | null
          method: string | null
          notes: string | null
          order_index: number | null
          player_id: string
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_type: string | null
          sets: number
          target_force_newton: number | null
          tempo: string | null
          training_session_id: string
          weight_kg: number | null
        }
        Insert: {
          category_id: string
          cluster_sets?: Json | null
          contraction_regime?: string | null
          created_at?: string
          drop_sets?: Json | null
          duration_seconds?: number | null
          exercise_category?: string | null
          exercise_name: string
          group_id?: string | null
          group_order?: number | null
          id?: string
          library_exercise_id?: string | null
          method?: string | null
          notes?: string | null
          order_index?: number | null
          player_id: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_type?: string | null
          sets?: number
          target_force_newton?: number | null
          tempo?: string | null
          training_session_id: string
          weight_kg?: number | null
        }
        Update: {
          category_id?: string
          cluster_sets?: Json | null
          contraction_regime?: string | null
          created_at?: string
          drop_sets?: Json | null
          duration_seconds?: number | null
          exercise_category?: string | null
          exercise_name?: string
          group_id?: string | null
          group_order?: number | null
          id?: string
          library_exercise_id?: string | null
          method?: string | null
          notes?: string | null
          order_index?: number | null
          player_id?: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_type?: string | null
          sets?: number
          target_force_newton?: number | null
          tempo?: string | null
          training_session_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_session_exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_session_exercises_library_exercise_id_fkey"
            columns: ["library_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_session_exercises_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_session_exercises_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_session_exercises_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_records: {
        Row: {
          avg_hr_bpm: number | null
          category_id: string
          created_at: string
          hrv_ms: number | null
          id: string
          match_id: string | null
          max_hr_bpm: number | null
          notes: string | null
          player_id: string
          record_date: string
          record_type: string
          resting_hr_bpm: number | null
          training_session_id: string | null
          updated_at: string
          zone1_max_bpm: number | null
          zone1_minutes: number | null
          zone2_max_bpm: number | null
          zone2_minutes: number | null
          zone3_max_bpm: number | null
          zone3_minutes: number | null
          zone4_max_bpm: number | null
          zone4_minutes: number | null
          zone5_max_bpm: number | null
          zone5_minutes: number | null
        }
        Insert: {
          avg_hr_bpm?: number | null
          category_id: string
          created_at?: string
          hrv_ms?: number | null
          id?: string
          match_id?: string | null
          max_hr_bpm?: number | null
          notes?: string | null
          player_id: string
          record_date?: string
          record_type?: string
          resting_hr_bpm?: number | null
          training_session_id?: string | null
          updated_at?: string
          zone1_max_bpm?: number | null
          zone1_minutes?: number | null
          zone2_max_bpm?: number | null
          zone2_minutes?: number | null
          zone3_max_bpm?: number | null
          zone3_minutes?: number | null
          zone4_max_bpm?: number | null
          zone4_minutes?: number | null
          zone5_max_bpm?: number | null
          zone5_minutes?: number | null
        }
        Update: {
          avg_hr_bpm?: number | null
          category_id?: string
          created_at?: string
          hrv_ms?: number | null
          id?: string
          match_id?: string | null
          max_hr_bpm?: number | null
          notes?: string | null
          player_id?: string
          record_date?: string
          record_type?: string
          resting_hr_bpm?: number | null
          training_session_id?: string | null
          updated_at?: string
          zone1_max_bpm?: number | null
          zone1_minutes?: number | null
          zone2_max_bpm?: number | null
          zone2_minutes?: number | null
          zone3_max_bpm?: number | null
          zone3_minutes?: number | null
          zone4_max_bpm?: number | null
          zone4_minutes?: number | null
          zone5_max_bpm?: number | null
          zone5_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_records_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_records_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_protocols: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          injury_category: string
          is_system_default: boolean | null
          name: string
          typical_duration_days_max: number | null
          typical_duration_days_min: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          injury_category: string
          is_system_default?: boolean | null
          name: string
          typical_duration_days_max?: number | null
          typical_duration_days_min?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          injury_category?: string
          is_system_default?: boolean | null
          name?: string
          typical_duration_days_max?: number | null
          typical_duration_days_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_protocols_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      jump_tests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          notes: string | null
          player_id: string
          result_cm: number
          test_date: string
          test_type: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          result_cm: number
          test_date?: string
          test_type: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          result_cm?: number
          test_date?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jump_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jump_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jump_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      kicking_attempts: {
        Row: {
          category_id: string
          created_at: string
          half: number | null
          id: string
          kick_type: string
          match_id: string
          minute: number | null
          notes: string | null
          player_id: string
          success: boolean
          zone_label: string | null
          zone_x: number
          zone_y: number
        }
        Insert: {
          category_id: string
          created_at?: string
          half?: number | null
          id?: string
          kick_type?: string
          match_id: string
          minute?: number | null
          notes?: string | null
          player_id: string
          success?: boolean
          zone_label?: string | null
          zone_x?: number
          zone_y?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          half?: number | null
          id?: string
          kick_type?: string
          match_id?: string
          minute?: number | null
          notes?: string | null
          player_id?: string
          success?: boolean
          zone_label?: string | null
          zone_x?: number
          zone_y?: number
        }
        Relationships: [
          {
            foreignKeyName: "kicking_attempts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kicking_attempts_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kicking_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kicking_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          boat_type: string | null
          created_at: string
          crew_role: string | null
          id: string
          is_starter: boolean | null
          match_id: string
          minutes_played: number | null
          player_id: string
          position: string | null
          seat_position: number | null
        }
        Insert: {
          boat_type?: string | null
          created_at?: string
          crew_role?: string | null
          id?: string
          is_starter?: boolean | null
          match_id: string
          minutes_played?: number | null
          player_id: string
          position?: string | null
          seat_position?: number | null
        }
        Update: {
          boat_type?: string | null
          created_at?: string
          crew_role?: string | null
          id?: string
          is_starter?: boolean | null
          match_id?: string
          minutes_played?: number | null
          player_id?: string
          position?: string | null
          seat_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sheet_players: {
        Row: {
          created_at: string
          id: string
          is_captain: boolean | null
          is_starter: boolean | null
          jersey_number: number | null
          match_sheet_id: string
          notes: string | null
          order_index: number | null
          player_id: string
          position: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_captain?: boolean | null
          is_starter?: boolean | null
          jersey_number?: number | null
          match_sheet_id: string
          notes?: string | null
          order_index?: number | null
          player_id: string
          position?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_captain?: boolean | null
          is_starter?: boolean | null
          jersey_number?: number | null
          match_sheet_id?: string
          notes?: string | null
          order_index?: number | null
          player_id?: string
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_sheet_players_match_sheet_id_fkey"
            columns: ["match_sheet_id"]
            isOneToOne: false
            referencedRelation: "match_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sheet_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sheet_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sheets: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          match_id: string | null
          match_time: string | null
          name: string
          notes: string | null
          opponent: string | null
          sheet_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          match_id?: string | null
          match_time?: string | null
          name: string
          notes?: string | null
          opponent?: string | null
          sheet_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          match_id?: string | null
          match_time?: string | null
          name?: string
          notes?: string | null
          opponent?: string | null
          sheet_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_sheets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sheets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stat_overrides: {
        Row: {
          created_at: string
          enabled_stats: string[]
          id: string
          match_id: string
        }
        Insert: {
          created_at?: string
          enabled_stats?: string[]
          id?: string
          match_id: string
        }
        Update: {
          created_at?: string
          enabled_stats?: string[]
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_stat_overrides_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          age_category: string | null
          average_play_sequence: number | null
          category_id: string
          competition: string | null
          competition_stage: string | null
          created_at: string
          distance_meters: number | null
          effective_play_time: number | null
          end_date: string | null
          event_type: string | null
          fis_calendar_event_id: string | null
          fis_event_factor: number | null
          fis_participants_count: number | null
          fis_pre_competition_validated: boolean | null
          fis_top5_points: Json | null
          id: string
          is_finalized: boolean | null
          is_home: boolean | null
          location: string | null
          longest_play_sequence: number | null
          match_date: string
          match_format: string | null
          match_time: string | null
          notes: string | null
          opponent: string
          parent_match_id: string | null
          score_away: number | null
          score_home: number | null
          updated_at: string
        }
        Insert: {
          age_category?: string | null
          average_play_sequence?: number | null
          category_id: string
          competition?: string | null
          competition_stage?: string | null
          created_at?: string
          distance_meters?: number | null
          effective_play_time?: number | null
          end_date?: string | null
          event_type?: string | null
          fis_calendar_event_id?: string | null
          fis_event_factor?: number | null
          fis_participants_count?: number | null
          fis_pre_competition_validated?: boolean | null
          fis_top5_points?: Json | null
          id?: string
          is_finalized?: boolean | null
          is_home?: boolean | null
          location?: string | null
          longest_play_sequence?: number | null
          match_date: string
          match_format?: string | null
          match_time?: string | null
          notes?: string | null
          opponent: string
          parent_match_id?: string | null
          score_away?: number | null
          score_home?: number | null
          updated_at?: string
        }
        Update: {
          age_category?: string | null
          average_play_sequence?: number | null
          category_id?: string
          competition?: string | null
          competition_stage?: string | null
          created_at?: string
          distance_meters?: number | null
          effective_play_time?: number | null
          end_date?: string | null
          event_type?: string | null
          fis_calendar_event_id?: string | null
          fis_event_factor?: number | null
          fis_participants_count?: number | null
          fis_pre_competition_validated?: boolean | null
          fis_top5_points?: Json | null
          id?: string
          is_finalized?: boolean | null
          is_home?: boolean | null
          location?: string | null
          longest_play_sequence?: number | null
          match_date?: string
          match_format?: string | null
          match_time?: string | null
          notes?: string | null
          opponent?: string
          parent_match_id?: string | null
          score_away?: number | null
          score_home?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_fis_calendar_event_id_fkey"
            columns: ["fis_calendar_event_id"]
            isOneToOne: false
            referencedRelation: "fis_calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_parent_match_id_fkey"
            columns: ["parent_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          category_id: string
          created_at: string
          document_url: string | null
          expiry_date: string | null
          id: string
          last_reminder_sent: string | null
          location: string | null
          name: string
          next_due_date: string | null
          notes: string | null
          player_id: string
          provider: string | null
          record_date: string
          record_type: string
          reminder_days_before: number | null
          reminder_enabled: boolean | null
          result: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          last_reminder_sent?: string | null
          location?: string | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          player_id: string
          provider?: string | null
          record_date: string
          record_type: string
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          result?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          last_reminder_sent?: string | null
          location?: string | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          player_id?: string
          provider?: string | null
          record_date?: string
          record_type?: string
          reminder_days_before?: number | null
          reminder_enabled?: boolean | null
          result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      menstrual_cycles: {
        Row: {
          category_id: string
          created_at: string
          cycle_length_days: number | null
          cycle_start_date: string
          id: string
          notes: string | null
          period_length_days: number | null
          player_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          cycle_length_days?: number | null
          cycle_start_date: string
          id?: string
          notes?: string | null
          period_length_days?: number | null
          player_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          cycle_length_days?: number | null
          cycle_start_date?: string
          id?: string
          notes?: string | null
          period_length_days?: number | null
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menstrual_cycles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_cycles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      menstrual_symptoms: {
        Row: {
          category_id: string
          created_at: string
          cycle_day: number | null
          energy_level: number | null
          id: string
          mood_level: number | null
          notes: string | null
          pain_level: number | null
          phase: string | null
          player_id: string
          sleep_quality: number | null
          symptoms: string[] | null
          tracking_date: string
        }
        Insert: {
          category_id: string
          created_at?: string
          cycle_day?: number | null
          energy_level?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          pain_level?: number | null
          phase?: string | null
          player_id: string
          sleep_quality?: number | null
          symptoms?: string[] | null
          tracking_date?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          cycle_day?: number | null
          energy_level?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          pain_level?: number | null
          phase?: string | null
          player_id?: string
          sleep_quality?: number | null
          symptoms?: string[] | null
          tracking_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "menstrual_symptoms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_symptoms_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menstrual_symptoms_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_assessments: {
        Row: {
          anxiety_level: number | null
          areas_to_improve: string | null
          assessed_by: string | null
          assessment_date: string
          assessment_type: string
          category_id: string
          confidence_level: number | null
          created_at: string
          focus_level: number | null
          id: string
          mental_prep_notes: string | null
          motivation_level: number | null
          player_id: string
          resilience_level: number | null
          strengths: string | null
          team_cohesion: number | null
          updated_at: string
        }
        Insert: {
          anxiety_level?: number | null
          areas_to_improve?: string | null
          assessed_by?: string | null
          assessment_date?: string
          assessment_type: string
          category_id: string
          confidence_level?: number | null
          created_at?: string
          focus_level?: number | null
          id?: string
          mental_prep_notes?: string | null
          motivation_level?: number | null
          player_id: string
          resilience_level?: number | null
          strengths?: string | null
          team_cohesion?: number | null
          updated_at?: string
        }
        Update: {
          anxiety_level?: number | null
          areas_to_improve?: string | null
          assessed_by?: string | null
          assessment_date?: string
          assessment_type?: string
          category_id?: string
          confidence_level?: number | null
          created_at?: string
          focus_level?: number | null
          id?: string
          mental_prep_notes?: string | null
          motivation_level?: number | null
          player_id?: string
          resilience_level?: number | null
          strengths?: string | null
          team_cohesion?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mental_assessments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_goals: {
        Row: {
          category_id: string
          created_at: string
          goal_description: string | null
          goal_title: string
          goal_type: string
          id: string
          player_id: string
          progress_percentage: number | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          goal_description?: string | null
          goal_title: string
          goal_type: string
          id?: string
          player_id: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          goal_description?: string | null
          goal_title?: string
          goal_type?: string
          id?: string
          player_id?: string
          progress_percentage?: number | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mental_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_prep_sessions: {
        Row: {
          category_id: string
          created_at: string
          duration_minutes: number | null
          exercises_practiced: string | null
          homework: string | null
          id: string
          next_session_date: string | null
          player_feedback: string | null
          player_id: string
          practitioner_name: string | null
          session_date: string
          session_type: string
          topics_covered: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          duration_minutes?: number | null
          exercises_practiced?: string | null
          homework?: string | null
          id?: string
          next_session_date?: string | null
          player_feedback?: string | null
          player_id: string
          practitioner_name?: string | null
          session_date: string
          session_type: string
          topics_covered?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          duration_minutes?: number | null
          exercises_practiced?: string | null
          homework?: string | null
          id?: string
          next_session_date?: string | null
          player_feedback?: string | null
          player_id?: string
          practitioner_name?: string | null
          session_date?: string
          session_type?: string
          topics_covered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mental_prep_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_prep_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mental_prep_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          action_data: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_announcement: boolean | null
          is_urgent: boolean | null
          message_type: string | null
          poll_id: string | null
          read_by: string[] | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_announcement?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
          poll_id?: string | null
          read_by?: string[] | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_announcement?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
          poll_id?: string | null
          read_by?: string[] | null
          sender_id?: string
          updated_at?: string
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
            foreignKeyName: "messages_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_tests: {
        Row: {
          category_id: string
          created_at: string
          id: string
          left_score: number | null
          notes: string | null
          player_id: string
          right_score: number | null
          score: number | null
          test_date: string
          test_type: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          left_score?: number | null
          notes?: string | null
          player_id: string
          right_score?: number | null
          score?: number | null
          test_date?: string
          test_type: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          left_score?: number | null
          notes?: string | null
          player_id?: string
          right_score?: number | null
          score?: number | null
          test_date?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobility_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      national_team_event_types: {
        Row: {
          category_id: string
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "national_team_event_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      national_team_events: {
        Row: {
          category_id: string
          created_at: string
          end_date: string | null
          event_type: string
          event_type_id: string | null
          id: string
          is_home: boolean | null
          location: string | null
          name: string
          notes: string | null
          opponent: string | null
          score_away: number | null
          score_home: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          end_date?: string | null
          event_type: string
          event_type_id?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          opponent?: string | null
          score_away?: number | null
          score_home?: number | null
          start_date: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          end_date?: string | null
          event_type?: string
          event_type_id?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          opponent?: string | null
          score_away?: number | null
          score_home?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "national_team_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_team_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "national_team_event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          birthday_alerts: boolean | null
          category_id: string | null
          created_at: string
          daily_digest: boolean | null
          digest_time: string | null
          id: string
          injury_alerts: boolean | null
          medical_reminders: boolean | null
          protocol_updates: boolean | null
          test_reminders: boolean | null
          updated_at: string
          user_id: string
          wellness_alerts: boolean | null
        }
        Insert: {
          birthday_alerts?: boolean | null
          category_id?: string | null
          created_at?: string
          daily_digest?: boolean | null
          digest_time?: string | null
          id?: string
          injury_alerts?: boolean | null
          medical_reminders?: boolean | null
          protocol_updates?: boolean | null
          test_reminders?: boolean | null
          updated_at?: string
          user_id: string
          wellness_alerts?: boolean | null
        }
        Update: {
          birthday_alerts?: boolean | null
          category_id?: string | null
          created_at?: string
          daily_digest?: boolean | null
          digest_time?: string | null
          id?: string
          injury_alerts?: boolean | null
          medical_reminders?: boolean | null
          protocol_updates?: boolean | null
          test_reminders?: boolean | null
          updated_at?: string
          user_id?: string
          wellness_alerts?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category_id: string
          created_at: string
          id: string
          injury_id: string | null
          is_read: boolean
          message: string
          metadata: Json | null
          notification_subtype: string | null
          notification_type: string
          priority: string | null
          scheduled_for: string | null
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
          metadata?: Json | null
          notification_subtype?: string | null
          notification_type: string
          priority?: string | null
          scheduled_for?: string | null
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
          metadata?: Json | null
          notification_subtype?: string | null
          notification_type?: string
          priority?: string | null
          scheduled_for?: string | null
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
      nutrition_entries: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category_id: string
          created_at: string
          entry_date: string
          fats_g: number | null
          id: string
          meal_description: string | null
          meal_type: string
          notes: string | null
          player_id: string
          proteins_g: number | null
          water_ml: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category_id: string
          created_at?: string
          entry_date?: string
          fats_g?: number | null
          id?: string
          meal_description?: string | null
          meal_type: string
          notes?: string | null
          player_id: string
          proteins_g?: number | null
          water_ml?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category_id?: string
          created_at?: string
          entry_date?: string
          fats_g?: number | null
          id?: string
          meal_description?: string | null
          meal_type?: string
          notes?: string | null
          player_id?: string
          proteins_g?: number | null
          water_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      padel_session_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          match_id: string | null
          player_id: string
          training_session_id: string | null
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          match_id?: string | null
          player_id: string
          training_session_id?: string | null
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          match_id?: string | null
          player_id?: string
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "padel_session_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "player_padel_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padel_session_equipment_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padel_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padel_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padel_session_equipment_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_settings: {
        Row: {
          accent_color: string | null
          category_id: string | null
          club_id: string | null
          club_name_override: string | null
          created_at: string
          footer_text: string | null
          header_color: string | null
          id: string
          logo_url: string | null
          show_category_name: boolean | null
          show_club_name: boolean | null
          show_date: boolean | null
          show_logo: boolean | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          category_id?: string | null
          club_id?: string | null
          club_name_override?: string | null
          created_at?: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_url?: string | null
          show_category_name?: boolean | null
          show_club_name?: boolean | null
          show_date?: boolean | null
          show_logo?: boolean | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          category_id?: string | null
          club_id?: string | null
          club_name_override?: string | null
          created_at?: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          logo_url?: string | null
          show_category_name?: boolean | null
          show_club_name?: boolean | null
          show_date?: boolean | null
          show_logo?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_categories: {
        Row: {
          category_id: string
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_cycles: {
        Row: {
          category_id: string
          color: string
          created_at: string
          cycle_type: string | null
          dominant_quality: string | null
          end_date: string
          fatigue_target: string | null
          id: string
          intensity: number | null
          load_pattern: string | null
          name: string
          notes: string | null
          objective: string | null
          periodization_category_id: string
          sessions_per_week: number | null
          start_date: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          category_id: string
          color?: string
          created_at?: string
          cycle_type?: string | null
          dominant_quality?: string | null
          end_date: string
          fatigue_target?: string | null
          id?: string
          intensity?: number | null
          load_pattern?: string | null
          name: string
          notes?: string | null
          objective?: string | null
          periodization_category_id: string
          sessions_per_week?: number | null
          start_date: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string
          cycle_type?: string | null
          dominant_quality?: string | null
          end_date?: string
          fatigue_target?: string | null
          id?: string
          intensity?: number | null
          load_pattern?: string | null
          name?: string
          notes?: string | null
          objective?: string | null
          periodization_category_id?: string
          sessions_per_week?: number | null
          start_date?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "periodization_cycles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodization_cycles_periodization_category_id_fkey"
            columns: ["periodization_category_id"]
            isOneToOne: false
            referencedRelation: "periodization_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      periodization_saved_colors: {
        Row: {
          category_id: string
          color: string
          created_at: string
          id: string
        }
        Insert: {
          category_id: string
          color: string
          created_at?: string
          id?: string
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodization_saved_colors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      player_academic_profiles: {
        Row: {
          category_id: string
          class_name: string | null
          created_at: string
          grade_level: string | null
          id: string
          player_id: string
          school_contact_email: string | null
          school_contact_name: string | null
          school_contact_phone: string | null
          school_name: string | null
          special_arrangements: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          class_name?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          player_id: string
          school_contact_email?: string | null
          school_contact_name?: string | null
          school_contact_phone?: string | null
          school_name?: string | null
          special_arrangements?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          class_name?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          player_id?: string
          school_contact_email?: string | null
          school_contact_name?: string | null
          school_contact_phone?: string | null
          school_name?: string | null
          special_arrangements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_academic_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_academic_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_academic_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_academic_tracking: {
        Row: {
          absence_reason: string | null
          academic_grade: number | null
          category_id: string
          created_at: string
          grade_scale: string | null
          id: string
          notes: string | null
          player_id: string
          school_absence_hours: number | null
          subject: string | null
          tracking_date: string
        }
        Insert: {
          absence_reason?: string | null
          academic_grade?: number | null
          category_id: string
          created_at?: string
          grade_scale?: string | null
          id?: string
          notes?: string | null
          player_id: string
          school_absence_hours?: number | null
          subject?: string | null
          tracking_date?: string
        }
        Update: {
          absence_reason?: string | null
          academic_grade?: number | null
          category_id?: string
          created_at?: string
          grade_scale?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          school_absence_hours?: number | null
          subject?: string | null
          tracking_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_academic_tracking_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_academic_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_academic_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_availability_scores: {
        Row: {
          availability_status: string
          awcr_score: number | null
          category_id: string
          created_at: string
          fatigue_score: number | null
          id: string
          injury_score: number | null
          notes: string | null
          overall_score: number | null
          player_id: string
          score_date: string
          wellness_score: number | null
        }
        Insert: {
          availability_status?: string
          awcr_score?: number | null
          category_id: string
          created_at?: string
          fatigue_score?: number | null
          id?: string
          injury_score?: number | null
          notes?: string | null
          overall_score?: number | null
          player_id: string
          score_date?: string
          wellness_score?: number | null
        }
        Update: {
          availability_status?: string
          awcr_score?: number | null
          category_id?: string
          created_at?: string
          fatigue_score?: number | null
          id?: string
          injury_score?: number | null
          notes?: string | null
          overall_score?: number | null
          player_id?: string
          score_date?: string
          wellness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_availability_scores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_bowling_arsenal: {
        Row: {
          balance_type: string | null
          ball_catalog_id: string | null
          category_id: string
          created_at: string
          current_surface: string | null
          custom_ball_brand: string | null
          custom_ball_name: string | null
          custom_differential: number | null
          custom_intermediate_diff: number | null
          custom_rg: number | null
          drilling_layout: string | null
          games_played: number
          id: string
          is_active: boolean
          notes: string | null
          player_id: string
          purchase_date: string | null
          updated_at: string
          weight_lbs: number | null
        }
        Insert: {
          balance_type?: string | null
          ball_catalog_id?: string | null
          category_id: string
          created_at?: string
          current_surface?: string | null
          custom_ball_brand?: string | null
          custom_ball_name?: string | null
          custom_differential?: number | null
          custom_intermediate_diff?: number | null
          custom_rg?: number | null
          drilling_layout?: string | null
          games_played?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id: string
          purchase_date?: string | null
          updated_at?: string
          weight_lbs?: number | null
        }
        Update: {
          balance_type?: string | null
          ball_catalog_id?: string | null
          category_id?: string
          created_at?: string
          current_surface?: string | null
          custom_ball_brand?: string | null
          custom_ball_name?: string | null
          custom_differential?: number | null
          custom_intermediate_diff?: number | null
          custom_rg?: number | null
          drilling_layout?: string | null
          games_played?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id?: string
          purchase_date?: string | null
          updated_at?: string
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_bowling_arsenal_ball_catalog_id_fkey"
            columns: ["ball_catalog_id"]
            isOneToOne: false
            referencedRelation: "bowling_ball_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_bowling_arsenal_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_bowling_arsenal_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_bowling_arsenal_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_caps: {
        Row: {
          cap_date: string
          cap_number: number | null
          category_id: string
          competition: string | null
          created_at: string
          event_id: string | null
          id: string
          minutes_played: number | null
          notes: string | null
          opponent: string | null
          player_id: string
          points: number | null
          tries: number | null
          was_starter: boolean | null
        }
        Insert: {
          cap_date: string
          cap_number?: number | null
          category_id: string
          competition?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          player_id: string
          points?: number | null
          tries?: number | null
          was_starter?: boolean | null
        }
        Update: {
          cap_date?: string
          cap_number?: number | null
          category_id?: string
          competition?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          player_id?: string
          points?: number | null
          tries?: number | null
          was_starter?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_caps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_caps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "national_team_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_caps_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_caps_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_categories: {
        Row: {
          category_id: string
          club_id: string
          id: string
          is_primary: boolean | null
          joined_at: string | null
          player_id: string
          status: string
        }
        Insert: {
          category_id: string
          club_id: string
          id?: string
          is_primary?: boolean | null
          joined_at?: string | null
          player_id: string
          status?: string
        }
        Update: {
          category_id?: string
          club_id?: string
          id?: string
          is_primary?: boolean | null
          joined_at?: string | null
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_categories_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_categories_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_contacts: {
        Row: {
          address: string | null
          category_id: string
          contact_type: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          player_id: string
          relationship: string | null
        }
        Insert: {
          address?: string | null
          category_id: string
          contact_type?: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          player_id: string
          relationship?: string | null
        }
        Update: {
          address?: string | null
          category_id?: string
          contact_type?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          player_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_contacts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_contacts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_contacts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_development_plans: {
        Row: {
          academic_objectives: string | null
          annual_summary: string | null
          category_id: string
          created_at: string
          id: string
          mental_objectives: string | null
          physical_objectives: string | null
          player_id: string
          season_year: number
          semester1_review: string | null
          semester2_review: string | null
          tactical_objectives: string | null
          technical_objectives: string | null
          updated_at: string
        }
        Insert: {
          academic_objectives?: string | null
          annual_summary?: string | null
          category_id: string
          created_at?: string
          id?: string
          mental_objectives?: string | null
          physical_objectives?: string | null
          player_id: string
          season_year: number
          semester1_review?: string | null
          semester2_review?: string | null
          tactical_objectives?: string | null
          technical_objectives?: string | null
          updated_at?: string
        }
        Update: {
          academic_objectives?: string | null
          annual_summary?: string | null
          category_id?: string
          created_at?: string
          id?: string
          mental_objectives?: string | null
          physical_objectives?: string | null
          player_id?: string
          season_year?: number
          semester1_review?: string | null
          semester2_review?: string | null
          tactical_objectives?: string | null
          technical_objectives?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_development_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_development_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_development_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_evaluations: {
        Row: {
          areas_to_improve: string | null
          attitude_score: number | null
          category_id: string
          created_at: string
          evaluated_by: string | null
          evaluation_date: string
          evaluation_period: string | null
          id: string
          mental_score: number | null
          overall_comments: string | null
          physical_score: number | null
          player_id: string
          strengths: string | null
          tactical_score: number | null
          technical_score: number | null
        }
        Insert: {
          areas_to_improve?: string | null
          attitude_score?: number | null
          category_id: string
          created_at?: string
          evaluated_by?: string | null
          evaluation_date?: string
          evaluation_period?: string | null
          id?: string
          mental_score?: number | null
          overall_comments?: string | null
          physical_score?: number | null
          player_id: string
          strengths?: string | null
          tactical_score?: number | null
          technical_score?: number | null
        }
        Update: {
          areas_to_improve?: string | null
          attitude_score?: number | null
          category_id?: string
          created_at?: string
          evaluated_by?: string | null
          evaluation_date?: string
          evaluation_period?: string | null
          id?: string
          mental_score?: number | null
          overall_comments?: string | null
          physical_score?: number | null
          player_id?: string
          strengths?: string | null
          tactical_score?: number | null
          technical_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_evaluations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_exercise_completions: {
        Row: {
          completed: boolean | null
          completion_date: string
          created_at: string
          id: string
          notes: string | null
          phase_id: string
          player_id: string
          player_rehab_protocol_id: string
          protocol_exercise_id: string | null
          protocol_phase_exercise_id: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          completion_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          phase_id: string
          player_id: string
          player_rehab_protocol_id: string
          protocol_exercise_id?: string | null
          protocol_phase_exercise_id?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          completion_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          phase_id?: string
          player_id?: string
          player_rehab_protocol_id?: string
          protocol_exercise_id?: string | null
          protocol_phase_exercise_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_exercise_completions_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_exercise_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_exercise_completions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_exercise_completions_player_rehab_protocol_id_fkey"
            columns: ["player_rehab_protocol_id"]
            isOneToOne: false
            referencedRelation: "player_rehab_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_exercise_completions_protocol_exercise_id_fkey"
            columns: ["protocol_exercise_id"]
            isOneToOne: false
            referencedRelation: "protocol_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_exercise_completions_protocol_phase_exercise_id_fkey"
            columns: ["protocol_phase_exercise_id"]
            isOneToOne: false
            referencedRelation: "protocol_phase_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stats: {
        Row: {
          breakthroughs: number | null
          carries: number | null
          conversions: number | null
          created_at: string
          defensive_recoveries: number | null
          drop_goals: number | null
          id: string
          match_id: string
          meters_gained: number | null
          notes: string | null
          offloads: number | null
          penalties_scored: number | null
          player_id: string
          red_cards: number | null
          sport_data: Json | null
          tackles: number | null
          tackles_missed: number | null
          total_contacts: number | null
          tries: number | null
          turnovers_won: number | null
          yellow_cards: number | null
        }
        Insert: {
          breakthroughs?: number | null
          carries?: number | null
          conversions?: number | null
          created_at?: string
          defensive_recoveries?: number | null
          drop_goals?: number | null
          id?: string
          match_id: string
          meters_gained?: number | null
          notes?: string | null
          offloads?: number | null
          penalties_scored?: number | null
          player_id: string
          red_cards?: number | null
          sport_data?: Json | null
          tackles?: number | null
          tackles_missed?: number | null
          total_contacts?: number | null
          tries?: number | null
          turnovers_won?: number | null
          yellow_cards?: number | null
        }
        Update: {
          breakthroughs?: number | null
          carries?: number | null
          conversions?: number | null
          created_at?: string
          defensive_recoveries?: number | null
          drop_goals?: number | null
          id?: string
          match_id?: string
          meters_gained?: number | null
          notes?: string | null
          offloads?: number | null
          penalties_scored?: number | null
          player_id?: string
          red_cards?: number | null
          sport_data?: Json | null
          tackles?: number | null
          tackles_missed?: number | null
          total_contacts?: number | null
          tries?: number | null
          turnovers_won?: number | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
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
          {
            foreignKeyName: "player_measurements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_medals: {
        Row: {
          awarded_date: string
          category_id: string
          created_at: string
          created_by: string | null
          custom_title: string | null
          group_id: string | null
          id: string
          match_id: string
          medal_type: string
          notes: string | null
          player_id: string
          rank: number | null
          team_label: string | null
          updated_at: string
        }
        Insert: {
          awarded_date?: string
          category_id: string
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          group_id?: string | null
          id?: string
          match_id: string
          medal_type: string
          notes?: string | null
          player_id: string
          rank?: number | null
          team_label?: string | null
          updated_at?: string
        }
        Update: {
          awarded_date?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          group_id?: string | null
          id?: string
          match_id?: string
          medal_type?: string
          notes?: string | null
          player_id?: string
          rank?: number | null
          team_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_medals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_medals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_medals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_medals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_objectives: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          metric_name: string | null
          metric_unit: string | null
          objective_type: string
          player_id: string
          progress_percentage: number | null
          season_year: number
          status: string
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          metric_name?: string | null
          metric_unit?: string | null
          objective_type?: string
          player_id: string
          progress_percentage?: number | null
          season_year?: number
          status?: string
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          metric_name?: string | null
          metric_unit?: string | null
          objective_type?: string
          player_id?: string
          progress_percentage?: number | null
          season_year?: number
          status?: string
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_objectives_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_objectives_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_objectives_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_padel_equipment: {
        Row: {
          accessory_brand: string | null
          accessory_description: string | null
          accessory_type: string | null
          category_id: string
          created_at: string
          equipment_type: string
          id: string
          is_active: boolean
          notes: string | null
          player_id: string
          racket_balance: string | null
          racket_brand: string | null
          racket_model: string | null
          racket_shape: string | null
          racket_surface: string | null
          racket_weight_g: number | null
          shoe_brand: string | null
          shoe_model: string | null
          updated_at: string
        }
        Insert: {
          accessory_brand?: string | null
          accessory_description?: string | null
          accessory_type?: string | null
          category_id: string
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id: string
          racket_balance?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          racket_shape?: string | null
          racket_surface?: string | null
          racket_weight_g?: number | null
          shoe_brand?: string | null
          shoe_model?: string | null
          updated_at?: string
        }
        Update: {
          accessory_brand?: string | null
          accessory_description?: string | null
          accessory_type?: string | null
          category_id?: string
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id?: string
          racket_balance?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          racket_shape?: string | null
          racket_surface?: string | null
          racket_weight_g?: number | null
          shoe_brand?: string | null
          shoe_model?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_padel_equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_padel_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_padel_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_performance_references: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          player_id: string
          ref_acceleration_max: number | null
          ref_deceleration_max: number | null
          ref_high_intensity_distance_per_min: number | null
          ref_impacts_per_min: number | null
          ref_player_load_per_min: number | null
          ref_sprint_distance_m: number | null
          ref_time_40m_seconds: number | null
          ref_vmax_kmh: number | null
          ref_vmax_ms: number | null
          source_id: string | null
          source_type: string
          test_date: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id: string
          ref_acceleration_max?: number | null
          ref_deceleration_max?: number | null
          ref_high_intensity_distance_per_min?: number | null
          ref_impacts_per_min?: number | null
          ref_player_load_per_min?: number | null
          ref_sprint_distance_m?: number | null
          ref_time_40m_seconds?: number | null
          ref_vmax_kmh?: number | null
          ref_vmax_ms?: number | null
          source_id?: string | null
          source_type?: string
          test_date: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id?: string
          ref_acceleration_max?: number | null
          ref_deceleration_max?: number | null
          ref_high_intensity_distance_per_min?: number | null
          ref_impacts_per_min?: number | null
          ref_player_load_per_min?: number | null
          ref_sprint_distance_m?: number | null
          ref_time_40m_seconds?: number | null
          ref_vmax_kmh?: number | null
          ref_vmax_ms?: number | null
          source_id?: string | null
          source_type?: string
          test_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_performance_references_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_performance_references_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_performance_references_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rehab_exercises: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          exercise_library_id: string | null
          exercise_order: number
          frequency: string | null
          id: string
          image_url: string | null
          is_completed: boolean
          name: string
          notes: string | null
          phase_id: string | null
          phase_number: number
          player_rehab_protocol_id: string
          reps: string | null
          sets: number | null
          source_exercise_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          exercise_library_id?: string | null
          exercise_order?: number
          frequency?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          name: string
          notes?: string | null
          phase_id?: string | null
          phase_number?: number
          player_rehab_protocol_id: string
          reps?: string | null
          sets?: number | null
          source_exercise_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          exercise_library_id?: string | null
          exercise_order?: number
          frequency?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean
          name?: string
          notes?: string | null
          phase_id?: string | null
          phase_number?: number
          player_rehab_protocol_id?: string
          reps?: string | null
          sets?: number | null
          source_exercise_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_rehab_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_exercises_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_exercises_player_rehab_protocol_id_fkey"
            columns: ["player_rehab_protocol_id"]
            isOneToOne: false
            referencedRelation: "player_rehab_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_exercises_source_exercise_id_fkey"
            columns: ["source_exercise_id"]
            isOneToOne: false
            referencedRelation: "protocol_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rehab_protocols: {
        Row: {
          category_id: string
          completed_at: string | null
          created_at: string
          current_phase: number | null
          id: string
          injury_id: string
          notes: string | null
          player_id: string
          protocol_id: string
          recommended_load_reduction: number | null
          started_at: string | null
          status: string | null
          track_wellness: boolean | null
          updated_at: string
        }
        Insert: {
          category_id: string
          completed_at?: string | null
          created_at?: string
          current_phase?: number | null
          id?: string
          injury_id: string
          notes?: string | null
          player_id: string
          protocol_id: string
          recommended_load_reduction?: number | null
          started_at?: string | null
          status?: string | null
          track_wellness?: boolean | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          completed_at?: string | null
          created_at?: string
          current_phase?: number | null
          id?: string
          injury_id?: string
          notes?: string | null
          player_id?: string
          protocol_id?: string
          recommended_load_reduction?: number | null
          started_at?: string | null
          status?: string | null
          track_wellness?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_rehab_protocols_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_protocols_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_protocols_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_protocols_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rehab_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "injury_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      player_selections: {
        Row: {
          category_id: string
          competition_name: string | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          player_id: string
          selection_date: string
          selection_type: string
        }
        Insert: {
          category_id: string
          competition_name?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          player_id: string
          selection_date?: string
          selection_type: string
        }
        Update: {
          category_id?: string
          competition_name?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          selection_date?: string
          selection_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_selections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_selections_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_selections_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ski_equipment: {
        Row: {
          boot_brand: string | null
          boot_flex: number | null
          boot_model: string | null
          camber_type: string | null
          category_id: string
          created_at: string
          equipment_type: string
          id: string
          is_active: boolean
          notes: string | null
          player_id: string
          ski_brand: string | null
          ski_length_cm: number | null
          ski_model: string | null
          ski_radius_m: number | null
          ski_stiffness: string | null
          sole_structure: string | null
          updated_at: string
          wax_brand: string | null
          wax_humidity_range: string | null
          wax_temp_range: string | null
          wax_type: string | null
        }
        Insert: {
          boot_brand?: string | null
          boot_flex?: number | null
          boot_model?: string | null
          camber_type?: string | null
          category_id: string
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id: string
          ski_brand?: string | null
          ski_length_cm?: number | null
          ski_model?: string | null
          ski_radius_m?: number | null
          ski_stiffness?: string | null
          sole_structure?: string | null
          updated_at?: string
          wax_brand?: string | null
          wax_humidity_range?: string | null
          wax_temp_range?: string | null
          wax_type?: string | null
        }
        Update: {
          boot_brand?: string | null
          boot_flex?: number | null
          boot_model?: string | null
          camber_type?: string | null
          category_id?: string
          created_at?: string
          equipment_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          player_id?: string
          ski_brand?: string | null
          ski_length_cm?: number | null
          ski_model?: string | null
          ski_radius_m?: number | null
          ski_stiffness?: string | null
          sole_structure?: string | null
          updated_at?: string
          wax_brand?: string | null
          wax_humidity_range?: string | null
          wax_temp_range?: string | null
          wax_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_ski_equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ski_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ski_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_surf_equipment: {
        Row: {
          board_brand: string | null
          board_length_feet: number | null
          board_model: string | null
          board_shaper: string | null
          board_thickness_inches: number | null
          board_type: string | null
          board_volume_liters: number | null
          board_width_inches: number | null
          category_id: string
          created_at: string
          equipment_type: string
          fins_brand: string | null
          fins_model: string | null
          fins_type: string | null
          id: string
          image_url: string | null
          is_active: boolean
          notes: string | null
          player_id: string
          purchase_date: string | null
          updated_at: string
          wetsuit_brand: string | null
          wetsuit_thickness: string | null
        }
        Insert: {
          board_brand?: string | null
          board_length_feet?: number | null
          board_model?: string | null
          board_shaper?: string | null
          board_thickness_inches?: number | null
          board_type?: string | null
          board_volume_liters?: number | null
          board_width_inches?: number | null
          category_id: string
          created_at?: string
          equipment_type?: string
          fins_brand?: string | null
          fins_model?: string | null
          fins_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          player_id: string
          purchase_date?: string | null
          updated_at?: string
          wetsuit_brand?: string | null
          wetsuit_thickness?: string | null
        }
        Update: {
          board_brand?: string | null
          board_length_feet?: number | null
          board_model?: string | null
          board_shaper?: string | null
          board_thickness_inches?: number | null
          board_type?: string | null
          board_volume_liters?: number | null
          board_width_inches?: number | null
          category_id?: string
          created_at?: string
          equipment_type?: string
          fins_brand?: string | null
          fins_model?: string | null
          fins_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          notes?: string | null
          player_id?: string
          purchase_date?: string | null
          updated_at?: string
          wetsuit_brand?: string | null
          wetsuit_thickness?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_surf_equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_surf_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_surf_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      player_transfers: {
        Row: {
          created_at: string
          from_category_id: string
          id: string
          notes: string | null
          player_id: string
          reason: string | null
          to_category_id: string
          transfer_date: string
          transferred_by: string | null
        }
        Insert: {
          created_at?: string
          from_category_id: string
          id?: string
          notes?: string | null
          player_id: string
          reason?: string | null
          to_category_id: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Update: {
          created_at?: string
          from_category_id?: string
          id?: string
          notes?: string | null
          player_id?: string
          reason?: string | null
          to_category_id?: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_transfers_from_category_id_fkey"
            columns: ["from_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_transfers_to_category_id_fkey"
            columns: ["to_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_year: number | null
          category_id: string
          club_origin: string | null
          created_at: string
          dietary_requirements: string | null
          discipline: string | null
          disciplines: string[] | null
          email: string | null
          emergency_notes: string | null
          first_name: string | null
          fis_code: string | null
          fis_objective: string | null
          fis_objective_date: string | null
          fis_points: number | null
          fis_ranking: number | null
          id: string
          medical_notes: string | null
          name: string
          parent_contact_1_email: string | null
          parent_contact_1_name: string | null
          parent_contact_1_phone: string | null
          parent_contact_1_relation: string | null
          parent_contact_2_email: string | null
          parent_contact_2_name: string | null
          parent_contact_2_phone: string | null
          parent_contact_2_relation: string | null
          phone: string | null
          position: string | null
          pwa_install_dismissed: boolean | null
          season_id: string | null
          specialties: string[] | null
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id: string
          club_origin?: string | null
          created_at?: string
          dietary_requirements?: string | null
          discipline?: string | null
          disciplines?: string[] | null
          email?: string | null
          emergency_notes?: string | null
          first_name?: string | null
          fis_code?: string | null
          fis_objective?: string | null
          fis_objective_date?: string | null
          fis_points?: number | null
          fis_ranking?: number | null
          id?: string
          medical_notes?: string | null
          name: string
          parent_contact_1_email?: string | null
          parent_contact_1_name?: string | null
          parent_contact_1_phone?: string | null
          parent_contact_1_relation?: string | null
          parent_contact_2_email?: string | null
          parent_contact_2_name?: string | null
          parent_contact_2_phone?: string | null
          parent_contact_2_relation?: string | null
          phone?: string | null
          position?: string | null
          pwa_install_dismissed?: boolean | null
          season_id?: string | null
          specialties?: string[] | null
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          allergies?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id?: string
          club_origin?: string | null
          created_at?: string
          dietary_requirements?: string | null
          discipline?: string | null
          disciplines?: string[] | null
          email?: string | null
          emergency_notes?: string | null
          first_name?: string | null
          fis_code?: string | null
          fis_objective?: string | null
          fis_objective_date?: string | null
          fis_points?: number | null
          fis_ranking?: number | null
          id?: string
          medical_notes?: string | null
          name?: string
          parent_contact_1_email?: string | null
          parent_contact_1_name?: string | null
          parent_contact_1_phone?: string | null
          parent_contact_1_relation?: string | null
          parent_contact_2_email?: string | null
          parent_contact_2_name?: string | null
          parent_contact_2_phone?: string | null
          parent_contact_2_relation?: string | null
          phone?: string | null
          position?: string | null
          pwa_install_dismissed?: boolean | null
          season_id?: string | null
          specialties?: string[] | null
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          category_id: string | null
          conversation_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_anonymous: boolean
          is_closed: boolean
          linked_event_id: string | null
          linked_event_type: string | null
          message_id: string | null
          poll_type: string
          question: string
          updated_at: string
        }
        Insert: {
          allow_multiple?: boolean
          category_id?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_closed?: boolean
          linked_event_id?: string | null
          linked_event_type?: string | null
          message_id?: string | null
          poll_type?: string
          question: string
          updated_at?: string
        }
        Update: {
          allow_multiple?: boolean
          category_id?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_anonymous?: boolean
          is_closed?: boolean
          linked_event_id?: string | null
          linked_event_type?: string | null
          message_id?: string | null
          poll_type?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      position_benchmarks: {
        Row: {
          bench_ratio_elite: number | null
          bench_ratio_good: number | null
          body_fat_max: number | null
          category_id: string
          cmj_cm_elite: number | null
          cmj_cm_good: number | null
          created_at: string
          id: string
          muscle_mass_min_ratio: number | null
          notes: string | null
          position: string
          sprint_40m_elite: number | null
          sprint_40m_good: number | null
          squat_ratio_elite: number | null
          squat_ratio_good: number | null
          updated_at: string
          yo_yo_level_elite: string | null
          yo_yo_level_good: string | null
        }
        Insert: {
          bench_ratio_elite?: number | null
          bench_ratio_good?: number | null
          body_fat_max?: number | null
          category_id: string
          cmj_cm_elite?: number | null
          cmj_cm_good?: number | null
          created_at?: string
          id?: string
          muscle_mass_min_ratio?: number | null
          notes?: string | null
          position: string
          sprint_40m_elite?: number | null
          sprint_40m_good?: number | null
          squat_ratio_elite?: number | null
          squat_ratio_good?: number | null
          updated_at?: string
          yo_yo_level_elite?: string | null
          yo_yo_level_good?: string | null
        }
        Update: {
          bench_ratio_elite?: number | null
          bench_ratio_good?: number | null
          body_fat_max?: number | null
          category_id?: string
          cmj_cm_elite?: number | null
          cmj_cm_good?: number | null
          created_at?: string
          id?: string
          muscle_mass_min_ratio?: number | null
          notes?: string | null
          position?: string
          sprint_40m_elite?: number | null
          sprint_40m_good?: number | null
          squat_ratio_elite?: number | null
          squat_ratio_good?: number | null
          updated_at?: string
          yo_yo_level_elite?: string | null
          yo_yo_level_good?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_benchmarks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      precision_exercise_types: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          label: string
          sport: string
          sub_discipline: string | null
          value: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          label: string
          sport: string
          sub_discipline?: string | null
          value: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          label?: string
          sport?: string
          sub_discipline?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "precision_exercise_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      precision_training: {
        Row: {
          attempts: number
          ball_arsenal_id: string | null
          category_id: string
          created_at: string
          exercise_label: string
          exercise_type_id: string | null
          id: string
          kick_origin_x: number | null
          kick_origin_y: number | null
          lineout_distance: string | null
          lineout_height: string | null
          notes: string | null
          player_id: string
          session_date: string
          success_rate: number | null
          successes: number
          training_session_id: string | null
          zone_x: number | null
          zone_y: number | null
        }
        Insert: {
          attempts?: number
          ball_arsenal_id?: string | null
          category_id: string
          created_at?: string
          exercise_label: string
          exercise_type_id?: string | null
          id?: string
          kick_origin_x?: number | null
          kick_origin_y?: number | null
          lineout_distance?: string | null
          lineout_height?: string | null
          notes?: string | null
          player_id: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
          zone_x?: number | null
          zone_y?: number | null
        }
        Update: {
          attempts?: number
          ball_arsenal_id?: string | null
          category_id?: string
          created_at?: string
          exercise_label?: string
          exercise_type_id?: string | null
          id?: string
          kick_origin_x?: number | null
          kick_origin_y?: number | null
          lineout_distance?: string | null
          lineout_height?: string | null
          notes?: string | null
          player_id?: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
          zone_x?: number | null
          zone_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "precision_training_ball_arsenal_id_fkey"
            columns: ["ball_arsenal_id"]
            isOneToOne: false
            referencedRelation: "player_bowling_arsenal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precision_training_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precision_training_exercise_type_id_fkey"
            columns: ["exercise_type_id"]
            isOneToOne: false
            referencedRelation: "precision_exercise_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precision_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precision_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precision_training_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
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
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      program_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          player_id: string
          program_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          player_id: string
          program_id: string
          start_date?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          player_id?: string
          program_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          bodyweight_data: Json | null
          cluster_sets: Json | null
          created_at: string
          drop_sets: Json | null
          erg_data: Json | null
          exercise_category: string | null
          exercise_name: string
          group_id: string | null
          group_order: number | null
          id: string
          is_rm_test: boolean | null
          library_exercise_id: string | null
          method: string | null
          notes: string | null
          order_index: number
          percentage_1rm: number | null
          reps: string | null
          rest_seconds: number | null
          rm_test_type: string | null
          running_data: Json | null
          session_id: string
          sets: number | null
          target_force_newton: number | null
          target_velocity: number | null
          tempo: string | null
        }
        Insert: {
          bodyweight_data?: Json | null
          cluster_sets?: Json | null
          created_at?: string
          drop_sets?: Json | null
          erg_data?: Json | null
          exercise_category?: string | null
          exercise_name: string
          group_id?: string | null
          group_order?: number | null
          id?: string
          is_rm_test?: boolean | null
          library_exercise_id?: string | null
          method?: string | null
          notes?: string | null
          order_index?: number
          percentage_1rm?: number | null
          reps?: string | null
          rest_seconds?: number | null
          rm_test_type?: string | null
          running_data?: Json | null
          session_id: string
          sets?: number | null
          target_force_newton?: number | null
          target_velocity?: number | null
          tempo?: string | null
        }
        Update: {
          bodyweight_data?: Json | null
          cluster_sets?: Json | null
          created_at?: string
          drop_sets?: Json | null
          erg_data?: Json | null
          exercise_category?: string | null
          exercise_name?: string
          group_id?: string | null
          group_order?: number | null
          id?: string
          is_rm_test?: boolean | null
          library_exercise_id?: string | null
          method?: string | null
          notes?: string | null
          order_index?: number
          percentage_1rm?: number | null
          reps?: string | null
          rest_seconds?: number | null
          rm_test_type?: string | null
          running_data?: Json | null
          session_id?: string
          sets?: number | null
          target_force_newton?: number | null
          target_velocity?: number | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_library_exercise_id_fkey"
            columns: ["library_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sessions: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          name: string | null
          scheduled_day: number | null
          session_number: number
          week_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          name?: string | null
          scheduled_day?: number | null
          session_number?: number
          week_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          name?: string | null
          scheduled_day?: number | null
          session_number?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          block_name: string | null
          block_order: number | null
          created_at: string
          id: string
          name: string | null
          program_id: string
          week_number: number
        }
        Insert: {
          block_name?: string | null
          block_order?: number | null
          created_at?: string
          id?: string
          name?: string | null
          program_id: string
          week_number?: number
        }
        Update: {
          block_name?: string | null
          block_order?: number | null
          created_at?: string
          id?: string
          name?: string | null
          program_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      prophylaxis_assignments: {
        Row: {
          category_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          player_id: string
          program_id: string
          start_date: string
        }
        Insert: {
          category_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          player_id: string
          program_id: string
          start_date?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          player_id?: string
          program_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "prophylaxis_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "prophylaxis_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      prophylaxis_exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_name: string
          id: string
          library_exercise_id: string | null
          notes: string | null
          order_index: number
          program_id: string
          reps: string | null
          rest_seconds: number | null
          sets: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          library_exercise_id?: string | null
          notes?: string | null
          order_index?: number
          program_id: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          library_exercise_id?: string | null
          notes?: string | null
          order_index?: number
          program_id?: string
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prophylaxis_exercises_library_exercise_id_fkey"
            columns: ["library_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "prophylaxis_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      prophylaxis_programs: {
        Row: {
          body_zone: string
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          player_id: string | null
          updated_at: string
        }
        Insert: {
          body_zone: string
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          player_id?: string | null
          updated_at?: string
        }
        Update: {
          body_zone?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          player_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prophylaxis_programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophylaxis_programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_exercises: {
        Row: {
          created_at: string
          description: string | null
          exercise_order: number | null
          frequency: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          phase_id: string
          reps: string | null
          sets: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          exercise_order?: number | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          phase_id: string
          reps?: string | null
          sets?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          exercise_order?: number | null
          frequency?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          phase_id?: string
          reps?: string | null
          sets?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_exercises_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_phase_exercises: {
        Row: {
          created_at: string
          custom_exercise_name: string | null
          exercise_library_id: string | null
          exercise_order: number | null
          frequency: string | null
          id: string
          notes: string | null
          phase_id: string
          reps: string | null
          sets: number | null
        }
        Insert: {
          created_at?: string
          custom_exercise_name?: string | null
          exercise_library_id?: string | null
          exercise_order?: number | null
          frequency?: string | null
          id?: string
          notes?: string | null
          phase_id: string
          reps?: string | null
          sets?: number | null
        }
        Update: {
          created_at?: string
          custom_exercise_name?: string | null
          exercise_library_id?: string | null
          exercise_order?: number | null
          frequency?: string | null
          id?: string
          notes?: string | null
          phase_id?: string
          reps?: string | null
          sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_phase_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_phase_exercises_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_phases: {
        Row: {
          care_instructions: string[] | null
          created_at: string
          description: string | null
          duration_days_max: number | null
          duration_days_min: number | null
          exit_criteria: string[] | null
          id: string
          linked_program_id: string | null
          name: string
          objectives: string[] | null
          phase_number: number
          protocol_id: string
          taping_diagram_url: string | null
          taping_instructions: string[] | null
        }
        Insert: {
          care_instructions?: string[] | null
          created_at?: string
          description?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          exit_criteria?: string[] | null
          id?: string
          linked_program_id?: string | null
          name: string
          objectives?: string[] | null
          phase_number: number
          protocol_id: string
          taping_diagram_url?: string | null
          taping_instructions?: string[] | null
        }
        Update: {
          care_instructions?: string[] | null
          created_at?: string
          description?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          exit_criteria?: string[] | null
          id?: string
          linked_program_id?: string | null
          name?: string
          objectives?: string[] | null
          phase_number?: number
          protocol_id?: string
          taping_diagram_url?: string | null
          taping_instructions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_phases_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_phases_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "injury_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      public_access_tokens: {
        Row: {
          access_type: string
          category_id: string | null
          club_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          last_used_at: string | null
          token: string
        }
        Insert: {
          access_type?: string
          category_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          token?: string
        }
        Update: {
          access_type?: string
          category_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_access_tokens_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_access_tokens_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_access_tokens_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_journal: {
        Row: {
          active_recovery: boolean | null
          active_recovery_duration_min: number | null
          active_recovery_type: string | null
          bed_time: string | null
          category_id: string
          compression: boolean | null
          compression_duration_min: number | null
          compression_type: string | null
          contrast_bath: boolean | null
          contrast_bath_duration_min: number | null
          created_at: string
          cryotherapy: boolean | null
          cryotherapy_duration_min: number | null
          energy_level: number | null
          entry_date: string
          foam_rolling: boolean | null
          foam_rolling_duration_min: number | null
          ice_bath: boolean | null
          ice_bath_duration_min: number | null
          ice_bath_temperature: number | null
          id: string
          massage: boolean | null
          massage_duration_min: number | null
          massage_type: string | null
          muscle_readiness: number | null
          notes: string | null
          overall_recovery_score: number | null
          player_id: string
          protein_shake: boolean | null
          sauna: boolean | null
          sauna_duration_min: number | null
          sleep_duration_hours: number | null
          sleep_notes: string | null
          sleep_quality: number | null
          stretching: boolean | null
          stretching_duration_min: number | null
          stretching_type: string | null
          supplements_taken: string[] | null
          updated_at: string
          wake_time: string | null
          water_intake_liters: number | null
        }
        Insert: {
          active_recovery?: boolean | null
          active_recovery_duration_min?: number | null
          active_recovery_type?: string | null
          bed_time?: string | null
          category_id: string
          compression?: boolean | null
          compression_duration_min?: number | null
          compression_type?: string | null
          contrast_bath?: boolean | null
          contrast_bath_duration_min?: number | null
          created_at?: string
          cryotherapy?: boolean | null
          cryotherapy_duration_min?: number | null
          energy_level?: number | null
          entry_date?: string
          foam_rolling?: boolean | null
          foam_rolling_duration_min?: number | null
          ice_bath?: boolean | null
          ice_bath_duration_min?: number | null
          ice_bath_temperature?: number | null
          id?: string
          massage?: boolean | null
          massage_duration_min?: number | null
          massage_type?: string | null
          muscle_readiness?: number | null
          notes?: string | null
          overall_recovery_score?: number | null
          player_id: string
          protein_shake?: boolean | null
          sauna?: boolean | null
          sauna_duration_min?: number | null
          sleep_duration_hours?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          stretching?: boolean | null
          stretching_duration_min?: number | null
          stretching_type?: string | null
          supplements_taken?: string[] | null
          updated_at?: string
          wake_time?: string | null
          water_intake_liters?: number | null
        }
        Update: {
          active_recovery?: boolean | null
          active_recovery_duration_min?: number | null
          active_recovery_type?: string | null
          bed_time?: string | null
          category_id?: string
          compression?: boolean | null
          compression_duration_min?: number | null
          compression_type?: string | null
          contrast_bath?: boolean | null
          contrast_bath_duration_min?: number | null
          created_at?: string
          cryotherapy?: boolean | null
          cryotherapy_duration_min?: number | null
          energy_level?: number | null
          entry_date?: string
          foam_rolling?: boolean | null
          foam_rolling_duration_min?: number | null
          ice_bath?: boolean | null
          ice_bath_duration_min?: number | null
          ice_bath_temperature?: number | null
          id?: string
          massage?: boolean | null
          massage_duration_min?: number | null
          massage_type?: string | null
          muscle_readiness?: number | null
          notes?: string | null
          overall_recovery_score?: number | null
          player_id?: string
          protein_shake?: boolean | null
          sauna?: boolean | null
          sauna_duration_min?: number | null
          sleep_duration_hours?: number | null
          sleep_notes?: string | null
          sleep_quality?: number | null
          stretching?: boolean | null
          stretching_duration_min?: number | null
          stretching_type?: string | null
          supplements_taken?: string[] | null
          updated_at?: string
          wake_time?: string | null
          water_intake_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_journal_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_journal_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_journal_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_prospects: {
        Row: {
          birth_date: string | null
          category_id: string
          city: string | null
          created_at: string
          created_by: string | null
          current_club: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          rating: number | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          category_id: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          category_id?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          current_club?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_prospects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_calendar_events: {
        Row: {
          category_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_completed: boolean | null
          notes: string | null
          phase_id: string | null
          phase_name: string
          phase_number: number
          player_id: string
          player_rehab_protocol_id: string
          title: string
        }
        Insert: {
          category_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          phase_id?: string | null
          phase_name: string
          phase_number: number
          player_id: string
          player_rehab_protocol_id: string
          title: string
        }
        Update: {
          category_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          phase_id?: string | null
          phase_name?: string
          phase_number?: number
          player_id?: string
          player_rehab_protocol_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehab_calendar_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_calendar_events_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "protocol_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_calendar_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_calendar_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_calendar_events_player_rehab_protocol_id_fkey"
            columns: ["player_rehab_protocol_id"]
            isOneToOne: false
            referencedRelation: "player_rehab_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      rehab_exercise_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty_level: number | null
          exercise_id: string
          id: string
          logged_by: string | null
          notes: string | null
          pain_level: number | null
          player_rehab_protocol_id: string
          reps_completed: string | null
          sets_completed: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty_level?: number | null
          exercise_id: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          pain_level?: number | null
          player_rehab_protocol_id: string
          reps_completed?: string | null
          sets_completed?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty_level?: number | null
          exercise_id?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          pain_level?: number | null
          player_rehab_protocol_id?: string
          reps_completed?: string | null
          sets_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rehab_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "protocol_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehab_exercise_logs_player_rehab_protocol_id_fkey"
            columns: ["player_rehab_protocol_id"]
            isOneToOne: false
            referencedRelation: "player_rehab_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      return_to_play_protocols: {
        Row: {
          category_id: string
          completed_at: string | null
          created_at: string
          current_phase: number
          id: string
          injury_id: string
          notes: string | null
          player_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          completed_at?: string | null
          created_at?: string
          current_phase?: number
          id?: string
          injury_id: string
          notes?: string | null
          player_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          completed_at?: string | null
          created_at?: string
          current_phase?: number
          id?: string
          injury_id?: string
          notes?: string | null
          player_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_to_play_protocols_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_play_protocols_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_play_protocols_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_play_protocols_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      role_menu_permissions: {
        Row: {
          created_at: string
          id: string
          menu_key: string
          menu_label: string
          player_visible: boolean
          staff_admin_visible: boolean
          staff_administratif_visible: boolean
          staff_coach_visible: boolean
          staff_doctor_visible: boolean
          staff_prepa_visible: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_key: string
          menu_label: string
          player_visible?: boolean
          staff_admin_visible?: boolean
          staff_administratif_visible?: boolean
          staff_coach_visible?: boolean
          staff_doctor_visible?: boolean
          staff_prepa_visible?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_key?: string
          menu_label?: string
          player_visible?: boolean
          staff_admin_visible?: boolean
          staff_administratif_visible?: boolean
          staff_coach_visible?: boolean
          staff_doctor_visible?: boolean
          staff_prepa_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rtp_phase_completions: {
        Row: {
          checklist_completed: Json | null
          completed_at: string | null
          created_at: string
          id: string
          phase_name: string
          phase_number: number
          protocol_id: string
          started_at: string | null
          status: string
          validated_by: string | null
          validation_notes: string | null
        }
        Insert: {
          checklist_completed?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          phase_name: string
          phase_number: number
          protocol_id: string
          started_at?: string | null
          status?: string
          validated_by?: string | null
          validation_notes?: string | null
        }
        Update: {
          checklist_completed?: Json | null
          completed_at?: string | null
          created_at?: string
          id?: string
          phase_name?: string
          phase_number?: number
          protocol_id?: string
          started_at?: string | null
          status?: string
          validated_by?: string | null
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rtp_phase_completions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "return_to_play_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      rugby_specific_tests: {
        Row: {
          agility_time_seconds: number | null
          bronco_time_seconds: number | null
          category_id: string
          created_at: string
          id: string
          notes: string | null
          player_id: string
          test_date: string
          test_type: string
          yo_yo_distance_m: number | null
          yo_yo_level: string | null
        }
        Insert: {
          agility_time_seconds?: number | null
          bronco_time_seconds?: number | null
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          test_date?: string
          test_type: string
          yo_yo_distance_m?: number | null
          yo_yo_level?: string | null
        }
        Update: {
          agility_time_seconds?: number | null
          bronco_time_seconds?: number | null
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          test_date?: string
          test_type?: string
          yo_yo_distance_m?: number | null
          yo_yo_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rugby_specific_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rugby_specific_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rugby_specific_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      season_goals: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          goal_type: string
          id: string
          progress_percentage: number | null
          season_year: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          goal_type: string
          id?: string
          progress_percentage?: number | null
          season_year: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          progress_percentage?: number | null
          season_year?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      season_milestones: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          milestone_date: string
          milestone_type: string
          season_year: number
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          milestone_date: string
          milestone_type: string
          season_year: number
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          milestone_date?: string
          milestone_type?: string
          season_year?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_milestones_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          club_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          category_id: string | null
          cooldown_description: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          equipment_needed: string[] | null
          id: string
          intensity: string | null
          is_shared: boolean | null
          main_content: string | null
          name: string
          notes: string | null
          objectives: string | null
          session_type: string
          updated_at: string
          warmup_description: string | null
        }
        Insert: {
          category_id?: string | null
          cooldown_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          id?: string
          intensity?: string | null
          is_shared?: boolean | null
          main_content?: string | null
          name: string
          notes?: string | null
          objectives?: string | null
          session_type?: string
          updated_at?: string
          warmup_description?: string | null
        }
        Update: {
          category_id?: string | null
          cooldown_description?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          equipment_needed?: string[] | null
          id?: string
          intensity?: string | null
          is_shared?: boolean | null
          main_content?: string | null
          name?: string
          notes?: string | null
          objectives?: string | null
          session_type?: string
          updated_at?: string
          warmup_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ski_conditions: {
        Row: {
          air_temperature_celsius: number | null
          altitude_m: number | null
          avalanche_risk: number | null
          category_id: string
          created_at: string
          gate_setup: string | null
          id: string
          match_id: string | null
          notes: string | null
          piste_condition: string | null
          piste_evolution: string | null
          precipitation: string | null
          slope_difficulty: string | null
          slope_hardness: string | null
          slope_name: string | null
          snow_evolution: string | null
          snow_granulometry: string | null
          snow_humidity: string | null
          snow_quality: number | null
          snow_temperature_celsius: number | null
          snow_type: string | null
          sunshine: string | null
          training_session_id: string | null
          updated_at: string
          visibility: string | null
          weather: string | null
          wind_direction: string | null
          wind_speed_kmh: number | null
        }
        Insert: {
          air_temperature_celsius?: number | null
          altitude_m?: number | null
          avalanche_risk?: number | null
          category_id: string
          created_at?: string
          gate_setup?: string | null
          id?: string
          match_id?: string | null
          notes?: string | null
          piste_condition?: string | null
          piste_evolution?: string | null
          precipitation?: string | null
          slope_difficulty?: string | null
          slope_hardness?: string | null
          slope_name?: string | null
          snow_evolution?: string | null
          snow_granulometry?: string | null
          snow_humidity?: string | null
          snow_quality?: number | null
          snow_temperature_celsius?: number | null
          snow_type?: string | null
          sunshine?: string | null
          training_session_id?: string | null
          updated_at?: string
          visibility?: string | null
          weather?: string | null
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Update: {
          air_temperature_celsius?: number | null
          altitude_m?: number | null
          avalanche_risk?: number | null
          category_id?: string
          created_at?: string
          gate_setup?: string | null
          id?: string
          match_id?: string | null
          notes?: string | null
          piste_condition?: string | null
          piste_evolution?: string | null
          precipitation?: string | null
          slope_difficulty?: string | null
          slope_hardness?: string | null
          slope_name?: string | null
          snow_evolution?: string | null
          snow_granulometry?: string | null
          snow_humidity?: string | null
          snow_quality?: number | null
          snow_temperature_celsius?: number | null
          snow_type?: string | null
          sunshine?: string | null
          training_session_id?: string | null
          updated_at?: string
          visibility?: string | null
          weather?: string | null
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ski_conditions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_conditions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_conditions_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ski_session_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          match_id: string | null
          player_id: string
          training_session_id: string | null
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          match_id?: string | null
          player_id: string
          training_session_id?: string | null
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          match_id?: string | null
          player_id?: string
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ski_session_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "player_ski_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_session_equipment_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ski_session_equipment_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_alerts: {
        Row: {
          alert_type: string
          category_id: string
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          player_id: string
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          category_id: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          player_id: string
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          category_id?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          player_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_alerts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_alerts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "speed_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notes: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          is_confidential: boolean | null
          note_content: string
          note_date: string
          player_id: string
          staff_role: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_confidential?: boolean | null
          note_content: string
          note_date?: string
          player_id: string
          staff_role: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_confidential?: boolean | null
          note_content?: string
          note_date?: string
          player_id?: string
          staff_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_notes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
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
          {
            foreignKeyName: "strength_tests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          gps_data_enabled: boolean | null
          id: string
          is_active: boolean
          max_athletes: number
          max_categories_per_club: number
          max_clubs: number
          max_staff_per_category: number | null
          max_staff_users: number
          name: string
          price_monthly: number | null
          price_yearly: number | null
          trial_days: number | null
          video_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          gps_data_enabled?: boolean | null
          id?: string
          is_active?: boolean
          max_athletes?: number
          max_categories_per_club?: number
          max_clubs?: number
          max_staff_per_category?: number | null
          max_staff_users?: number
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          trial_days?: number | null
          video_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          gps_data_enabled?: boolean | null
          id?: string
          is_active?: boolean
          max_athletes?: number
          max_categories_per_club?: number
          max_clubs?: number
          max_staff_per_category?: number | null
          max_staff_users?: number
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          trial_days?: number | null
          video_enabled?: boolean | null
        }
        Relationships: []
      }
      super_admin_users: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      surf_conditions: {
        Row: {
          bottom_notes: string | null
          bottom_type: string | null
          category_id: string
          created_at: string
          id: string
          match_id: string | null
          notes: string | null
          spot_name: string | null
          spot_quality: number | null
          swell_direction: string | null
          swell_height_m: number | null
          swell_period_s: number | null
          tide_coefficient: number | null
          tide_level: string | null
          tide_phase: string | null
          training_session_id: string | null
          updated_at: string
          wave_quality: number | null
          wind_direction: string | null
          wind_speed_kmh: number | null
        }
        Insert: {
          bottom_notes?: string | null
          bottom_type?: string | null
          category_id: string
          created_at?: string
          id?: string
          match_id?: string | null
          notes?: string | null
          spot_name?: string | null
          spot_quality?: number | null
          swell_direction?: string | null
          swell_height_m?: number | null
          swell_period_s?: number | null
          tide_coefficient?: number | null
          tide_level?: string | null
          tide_phase?: string | null
          training_session_id?: string | null
          updated_at?: string
          wave_quality?: number | null
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Update: {
          bottom_notes?: string | null
          bottom_type?: string | null
          category_id?: string
          created_at?: string
          id?: string
          match_id?: string | null
          notes?: string | null
          spot_name?: string | null
          spot_quality?: number | null
          swell_direction?: string | null
          swell_height_m?: number | null
          swell_period_s?: number | null
          tide_coefficient?: number | null
          tide_level?: string | null
          tide_phase?: string | null
          training_session_id?: string | null
          updated_at?: string
          wave_quality?: number | null
          wind_direction?: string | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surf_conditions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_conditions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_conditions_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      surf_session_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          match_id: string | null
          player_id: string
          training_session_id: string | null
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          match_id?: string | null
          player_id: string
          training_session_id?: string | null
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          match_id?: string | null
          player_id?: string
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surf_session_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "player_surf_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_session_equipment_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_session_equipment_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surf_session_equipment_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_trips: {
        Row: {
          accommodation: string | null
          category_id: string
          created_at: string
          created_by: string | null
          departure_date: string
          departure_time: string | null
          destination: string
          id: string
          match_id: string | null
          meal_plan: string | null
          meeting_point: string | null
          notes: string | null
          return_date: string | null
          return_time: string | null
          title: string
          transport_details: string | null
          transport_type: string
        }
        Insert: {
          accommodation?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          departure_date: string
          departure_time?: string | null
          destination: string
          id?: string
          match_id?: string | null
          meal_plan?: string | null
          meeting_point?: string | null
          notes?: string | null
          return_date?: string | null
          return_time?: string | null
          title: string
          transport_details?: string | null
          transport_type?: string
        }
        Update: {
          accommodation?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          departure_date?: string
          departure_time?: string | null
          destination?: string
          id?: string
          match_id?: string | null
          meal_plan?: string | null
          meeting_point?: string | null
          notes?: string | null
          return_date?: string | null
          return_time?: string | null
          title?: string
          transport_details?: string | null
          transport_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_trips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_trips_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          template_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          template_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tennis_drill_training: {
        Row: {
          attempts: number
          category_id: string
          created_at: string
          exercise_type: string
          id: string
          notes: string | null
          player_id: string
          session_date: string
          success_rate: number | null
          successes: number
          training_session_id: string | null
        }
        Insert: {
          attempts?: number
          category_id: string
          created_at?: string
          exercise_type: string
          id?: string
          notes?: string | null
          player_id: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
        }
        Update: {
          attempts?: number
          category_id?: string
          created_at?: string
          exercise_type?: string
          id?: string
          notes?: string | null
          player_id?: string
          session_date?: string
          success_rate?: number | null
          successes?: number
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tennis_drill_training_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tennis_drill_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tennis_drill_training_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tennis_drill_training_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_reminders: {
        Row: {
          category_id: string
          created_at: string | null
          frequency_weeks: number
          id: string
          is_active: boolean
          last_notification_date: string | null
          start_date: string | null
          test_type: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          frequency_weeks?: number
          id?: string
          is_active?: boolean
          last_notification_date?: string | null
          start_date?: string | null
          test_type: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          frequency_weeks?: number
          id?: string
          is_active?: boolean
          last_notification_date?: string | null
          start_date?: string | null
          test_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_reminders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          id: string
          match_date: string
          match_order: number
          match_time: string | null
          notes: string | null
          opponent: string
          result: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_date: string
          match_order?: number
          match_time?: string | null
          notes?: string | null
          opponent: string
          result?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_date?: string
          match_order?: number
          match_time?: string | null
          notes?: string | null
          opponent?: string
          result?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_player_rotation: {
        Row: {
          created_at: string
          id: string
          is_starter: boolean
          minutes_played: number
          player_id: string
          tournament_match_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_starter?: boolean
          minutes_played?: number
          player_id: string
          tournament_match_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_starter?: boolean
          minutes_played?: number
          player_id?: string
          tournament_match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_player_rotation_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_player_rotation_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_player_rotation_tournament_match_id_fkey"
            columns: ["tournament_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          category_id: string
          created_at: string
          end_date: string
          id: string
          location: string | null
          name: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          end_date: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          end_date?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          absence_reason: string | null
          attendance_date: string
          category_id: string
          created_at: string
          id: string
          late_justified: boolean | null
          late_minutes: number | null
          late_reason: string | null
          player_id: string
          status: string
          training_session_id: string | null
        }
        Insert: {
          absence_reason?: string | null
          attendance_date?: string
          category_id: string
          created_at?: string
          id?: string
          late_justified?: boolean | null
          late_minutes?: number | null
          late_reason?: string | null
          player_id: string
          status?: string
          training_session_id?: string | null
        }
        Update: {
          absence_reason?: string | null
          attendance_date?: string
          category_id?: string
          created_at?: string
          id?: string
          late_justified?: boolean | null
          late_minutes?: number | null
          late_reason?: string | null
          player_id?: string
          status?: string
          training_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_cycles: {
        Row: {
          category_id: string
          created_at: string
          cycle_type: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          period_id: string | null
          start_date: string
          target_awcr_max: number | null
          target_awcr_min: number | null
          target_intensity: number | null
          target_load_max: number | null
          target_load_min: number | null
          updated_at: string
          week_number: number
        }
        Insert: {
          category_id: string
          created_at?: string
          cycle_type?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          period_id?: string | null
          start_date: string
          target_awcr_max?: number | null
          target_awcr_min?: number | null
          target_intensity?: number | null
          target_load_max?: number | null
          target_load_min?: number | null
          updated_at?: string
          week_number: number
        }
        Update: {
          category_id?: string
          created_at?: string
          cycle_type?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          period_id?: string | null
          start_date?: string
          target_awcr_max?: number | null
          target_awcr_min?: number | null
          target_intensity?: number | null
          target_load_max?: number | null
          target_load_min?: number | null
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
      training_programs: {
        Row: {
          body_zone: string | null
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: string | null
          name: string
          reathletisation_phase: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          body_zone?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name: string
          reathletisation_phase?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          body_zone?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          name?: string
          reathletisation_phase?: string | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_blocks: {
        Row: {
          block_order: number
          bowling_exercise_type: string | null
          contact_charge: string | null
          created_at: string
          end_time: string | null
          id: string
          intensity: number | null
          notes: string | null
          objective: string | null
          session_type: string | null
          start_time: string | null
          target_intensity: string | null
          training_session_id: string
          training_type: string
          volume: string | null
        }
        Insert: {
          block_order?: number
          bowling_exercise_type?: string | null
          contact_charge?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          objective?: string | null
          session_type?: string | null
          start_time?: string | null
          target_intensity?: string | null
          training_session_id: string
          training_type: string
          volume?: string | null
        }
        Update: {
          block_order?: number
          bowling_exercise_type?: string | null
          contact_charge?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          objective?: string | null
          session_type?: string | null
          start_time?: string | null
          target_intensity?: string | null
          training_session_id?: string
          training_type?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_blocks_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          category_id: string
          created_at: string
          created_by_player_id: string | null
          id: string
          intensity: number | null
          notes: string | null
          periodization_cycle_id: string | null
          planned_intensity: number | null
          session_date: string
          session_end_time: string | null
          session_start_time: string | null
          test_reminder_id: string | null
          training_type: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by_player_id?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          periodization_cycle_id?: string | null
          planned_intensity?: number | null
          session_date: string
          session_end_time?: string | null
          session_start_time?: string | null
          test_reminder_id?: string | null
          training_type: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by_player_id?: string | null
          id?: string
          intensity?: number | null
          notes?: string | null
          periodization_cycle_id?: string | null
          planned_intensity?: number | null
          session_date?: string
          session_end_time?: string | null
          session_start_time?: string | null
          test_reminder_id?: string | null
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_periodization_cycle_id_fkey"
            columns: ["periodization_cycle_id"]
            isOneToOne: false
            referencedRelation: "periodization_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_test_reminder_id_fkey"
            columns: ["test_reminder_id"]
            isOneToOne: false
            referencedRelation: "test_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          visibility?: string
        }
        Relationships: []
      }
      user_activity_tracking: {
        Row: {
          activity_date: string
          created_at: string | null
          duration_seconds: number
          id: string
          last_heartbeat: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          activity_date?: string
          created_at?: string | null
          duration_seconds?: number
          id?: string
          last_heartbeat?: string | null
          user_id: string
          user_type?: string
        }
        Update: {
          activity_date?: string
          created_at?: string | null
          duration_seconds?: number
          id?: string
          last_heartbeat?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_convocations: boolean
          email_enabled: boolean
          email_matches: boolean
          email_rpe_reminder: boolean
          email_sessions: boolean
          email_wellness_reminder: boolean
          id: string
          push_convocations: boolean
          push_enabled: boolean
          push_injuries: boolean
          push_matches: boolean
          push_messages: boolean
          push_rpe_reminder: boolean
          push_sessions: boolean
          push_wellness_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_convocations?: boolean
          email_enabled?: boolean
          email_matches?: boolean
          email_rpe_reminder?: boolean
          email_sessions?: boolean
          email_wellness_reminder?: boolean
          id?: string
          push_convocations?: boolean
          push_enabled?: boolean
          push_injuries?: boolean
          push_matches?: boolean
          push_messages?: boolean
          push_rpe_reminder?: boolean
          push_sessions?: boolean
          push_wellness_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_convocations?: boolean
          email_enabled?: boolean
          email_matches?: boolean
          email_rpe_reminder?: boolean
          email_sessions?: boolean
          email_wellness_reminder?: boolean
          id?: string
          push_convocations?: boolean
          push_enabled?: boolean
          push_injuries?: boolean
          push_matches?: boolean
          push_messages?: boolean
          push_rpe_reminder?: boolean
          push_sessions?: boolean
          push_wellness_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_status: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_status_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "global_notifications"
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
      video_analyses: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          match_id: string | null
          match_start_timestamp: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_file_url: string | null
          video_source: string | null
          video_url: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          match_id?: string | null
          match_start_timestamp?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_file_url?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          match_id?: string | null
          match_start_timestamp?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_file_url?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_analyses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analyses_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      video_clips: {
        Row: {
          action_category: string | null
          action_type: string
          category_id: string
          clip_url: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          end_time_seconds: number | null
          id: string
          match_id: string | null
          notes: string | null
          start_time_seconds: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_analysis_id: string
          video_file_url: string | null
        }
        Insert: {
          action_category?: string | null
          action_type: string
          category_id: string
          clip_url: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          end_time_seconds?: number | null
          id?: string
          match_id?: string | null
          notes?: string | null
          start_time_seconds?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_analysis_id: string
          video_file_url?: string | null
        }
        Update: {
          action_category?: string | null
          action_type?: string
          category_id?: string
          clip_url?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          end_time_seconds?: number | null
          id?: string
          match_id?: string | null
          notes?: string | null
          start_time_seconds?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_analysis_id?: string
          video_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_clips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_clips_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_clips_video_analysis_id_fkey"
            columns: ["video_analysis_id"]
            isOneToOne: false
            referencedRelation: "video_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_planning: {
        Row: {
          assigned_players: string[] | null
          category_id: string
          created_at: string
          created_by: string | null
          custom_description: string | null
          custom_title: string | null
          day_of_week: number
          id: string
          location: string | null
          notes: string | null
          status: string | null
          template_id: string | null
          time_slot: string | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          assigned_players?: string[] | null
          category_id: string
          created_at?: string
          created_by?: string | null
          custom_description?: string | null
          custom_title?: string | null
          day_of_week: number
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          template_id?: string | null
          time_slot?: string | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          assigned_players?: string[] | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          custom_description?: string | null
          custom_title?: string | null
          day_of_week?: number
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          template_id?: string | null
          time_slot?: string | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_planning_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_planning_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_tracking: {
        Row: {
          category_id: string
          created_at: string
          general_fatigue: number
          has_specific_pain: boolean
          id: string
          notes: string | null
          pain_location: string | null
          pain_zone: string | null
          player_id: string
          sleep_duration: number
          sleep_quality: number
          soreness_lower_body: number
          soreness_upper_body: number
          stress_level: number
          tracking_date: string
        }
        Insert: {
          category_id: string
          created_at?: string
          general_fatigue: number
          has_specific_pain?: boolean
          id?: string
          notes?: string | null
          pain_location?: string | null
          pain_zone?: string | null
          player_id: string
          sleep_duration: number
          sleep_quality: number
          soreness_lower_body: number
          soreness_upper_body: number
          stress_level: number
          tracking_date?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          general_fatigue?: number
          has_specific_pain?: boolean
          id?: string
          notes?: string | null
          pain_location?: string | null
          pain_zone?: string | null
          player_id?: string
          sleep_duration?: number
          sleep_quality?: number
          soreness_lower_body?: number
          soreness_upper_body?: number
          stress_level?: number
          tracking_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wellness_tracking_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wellness_tracking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_all_clubs: {
        Row: {
          category_count: number | null
          created_at: string | null
          id: string | null
          member_count: number | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          category_count?: never
          created_at?: string | null
          id?: string | null
          member_count?: never
          name?: string | null
          user_id?: string | null
        }
        Update: {
          category_count?: never
          created_at?: string | null
          id?: string | null
          member_count?: never
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_all_users: {
        Row: {
          clubs_owned: number | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_approved: boolean | null
          is_super_admin: boolean | null
          phone: string | null
        }
        Insert: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_approved?: never
          is_super_admin?: never
          phone?: string | null
        }
        Update: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_approved?: never
          is_super_admin?: never
          phone?: string | null
        }
        Relationships: []
      }
      admin_dashboard_stats: {
        Row: {
          active_clients: number | null
          active_clubs: number | null
          revenue_this_month: number | null
          suspended_clients: number | null
          total_athletes: number | null
          total_categories: number | null
          total_clients: number | null
          total_clubs: number | null
          total_users: number | null
          trial_clients: number | null
        }
        Relationships: []
      }
      all_invitations: {
        Row: {
          accepted_at: string | null
          category_ids: string[] | null
          club_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invitation_type: string | null
          invited_by: string | null
          recipient_name: string | null
          role: string | null
          status: string | null
          token: string | null
        }
        Relationships: []
      }
      players_safe: {
        Row: {
          allergies: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_year: number | null
          category_id: string | null
          club_origin: string | null
          created_at: string | null
          dietary_requirements: string | null
          discipline: string | null
          email: string | null
          emergency_notes: string | null
          first_name: string | null
          id: string | null
          medical_notes: string | null
          name: string | null
          parent_contact_1_email: string | null
          parent_contact_1_name: string | null
          parent_contact_1_phone: string | null
          parent_contact_1_relation: string | null
          parent_contact_2_email: string | null
          parent_contact_2_name: string | null
          parent_contact_2_phone: string | null
          parent_contact_2_relation: string | null
          phone: string | null
          position: string | null
          pwa_install_dismissed: boolean | null
          season_id: string | null
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          allergies?: never
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id?: string | null
          club_origin?: string | null
          created_at?: string | null
          dietary_requirements?: never
          discipline?: string | null
          email?: never
          emergency_notes?: never
          first_name?: string | null
          id?: string | null
          medical_notes?: never
          name?: string | null
          parent_contact_1_email?: never
          parent_contact_1_name?: never
          parent_contact_1_phone?: never
          parent_contact_1_relation?: never
          parent_contact_2_email?: never
          parent_contact_2_name?: never
          parent_contact_2_phone?: never
          parent_contact_2_relation?: never
          phone?: never
          position?: string | null
          pwa_install_dismissed?: boolean | null
          season_id?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          allergies?: never
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id?: string | null
          club_origin?: string | null
          created_at?: string | null
          dietary_requirements?: never
          discipline?: string | null
          email?: never
          emergency_notes?: never
          first_name?: string | null
          id?: string | null
          medical_notes?: never
          name?: string | null
          parent_contact_1_email?: never
          parent_contact_1_name?: never
          parent_contact_1_phone?: never
          parent_contact_1_relation?: never
          parent_contact_2_email?: never
          parent_contact_2_name?: never
          parent_contact_2_phone?: never
          parent_contact_2_relation?: never
          phone?: never
          position?: string | null
          pwa_install_dismissed?: boolean | null
          season_id?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_category_invitations: {
        Row: {
          category_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_invitations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_club_invitations: {
        Row: {
          club_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "admin_all_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_profiles: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          email?: never
          full_name?: string | null
          id?: string | null
        }
        Update: {
          email?: never
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_ambassador_invitation: {
        Args: { invitation_token: string }
        Returns: boolean
      }
      accept_athlete_invitation_signup: {
        Args: { _token: string; _user_id: string }
        Returns: Json
      }
      accept_category_invitation: { Args: { _token: string }; Returns: Json }
      accept_club_invitation: { Args: { _token: string }; Returns: Json }
      can_access_category: {
        Args: { _category_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_club: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      can_modify_club_data: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_player_sensitive_data: {
        Args: { _category_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_old_invitation_attempts: { Args: never; Returns: undefined }
      create_category_with_members: {
        Args: {
          _club_id: string
          _gender: string
          _member_ids?: string[]
          _name: string
          _rugby_type: string
        }
        Returns: string
      }
      expire_trial_clients: { Args: never; Returns: undefined }
      get_player_categories: {
        Args: { _player_id: string }
        Returns: {
          category_id: string
          category_name: string
          club_id: string
          club_name: string
          is_primary: boolean
          sport_type: string
        }[]
      }
      get_safe_profile: {
        Args: { profile_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      has_club_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_medical_access: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      has_medical_or_coaching_access: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      has_valid_athlete_token_for_player: {
        Args: { _player_id: string }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type: string
        }
        Returns: string
      }
      renew_invitation: {
        Args: { _invitation_id: string; _table_name: string }
        Returns: Json
      }
      respond_to_category_link: {
        Args: { _player_category_id: string; _response: string }
        Returns: Json
      }
      transfer_player_with_history: {
        Args: {
          _from_category_id: string
          _notes?: string
          _player_id: string
          _reason?: string
          _to_category_id: string
        }
        Returns: Json
      }
      user_is_conversation_admin: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      user_participates_in_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      validate_athlete_invitation: { Args: { _token: string }; Returns: Json }
      validate_athlete_token: { Args: { _token: string }; Returns: Json }
      validate_public_token: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "coach"
        | "viewer"
        | "physio"
        | "doctor"
        | "mental_coach"
        | "prepa_physique"
        | "administratif"
        | "athlete"
      injury_severity: "légère" | "modérée" | "grave"
      injury_status: "active" | "recovering" | "healed"
      period_type: "préparation" | "compétition" | "récupération" | "trêve"
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
        "coach",
        "viewer",
        "physio",
        "doctor",
        "mental_coach",
        "prepa_physique",
        "administratif",
        "athlete",
      ],
      injury_severity: ["légère", "modérée", "grave"],
      injury_status: ["active", "recovering", "healed"],
      period_type: ["préparation", "compétition", "récupération", "trêve"],
    },
  },
} as const
