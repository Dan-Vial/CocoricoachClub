# Schéma de Base de Données - RugbyStrength Planner

**Total: 91 tables**

---

## 📋 Tables Principales

### 🏢 Organisation

#### `clubs`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| created_at | timestamp with time zone | NOT NULL | now() |
| user_id | uuid | NOT NULL | - |
| name | text | NOT NULL | - |
| logo_url | text | NULL | - |

#### `categories`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| club_id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| cover_image_url | text | NULL | - |
| rugby_type | text | NOT NULL | 'XV' |
| gender | text | NOT NULL | 'masculine' |

---

### 👥 Utilisateurs & Membres

#### `profiles`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NULL | now() |
| full_name | text | NULL | - |
| email | text | NULL | - |

#### `club_members`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| club_id | uuid | NOT NULL | - |
| user_id | uuid | NOT NULL | - |
| role | app_role | NOT NULL | 'viewer' |
| invited_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `category_members`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| user_id | uuid | NOT NULL | - |
| role | app_role | NOT NULL | 'viewer' |
| invited_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `user_roles`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| role | app_role | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `approved_users`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| approved_at | timestamp with time zone | NOT NULL | now() |
| approved_by | uuid | NULL | - |
| is_free_user | boolean | NULL | false |
| notes | text | NULL | - |

#### `super_admin_users`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| granted_by | uuid | NULL | - |

---

### 🏃 Athlètes

#### `players`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| birth_year | integer | NULL | - |
| birth_date | date | NULL | - |
| name | text | NOT NULL | - |
| avatar_url | text | NULL | - |
| position | text | NULL | - |
| club_origin | text | NULL | - |
| email | text | NULL | - |
| phone | text | NULL | - |

#### `player_measurements`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| measurement_date | date | NOT NULL | CURRENT_DATE |
| weight_kg | numeric | NULL | - |
| height_cm | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `body_composition`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| measurement_date | date | NOT NULL | CURRENT_DATE |
| weight_kg | numeric | NULL | - |
| height_cm | numeric | NULL | - |
| body_fat_percentage | numeric | NULL | - |
| muscle_mass_kg | numeric | NULL | - |
| bmi | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| notes | text | NULL | - |

#### `player_contacts`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| is_primary | boolean | NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |
| contact_type | text | NOT NULL | 'parent' |
| first_name | text | NOT NULL | - |
| last_name | text | NOT NULL | - |
| relationship | text | NULL | - |
| phone | text | NULL | - |
| email | text | NULL | - |
| address | text | NULL | - |
| notes | text | NULL | - |

#### `player_transfers`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| from_category_id | uuid | NOT NULL | - |
| to_category_id | uuid | NOT NULL | - |
| transfer_date | date | NOT NULL | CURRENT_DATE |
| transferred_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| reason | text | NULL | - |
| notes | text | NULL | - |

---

### 🏋️ Entraînement

#### `training_sessions`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| session_date | date | NOT NULL | - |
| session_start_time | time without time zone | NULL | - |
| training_type | training_type | NOT NULL | - |
| intensity | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| session_end_time | time without time zone | NULL | - |
| notes | text | NULL | - |

#### `training_attendance`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| training_session_id | uuid | NULL | - |
| attendance_date | date | NOT NULL | CURRENT_DATE |
| created_at | timestamp with time zone | NOT NULL | now() |
| status | text | NOT NULL | 'present' |
| absence_reason | text | NULL | - |

