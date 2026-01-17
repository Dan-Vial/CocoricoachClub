-- Drop the existing check constraint on rugby_type
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_rugby_type_check;

-- Add a new check constraint with all sport types
ALTER TABLE public.categories ADD CONSTRAINT categories_rugby_type_check CHECK (
  rugby_type IN (
    -- Rugby types
    'XV', '7', 'XIII', 'academie', 'national_team',
    -- Football types
    'football', 'football_club', 'football_academie', 'football_national',
    -- Handball types
    'handball', 'handball_club', 'handball_academie', 'handball_national',
    -- Volleyball types
    'volleyball', 'volleyball_club', 'volleyball_academie', 'volleyball_national',
    -- Basketball types
    'basketball', 'basketball_club', 'basketball_academie', 'basketball_national',
    -- Judo types
    'judo', 'judo_club', 'judo_academie', 'judo_national',
    -- Bowling types
    'bowling', 'bowling_club', 'bowling_academie', 'bowling_national',
    -- Aviron types
    'aviron', 'aviron_club', 'aviron_academie', 'aviron_national'
  )
);