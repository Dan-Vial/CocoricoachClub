-- Drop the existing check constraint
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_rugby_type_check;

-- Add the updated check constraint with all sport types including athletics
ALTER TABLE public.categories ADD CONSTRAINT categories_rugby_type_check CHECK (
  rugby_type IN (
    -- Rugby types
    'XV', '7', 'XIII', '15', 'academie', 'national_team',
    -- Legacy simple types
    'football', 'handball', 'volleyball', 'basketball', 'judo', 'bowling', 'aviron', 'athletisme',
    -- Football subtypes
    'football_club', 'football_academie', 'football_national',
    -- Handball subtypes
    'handball_club', 'handball_academie', 'handball_national',
    -- Volleyball subtypes
    'volleyball_club', 'volleyball_academie', 'volleyball_national',
    -- Basketball subtypes
    'basketball_club', 'basketball_academie', 'basketball_national',
    -- Judo subtypes
    'judo_club', 'judo_academie', 'judo_national',
    -- Bowling subtypes
    'bowling_club', 'bowling_academie', 'bowling_national',
    -- Aviron subtypes
    'aviron_club', 'aviron_academie', 'aviron_national',
    -- Athletics category subtypes (Club, Académie, National)
    'athletisme_club', 'athletisme_academie', 'athletisme_national',
    -- Athletics disciplines (for backwards compatibility if needed)
    'athletisme_sprints', 'athletisme_haies', 'athletisme_demi_fond', 
    'athletisme_fond', 'athletisme_marche', 'athletisme_sauts_longueur',
    'athletisme_sauts_hauteur', 'athletisme_lancers', 'athletisme_combines'
  )
);