#### `awcr_tracking`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| training_session_id | uuid | NULL | - |
| session_date | date | NOT NULL | - |
| rpe | integer | NOT NULL | - |
| duration_minutes | integer | NOT NULL | 0 |
| training_load | integer | NULL | - |
| acute_load | numeric | NULL | - |
| chronic_load | numeric | NULL | - |
| awcr | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `gps_sessions`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| session_date | date | NOT NULL | - |
| total_distance_m | numeric | NULL | - |
| high_speed_distance_m | numeric | NULL | - |
| sprint_distance_m | numeric | NULL | - |
| max_speed_ms | numeric | NULL | - |
| avg_speed_ms | numeric | NULL | - |
| player_load | numeric | NULL | - |
| accelerations | integer | NULL | - |
| decelerations | integer | NULL | - |
| high_intensity_accelerations | integer | NULL | - |
| high_intensity_decelerations | integer | NULL | - |
| duration_minutes | numeric | NULL | - |
| time_zone_1_min | numeric | NULL | - |
| time_zone_2_min | numeric | NULL | - |
| time_zone_3_min | numeric | NULL | - |
| time_zone_4_min | numeric | NULL | - |
| time_zone_5_min | numeric | NULL | - |
| sprint_count | integer | NULL | - |
| max_sprint_distance_m | numeric | NULL | - |
| raw_data | jsonb | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| session_name | text | NULL | - |
| source | text | NULL | 'manual' |
| notes | text | NULL | - |

---

### 🏉 Matchs

#### `matches`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| match_date | date | NOT NULL | - |
| match_time | time without time zone | NULL | - |
| is_home | boolean | NULL | true |
| score_home | integer | NULL | - |
| score_away | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| effective_play_time | integer | NULL | - |
| longest_play_sequence | integer | NULL | - |
| average_play_sequence | numeric | NULL | - |
| opponent | text | NOT NULL | - |
| location | text | NULL | - |
| notes | text | NULL | - |
| competition | text | NULL | - |

#### `match_lineups`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| match_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| is_starter | boolean | NULL | - |
| minutes_played | integer | NULL | - |
| position | text | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `player_match_stats`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| match_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| tries | integer | NULL | 0 |
| conversions | integer | NULL | 0 |
| penalties_scored | integer | NULL | 0 |
| drop_goals | integer | NULL | 0 |
| tackles | integer | NULL | 0 |
| tackles_missed | integer | NULL | 0 |
| carries | integer | NULL | 0 |
| meters_gained | integer | NULL | 0 |
| offloads | integer | NULL | 0 |
| turnovers_won | integer | NULL | 0 |
| yellow_cards | integer | NULL | 0 |
| red_cards | integer | NULL | 0 |
| created_at | timestamp with time zone | NOT NULL | now() |
| defensive_recoveries | integer | NULL | 0 |
| breakthroughs | integer | NULL | 0 |
| total_contacts | integer | NULL | 0 |
| sport_data | jsonb | NULL | '{}' |
| notes | text | NULL | - |

#### `tournaments`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| start_date | date | NOT NULL | - |
| end_date | date | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| location | text | NULL | - |
| notes | text | NULL | - |

#### `tournament_matches`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| tournament_id | uuid | NOT NULL | - |
| match_date | date | NOT NULL | - |
| match_time | time without time zone | NULL | - |
| match_order | integer | NOT NULL | 1 |
| created_at | timestamp with time zone | NOT NULL | now() |
| opponent | text | NOT NULL | - |
| result | text | NULL | - |
| notes | text | NULL | - |

#### `tournament_player_rotation`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| tournament_match_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| minutes_played | integer | NOT NULL | 0 |
| is_starter | boolean | NOT NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |

---

### 💚 Bien-être & Santé

#### `wellness_tracking`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| tracking_date | date | NOT NULL | CURRENT_DATE |
| sleep_quality | integer | NOT NULL | - |
| sleep_duration | integer | NOT NULL | - |
| general_fatigue | integer | NOT NULL | - |
| stress_level | integer | NOT NULL | - |
| soreness_upper_body | integer | NOT NULL | - |
| soreness_lower_body | integer | NOT NULL | - |
| has_specific_pain | boolean | NOT NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |
| pain_location | text | NULL | - |

