-- Mettre à jour les anciennes catégories vers les nouvelles
UPDATE exercise_library SET category = 'ergo_assault' WHERE category IN ('assault_bike', 'echo_bike');
UPDATE exercise_library SET category = 'ergo_bikeerg' WHERE category = 'bikeerg';
UPDATE exercise_library SET category = 'ergo_rowerg' WHERE category = 'rowerg';
UPDATE exercise_library SET category = 'ergo_skierg' WHERE category = 'skierg';
UPDATE exercise_library SET category = 'mobility' WHERE category = 'stretching_mobility';

-- Supprimer l'ancienne contrainte
ALTER TABLE exercise_library DROP CONSTRAINT IF EXISTS exercise_library_category_check;

-- Ajouter les nouvelles catégories d'haltérophilie à la contrainte
ALTER TABLE exercise_library ADD CONSTRAINT exercise_library_category_check CHECK (
  category IN (
    -- Haltérophilie
    'halterophilie', 'halterophilie_snatch', 'halterophilie_clean', 'halterophilie_jerk', 
    'halterophilie_clean_jerk', 'halterophilie_pulls', 'halterophilie_positions',
    'halterophilie_hang', 'halterophilie_blocks', 'halterophilie_complexes',
    'halterophilie_squats', 'halterophilie_presses', 'halterophilie_pulls_strength',
    -- Musculation
    'upper_push', 'upper_pull', 'shoulders', 'arms', 'lower_push', 'lower_pull',
    'glutes', 'hamstrings', 'calves', 'core', 'anti_rotation', 'musculation',
    'plyometrics', 'isometrics', 'explosive',
    -- Poids de corps
    'bodyweight_upper', 'bodyweight_lower', 'bodyweight_core', 'bodyweight_full',
    'calisthenics', 'gymnastics', 'weighted_calisthenics',
    -- CrossFit / Hyrox
    'crossfit_wod', 'crossfit_amrap', 'crossfit_emom', 'crossfit_fortime', 'crossfit_chipper',
    'hyrox_simulation', 'hyrox_running', 'hyrox_stations', 'functional_fitness',
    -- Pilates / Yoga
    'pilates_mat', 'pilates_reformer', 'yoga_flow', 'yoga_power', 'yoga_stretch', 'pilates_core',
    -- Réathlétisation
    'reathletisation_lower', 'reathletisation_upper', 'reathletisation_trunk',
    'proprioception', 'neuromuscular', 'shoulder_stability', 'knee_stability',
    'ankle_stability', 'hip_stability', 'prophylaxis', 'eccentric',
    -- Ergo / Cardio
    'ergo_rowerg', 'ergo_skierg', 'ergo_bikeerg', 'ergo_assault',
    'ergo_treadmill', 'ergo_elliptical', 'ergo_stairmaster', 'ergo_versaclimber',
    -- Sled
    'sled_push', 'sled_pull', 'sled_drag', 'prowler',
    -- Course
    'running_ef', 'running_seuil', 'running_vma', 'running_fractionne',
    'running_sprint', 'running_cote', 'running_fartlek', 'running_tempo',
    'running_recup', 'running_ppg', 'running_trail',
    -- Terrain général
    'cardio', 'terrain', 'speed', 'agility', 'endurance', 'interval',
    -- Terrain sports
    'football_technique', 'football_tactical', 'football_finishing', 'football_possession',
    'handball_shooting', 'handball_defense', 'handball_fast_break',
    'basketball_shooting', 'basketball_dribbling', 'basketball_defense', 'basketball_transition',
    'volleyball_service', 'volleyball_attack', 'volleyball_block', 'volleyball_reception',
    'rugby_scrummage', 'rugby_lineout', 'rugby_tackle', 'rugby_ruck', 'rugby_passing', 'rugby_kicking',
    'judo_randori', 'judo_uchikomi', 'judo_nagekomi', 'judo_newaza', 'judo_kata',
    'aviron_technique', 'aviron_ergo', 'aviron_endurance',
    'bowling_technique', 'bowling_spare', 'bowling_strike',
    -- Athlétisme
    'athletisme_starting_blocks', 'athletisme_acceleration', 'athletisme_max_velocity', 'athletisme_sprint_endurance',
    'athletisme_hurdle_drills', 'athletisme_hurdle_rhythm',
    'athletisme_intervals', 'athletisme_tempo_runs', 'athletisme_long_run', 'athletisme_fartlek',
    'athletisme_approach_work', 'athletisme_takeoff_drills', 'athletisme_flight_drills', 'athletisme_landing', 'athletisme_pole_vault_tech',
    'athletisme_throwing_drills', 'athletisme_rotation_work', 'athletisme_release_drills', 'athletisme_implement_work',
    -- Mobilité / Échauffement
    'warmup', 'warmup_dynamic', 'warmup_specific', 'activation', 'mobility', 'stretching',
    'dynamic_stretching', 'foam_rolling', 'recovery', 'breathing', 'cooldown',
    -- Autre
    'other'
  )
);