// Competitions/Championships by sport type

export interface CompetitionCategory {
  label: string;
  options: string[];
}

// Rugby competitions (XV, 7, academie, national_team)
export const RUGBY_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "Groupama A",
      "Groupama B", 
      "Groupama C",
      "Gaudermen",
      "Alamercery",
      "Crabos A",
      "Crabos B",
      "Espoirs",
      "Reichel/Espoirs",
      "Sevens jeunes",
    ],
  },
  {
    label: "Championnats Seniors",
    options: [
      "Top 14",
      "Pro D2",
      "Nationale",
      "Fédérale 1",
      "Fédérale 2",
      "Fédérale 3",
      "Elite 1 féminine",
      "Elite 2 féminine",
    ],
  },
  {
    label: "Compétitions Nationales",
    options: [
      "SCF",
      "Sélection nationale",
      "Sélection régionale",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Coupe du Monde",
      "Six Nations",
      "Rugby Championship",
      "Champions Cup",
      "Challenge Cup",
      "Super Rugby",
      "Pacific Nations Cup",
      "World Series (Sevens)",
      "Coupe du Monde Sevens",
      "Jeux Olympiques",
      "Tournoi des 6 Nations U20",
      "Coupe du Monde U20",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Matchs amicaux",
    ],
  },
];

// Football competitions
export const FOOTBALL_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "U13 Départemental",
      "U13 Régional",
      "U14 Départemental",
      "U14 Régional",
      "U15 Départemental",
      "U15 Régional",
      "U15 National",
      "U17 Départemental",
      "U17 Régional",
      "U17 National",
      "U19 Départemental",
      "U19 Régional",
      "U19 National",
    ],
  },
  {
    label: "Championnats Seniors Nationaux",
    options: [
      "Ligue 1",
      "Ligue 2",
      "National",
      "National 2",
      "National 3",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Régional 1",
      "Régional 2",
      "Régional 3",
    ],
  },
  {
    label: "Championnats Départementaux",
    options: [
      "Départemental 1",
      "Départemental 2",
      "Départemental 3",
      "Départemental 4",
    ],
  },
  {
    label: "Coupes",
    options: [
      "Coupe de France",
      "Coupe Gambardella",
      "Coupe de la Ligue",
      "Coupe Régionale",
      "Coupe Départementale",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Coupe du Monde",
      "Coupe du Monde Féminine",
      "Euro",
      "Euro Féminin",
      "Ligue des Champions",
      "Ligue Europa",
      "Ligue Europa Conférence",
      "Supercoupe d'Europe",
      "Coupe du Monde des Clubs",
      "Ligue des Nations",
      "Copa America",
      "CAN (Coupe d'Afrique)",
      "Gold Cup",
      "Coupe d'Asie",
      "Jeux Olympiques",
      "Coupe du Monde U20",
      "Euro U21",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Matchs amicaux",
    ],
  },
];

// Handball competitions
export const HANDBALL_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "U13 Départemental",
      "U13 Régional",
      "U15 Départemental",
      "U15 Régional",
      "U17 Départemental",
      "U17 Régional",
      "U17 National",
      "U18 Départemental",
      "U18 Régional",
      "U18 National",
    ],
  },
  {
    label: "Championnats Seniors Nationaux",
    options: [
      "Lidl Starligue",
      "Proligue",
      "Nationale 1",
      "Nationale 2",
      "Nationale 3",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Pré-Nationale",
      "Régionale 1",
      "Régionale 2",
    ],
  },
  {
    label: "Championnats Départementaux",
    options: [
      "Départemental 1",
      "Départemental 2",
      "Départemental 3",
    ],
  },
  {
    label: "Coupes",
    options: [
      "Coupe de France",
      "Coupe de la Ligue",
      "Coupe Régionale",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Championnat du Monde",
      "Championnat du Monde Féminin",
      "Championnat d'Europe",
      "Championnat d'Europe Féminin",
      "EHF Champions League",
      "EHF European League",
      "Super Globe",
      "Jeux Olympiques",
      "Jeux Méditerranéens",
      "Championnat du Monde U21",
      "Championnat d'Europe U20",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Matchs amicaux",
    ],
  },
];