#### `recovery_journal`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| entry_date | date | NOT NULL | CURRENT_DATE |
| sleep_duration_hours | numeric | NULL | - |
| sleep_quality | integer | NULL | - |
| bed_time | time without time zone | NULL | - |
| wake_time | time without time zone | NULL | - |
| ice_bath | boolean | NULL | false |
| ice_bath_duration_min | integer | NULL | - |
| ice_bath_temperature | integer | NULL | - |
| contrast_bath | boolean | NULL | false |
| contrast_bath_duration_min | integer | NULL | - |
| massage | boolean | NULL | false |
| massage_duration_min | integer | NULL | - |
| foam_rolling | boolean | NULL | false |
| foam_rolling_duration_min | integer | NULL | - |
| stretching | boolean | NULL | false |
| stretching_duration_min | integer | NULL | - |
| compression | boolean | NULL | false |
| compression_duration_min | integer | NULL | - |
| sauna | boolean | NULL | false |
| sauna_duration_min | integer | NULL | - |
| cryotherapy | boolean | NULL | false |
| cryotherapy_duration_min | integer | NULL | - |
| active_recovery | boolean | NULL | false |
| active_recovery_duration_min | integer | NULL | - |
| water_intake_liters | numeric | NULL | - |
| protein_shake | boolean | NULL | false |
| overall_recovery_score | integer | NULL | - |
| energy_level | integer | NULL | - |
| muscle_readiness | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| sleep_notes | text | NULL | - |
| massage_type | text | NULL | - |
| stretching_type | text | NULL | - |
| compression_type | text | NULL | - |
| active_recovery_type | text | NULL | - |
| supplements_taken | text[] | NULL | - |
| notes | text | NULL | - |

#### `nutrition_entries`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| entry_date | date | NOT NULL | CURRENT_DATE |
| calories | integer | NULL | - |
| proteins_g | numeric | NULL | - |
| carbs_g | numeric | NULL | - |
| fats_g | numeric | NULL | - |
| water_ml | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| meal_type | text | NOT NULL | - |
| meal_description | text | NULL | - |
| notes | text | NULL | - |

#### `menstrual_cycles`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| cycle_start_date | date | NOT NULL | - |
| cycle_length_days | integer | NULL | 28 |
| period_length_days | integer | NULL | 5 |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| notes | text | NULL | - |

#### `menstrual_symptoms`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| tracking_date | date | NOT NULL | CURRENT_DATE |
| cycle_day | integer | NULL | - |
| energy_level | integer | NULL | - |
| pain_level | integer | NULL | - |
| mood_level | integer | NULL | - |
| sleep_quality | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| phase | text | NULL | - |
| symptoms | text[] | NULL | - |
| notes | text | NULL | - |

---

### 🤕 Blessures

#### `injuries`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| injury_date | date | NOT NULL | CURRENT_DATE |
| severity | injury_severity | NOT NULL | - |
| estimated_return_date | date | NULL | - |
| actual_return_date | date | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| status | injury_status | NOT NULL | 'active' |
| injury_type | text | NOT NULL | - |
| description | text | NULL | - |
| protocol_notes | text | NULL | - |

#### `concussion_protocols`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| incident_date | date | NOT NULL | CURRENT_DATE |
| clearance_date | date | NULL | - |
| return_to_play_phase | integer | NULL | 1 |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| incident_description | text | NULL | - |
| symptoms | text[] | NULL | - |
| status | text | NOT NULL | 'active' |
| medical_notes | text | NULL | - |

#### `injury_protocols`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| typical_duration_days_min | integer | NULL | - |
| typical_duration_days_max | integer | NULL | - |
| is_system_default | boolean | NULL | false |
| category_id | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| injury_category | text | NOT NULL | - |
| description | text | NULL | - |

#### `protocol_phases`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| protocol_id | uuid | NOT NULL | - |
| phase_number | integer | NOT NULL | - |
| duration_days_min | integer | NULL | - |
| duration_days_max | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| description | text | NULL | - |
| objectives | text[] | NULL | - |
| exit_criteria | text[] | NULL | - |

