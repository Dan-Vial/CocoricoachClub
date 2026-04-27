// Sport types configuration
export type SportType = 
  | "XV" 
  | "7" 
  | "XIII"
  | "touch"
  | "academie" 
  | "national_team"
  | "football" 
  | "handball" 
  | "judo" 
  | "volleyball"
  | "bowling"
  | "basketball"
  | "aviron"
  | "athletisme"
  | "crossfit"
  | "padel"
  | "natation"
  | "ski"
  | "surf"
  | "triathlon"
  | "tennis"
  | "football_club"
  | "football_academie"
  | "football_national"
  | "handball_club"
  | "handball_academie"
  | "handball_national"
  | "volleyball_club"
  | "volleyball_academie"
  | "volleyball_national"
  | "basketball_club"
  | "basketball_academie"
  | "basketball_national"
  | "basketball_3x3"
  | "basketball_pro"
  | "basketball_jeunes"
  | "judo_club"
  | "judo_academie"
  | "judo_national"
  | "bowling_club"
  | "bowling_academie"
  | "bowling_national"
  | "aviron_club"
  | "aviron_academie"
  | "aviron_national"
  | "crossfit_box"
  | "crossfit_hyrox"
  | "crossfit_musculation"
  | "padel_club"
  | "padel_academie"
  | "padel_national"
  | "natation_club"
  | "natation_academie"
  | "natation_national"
  | "ski_club"
  | "ski_academie"
  | "ski_national"
  | "surf_club"
  | "surf_academie"
  | "surf_national"
  | "triathlon_club"
  | "triathlon_academie"
  | "triathlon_national"
  | "tennis_club"
  | "tennis_academie"
  | "tennis_national"
  // Athlétisme disciplines
  | "athletisme_sprints"
  | "athletisme_haies"
  | "athletisme_demi_fond"
  | "athletisme_fond"
  | "athletisme_marche"
  | "athletisme_sauts_longueur"
  | "athletisme_sauts_hauteur"
  | "athletisme_lancers"
  | "athletisme_combines"
  | "athletisme_trail"
  | "athletisme_ultra_trail"
  | "athletisme_club"
  | "athletisme_academie"
  | "athletisme_national";

export interface SportTypeOption {
  value: SportType;
  label: string;
  category: "rugby" | "team" | "individual";
}

// Main sport categories for the first dropdown
export type MainSportCategory = "rugby" | "football" | "handball" | "volleyball" | "basketball" | "judo" | "bowling" | "aviron" | "athletisme" | "crossfit" | "padel" | "natation" | "ski" | "surf" | "triathlon" | "tennis";

export interface MainSportOption {
  value: MainSportCategory;
  label: string;
}

