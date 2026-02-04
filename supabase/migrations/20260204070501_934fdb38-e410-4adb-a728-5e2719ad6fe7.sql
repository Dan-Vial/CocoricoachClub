-- Mise à jour de la contrainte de catégorie pour inclure toutes les nouvelles catégories
ALTER TABLE exercise_library DROP CONSTRAINT IF EXISTS exercise_library_category_check;

ALTER TABLE exercise_library ADD CONSTRAINT exercise_library_category_check CHECK (category = ANY (ARRAY[
  -- Musculation
  'upper_push', 'upper_pull', 'shoulders', 'arms',
  'lower_push', 'lower_pull', 'glutes', 'hamstrings', 'calves',
  'core', 'anti_rotation', 'musculation',
  'halterophilie', 'plyometrics', 'isometrics', 'explosive',
  
  -- Poids de corps
  'bodyweight_upper', 'bodyweight_lower', 'bodyweight_core', 'bodyweight_full',
  'calisthenics', 'gymnastics',
  
  -- CrossFit / Hyrox
  'crossfit_wod', 'crossfit_amrap', 'crossfit_emom', 'crossfit_fortime', 'crossfit_chipper',
  'hyrox_simulation', 'hyrox_running', 'hyrox_stations', 'functional_fitness',
  
  -- Pilates / Yoga
  'pilates_mat', 'pilates_reformer', 'pilates_core',
  'yoga_flow', 'yoga_power', 'yoga_stretch',
  
  -- Réathlétisation
  'reathletisation_lower', 'reathletisation_upper', 'reathletisation_trunk',
  'proprioception', 'neuromuscular',
  'shoulder_stability', 'knee_stability', 'ankle_stability', 'hip_stability',
  'prophylaxis', 'eccentric',
  
  -- Ergo / Cardio machines
  'ergo_rowerg', 'ergo_skierg', 'ergo_bikeerg', 'ergo_assault',
  'ergo_treadmill', 'ergo_elliptical', 'ergo_stairmaster', 'ergo_versaclimber',
  'ergometre', 'rowerg', 'skierg', 'bikeerg', 'assault_bike', 'echo_bike',
  
  -- Sled / Traîneau
  'sled_push', 'sled_pull', 'sled_drag', 'prowler',
  
  -- Course à pied
  'running_ef', 'running_seuil', 'running_vma', 'running_fractionne',
  'running_sprint', 'running_cote', 'running_fartlek', 'running_tempo',
  'running_recup', 'running_ppg', 'running_trail',
  
  -- Terrain général
  'cardio', 'terrain', 'speed', 'agility', 'endurance', 'interval',
  
  -- Football
  'football_technique', 'football_tactical', 'football_finishing', 'football_possession',
  
  -- Handball
  'handball_shooting', 'handball_defense', 'handball_fast_break',
  
  -- Basketball
  'basketball_shooting', 'basketball_dribbling', 'basketball_defense', 'basketball_transition',
  
  -- Volleyball
  'volleyball_service', 'volleyball_attack', 'volleyball_block', 'volleyball_reception',
  
  -- Rugby
  'rugby_scrummage', 'rugby_lineout', 'rugby_tackle', 'rugby_ruck', 'rugby_passing', 'rugby_kicking',
  
  -- Judo
  'judo_randori', 'judo_uchikomi', 'judo_nagekomi', 'judo_newaza', 'judo_kata',
  
  -- Aviron
  'aviron_technique', 'aviron_ergo', 'aviron_endurance',
  
  -- Bowling
  'bowling_technique', 'bowling_spare', 'bowling_strike',
  
  -- Athlétisme
  'athletisme_starting_blocks', 'athletisme_acceleration', 'athletisme_max_velocity', 'athletisme_sprint_endurance',
  'athletisme_hurdle_drills', 'athletisme_hurdle_rhythm',
  'athletisme_intervals', 'athletisme_tempo_runs', 'athletisme_long_run', 'athletisme_fartlek',
  'athletisme_approach_work', 'athletisme_takeoff_drills', 'athletisme_flight_drills', 'athletisme_landing', 'athletisme_pole_vault_tech',
  'athletisme_throwing_drills', 'athletisme_rotation_work', 'athletisme_release_drills', 'athletisme_implement_work',
  
  -- Stretching / Mobilité / Échauffement
  'warmup', 'warmup_dynamic', 'warmup_specific', 'activation',
  'mobility', 'stretching', 'dynamic_stretching', 'stretching_mobility',
  'foam_rolling', 'recovery', 'breathing', 'cooldown',
  
  'other'
]));