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
        ]
      }
      categories: {
        Row: {
          club_id: string
          cover_image_url: string | null
          created_at: string
          gender: string
          id: string
          name: string
          rugby_type: string
        }
        Insert: {
          club_id: string
          cover_image_url?: string | null
          created_at?: string
          gender?: string
          id?: string
          name: string
          rugby_type?: string
        }
        Update: {
          club_id?: string
          cover_image_url?: string | null
          created_at?: string
          gender?: string
          id?: string
          name?: string
          rugby_type?: string
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
      club_invitations: {
        Row: {
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
          created_at: string
          id: string
          logo_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
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
      exercise_library: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string[] | null
          id: string
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
            foreignKeyName: "gps_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_session_exercises: {
        Row: {
          category_id: string
          created_at: string
          duration_seconds: number | null
          exercise_category: string | null
          exercise_name: string
          group_id: string | null
          id: string
          library_exercise_id: string | null
          notes: string | null
          order_index: number | null
          player_id: string
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_type: string | null
          sets: number
          tempo: string | null
          training_session_id: string
          weight_kg: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          duration_seconds?: number | null
          exercise_category?: string | null
          exercise_name: string
          group_id?: string | null
          id?: string
          library_exercise_id?: string | null
          notes?: string | null
          order_index?: number | null
          player_id: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_type?: string | null
          sets?: number
          tempo?: string | null
          training_session_id: string
          weight_kg?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_category?: string | null
          exercise_name?: string
          group_id?: string | null
          id?: string
          library_exercise_id?: string | null
          notes?: string | null
          order_index?: number | null
          player_id?: string
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_type?: string | null
          sets?: number
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
            foreignKeyName: "gym_session_exercises_training_session_id_fkey"
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
          event_type: string | null
          id: string
          is_home: boolean | null
          location: string | null
          longest_play_sequence: number | null
          match_date: string
          match_time: string | null
          notes: string | null
          opponent: string
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
          event_type?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          longest_play_sequence?: number | null
          match_date: string
          match_time?: string | null
          notes?: string | null
          opponent: string
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
          event_type?: string | null
          id?: string
          is_home?: boolean | null
          location?: string | null
          longest_play_sequence?: number | null
          match_date?: string
          match_time?: string | null
          notes?: string | null
          opponent?: string
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
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_announcement: boolean | null
          is_urgent: boolean | null
          message_type: string | null
          read_by: string[] | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_announcement?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
          read_by?: string[] | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_announcement?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
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
        ]
      }
      player_academic_tracking: {
        Row: {
          absence_reason: string | null
          academic_grade: number | null
          category_id: string
          created_at: string
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
          avatar_url: string | null
          birth_date: string | null
          birth_year: number | null
          category_id: string
          club_origin: string | null
          created_at: string
          discipline: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          specialty: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id: string
          club_origin?: string | null
          created_at?: string
          discipline?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          position?: string | null
          specialty?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          category_id?: string
          club_origin?: string | null
          created_at?: string
          discipline?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          specialty?: string | null
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
          cluster_sets: Json | null
          created_at: string
          drop_sets: Json | null
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
          session_id: string
          sets: number | null
          tempo: string | null
        }
        Insert: {
          cluster_sets?: Json | null
          created_at?: string
          drop_sets?: Json | null
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
          session_id: string
          sets?: number | null
          tempo?: string | null
        }
        Update: {
          cluster_sets?: Json | null
          created_at?: string
          drop_sets?: Json | null
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
          session_id?: string
          sets?: number | null
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
          created_at: string
          id: string
          name: string | null
          program_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          program_id: string
          week_number?: number
        }
        Update: {
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
          created_at: string
          description: string | null
          duration_days_max: number | null
          duration_days_min: number | null
          exit_criteria: string[] | null
          id: string
          name: string
          objectives: string[] | null
          phase_number: number
          protocol_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          exit_criteria?: string[] | null
          id?: string
          name: string
          objectives?: string[] | null
          phase_number: number
          protocol_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days_max?: number | null
          duration_days_min?: number | null
          exit_criteria?: string[] | null
          id?: string
          name?: string
          objectives?: string[] | null
          phase_number?: number
          protocol_id?: string
        }
        Relationships: [
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
        ]
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
      test_reminders: {
        Row: {
          category_id: string
          created_at: string | null
          frequency_weeks: number
          id: string
          is_active: boolean
          last_notification_date: string | null
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
          training_type: string
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
          training_type: string
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
          pain_location: string | null
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
          pain_location?: string | null
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
          pain_location?: string | null
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
        }
        Insert: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_approved?: never
          is_super_admin?: never
        }
        Update: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_approved?: never
          is_super_admin?: never
        }
        Relationships: []
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
      user_is_conversation_admin: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      user_participates_in_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
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
      ],
      injury_severity: ["légère", "modérée", "grave"],
      injury_status: ["active", "recovering", "healed"],
      period_type: ["préparation", "compétition", "récupération", "trêve"],
    },
  },
} as const