export const MAIN_SPORTS: MainSportOption[] = [
  { value: "rugby", label: "Rugby" },
  { value: "football", label: "Football" },
  { value: "handball", label: "Handball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "natation", label: "Natation" },
  { value: "ski", label: "Sports de Glisse (Ski / Snow)" },
  { value: "surf", label: "Surf" },
  { value: "triathlon", label: "Triathlon" },
  { value: "judo", label: "Judo" },
  { value: "bowling", label: "Bowling" },
  { value: "aviron", label: "Aviron" },
  { value: "athletisme", label: "Athlétisme" },
  { value: "crossfit", label: "CrossFit / Hyrox / Musculation" },
];

// Sub-types for rugby
export interface SportSubTypeOption {
  value: SportType;
  label: string;
}

// Generic option for player attributes (discipline, weight category)
export interface PlayerAttributeOption {
  value: string;
  label: string;
}

export const RUGBY_SUBTYPES: SportSubTypeOption[] = [
  { value: "XV", label: "Rugby à XV" },
  { value: "7", label: "Rugby à 7" },
  { value: "XIII", label: "Rugby à XIII" },
  { value: "touch", label: "Touch Rugby" },
  { value: "academie", label: "Académie / Pôle Espoir" },
  { value: "national_team", label: "Équipe Nationale" },
];

// Sub-types for athletics CATEGORY creation (Club, Académie, National only)
export const ATHLETISME_CATEGORY_SUBTYPES: SportSubTypeOption[] = [
  { value: "athletisme_club", label: "Athlétisme - Club" },
  { value: "athletisme_academie", label: "Athlétisme - Académie / Pôle Espoir" },
  { value: "athletisme_national", label: "Athlétisme - Équipe Nationale" },
];

// Disciplines for PLAYER creation (used in AddPlayerDialog)
export const ATHLETISME_DISCIPLINES: PlayerAttributeOption[] = [
  { value: "athletisme_sprints", label: "Sprints" },
  { value: "athletisme_haies", label: "Haies" },
  { value: "athletisme_demi_fond", label: "Demi-fond" },
  { value: "athletisme_fond", label: "Fond" },
  { value: "athletisme_marche", label: "Marche athlétique" },
  { value: "athletisme_sauts_longueur", label: "Sauts horizontaux" },
  { value: "athletisme_sauts_hauteur", label: "Sauts verticaux" },
  { value: "athletisme_lancers", label: "Lancers" },
  { value: "athletisme_combines", label: "Épreuves combinées" },
  { value: "athletisme_trail", label: "Trail" },
  { value: "athletisme_ultra_trail", label: "Ultra-Trail" },
];

// Specialties per discipline for athletics
export interface SpecialtyOption {
  value: string;
  label: string;
}

export const ATHLETISME_SPECIALTIES: Record<string, SpecialtyOption[]> = {
  athletisme_sprints: [
    { value: "60m", label: "60m" },
    { value: "100m", label: "100m" },
    { value: "200m", label: "200m" },
    { value: "400m", label: "400m" },
  ],
  athletisme_haies: [
    { value: "60mH", label: "60m Haies" },
    { value: "100mH", label: "100m Haies" },
    { value: "110mH", label: "110m Haies" },
    { value: "400mH", label: "400m Haies" },
  ],
  athletisme_demi_fond: [
    { value: "800m", label: "800m" },
    { value: "1500m", label: "1500m" },
    { value: "mile", label: "Mile" },
  ],
  athletisme_fond: [
    { value: "3000m", label: "3000m" },
    { value: "5000m", label: "5000m" },
    { value: "10000m", label: "10000m" },
    { value: "cross", label: "Cross-country" },
    { value: "semi_marathon", label: "Semi-marathon" },
    { value: "marathon", label: "Marathon" },
  ],
  athletisme_marche: [
    { value: "10km_marche", label: "10km Marche" },
    { value: "20km_marche", label: "20km Marche" },
    { value: "35km_marche", label: "35km Marche" },
    { value: "50km_marche", label: "50km Marche" },
  ],
  athletisme_sauts_longueur: [
    { value: "longueur", label: "Longueur" },
    { value: "triple_saut", label: "Triple saut" },
  ],
  athletisme_sauts_hauteur: [
    { value: "hauteur", label: "Hauteur" },
    { value: "perche", label: "Perche" },
  ],
  athletisme_lancers: [
    { value: "poids", label: "Poids" },
    { value: "disque", label: "Disque" },
    { value: "marteau", label: "Marteau" },
    { value: "javelot", label: "Javelot" },
  ],
  athletisme_combines: [
    { value: "pentathlon", label: "Pentathlon" },
    { value: "heptathlon", label: "Heptathlon" },
    { value: "decathlon", label: "Décathlon" },
  ],
  athletisme_trail: [
    { value: "trail_court", label: "Trail court (< 42 km)" },
    { value: "trail_long", label: "Trail long (42-80 km)" },
    { value: "trail_vertical", label: "Trail vertical / Kilomètre vertical" },
    { value: "trail_montagne", label: "Course de montagne" },
  ],
  athletisme_ultra_trail: [
    { value: "ultra_80_100", label: "Ultra 80-100 km" },
    { value: "ultra_100_plus", label: "Ultra 100+ km" },
    { value: "ultra_24h", label: "24 heures" },
    { value: "ultra_multi_etapes", label: "Multi-étapes / Raid" },
  ],
};

// Weight categories for Judo (used in AddPlayerDialog)
export const JUDO_WEIGHT_CATEGORIES_MEN: PlayerAttributeOption[] = [
  { value: "judo_-60kg", label: "-60 kg" },
  { value: "judo_-66kg", label: "-66 kg" },
  { value: "judo_-73kg", label: "-73 kg" },
  { value: "judo_-81kg", label: "-81 kg" },
  { value: "judo_-90kg", label: "-90 kg" },
  { value: "judo_-100kg", label: "-100 kg" },
  { value: "judo_+100kg", label: "+100 kg" },
];

export const JUDO_WEIGHT_CATEGORIES_WOMEN: PlayerAttributeOption[] = [
  { value: "judo_-48kg", label: "-48 kg" },
  { value: "judo_-52kg", label: "-52 kg" },
  { value: "judo_-57kg", label: "-57 kg" },
  { value: "judo_-63kg", label: "-63 kg" },
  { value: "judo_-70kg", label: "-70 kg" },
  { value: "judo_-78kg", label: "-78 kg" },
  { value: "judo_+78kg", label: "+78 kg" },
];

// Combined weight categories for general selection
export const JUDO_WEIGHT_CATEGORIES: PlayerAttributeOption[] = [
  { value: "judo_-48kg", label: "-48 kg (F)" },
  { value: "judo_-52kg", label: "-52 kg (F)" },
  { value: "judo_-57kg", label: "-57 kg (F)" },
  { value: "judo_-60kg", label: "-60 kg (M)" },
  { value: "judo_-63kg", label: "-63 kg (F)" },
  { value: "judo_-66kg", label: "-66 kg (M)" },
  { value: "judo_-70kg", label: "-70 kg (F)" },
  { value: "judo_-73kg", label: "-73 kg (M)" },
  { value: "judo_-78kg", label: "-78 kg (F)" },
  { value: "judo_-81kg", label: "-81 kg (M)" },
  { value: "judo_+78kg", label: "+78 kg (F)" },
  { value: "judo_-90kg", label: "-90 kg (M)" },
  { value: "judo_-100kg", label: "-100 kg (M)" },
  { value: "judo_+100kg", label: "+100 kg (M)" },
];

// Roles for Aviron (Rowing)
export const AVIRON_ROLES: PlayerAttributeOption[] = [
  { value: "barreur", label: "Barreur" },
  { value: "rameur_pointe", label: "Rameur de pointe" },
  { value: "rameur_couple", label: "Rameur de couple" },
  { value: "chef_nage", label: "Chef de nage" },
  { value: "nage_1", label: "Nage 1 (Bow)" },
  { value: "nage_2", label: "Nage 2" },
  { value: "nage_3", label: "Nage 3" },
  { value: "nage_4", label: "Nage 4" },
  { value: "nage_5", label: "Nage 5" },
  { value: "nage_6", label: "Nage 6" },
  { value: "nage_7", label: "Nage 7" },
  { value: "nage_8", label: "Nage 8 (Stroke)" },
];

// Disciplines for Natation (Swimming)
export const NATATION_DISCIPLINES: PlayerAttributeOption[] = [
  { value: "natation_crawl", label: "Nage Libre (Crawl)" },
  { value: "natation_dos", label: "Dos" },
  { value: "natation_brasse", label: "Brasse" },
  { value: "natation_papillon", label: "Papillon" },
  { value: "natation_4nages", label: "4 Nages" },
  { value: "natation_eau_libre", label: "Eau libre" },
];

export const NATATION_SPECIALTIES: Record<string, SpecialtyOption[]> = {
  natation_crawl: [
    { value: "50m_nl", label: "50m NL" },
    { value: "100m_nl", label: "100m NL" },
    { value: "200m_nl", label: "200m NL" },
    { value: "400m_nl", label: "400m NL" },
    { value: "800m_nl", label: "800m NL" },
    { value: "1500m_nl", label: "1500m NL" },
  ],
  natation_dos: [
    { value: "50m_dos", label: "50m Dos" },
    { value: "100m_dos", label: "100m Dos" },
    { value: "200m_dos", label: "200m Dos" },
  ],
  natation_brasse: [
    { value: "50m_brasse", label: "50m Brasse" },
    { value: "100m_brasse", label: "100m Brasse" },
    { value: "200m_brasse", label: "200m Brasse" },
  ],
  natation_papillon: [
    { value: "50m_pap", label: "50m Papillon" },
    { value: "100m_pap", label: "100m Papillon" },
    { value: "200m_pap", label: "200m Papillon" },
  ],
  natation_4nages: [
    { value: "200m_4n", label: "200m 4 Nages" },
    { value: "400m_4n", label: "400m 4 Nages" },
  ],
  natation_eau_libre: [
    { value: "5km_el", label: "5km Eau libre" },
    { value: "10km_el", label: "10km Eau libre" },
    { value: "25km_el", label: "25km Eau libre" },
  ],
};

// Club-level discipline families for Sports de Glisse
export interface SkiClubDisciplineOption {
  value: string;
  label: string;
}

export const SKI_CLUB_DISCIPLINES: SkiClubDisciplineOption[] = [
  { value: "ski_alpin", label: "Ski Alpin" },
  { value: "ski_fond", label: "Ski de Fond" },
  { value: "ski_biathlon", label: "Biathlon" },
  { value: "ski_freestyle", label: "Ski Freestyle" },
  { value: "snowboard_freestyle", label: "Snowboard Freestyle" },
  { value: "snowboard_alpin", label: "Snowboard Alpin" },
  { value: "ski_saut", label: "Saut à Ski" },
  { value: "ski_combine_nordique", label: "Combiné Nordique" },
];

// Disciplines for Sports de Glisse (Ski/Snow)
export const SKI_DISCIPLINES: PlayerAttributeOption[] = [
  // Ski Alpin
  { value: "ski_descente", label: "Ski Alpin - Descente" },
  { value: "ski_slalom", label: "Ski Alpin - Slalom" },
  { value: "ski_geant", label: "Ski Alpin - Géant" },
  { value: "ski_super_g", label: "Ski Alpin - Super-G" },
  { value: "ski_combine", label: "Ski Alpin - Combiné" },
  // Biathlon
  { value: "ski_biathlon", label: "Biathlon" },
  // Ski de fond
  { value: "ski_fond_sprint", label: "Ski de fond - Sprint" },
  { value: "ski_fond_distance", label: "Ski de fond - Distance" },
  { value: "ski_fond_relais", label: "Ski de fond - Relais" },
  { value: "ski_fond_skiathlon", label: "Ski de fond - Skiathlon" },
  // Freestyle
  { value: "ski_freestyle_bosses", label: "Freestyle - Bosses" },
  { value: "ski_freestyle_slopestyle", label: "Freestyle - Slopestyle" },
  { value: "ski_freestyle_halfpipe", label: "Freestyle - Half-pipe" },
  { value: "ski_freestyle_skicross", label: "Freestyle - Skicross" },
  // Snowboard
  { value: "snow_slopestyle", label: "Snowboard - Slopestyle" },
  { value: "snow_halfpipe", label: "Snowboard - Half-pipe" },
  { value: "snow_boardercross", label: "Snowboard - Boardercross" },
  { value: "snow_geant_parallele", label: "Snowboard - Géant parallèle" },
  { value: "snow_big_air", label: "Snowboard - Big Air" },
  // Saut à ski
  { value: "ski_saut", label: "Saut à ski" },
  // Combiné nordique
  { value: "ski_combine_nordique", label: "Combiné nordique" },
];

// Disciplines for Surf
export const SURF_DISCIPLINES: PlayerAttributeOption[] = [
  { value: "surf_shortboard", label: "Shortboard" },
  { value: "surf_longboard", label: "Longboard" },
  { value: "surf_bodyboard", label: "Bodyboard" },
  { value: "surf_big_wave", label: "Big Wave" },
  { value: "surf_sup", label: "Stand Up Paddle (SUP)" },
  { value: "surf_tow_in", label: "Tow-in" },
  { value: "surf_foil", label: "Surf Foil" },
];

// Disciplines for Triathlon
export const TRIATHLON_DISCIPLINES: PlayerAttributeOption[] = [
  { value: "triathlon_sprint", label: "Triathlon Sprint" },
  { value: "triathlon_olympique", label: "Triathlon Olympique (Distance M)" },
  { value: "triathlon_half", label: "Half Ironman (70.3)" },
  { value: "triathlon_ironman", label: "Ironman (Distance L)" },
  { value: "triathlon_duathlon", label: "Duathlon (Course + Vélo)" },
  { value: "triathlon_aquathlon", label: "Aquathlon (Natation + Course)" },
];

// Padel roles/positions
export const PADEL_POSITIONS: PlayerAttributeOption[] = [
  { value: "padel_drive", label: "Joueur côté Drive" },
  { value: "padel_reves", label: "Joueur côté Revers" },
  { value: "padel_polyvalent", label: "Polyvalent" },
];

// Sub-types for CrossFit/Hyrox/Musculation
export const CROSSFIT_SUBTYPES: SportSubTypeOption[] = [
  { value: "crossfit_box", label: "CrossFit - Box / Salle" },
  { value: "crossfit_hyrox", label: "Hyrox / Fitness Fonctionnel" },
  { value: "crossfit_musculation", label: "Musculation / Bodybuilding" },
];

// Basketball-specific subtypes
export const BASKETBALL_SUBTYPES: SportSubTypeOption[] = [
  { value: "basketball_club", label: "Basketball - Club" },
  { value: "basketball_3x3", label: "Basketball 3x3" },
  { value: "basketball_pro", label: "Basketball - Pro / Semi-Pro" },
  { value: "basketball_jeunes", label: "Basketball - Centre de Formation / Jeunes" },
  { value: "basketball_academie", label: "Basketball - Académie / Pôle Espoir" },
  { value: "basketball_national", label: "Basketball - Équipe Nationale" },
];

// Sub-types for other sports (Club, Académie, Équipe Nationale)
export const getOtherSportSubtypes = (sport: MainSportCategory): SportSubTypeOption[] => {
  if (sport === "rugby") return RUGBY_SUBTYPES;
  if (sport === "athletisme") return ATHLETISME_CATEGORY_SUBTYPES;
  if (sport === "crossfit") return CROSSFIT_SUBTYPES;
  if (sport === "basketball") return BASKETBALL_SUBTYPES;

  // Sports de Glisse: show all ski/snow sub-disciplines as category types
  if (sport === "ski") {
    return [
      { value: "ski_club" as SportType, label: "Sports de Glisse - Club" },
      { value: "ski_academie" as SportType, label: "Sports de Glisse - Académie / Pôle Espoir" },
      { value: "ski_national" as SportType, label: "Sports de Glisse - Équipe Nationale" },
      { value: "ski_alpin_club" as SportType, label: "Ski Alpin - Club" },
      { value: "ski_alpin_academie" as SportType, label: "Ski Alpin - Académie" },
      { value: "ski_alpin_national" as SportType, label: "Ski Alpin - Équipe Nationale" },
      { value: "snowboard_freestyle_club" as SportType, label: "Snowboard Freestyle - Club" },
      { value: "snowboard_freestyle_academie" as SportType, label: "Snowboard Freestyle - Académie" },
      { value: "snowboard_freestyle_national" as SportType, label: "Snowboard Freestyle - Équipe Nationale" },
      { value: "snowboard_alpin_club" as SportType, label: "Snowboard Alpin - Club" },
      { value: "snowboard_alpin_academie" as SportType, label: "Snowboard Alpin - Académie" },
      { value: "snowboard_alpin_national" as SportType, label: "Snowboard Alpin - Équipe Nationale" },
      { value: "ski_freestyle_club" as SportType, label: "Ski Freestyle - Club" },
      { value: "ski_freestyle_academie" as SportType, label: "Ski Freestyle - Académie" },
      { value: "ski_freestyle_national" as SportType, label: "Ski Freestyle - Équipe Nationale" },
      { value: "ski_fond_club" as SportType, label: "Ski de Fond - Club" },
      { value: "ski_fond_academie" as SportType, label: "Ski de Fond - Académie" },
      { value: "ski_fond_national" as SportType, label: "Ski de Fond - Équipe Nationale" },
      { value: "ski_biathlon_club" as SportType, label: "Biathlon - Club" },
      { value: "ski_biathlon_academie" as SportType, label: "Biathlon - Académie" },
      { value: "ski_biathlon_national" as SportType, label: "Biathlon - Équipe Nationale" },
    ];
  }
  
  const sportLabels: Record<string, string> = {
    football: "Football",
    handball: "Handball",
    volleyball: "Volleyball",
    judo: "Judo",
    bowling: "Bowling",
    aviron: "Aviron",
    padel: "Padel",
    natation: "Natation",
    surf: "Surf",
    triathlon: "Triathlon",
    tennis: "Tennis",
  };

  const label = sportLabels[sport] || sport;

  return [
    { value: `${sport}_club` as SportType, label: `${label} - Club` },
    { value: `${sport}_academie` as SportType, label: `${label} - Académie / Pôle Espoir` },
    { value: `${sport}_national` as SportType, label: `${label} - Équipe Nationale` },
  ];
};

// Helper to check if a category is an athletics category
export const isAthletismeCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("athletisme") || rugbyType === "athletisme";
};