#### `player_rehab_protocols`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| injury_id | uuid | NOT NULL | - |
| protocol_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| current_phase | integer | NULL | 1 |
| started_at | timestamp with time zone | NULL | now() |
| completed_at | timestamp with time zone | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| recommended_load_reduction | integer | NULL | 50 |
| track_wellness | boolean | NULL | true |
| status | text | NULL | 'in_progress' |
| notes | text | NULL | - |

#### `return_to_play_protocols`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| injury_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| current_phase | integer | NOT NULL | 1 |
| started_at | timestamp with time zone | NULL | - |
| completed_at | timestamp with time zone | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| status | text | NOT NULL | 'not_started' |
| notes | text | NULL | - |

#### `rehab_calendar_events`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_rehab_protocol_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| phase_id | uuid | NULL | - |
| phase_number | integer | NOT NULL | - |
| event_date | date | NOT NULL | - |
| is_completed | boolean | NULL | false |
| completed_at | timestamp with time zone | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| phase_name | text | NOT NULL | - |
| event_type | text | NOT NULL | 'phase_start' |
| title | text | NOT NULL | - |
| description | text | NULL | - |
| notes | text | NULL | - |

---

### 📊 Tests Physiques

#### `jump_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| result_cm | numeric | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_type | text | NOT NULL | - |
| notes | text | NULL | - |

#### `speed_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| time_40m_seconds | numeric | NULL | - |
| speed_ms | numeric | NULL | - |
| speed_kmh | numeric | NULL | - |
| time_1600m_seconds | integer | NULL | - |
| time_1600m_minutes | integer | NULL | - |
| vma_kmh | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_type | text | NOT NULL | - |

#### `mobility_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| score | integer | NULL | - |
| left_score | integer | NULL | - |
| right_score | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_type | text | NOT NULL | - |
| notes | text | NULL | - |

#### `strength_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| weight_kg | numeric | NOT NULL | - |
| reps | integer | NULL | 1 |
| estimated_1rm | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_type | text | NOT NULL | - |
| notes | text | NULL | - |

#### `rugby_specific_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| yo_yo_distance_m | integer | NULL | - |
| bronco_time_seconds | numeric | NULL | - |
| agility_time_seconds | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_type | text | NOT NULL | - |
| yo_yo_level | text | NULL | - |
| notes | text | NULL | - |

#### `generic_tests`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| test_date | date | NOT NULL | CURRENT_DATE |
| result_value | numeric | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| test_category | text | NOT NULL | - |
| test_type | text | NOT NULL | - |
| result_unit | text | NULL | - |
| notes | text | NULL | - |

---

### 📚 Programmes d'Entraînement

#### `training_programs`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| is_active | boolean | NULL | false |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| description | text | NULL | - |
| level | text | NULL | 'intermediate' |
| body_zone | text | NULL | - |
| theme | text | NULL | - |
| reathletisation_phase | text | NULL | - |

#### `program_weeks`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| program_id | uuid | NOT NULL | - |
| week_number | integer | NOT NULL | 1 |
| created_at | timestamp with time zone | NOT NULL | now() |
| name | text | NULL | - |

#### `program_sessions`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| week_id | uuid | NOT NULL | - |
| session_number | integer | NOT NULL | 1 |
| day_of_week | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| scheduled_day | integer | NULL | - |
| name | text | NULL | 'Séance' |

#### `program_exercises`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| session_id | uuid | NOT NULL | - |
| library_exercise_id | uuid | NULL | - |
| order_index | integer | NOT NULL | 0 |
| sets | integer | NULL | 3 |
| percentage_1rm | integer | NULL | - |
| rest_seconds | integer | NULL | 90 |
| group_id | uuid | NULL | - |
| group_order | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| is_rm_test | boolean | NULL | false |
| drop_sets | jsonb | NULL | - |
| cluster_sets | jsonb | NULL | - |
| exercise_name | text | NOT NULL | - |
| method | text | NULL | 'normal' |
| reps | text | NULL | '10' |
| tempo | text | NULL | - |
| notes | text | NULL | - |
| rm_test_type | text | NULL | - |

