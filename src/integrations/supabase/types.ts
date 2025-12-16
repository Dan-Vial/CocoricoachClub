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
      approved_users: {
        Row: {
          approved_at: string
          approved_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          id?: string
          notes?: string | null
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
          expires_at: string
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
          expires_at?: string
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
          expires_at?: string
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
          created_at: string
          id: string
          is_starter: boolean | null
          match_id: string
          minutes_played: number | null
          player_id: string
          position: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_starter?: boolean | null
          match_id: string
          minutes_played?: number | null
          player_id: string
          position?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_starter?: boolean | null
          match_id?: string
          minutes_played?: number | null
          player_id?: string
          position?: string | null
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
          average_play_sequence: number | null
          category_id: string
          created_at: string
          effective_play_time: number | null
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
          average_play_sequence?: number | null
          category_id: string
          created_at?: string
          effective_play_time?: number | null
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
          average_play_sequence?: number | null
          category_id?: string
          created_at?: string
          effective_play_time?: number | null
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
      players: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          category_id: string
          created_at: string
          id: string
          name: string
          position: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          category_id: string
          created_at?: string
          id?: string
          name: string
          position?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: string | null
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
          owner_email: string | null
          owner_name: string | null
          user_id: string | null
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
          is_super_admin: boolean | null
        }
        Insert: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_super_admin?: never
        }
        Update: {
          clubs_owned?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_super_admin?: never
        }
        Relationships: []
      }
      safe_club_invitations: {
        Row: {
          club_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          token: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          token?: never
        }
        Update: {
          club_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          token?: never
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
    }
    Functions: {
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
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "coach" | "viewer"
      injury_severity: "légère" | "modérée" | "grave"
      injury_status: "active" | "recovering" | "healed"
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
      injury_status: ["active", "recovering", "healed"],
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