// Volleyball competitions
export const VOLLEYBALL_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "U13 Départemental",
      "U13 Régional",
      "U15 Départemental",
      "U15 Régional",
      "U17 Départemental",
      "U17 Régional",
      "U17 National",
      "U20 Départemental",
      "U20 Régional",
      "U20 National",
    ],
  },
  {
    label: "Championnats Seniors Nationaux",
    options: [
      "Ligue A",
      "Ligue B",
      "Nationale 1",
      "Nationale 2",
      "Nationale 3",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Pré-Nationale",
      "Régionale 1",
      "Régionale 2",
      "Régionale 3",
    ],
  },
  {
    label: "Championnats Départementaux",
    options: [
      "Départemental 1",
      "Départemental 2",
      "Départemental 3",
    ],
  },
  {
    label: "Coupes",
    options: [
      "Coupe de France",
      "Coupe Régionale",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Championnat du Monde",
      "Championnat du Monde Féminin",
      "Championnat d'Europe",
      "Championnat d'Europe Féminin",
      "CEV Champions League",
      "CEV Cup",
      "CEV Challenge Cup",
      "Ligue des Nations",
      "Jeux Olympiques",
      "Jeux Méditerranéens",
      "Championnat du Monde U21",
      "Championnat d'Europe U20",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Matchs amicaux",
    ],
  },
];

// Basketball competitions
export const BASKETBALL_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes - Locaux",
    options: [
      "U11 Local",
      "U13 Local",
      "U15 Local",
      "U17 Local",
      "U18 Local",
      "U20 Local",
    ],
  },
  {
    label: "Championnats Jeunes - Départementaux",
    options: [
      "U11 Départemental",
      "U13 Départemental",
      "U15 Départemental",
      "U17 Départemental",
      "U18 Départemental",
      "U20 Départemental",
    ],
  },
  {
    label: "Championnats Jeunes - Régionaux",
    options: [
      "U13 Régional",
      "U15 Régional Excellence",
      "U15 Régional",
      "U17 Régional Excellence",
      "U17 Régional",
      "U18 Régional Excellence",
      "U18 Régional",
      "U20 Régional",
    ],
  },
  {
    label: "Championnats Jeunes - Nationaux",
    options: [
      "U15 National",
      "U17 National",
      "U18 National",
      "U20 National",
      "Espoirs Pro A",
      "Espoirs Pro B",
    ],
  },
  {
    label: "Championnats Seniors - Nationaux",
    options: [
      "Betclic Elite (Pro A)",
      "Pro B",
      "Nationale 1",
      "Nationale 2",
      "Nationale 3",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Pré-Nationale",
      "Régionale 1",
      "Régionale 2",
      "Régionale 3",
    ],
  },
  {
    label: "Championnats Départementaux",
    options: [
      "Départemental 1",
      "Départemental 2",
      "Départemental 3",
      "Départemental 4",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "EuroLeague",
      "EuroCup",
      "FIBA Champions League",
      "FIBA Europe Cup",
      "Championnat d'Europe",
      "Coupe du Monde",
      "Jeux Olympiques",
    ],
  },
  {
    label: "Coupes",
    options: [
      "Coupe de France",
      "Leaders Cup",
      "Trophée du Futur",
      "Coupe Régionale",
      "Coupe Départementale",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Matchs amicaux",
    ],
  },
];

// Judo competitions
export const JUDO_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Tournois",
    options: [
      "Tournoi local",
      "Tournoi départemental",
      "Tournoi régional",
      "Tournoi national",
      "Tournoi international",
    ],
  },
  {
    label: "Championnats Jeunes",
    options: [
      "Championnat départemental Minimes",
      "Championnat régional Minimes",
      "Championnat de France Minimes",
      "Championnat départemental Cadets",
      "Championnat régional Cadets",
      "Championnat de France Cadets",
      "Championnat départemental Juniors",
      "Championnat régional Juniors",
      "Championnat de France Juniors",
    ],
  },
  {
    label: "Championnats Seniors",
    options: [
      "Championnat départemental Seniors",
      "Championnat régional Seniors",
      "Championnat de France 1ère Division",
      "Championnat de France 2ème Division",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Jeux Olympiques",
      "Championnats du Monde",
      "Championnats d'Europe",
      "Grand Slam (Paris)",
      "Grand Slam (Tokyo)",
      "Grand Slam (Osaka)",
      "Grand Slam (Düsseldorf)",
      "Grand Slam (Bakou)",
      "Grand Slam (Abu Dhabi)",
      "Grand Prix",
      "World Masters",
      "Championnats du Monde Juniors",
      "Championnats d'Europe Juniors",
      "Championnats du Monde Cadets",
    ],
  },
  {
    label: "Autres",
    options: [
      "Interclubs",
      "Animation départementale",
      "Stage technique",
      "Passage de grade",
    ],
  },
];