// Helper to check if a category is a judo category
export const isJudoCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("judo") || rugbyType === "judo";
};

// Helper to check if a category is natation
export const isNatationCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("natation") || rugbyType === "natation";
};

// Helper to check if a category is ski/snow
export const isSkiCategory = (rugbyType: string): boolean => {
  return (rugbyType?.startsWith("ski") || rugbyType?.startsWith("snow") || rugbyType === "ski" || rugbyType === "snowboard_freestyle" || rugbyType === "snowboard_alpin") && !rugbyType?.startsWith("surf");
};

// Get filtered ski/snow disciplines based on category type
export const getSkiDisciplinesForCategory = (rugbyType: string): PlayerAttributeOption[] => {
  if (!rugbyType) return SKI_DISCIPLINES;
  
  // Snowboard freestyle → only snowboard disciplines
  if (rugbyType.includes("snowboard_freestyle") || rugbyType.includes("snowboard_alpin")) {
    return SKI_DISCIPLINES.filter(d => d.value.startsWith("snow_"));
  }
  // Ski alpin → only ski alpin disciplines
  if (rugbyType.includes("ski_alpin")) {
    return SKI_DISCIPLINES.filter(d => ["ski_descente", "ski_slalom", "ski_geant", "ski_super_g", "ski_combine"].includes(d.value));
  }
  // Ski freestyle → only ski freestyle disciplines
  if (rugbyType.includes("ski_freestyle")) {
    return SKI_DISCIPLINES.filter(d => d.value.startsWith("ski_freestyle_"));
  }
  // Ski fond → only ski fond disciplines
  if (rugbyType.includes("ski_fond")) {
    return SKI_DISCIPLINES.filter(d => d.value.startsWith("ski_fond_"));
  }
  return SKI_DISCIPLINES;
};