#### `program_assignments`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| program_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| start_date | date | NOT NULL | CURRENT_DATE |
| end_date | date | NULL | - |
| is_active | boolean | NULL | true |
| created_at | timestamp with time zone | NOT NULL | now() |

#### `exercise_library`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| is_system | boolean | NULL | false |
| name | text | NOT NULL | - |
| category | text | NOT NULL | - |
| youtube_url | text | NULL | - |
| description | text | NULL | - |
| muscle_groups | text[] | NULL | - |
| difficulty | text | NULL | 'intermediate' |
| equipment | text[] | NULL | - |
| subcategory | text | NULL | - |

#### `gym_session_exercises`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| training_session_id | uuid | NOT NULL | - |
| library_exercise_id | uuid | NULL | - |
| order_index | integer | NULL | 0 |
| sets | integer | NOT NULL | - |
| reps | integer | NULL | - |
| weight_kg | numeric | NULL | - |
| duration_seconds | integer | NULL | - |
| rest_seconds | integer | NULL | - |
| rpe | integer | NULL | - |
| group_id | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| exercise_name | text | NOT NULL | - |
| exercise_category | text | NULL | - |
| set_type | text | NULL | - |
| tempo | text | NULL | - |
| notes | text | NULL | - |

---

### 📅 Périodisation

#### `training_periods`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| period_type | period_type | NOT NULL | - |
| start_date | date | NOT NULL | - |
| end_date | date | NOT NULL | - |
| target_load_percentage | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| description | text | NULL | - |

#### `training_cycles`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| period_id | uuid | NULL | - |
| week_number | integer | NOT NULL | - |
| start_date | date | NOT NULL | - |
| end_date | date | NOT NULL | - |
| target_intensity | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| target_load_min | integer | NULL | - |
| target_load_max | integer | NULL | - |
| target_awcr_min | numeric | NULL | 0.8 |
| target_awcr_max | numeric | NULL | 1.3 |
| name | text | NOT NULL | - |
| cycle_type | text | NULL | 'normal' |
| notes | text | NULL | - |

#### `season_goals`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| season_year | integer | NOT NULL | - |
| target_date | date | NULL | - |
| progress_percentage | integer | NULL | 0 |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| goal_type | text | NOT NULL | - |
| title | text | NOT NULL | - |
| description | text | NULL | - |
| status | text | NOT NULL | 'pending' |

#### `season_milestones`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| season_year | integer | NOT NULL | - |
| milestone_date | date | NOT NULL | - |
| is_completed | boolean | NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |
| title | text | NOT NULL | - |
| description | text | NULL | - |
| milestone_type | text | NOT NULL | - |

---

### 🏆 Équipe Nationale

#### `national_team_events`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| event_type_id | uuid | NULL | - |
| start_date | date | NOT NULL | - |
| end_date | date | NULL | - |
| is_home | boolean | NULL | true |
| score_home | integer | NULL | - |
| score_away | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| event_type | text | NOT NULL | - |
| location | text | NULL | - |
| opponent | text | NULL | - |
| notes | text | NULL | - |

#### `national_team_event_types`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| color | text | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| is_default | boolean | NULL | false |
| name | text | NOT NULL | - |

#### `player_caps`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| event_id | uuid | NULL | - |
| cap_date | date | NOT NULL | - |
| cap_number | integer | NULL | - |
| was_starter | boolean | NULL | true |
| minutes_played | integer | NULL | - |
| tries | integer | NULL | 0 |
| points | integer | NULL | 0 |
| created_at | timestamp with time zone | NOT NULL | now() |
| opponent | text | NULL | - |
| competition | text | NULL | - |
| notes | text | NULL | - |

