ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_rugby_type_check;

ALTER TABLE public.categories
ADD CONSTRAINT categories_rugby_type_check CHECK (
  rugby_type = ANY (ARRAY[
    'XV','7','XIII','15','touch','academie','national_team',
    'football','football_club','football_academie','football_national',
    'handball','handball_club','handball_academie','handball_national',
    'volleyball','volleyball_club','volleyball_academie','volleyball_national',
    'basketball','basketball_club','basketball_academie','basketball_national','basketball_3x3','basketball_pro','basketball_jeunes',
    'judo','judo_club','judo_academie','judo_national',
    'bowling','bowling_club','bowling_academie','bowling_national',
    'aviron','aviron_club','aviron_academie','aviron_national',
    'athletisme','athletisme_club','athletisme_academie','athletisme_national',
    'athletisme_sprints','athletisme_haies','athletisme_demi_fond','athletisme_fond','athletisme_marche',
    'athletisme_sauts_longueur','athletisme_sauts_hauteur','athletisme_lancers','athletisme_combines','athletisme_trail','athletisme_ultra_trail',
    'crossfit','crossfit_box','crossfit_hyrox','crossfit_musculation',
    'padel','padel_club','padel_academie','padel_national',
    'natation','natation_club','natation_academie','natation_national',
    'ski','ski_club','ski_academie','ski_national',
    'ski_alpin','ski_alpin_club','ski_alpin_academie','ski_alpin_national',
    'ski_fond','ski_fond_club','ski_fond_academie','ski_fond_national',
    'ski_biathlon','ski_biathlon_club','ski_biathlon_academie','ski_biathlon_national',
    'ski_freestyle','ski_freestyle_club','ski_freestyle_academie','ski_freestyle_national',
    'snowboard_freestyle','snowboard_freestyle_club','snowboard_freestyle_academie','snowboard_freestyle_national',
    'snowboard_alpin','snowboard_alpin_club','snowboard_alpin_academie','snowboard_alpin_national',
    'ski_saut','ski_saut_club','ski_saut_academie','ski_saut_national',
    'ski_combine_nordique','ski_combine_nordique_club','ski_combine_nordique_academie','ski_combine_nordique_national',
    'ski_descente','ski_slalom','ski_geant','ski_super_g','ski_combine',
    'ski_fond_sprint','ski_fond_distance','ski_fond_relais','ski_fond_skiathlon',
    'ski_freestyle_bosses','ski_freestyle_slopestyle','ski_freestyle_halfpipe','ski_freestyle_skicross',
    'snow_slopestyle','snow_halfpipe','snow_boardercross','snow_big_air',
    'surf','surf_club','surf_academie','surf_national','surf_shortboard','surf_longboard','surf_bodyboard','surf_big_wave','surf_sup','surf_tow_in','surf_foil',
    'triathlon','triathlon_club','triathlon_academie','triathlon_national',
    'tennis','tennis_club','tennis_academie','tennis_national'
  ])
);