// Helper to check if a category is surf
export const isSurfCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("surf") || rugbyType === "surf";
};

// Helper to check if a category is triathlon
export const isTriathlonCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("triathlon") || rugbyType === "triathlon";
};

// Helper to check if a category is padel
export const isPadelCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("padel") || rugbyType === "padel";
};

// Tennis positions
export const TENNIS_POSITIONS: PlayerAttributeOption[] = [
  { value: "tennis_droitier", label: "Droitier" },
  { value: "tennis_gaucher", label: "Gaucher" },
  { value: "tennis_simple", label: "Spécialiste Simple" },
  { value: "tennis_double", label: "Spécialiste Double" },
  { value: "tennis_polyvalent", label: "Polyvalent" },
];

// Helper to check if a category is tennis
export const isTennisCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("tennis") || rugbyType === "tennis";
};

export const SPORT_TYPES: SportTypeOption[] = [
  // Rugby types
  { value: "XV", label: "Rugby à XV", category: "rugby" },
  { value: "7", label: "Rugby à 7", category: "rugby" },
  { value: "XIII", label: "Rugby à XIII", category: "rugby" },
  { value: "touch", label: "Touch Rugby", category: "rugby" },
  { value: "academie", label: "Académie / Pôle Espoir", category: "rugby" },
  { value: "national_team", label: "Équipe Nationale", category: "rugby" },
  // Team sports - Club
  { value: "football_club", label: "Football - Club", category: "team" },
  { value: "handball_club", label: "Handball - Club", category: "team" },
  { value: "volleyball_club", label: "Volleyball - Club", category: "team" },
  { value: "basketball_club", label: "Basketball - Club", category: "team" },
  { value: "basketball_3x3", label: "Basketball 3x3", category: "team" },
  { value: "basketball_pro", label: "Basketball - Pro / Semi-Pro", category: "team" },
  { value: "basketball_jeunes", label: "Basketball - Centre de Formation / Jeunes", category: "team" },
  // Team sports - Académie
  { value: "football_academie", label: "Football - Académie", category: "team" },
  { value: "handball_academie", label: "Handball - Académie", category: "team" },
  { value: "volleyball_academie", label: "Volleyball - Académie", category: "team" },
  { value: "basketball_academie", label: "Basketball - Académie", category: "team" },
  // Team sports - National
  { value: "football_national", label: "Football - Équipe Nationale", category: "team" },
  { value: "handball_national", label: "Handball - Équipe Nationale", category: "team" },
  { value: "volleyball_national", label: "Volleyball - Équipe Nationale", category: "team" },
  { value: "basketball_national", label: "Basketball - Équipe Nationale", category: "team" },
  // Individual sports - Club
  { value: "judo_club", label: "Judo - Club", category: "individual" },
  { value: "bowling_club", label: "Bowling - Club", category: "individual" },
  { value: "aviron_club", label: "Aviron - Club", category: "individual" },
  { value: "padel_club", label: "Padel - Club", category: "individual" },
  { value: "natation_club", label: "Natation - Club", category: "individual" },
  { value: "ski_club", label: "Sports de Glisse - Club", category: "individual" },
  { value: "surf_club", label: "Surf - Club", category: "individual" },
  { value: "triathlon_club", label: "Triathlon - Club", category: "individual" },
  { value: "tennis_club", label: "Tennis - Club", category: "individual" },
  // Individual sports - Académie
  { value: "judo_academie", label: "Judo - Académie", category: "individual" },
  { value: "bowling_academie", label: "Bowling - Académie", category: "individual" },
  { value: "aviron_academie", label: "Aviron - Académie", category: "individual" },
  { value: "padel_academie", label: "Padel - Académie", category: "individual" },
  { value: "natation_academie", label: "Natation - Académie", category: "individual" },
  { value: "ski_academie", label: "Sports de Glisse - Académie", category: "individual" },
  { value: "surf_academie", label: "Surf - Académie", category: "individual" },
  { value: "triathlon_academie", label: "Triathlon - Académie", category: "individual" },
  { value: "tennis_academie", label: "Tennis - Académie", category: "individual" },
  // Individual sports - National
  { value: "judo_national", label: "Judo - Équipe Nationale", category: "individual" },
  { value: "bowling_national", label: "Bowling - Équipe Nationale", category: "individual" },
  { value: "aviron_national", label: "Aviron - Équipe Nationale", category: "individual" },
  { value: "padel_national", label: "Padel - Équipe Nationale", category: "individual" },
  { value: "natation_national", label: "Natation - Équipe Nationale", category: "individual" },
  { value: "ski_national", label: "Sports de Glisse - Équipe Nationale", category: "individual" },
  { value: "surf_national", label: "Surf - Équipe Nationale", category: "individual" },
  { value: "triathlon_national", label: "Triathlon - Équipe Nationale", category: "individual" },
  { value: "tennis_national", label: "Tennis - Équipe Nationale", category: "individual" },
  // CrossFit / Hyrox / Musculation
  { value: "crossfit_box", label: "CrossFit - Box / Salle", category: "individual" },
  { value: "crossfit_hyrox", label: "Hyrox / Fitness Fonctionnel", category: "individual" },
  { value: "crossfit_musculation", label: "Musculation / Bodybuilding", category: "individual" },
  { value: "crossfit", label: "CrossFit / Hyrox / Musculation", category: "individual" },
  // Athlétisme disciplines
  { value: "athletisme_sprints", label: "Athlétisme - Sprints", category: "individual" },
  { value: "athletisme_haies", label: "Athlétisme - Haies", category: "individual" },
  { value: "athletisme_demi_fond", label: "Athlétisme - Demi-fond", category: "individual" },
  { value: "athletisme_fond", label: "Athlétisme - Fond", category: "individual" },
  { value: "athletisme_marche", label: "Athlétisme - Marche athlétique", category: "individual" },
  { value: "athletisme_sauts_longueur", label: "Athlétisme - Sauts horizontaux", category: "individual" },
  { value: "athletisme_sauts_hauteur", label: "Athlétisme - Sauts verticaux", category: "individual" },
  { value: "athletisme_lancers", label: "Athlétisme - Lancers", category: "individual" },
  { value: "athletisme_combines", label: "Athlétisme - Épreuves combinées", category: "individual" },
  { value: "athletisme_trail", label: "Athlétisme - Trail", category: "individual" },
  { value: "athletisme_ultra_trail", label: "Athlétisme - Ultra-Trail", category: "individual" },
  { value: "athletisme_club", label: "Athlétisme - Club", category: "individual" },
  { value: "athletisme_academie", label: "Athlétisme - Académie", category: "individual" },
  { value: "athletisme_national", label: "Athlétisme - Équipe Nationale", category: "individual" },
  // Legacy types (for backwards compatibility)
  { value: "football", label: "Football", category: "team" },
  { value: "handball", label: "Handball", category: "team" },
  { value: "volleyball", label: "Volleyball", category: "team" },
  { value: "basketball", label: "Basketball", category: "team" },
  { value: "judo", label: "Judo", category: "individual" },
  { value: "bowling", label: "Bowling", category: "individual" },
  { value: "aviron", label: "Aviron", category: "individual" },
  { value: "athletisme", label: "Athlétisme", category: "individual" },
  { value: "padel", label: "Padel", category: "individual" },
  { value: "natation", label: "Natation", category: "individual" },
  { value: "ski", label: "Sports de Glisse", category: "individual" },
  { value: "surf", label: "Surf", category: "individual" },
  { value: "triathlon", label: "Triathlon", category: "individual" },
  { value: "tennis", label: "Tennis", category: "individual" },
];

