
ALTER TABLE public.categories DROP CONSTRAINT categories_rugby_type_check;

ALTER TABLE public.categories ADD CONSTRAINT categories_rugby_type_check CHECK (
  rugby_type = ANY (ARRAY[
    -- Rugby
    'XV','7','XIII','15','touch','academie','national_team',
    -- Football
    'football','football_club','football_academie','football_national',
    -- Handball
    'handball','handball_club','handball_academie','handball_national',
    -- Volleyball
    'volleyball','volleyball_club','volleyball_academie','volleyball_national',
    -- Basketball
    'basketball','basketball_club','basketball_academie','basketball_national','basketball_3x3','basketball_pro','basketball_jeunes',
    -- Judo
    'judo','judo_club','judo_academie','judo_national',
    -- Bowling
    'bowling','bowling_club','bowling_academie','bowling_national',
    -- Aviron
    'aviron','aviron_club','aviron_academie','aviron_national',
    -- Athlétisme
    'athletisme','athletisme_club','athletisme_academie','athletisme_national',
    'athletisme_sprints','athletisme_haies','athletisme_demi_fond','athletisme_fond','athletisme_marche',
    'athletisme_sauts_longueur','athletisme_sauts_hauteur','athletisme_lancers','athletisme_combines',
    'athletisme_trail','athletisme_ultra_trail',
    -- CrossFit / Hyrox
    'crossfit','crossfit_box','crossfit_hyrox','crossfit_musculation',
    -- Padel
    'padel','padel_club','padel_academie','padel_national',
    -- Natation
    'natation','natation_club','natation_academie','natation_national',
    -- Ski / Sports de glisse (base)
    'ski','ski_club','ski_academie','ski_national',
    -- Ski disciplines
    'ski_alpin','ski_fond','ski_biathlon','ski_freestyle',
    'snowboard_freestyle','snowboard_alpin','ski_saut','ski_combine_nordique',
    -- Ski subtypes détaillés
    'ski_descente','ski_slalom','ski_geant','ski_super_g','ski_combine',
    'ski_fond_sprint','ski_fond_distance','ski_fond_relais','ski_fond_skiathlon',
    'ski_freestyle_bosses','ski_freestyle_slopestyle','ski_freestyle_halfpipe','ski_freestyle_skicross',
    'snow_slopestyle','snow_halfpipe','snow_boardercross','snow_big_air',
    -- Surf
    'surf','surf_club','surf_academie','surf_national',
    'surf_shortboard','surf_longboard','surf_bodyboard','surf_big_wave','surf_sup','surf_tow_in','surf_foil',
    -- Triathlon
    'triathlon','triathlon_club','triathlon_academie','triathlon_national',
    -- Tennis
    'tennis','tennis_club','tennis_academie','tennis_national'
  ])
);