#### `gathering_wellness_assessments`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| event_id | uuid | NULL | - |
| linked_assessment_id | uuid | NULL | - |
| assessment_date | date | NOT NULL | CURRENT_DATE |
| assessment_type | text | NOT NULL | - |
| sleep_quality | integer | NULL | - |
| sleep_duration_hours | numeric | NULL | - |
| fatigue_level | integer | NULL | - |
| muscle_soreness | integer | NULL | - |
| stress_level | integer | NULL | - |
| mood_level | integer | NULL | - |
| motivation_level | integer | NULL | - |
| hydration_level | integer | NULL | - |
| appetite_level | integer | NULL | - |
| has_pain | boolean | NULL | - |
| pain_locations | text[] | NULL | - |
| pain_intensity | integer | NULL | - |
| pain_description | text | NULL | - |
| training_load_last_7_days | integer | NULL | - |
| training_load_last_14_days | integer | NULL | - |
| matches_played_last_14_days | integer | NULL | - |
| total_minutes_last_14_days | integer | NULL | - |
| current_awcr | numeric | NULL | - |
| recent_injuries | text | NULL | - |
| current_limitations | text | NULL | - |
| recommended_load | text | NULL | - |
| specific_recommendations | text | NULL | - |
| player_comments | text | NULL | - |
| club_staff_comments | text | NULL | - |
| national_staff_comments | text | NULL | - |
| filled_by | uuid | NULL | - |
| filled_by_role | text | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |

---

### 🎓 Académie & Développement

#### `player_development_plans`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| season_year | integer | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| physical_objectives | text | NULL | - |
| technical_objectives | text | NULL | - |
| tactical_objectives | text | NULL | - |
| mental_objectives | text | NULL | - |
| academic_objectives | text | NULL | - |
| semester1_review | text | NULL | - |
| semester2_review | text | NULL | - |
| annual_summary | text | NULL | - |

#### `player_academic_tracking`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| tracking_date | date | NOT NULL | CURRENT_DATE |
| school_absence_hours | numeric | NULL | 0 |
| academic_grade | numeric | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| absence_reason | text | NULL | - |
| subject | text | NULL | - |
| notes | text | NULL | - |

#### `player_evaluations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| evaluation_date | date | NOT NULL | CURRENT_DATE |
| overall_rating | integer | NULL | - |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| evaluation_type | text | NOT NULL | - |
| technical_skills | text | NULL | - |
| tactical_awareness | text | NULL | - |
| physical_attributes | text | NULL | - |
| mental_skills | text | NULL | - |
| strengths | text | NULL | - |
| areas_to_improve | text | NULL | - |
| notes | text | NULL | - |

#### `player_selections`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| selection_date | date | NOT NULL | CURRENT_DATE |
| end_date | date | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| selection_type | text | NOT NULL | - |
| competition_name | text | NULL | - |
| notes | text | NULL | - |

---

### 🏥 Dossiers Médicaux

#### `medical_records`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| record_date | date | NOT NULL | - |
| expiry_date | date | NULL | - |
| next_due_date | date | NULL | - |
| reminder_enabled | boolean | NULL | true |
| reminder_days_before | integer | NULL | 30 |
| last_reminder_sent | timestamp with time zone | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| document_url | text | NULL | - |
| record_type | text | NOT NULL | - |
| name | text | NOT NULL | - |
| provider | text | NULL | - |
| location | text | NULL | - |
| result | text | NULL | - |
| notes | text | NULL | - |

---

### 🔔 Notifications & Alertes

#### `notifications`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| injury_id | uuid | NULL | - |
| is_read | boolean | NOT NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |
| scheduled_for | timestamp with time zone | NULL | - |
| metadata | jsonb | NULL | '{}' |
| notification_type | text | NOT NULL | - |
| title | text | NOT NULL | - |
| message | text | NOT NULL | - |
| notification_subtype | text | NULL | - |
| priority | text | NULL | 'normal' |