export const getSportLabel = (type: string): string => {
  const sport = SPORT_TYPES.find(s => s.value === type);
  if (sport) return sport.label;
  
  // Fallback for legacy rugby types
  if (type === "XV" || type === "15") return "Rugby XV";
  if (type === "7") return "Rugby 7";
  if (type === "XIII") return "Rugby XIII";
  if (type === "touch") return "Touch Rugby";
  if (type === "academie") return "Académie";
  if (type === "national_team") return "Équipe Nationale";
  
  // Handle new sport subtypes
  if (type.includes("_club")) return type.replace("_club", " - Club").replace(/^\w/, c => c.toUpperCase());
  if (type.includes("_academie")) return type.replace("_academie", " - Académie").replace(/^\w/, c => c.toUpperCase());
  if (type.includes("_national")) return type.replace("_national", " - Équipe Nationale").replace(/^\w/, c => c.toUpperCase());
  
  return type;
};

export const isRugbyType = (type: string): boolean => {
  return ["XV", "7", "XIII", "touch", "15", "academie", "national_team"].includes(type);
};

export const getMainSportFromType = (type: string): MainSportCategory => {
  if (isRugbyType(type)) return "rugby";
  if (type.startsWith("football")) return "football";
  if (type.startsWith("handball")) return "handball";
  if (type.startsWith("volleyball")) return "volleyball";
  if (type.startsWith("basketball")) return "basketball";
  if (type.startsWith("judo")) return "judo";
  if (type.startsWith("bowling")) return "bowling";
  if (type.startsWith("aviron")) return "aviron";
  if (type.startsWith("athletisme")) return "athletisme";
  if (type.startsWith("crossfit")) return "crossfit";
  if (type.startsWith("padel")) return "padel";
  if (type.startsWith("natation")) return "natation";
  if (type.startsWith("surf")) return "surf";
  if (type.startsWith("ski") || type.startsWith("snow") || type === "snowboard_freestyle" || type === "snowboard_alpin") return "ski";
  if (type.startsWith("triathlon")) return "triathlon";
  if (type.startsWith("tennis")) return "tennis";
  return "rugby"; // default
};