// Aviron competitions
export const AVIRON_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Régates Jeunes",
    options: [
      "Championnat Départemental Minimes",
      "Championnat Régional Minimes",
      "Championnat de France Minimes",
      "Championnat Départemental Cadets",
      "Championnat Régional Cadets",
      "Championnat de France Cadets",
      "Championnat Départemental Juniors",
      "Championnat Régional Juniors",
      "Championnat de France Juniors",
    ],
  },
  {
    label: "Régates Seniors Nationales",
    options: [
      "Championnat de France Senior",
      "Championnat de France Elite",
      "Championnat de France Universitaire",
      "Coupe de France",
      "Tête de Rivière",
    ],
  },
  {
    label: "Régates Indoor (Ergomètre)",
    options: [
      "Championnat de France Indoor",
      "Championnat Régional Indoor",
      "Challenge National Indoor",
      "World Rowing Indoor Championships",
      "European Indoor Rowing Championships",
    ],
  },
  {
    label: "Distances Officielles",
    options: [
      "2000m (Distance Olympique)",
      "1000m (Sprint)",
      "500m (Court)",
      "6000m (Tête de Rivière)",
      "Marathon (42km)",
      "Longue Distance (10km+)",
    ],
  },
  {
    label: "Types de Bateaux",
    options: [
      "Skiff (1x)",
      "Double Scull (2x)",
      "Quatre de couple (4x)",
      "Huit de couple (8x)",
      "Deux sans barreur (2-)",
      "Deux avec barreur (2+)",
      "Quatre sans barreur (4-)",
      "Quatre avec barreur (4+)",
      "Huit avec barreur (8+)",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Jeux Olympiques",
      "Championnats du Monde",
      "Championnats d'Europe",
      "Coupe du Monde World Rowing",
      "Jeux Méditerranéens",
      "World Rowing U23 Championships",
      "World Rowing Junior Championships",
    ],
  },
  {
    label: "Autres",
    options: [
      "Régate Amicale",
      "Régate d'Entraînement",
      "Interclubs",
      "Stage Équipe",
    ],
  },
];

// Bowling competitions
export const BOWLING_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Nationaux",
    options: [
      "Championnat de France Individuel",
      "Championnat de France Doublette",
      "Championnat de France Triplette",
      "Championnat de France Équipe",
      "Championnat de France Masters",
      "Championnat de France Jeunes",
      "Coupe de France",
      "Trophée Fédéral",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Championnat Régional Individuel",
      "Championnat Régional Doublette",
      "Championnat Régional Triplette",
      "Championnat Régional Équipe",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Championnat du Monde",
      "Championnat d'Europe",
      "World Bowling Tour",
      "European Bowling Tour",
      "WBT Masters",
      "EBT Masters",
      "World Youth Championship",
      "European Youth Championship",
      "Mediterranean Championship",
      "Weber Cup",
      "World Series of Bowling",
    ],
  },
  {
    label: "Tournois",
    options: [
      "Tournoi Open",
      "Tournoi Pro-Am",
      "Tournoi Scratch",
      "Tournoi Handicap",
      "Tournoi Jeunes",
      "Tournoi Ranking",
    ],
  },
  {
    label: "Autres",
    options: [
      "Interclubs",
      "Ligue régionale",
      "Ligue départementale",
      "Stage technique",
      "Entraînement compétitif",
    ],
  },
];