#### `notification_preferences`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| category_id | uuid | NULL | - |
| injury_alerts | boolean | NULL | true |
| test_reminders | boolean | NULL | true |
| birthday_alerts | boolean | NULL | true |
| medical_reminders | boolean | NULL | true |
| protocol_updates | boolean | NULL | true |
| wellness_alerts | boolean | NULL | true |
| daily_digest | boolean | NULL | false |
| digest_time | time without time zone | NULL | '08:00:00' |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |

#### `smart_alerts`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| player_id | uuid | NOT NULL | - |
| data | jsonb | NULL | '{}' |
| is_read | boolean | NOT NULL | false |
| is_dismissed | boolean | NOT NULL | false |
| created_at | timestamp with time zone | NOT NULL | now() |
| expires_at | timestamp with time zone | NULL | - |
| alert_type | text | NOT NULL | - |
| severity | text | NOT NULL | - |
| title | text | NOT NULL | - |
| message | text | NOT NULL | - |

#### `test_reminders`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| frequency_weeks | integer | NOT NULL | 6 |
| is_active | boolean | NOT NULL | true |
| last_notification_date | date | NULL | - |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| test_type | text | NOT NULL | - |

#### `push_subscriptions`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| endpoint | text | NOT NULL | - |
| p256dh | text | NOT NULL | - |
| auth | text | NOT NULL | - |

---

### 💬 Messagerie

#### `conversations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NULL | - |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NULL | - |
| conversation_type | text | NOT NULL | 'direct' |

#### `conversation_participants`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| conversation_id | uuid | NOT NULL | - |
| user_id | uuid | NOT NULL | - |
| joined_at | timestamp with time zone | NOT NULL | now() |
| last_read_at | timestamp with time zone | NULL | - |
| is_admin | boolean | NULL | false |

#### `messages`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| conversation_id | uuid | NOT NULL | - |
| sender_id | uuid | NOT NULL | - |
| is_announcement | boolean | NULL | false |
| is_urgent | boolean | NULL | false |
| read_by | uuid[] | NULL | '{}' |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| content | text | NOT NULL | - |
| message_type | text | NULL | 'text' |

---

### 🔐 Invitations & Accès

#### `club_invitations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| club_id | uuid | NOT NULL | - |
| role | app_role | NOT NULL | 'viewer' |
| invited_by | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| expires_at | timestamp with time zone | NULL | - |
| email | text | NOT NULL | - |
| token | text | NOT NULL | gen_random_uuid() |
| status | text | NOT NULL | 'pending' |

#### `category_invitations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| role | app_role | NOT NULL | 'viewer' |
| invited_by | uuid | NOT NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| expires_at | timestamp with time zone | NULL | - |
| email | text | NOT NULL | - |
| token | text | NOT NULL | gen_random_uuid() |
| status | text | NOT NULL | 'pending' |

#### `ambassador_invitations`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| created_at | timestamp with time zone | NOT NULL | now() |
| expires_at | timestamp with time zone | NULL | - |
| invited_by | uuid | NULL | - |
| accepted_at | timestamp with time zone | NULL | - |
| accepted_by | uuid | NULL | - |
| email | text | NOT NULL | - |
| name | text | NULL | - |
| token | text | NOT NULL | encode(extensions.gen_random_bytes(32), 'hex') |
| status | text | NOT NULL | 'pending' |

#### `public_access_tokens`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| club_id | uuid | NULL | - |
| category_id | uuid | NULL | - |
| created_by | uuid | NOT NULL | - |
| expires_at | timestamp with time zone | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| last_used_at | timestamp with time zone | NULL | - |
| is_active | boolean | NOT NULL | true |
| token | text | NOT NULL | encode(extensions.gen_random_bytes(32), 'hex') |
| label | text | NULL | - |
| access_type | text | NOT NULL | 'viewer' |