// Helper to check if a category is Basketball 3x3 (FIBA 3x3 ruleset)
export const isBasket3x3 = (type: string | undefined | null): boolean => {
  if (!type) return false;
  return type.toLowerCase() === "basketball_3x3";
};

export const isIndividualSport = (type: string): boolean => {
  const individualPrefixes = [
    "judo", "bowling", "aviron", "athletisme", "crossfit",
    "padel", "natation", "ski", "surf", "triathlon", "tennis",
    "snowboard", "hyrox",
  ];
  return individualPrefixes.some(prefix => type === prefix || type.startsWith(prefix + "_"));
};

// Helper to check if a category is CrossFit/Hyrox/Musculation
export const isCrossfitCategory = (rugbyType: string): boolean => {
  return rugbyType?.startsWith("crossfit") || rugbyType === "crossfit";
};

// Sports that support HRV and heart rate zone tracking (all sports)
export const supportsHrvTracking = (_rugbyType: string): boolean => {
  return true;
};

export const isTeamSport = (type: string): boolean => {
  return ["XV", "7", "XIII", "15", "academie", "national_team", "football", "handball", "volleyball", "basketball", "football_club", "football_academie", "football_national", "handball_club", "handball_academie", "handball_national", "volleyball_club", "volleyball_academie", "volleyball_national", "basketball_club", "basketball_academie", "basketball_national", "basketball_3x3", "basketball_pro", "basketball_jeunes"].includes(type);
};

export const getRugbyTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "rugby");
};

export const getTeamSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "team");
};

export const getIndividualSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category === "individual");
};

export const getOtherSportTypes = (): SportTypeOption[] => {
  return SPORT_TYPES.filter(s => s.category !== "rugby");
};