// Athletics competitions
export const ATHLETISME_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats en salle",
    options: [
      "Championnat Départemental Salle",
      "Championnat Régional Salle",
      "Championnat de France Salle",
      "Championnats d'Europe en Salle",
      "Championnats du Monde en Salle",
    ],
  },
  {
    label: "Championnats Jeunes",
    options: [
      "Championnat Départemental Minimes",
      "Championnat Départemental Cadets",
      "Championnat Départemental Juniors",
      "Championnat Régional Minimes",
      "Championnat Régional Cadets",
      "Championnat Régional Juniors",
      "Championnat de France Minimes",
      "Championnat de France Cadets",
      "Championnat de France Juniors",
      "Championnat de France Espoirs",
      "Championnats d'Europe U18",
      "Championnats d'Europe U20",
      "Championnats d'Europe U23",
      "Championnats du Monde U20",
    ],
  },
  {
    label: "Championnats Seniors - Nationaux",
    options: [
      "Championnat Interclubs",
      "Championnat de France Élite",
      "Championnat de France National",
      "Championnat de France Espoirs",
      "Coupe de France des Clubs",
      "Meeting National",
    ],
  },
  {
    label: "Championnats Internationaux",
    options: [
      "Championnats d'Europe",
      "Championnats du Monde",
      "Jeux Olympiques",
      "Jeux Méditerranéens",
      "Jeux de la Francophonie",
      "Jeux Africains",
      "Championnats d'Afrique",
      "Championnats Panarabes",
    ],
  },
  {
    label: "Meetings Internationaux - Diamond League",
    options: [
      "Meeting de Paris (Stade de France)",
      "Prefontaine Classic (Eugene)",
      "Bislett Games (Oslo)",
      "Golden Gala (Rome)",
      "Meeting de Stockholm",
      "Weltklasse Zürich",
      "BAUHAUS-galan (Stockholm)",
      "Memorial Van Damme (Bruxelles)",
      "Athletissima (Lausanne)",
      "Meeting de Monaco",
      "Doha Diamond League",
      "Shanghai Diamond League",
      "Xiamen Diamond League",
      "Rabat Diamond League",
      "Silesia Diamond League",
      "London Diamond League",
    ],
  },
  {
    label: "Meetings Nationaux",
    options: [
      "Meeting de Liévin",
      "Meeting de Mondeville",
      "Meeting de Marseille",
      "Meeting de Lyon",
      "Meeting de Reims",
      "Meeting de Nantes",
      "Decanation",
      "Meeting Elite Tour",
    ],
  },
  {
    label: "Cross-Country",
    options: [
      "Cross Départemental",
      "Cross Régional",
      "Championnat de France de Cross",
      "Championnats d'Europe de Cross",
      "Championnats du Monde de Cross",
    ],
  },
  {
    label: "Courses sur Route",
    options: [
      "10 km sur Route",
      "Semi-Marathon",
      "Marathon",
      "Ekiden (Relais Marathon)",
      "100 km",
    ],
  },
  {
    label: "Trail",
    options: [
      "Trail court (< 42 km)",
      "Trail long (42-80 km)",
      "Trail vertical / Kilomètre vertical",
      "Course de montagne",
      "Championnat de France de Trail",
      "Championnat de France de Trail court",
      "Championnat de France de Trail long",
      "Championnats du Monde de Trail",
      "Championnats d'Europe de Trail",
      "Championnat de France de KV",
      "Championnat de France de Montagne",
    ],
  },
  {
    label: "Ultra-Trail",
    options: [
      "Ultra-Trail du Mont-Blanc (UTMB)",
      "CCC (UTMB)",
      "TDS (UTMB)",
      "OCC (UTMB)",
      "Diagonale des Fous (Grand Raid Réunion)",
      "Grand Trail des Templiers",
      "Ultra-Trail du Vercors",
      "EcoTrail de Paris",
      "Trail des Passerelles du Monteynard",
      "Western States 100",
      "Hardrock 100",
      "Tor des Géants",
      "Lavaredo Ultra Trail",
      "Championnat de France d'Ultra-Trail",
      "Championnats du Monde d'Ultra-Trail",
      "24 heures de course",
    ],
  },
  {
    label: "Épreuves combinées",
    options: [
      "Décathlon",
      "Heptathlon",
      "Pentathlon Salle",
      "Triathlon (Jeunes)",
      "Tétrathlon (Jeunes)",
      "Meeting Multiples Gotzis",
      "Meeting Multiples Talence",
    ],
  },
  {
    label: "Autres",
    options: [
      "Meeting Local",
      "Interclubs",
      "Critérium Régional",
      "Critérium National",
      "Sélection Régionale",
      "Sélection Nationale",
      "Stage Équipe",
    ],
  },
];

// Get competitions by sport type
export const getCompetitionsBySport = (sportType: string): CompetitionCategory[] => {
  // Handle exact matches first for rugby types
  if (["XV", "7", "XIII", "academie", "national_team", "national"].includes(sportType)) {
    return RUGBY_COMPETITIONS;
  }
  
  // Handle new sport subtypes (e.g., bowling_club, judo_academie)
  const baseSport = sportType.split('_')[0].toLowerCase();
  
  switch (baseSport) {
    case "football":
      return FOOTBALL_COMPETITIONS;
    case "handball":
      return HANDBALL_COMPETITIONS;
    case "volleyball":
      return VOLLEYBALL_COMPETITIONS;
    case "basketball":
      return BASKETBALL_COMPETITIONS;
    case "judo":
      return JUDO_COMPETITIONS;
    case "bowling":
      return BOWLING_COMPETITIONS;
    case "aviron":
      return AVIRON_COMPETITIONS;
    case "athletisme":
      return ATHLETISME_COMPETITIONS;
    default:
      // Check if it looks like a rugby type
      return RUGBY_COMPETITIONS;
  }
};

// Get flat list of all competition names for a sport
export const getCompetitionsFlatList = (sportType: string): string[] => {
  const categories = getCompetitionsBySport(sportType);
  return categories.flatMap(cat => cat.options);
};