#### `invitation_attempts`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| attempted_at | timestamp with time zone | NOT NULL | now() |
| success | boolean | NOT NULL | false |
| token | text | NOT NULL | - |
| ip_address | text | NULL | - |
| user_agent | text | NULL | - |

---

### 📋 Disponibilité & Benchmarks

#### `player_availability_scores`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| score_date | date | NOT NULL | CURRENT_DATE |
| awcr_score | integer | NULL | - |
| wellness_score | integer | NULL | - |
| injury_score | integer | NULL | - |
| fatigue_score | integer | NULL | - |
| overall_score | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| availability_status | text | NOT NULL | 'available' |
| notes | text | NULL | - |

#### `position_benchmarks`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| sprint_40m_elite | numeric | NULL | - |
| sprint_40m_good | numeric | NULL | - |
| squat_ratio_elite | numeric | NULL | - |
| squat_ratio_good | numeric | NULL | - |
| bench_ratio_elite | numeric | NULL | - |
| bench_ratio_good | numeric | NULL | - |
| body_fat_max | numeric | NULL | - |
| muscle_mass_min_ratio | numeric | NULL | - |
| cmj_cm_elite | integer | NULL | - |
| cmj_cm_good | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| position | text | NOT NULL | - |
| yo_yo_level_elite | text | NULL | - |
| yo_yo_level_good | text | NULL | - |
| notes | text | NULL | - |

---

### 📝 Audit & Logs

#### `audit_logs`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | - |
| entity_id | uuid | NULL | - |
| details | jsonb | NULL | '{}' |
| created_at | timestamp with time zone | NOT NULL | now() |
| action | text | NOT NULL | - |
| entity_type | text | NOT NULL | - |
| ip_address | text | NULL | - |
| user_agent | text | NULL | - |

#### `staff_notes`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| player_id | uuid | NOT NULL | - |
| category_id | uuid | NOT NULL | - |
| note_date | date | NOT NULL | CURRENT_DATE |
| is_confidential | boolean | NULL | false |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| staff_role | text | NOT NULL | - |
| note_content | text | NOT NULL | - |

---

### 📅 Planning

#### `weekly_planning`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| week_start_date | date | NOT NULL | - |
| day_of_week | integer | NOT NULL | - |
| time_slot | time without time zone | NULL | - |
| template_id | uuid | NULL | - |
| assigned_players | uuid[] | NULL | - |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| custom_title | text | NULL | - |
| custom_description | text | NULL | - |
| location | text | NULL | - |
| status | text | NULL | 'planned' |
| notes | text | NULL | - |

#### `session_templates`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| category_id | uuid | NOT NULL | - |
| default_duration_minutes | integer | NULL | 60 |
| training_type | training_type | NULL | - |
| is_active | boolean | NULL | true |
| created_by | uuid | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |
| name | text | NOT NULL | - |
| description | text | NULL | - |
| color | text | NULL | - |

#### `template_exercises`
| Colonne | Type | Nullable | Default |
|---------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| template_id | uuid | NOT NULL | - |
| exercise_id | uuid | NULL | - |
| order_index | integer | NOT NULL | 0 |
| sets | integer | NULL | - |
| duration_seconds | integer | NULL | - |
| rest_seconds | integer | NULL | - |
| created_at | timestamp with time zone | NOT NULL | now() |
| notes | text | NULL | - |
| exercise_name | text | NOT NULL | - |
| reps | text | NULL | - |

---

## 🔑 Types ENUM

### `app_role`
- `viewer`
- `coach`
- `physio`
- `doctor`
- `admin`

### `injury_severity`
- `minor`
- `moderate`
- `severe`

### `injury_status`
- `active`
- `recovering`
- `healed`

### `training_type`
- (Multiple sport-specific types)

### `period_type`
- `preparation`
- `competition`
- `transition`

---

## 📊 Statistiques

- **91 tables**
- **340+ politiques RLS**
- **20+ fonctions de base de données**
