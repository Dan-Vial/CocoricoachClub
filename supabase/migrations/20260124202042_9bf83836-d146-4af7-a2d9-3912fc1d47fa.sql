-- Drop the existing category check constraint
ALTER TABLE public.exercise_library DROP CONSTRAINT IF EXISTS exercise_library_category_check;

-- Create new constraint with expanded categories including ergo machines and sled exercises
ALTER TABLE public.exercise_library ADD CONSTRAINT exercise_library_category_check 
CHECK (category = ANY (ARRAY[
  -- Original categories
  'stretching_mobility', 'musculation', 'terrain', 'warmup', 'core', 
  'plyometrics', 'cardio', 'upper_push', 'upper_pull', 'lower_push', 
  'lower_pull', 'mobility', 'other',
  -- Musculation extended
  'shoulders', 'arms', 'glutes', 'hamstrings', 'calves', 'anti_rotation',
  'halterophilie', 'isometrics', 'explosive',
  -- Réathlétisation  
  'reathletisation_lower', 'reathletisation_upper', 'reathletisation_trunk',
  'proprioception', 'neuromuscular', 'shoulder_stability', 'knee_stability',
  'ankle_stability', 'hip_stability', 'prophylaxis', 'eccentric',
  -- Ergometers / Cardio machines
  'ergometre', 'skierg', 'rowerg', 'assault_bike', 'echo_bike', 'bikeerg',
  -- Sled exercises
  'sled_push', 'sled_pull',
  -- Terrain categories
  'speed', 'agility', 'endurance', 'interval',
  -- Stretching & recovery
  'stretching', 'dynamic_stretching', 'foam_rolling', 'recovery', 'breathing',
  -- Sport specific terrain
  'football_technique', 'football_tactical', 'football_finishing', 'football_possession',
  'handball_shooting', 'handball_defense', 'handball_fast_break',
  'basketball_shooting', 'basketball_dribbling', 'basketball_defense', 'basketball_transition',
  'volleyball_service', 'volleyball_attack', 'volleyball_block', 'volleyball_reception',
  'rugby_scrummage', 'rugby_lineout', 'rugby_tackle', 'rugby_ruck', 'rugby_passing', 'rugby_kicking',
  'judo_randori', 'judo_uchikomi', 'judo_nagekomi', 'judo_newaza', 'judo_kata',
  'aviron_technique', 'aviron_ergo', 'aviron_endurance',
  'bowling_technique', 'bowling_spare', 'bowling_strike',
  'athletisme_starting_blocks', 'athletisme_acceleration', 'athletisme_max_velocity', 'athletisme_sprint_endurance',
  'athletisme_hurdle_drills', 'athletisme_hurdle_rhythm',
  'athletisme_intervals', 'athletisme_tempo_runs', 'athletisme_long_run', 'athletisme_fartlek',
  'athletisme_approach_work', 'athletisme_takeoff_drills', 'athletisme_flight_drills', 'athletisme_landing', 'athletisme_pole_vault_tech',
  'athletisme_throwing_drills', 'athletisme_rotation_work', 'athletisme_release_drills', 'athletisme_implement_work'
]));