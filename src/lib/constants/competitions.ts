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

// CrossFit / Hyrox / Musculation competitions
export const CROSSFIT_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "CrossFit",
    options: [
      "CrossFit Open",
      "CrossFit Games",
      "CrossFit Quarterfinals",
      "CrossFit Semifinals",
      "CrossFit Sanctionals",
      "Compétition locale CrossFit",
      "Throwdown",
    ],
  },
  {
    label: "Hyrox",
    options: [
      "Hyrox Race",
      "Hyrox Pro",
      "Hyrox Doubles",
      "Hyrox World Championship",
      "Hyrox Elite 15",
    ],
  },
  {
    label: "Musculation / Bodybuilding",
    options: [
      "Championnat Départemental",
      "Championnat Régional",
      "Championnat de France FFBAD",
      "Championnat de France IFBB",
      "Mr Olympia",
      "Arnold Classic",
      "Compétition locale",
    ],
  },
  {
    label: "Autres",
    options: [
      "Compétition amicale",
      "Challenge interne",
      "WOD compétitif",
    ],
  },
];

// Tennis competitions
export const TENNIS_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "Championnat Départemental U12",
      "Championnat Départemental U14",
      "Championnat Départemental U16",
      "Championnat Départemental U18",
      "Championnat Régional U12",
      "Championnat Régional U14",
      "Championnat Régional U16",
      "Championnat Régional U18",
      "Championnat de France U12",
      "Championnat de France U14",
      "Championnat de France U16",
      "Championnat de France U18",
      "Orange Bowl",
      "Les Petits As",
    ],
  },
  {
    label: "Tournois Nationaux (Simple)",
    options: [
      "Tournoi TMC 15",
      "Tournoi TMC 30",
      "Tournoi TMC 40",
      "Tournoi National 1",
      "Tournoi National 2",
      "Tournoi National 3",
      "Championnat de France Seniors",
      "Championnat de France par équipes",
      "Open de France",
    ],
  },
  {
    label: "Circuit ATP / WTA",
    options: [
      "ATP 250",
      "ATP 500",
      "ATP Masters 1000",
      "ATP Finals",
      "WTA 250",
      "WTA 500",
      "WTA 1000",
      "WTA Finals",
      "ATP Challenger",
      "WTA 125",
      "ITF World Tennis Tour",
    ],
  },
  {
    label: "Grand Chelem",
    options: [
      "Open d'Australie",
      "Roland-Garros",
      "Wimbledon",
      "US Open",
    ],
  },
  {
    label: "Compétitions par Équipes",
    options: [
      "Coupe Davis",
      "Billie Jean King Cup",
      "United Cup",
      "ATP Cup",
      "Interclubs National",
      "Interclubs Régional",
      "Interclubs Départemental",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Jeux Olympiques",
      "Universiade",
      "Jeux Méditerranéens",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournoi Open",
      "Tournoi interne",
      "Matchs amicaux",
      "Exhibition",
    ],
  },
];

// Tennis competition stages
export const TENNIS_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "qualifications", label: "Qualifications" },
  { value: "premier_tour", label: "1er tour" },
  { value: "deuxieme_tour", label: "2ème tour" },
  { value: "troisieme_tour", label: "3ème tour" },
  { value: "seiziemes", label: "16èmes de finale" },
  { value: "huitiemes", label: "8èmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "petite_finale", label: "Match pour la 3ème place" },
  { value: "finale", label: "Finale" },
  { value: "classement_5", label: "Match de classement (5ème-8ème)" },
  { value: "classement_9", label: "Match de classement (9ème-12ème)" },
];

// Surf competitions
export const SURF_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Circuits Professionnels",
    options: [
      "WSL Championship Tour (CT)",
      "WSL Challenger Series (CS)",
      "WSL Qualifying Series (QS)",
      "WSL Big Wave Tour",
      "WSL Longboard Tour",
    ],
  },
  {
    label: "Championnats Nationaux",
    options: [
      "Championnat de France",
      "Coupe de France",
      "Championnat Régional",
      "Championnat Départemental",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "ISA World Surfing Games",
      "Jeux Olympiques",
      "Championnats d'Europe",
      "Pro Junior",
    ],
  },
  {
    label: "Compétitions Jeunes",
    options: [
      "Championnat de France Espoirs",
      "Championnat de France Cadets",
      "Coupe de France Jeunes",
      "Grom Series",
    ],
  },
  {
    label: "Événements Locaux",
    options: [
      "Contest Club",
      "Open Régional",
      "Expression Session",
      "Tow-in Session",
    ],
  },
];

// Surf competition stages
export const SURF_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "round_1", label: "Round 1" },
  { value: "round_2", label: "Round 2" },
  { value: "round_3", label: "Round 3" },
  { value: "round_4", label: "Round 4" },
  { value: "round_5", label: "Round 5" },
  { value: "huitiemes", label: "8èmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "finale", label: "Finale" },
];

// Padel competitions
export const PADEL_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Nationaux",
    options: [
      "Championnat de France P25",
      "Championnat de France P100",
      "Championnat de France P250",
      "Championnat de France P500",
      "Championnat de France P1000",
      "Championnat de France P2000",
      "Championnat de France par équipes",
      "Coupe de France",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Championnat Régional",
      "Open Régional",
      "Tournoi P100 Régional",
      "Tournoi P250 Régional",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "World Padel Tour",
      "Premier Padel",
      "FIP Tour",
      "Championnat du Monde",
      "Championnat d'Europe",
      "Jeux Européens",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournoi Open",
      "Matchs amicaux",
      "Interclubs",
    ],
  },
];

// Natation competitions
export const NATATION_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "Championnat Départemental Avenirs",
      "Championnat Départemental Jeunes",
      "Championnat Régional Jeunes",
      "Championnat de France Juniors",
      "Championnat de France Cadets",
      "Critérium National Jeunes",
    ],
  },
  {
    label: "Championnats Nationaux",
    options: [
      "Championnat de France en Grand Bassin",
      "Championnat de France en Petit Bassin",
      "Championnat de France Elite",
      "Championnats de France Open",
      "Meeting National FFN",
      "Meeting National Tour",
      "Coupe de France Interclubs",
    ],
  },
  {
    label: "Championnats Régionaux",
    options: [
      "Championnat Régional",
      "Interrégionaux",
      "Meeting Régional",
    ],
  },
  {
    label: "Eau Libre",
    options: [
      "Coupe de France Eau Libre",
      "Championnat de France Eau Libre",
      "Traversée",
      "Nage en mer",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Jeux Olympiques",
      "Championnats du Monde",
      "Championnats du Monde Petit Bassin",
      "Championnats d'Europe",
      "Championnats d'Europe Petit Bassin",
      "Coupe du Monde FINA",
      "World Aquatics Swimming Cup",
      "Mare Nostrum",
      "Jeux Méditerranéens",
      "Championnats du Monde Juniors",
      "Championnats d'Europe Juniors",
    ],
  },
  {
    label: "Autres",
    options: [
      "Meeting local",
      "Interclubs",
      "Test chronométré",
    ],
  },
];

// Ski / Sports de Glisse competitions
export const SKI_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Ski Alpin - Coupe du Monde",
    options: [
      "Coupe du Monde - Descente",
      "Coupe du Monde - Super-G",
      "Coupe du Monde - Géant",
      "Coupe du Monde - Slalom",
      "Coupe du Monde - Combiné",
      "Coupe du Monde - Parallèle",
    ],
  },
  {
    label: "Ski Alpin - Championnats",
    options: [
      "Jeux Olympiques",
      "Championnats du Monde",
      "Championnats de France",
      "Championnat Régional",
      "Coupe de France",
      "Championnat FIS",
      "Course FIS",
    ],
  },
  {
    label: "Ski Alpin - Jeunes",
    options: [
      "Championnat de France Cadets",
      "Championnat de France Juniors",
      "Championnat de France U16",
      "Championnat de France U21",
      "Coupe d'Europe Juniors",
      "Championnats du Monde Juniors",
    ],
  },
  {
    label: "Ski de Fond",
    options: [
      "Coupe du Monde",
      "Tour de Ski",
      "Championnats du Monde",
      "Jeux Olympiques",
      "Coupe de France",
      "Championnat de France",
      "La Transjurassienne",
      "Vasaloppet",
      "Birkebeinerrennet",
      "Marathon Ski Tour",
    ],
  },
  {
    label: "Biathlon",
    options: [
      "Coupe du Monde",
      "Championnats du Monde",
      "Jeux Olympiques",
      "IBU Cup",
      "Championnat de France",
      "Championnat d'Europe",
    ],
  },
  {
    label: "Freestyle / Snowboard",
    options: [
      "Coupe du Monde Freestyle",
      "Coupe du Monde Snowboard",
      "X Games",
      "Dew Tour",
      "Laax Open",
      "US Open",
      "Jeux Olympiques",
      "Championnats du Monde Freestyle",
      "Championnats du Monde Snowboard",
      "Freeride World Tour",
      "Championnat de France Freestyle",
      "Championnat de France Snowboard",
    ],
  },
  {
    label: "Saut / Combiné Nordique",
    options: [
      "Coupe du Monde Saut",
      "Tournée des 4 Tremplins",
      "Coupe du Monde Combiné Nordique",
      "Jeux Olympiques",
      "Championnats du Monde",
      "Championnat de France",
    ],
  },
  {
    label: "Autres",
    options: [
      "Compétition locale",
      "Critérium",
      "Course club",
      "Stage compétition",
    ],
  },
];

// Triathlon competitions
export const TRIATHLON_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Championnats Jeunes",
    options: [
      "Championnat Départemental Jeunes",
      "Championnat Régional Jeunes",
      "Championnat de France Jeunes",
      "Championnat de France Cadets",
      "Championnat de France Juniors",
      "Championnats d'Europe Juniors",
      "Championnats du Monde Juniors",
    ],
  },
  {
    label: "Championnats Nationaux",
    options: [
      "Championnat de France Sprint",
      "Championnat de France Distance M",
      "Championnat de France Longue Distance",
      "Championnat de France des Clubs D1",
      "Championnat de France des Clubs D2",
      "Championnat de France des Clubs D3",
      "Grand Prix de Triathlon",
      "Coupe de France",
    ],
  },
  {
    label: "Triathlon Longue Distance",
    options: [
      "Ironman France (Nice)",
      "Ironman 70.3",
      "Challenge Family",
      "Half Triathlon",
      "Embrunman",
      "Altriman",
      "Natureman",
      "Ironman World Championship (Kona)",
      "Ironman 70.3 World Championship",
    ],
  },
  {
    label: "Compétitions Internationales",
    options: [
      "Jeux Olympiques",
      "Championnats du Monde ITU",
      "Championnats d'Europe ETU",
      "World Triathlon Series (WTCS)",
      "World Triathlon Cup",
      "Super League Triathlon",
      "Continental Cup",
    ],
  },
  {
    label: "Duathlon / Aquathlon",
    options: [
      "Championnat de France Duathlon",
      "Championnat de France Aquathlon",
      "Championnats du Monde Duathlon",
      "Championnats d'Europe Duathlon",
    ],
  },
  {
    label: "Autres",
    options: [
      "Triathlon local",
      "Triathlon amical",
      "Swimrun",
      "Raid multisport",
    ],
  },
];

// Get competitions by sport type
export const getCompetitionsBySport = (sportType: string): CompetitionCategory[] => {
  // Handle exact matches first for rugby types
  if (["XV", "7", "XIII", "touch", "academie", "national_team", "national"].includes(sportType)) {
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
    case "crossfit":
      return CROSSFIT_COMPETITIONS;
    case "padel":
      return PADEL_COMPETITIONS;
    case "tennis":
      return TENNIS_COMPETITIONS;
    case "natation":
      return NATATION_COMPETITIONS;
    case "ski":
    case "snow":
      return SKI_COMPETITIONS;
    case "surf":
      return SURF_COMPETITIONS;
    case "triathlon":
      return TRIATHLON_COMPETITIONS;
    default:
      return RUGBY_COMPETITIONS;
  }
};

// Competition stages by sport category
export interface CompetitionStage {
  value: string;
  label: string;
}

// Rugby / Team sports stages (traditional knockout format)
export const TEAM_SPORT_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "poules_1", label: "Phase de poules - Match 1" },
  { value: "poules_2", label: "Phase de poules - Match 2" },
  { value: "poules_3", label: "Phase de poules - Match 3" },
  { value: "seiziemes", label: "Seizièmes de finale" },
  { value: "huitiemes", label: "Huitièmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "petite_finale", label: "Petite finale / 3ème place" },
  { value: "finale", label: "Finale" },
];

// Individual/timed sport stages  
export const INDIVIDUAL_SPORT_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "series", label: "Séries / Qualifications" },
  { value: "repechages", label: "Repêchages" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "finale_b", label: "Finale B" },
  { value: "finale", label: "Finale" },
];

// Ski/Snow stages
export const SKI_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "manche_1", label: "Manche 1" },
  { value: "manche_2", label: "Manche 2" },
  { value: "qualifications", label: "Qualifications" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "petite_finale", label: "Petite finale" },
  { value: "finale", label: "Finale" },
  { value: "super_finale", label: "Super Finale" },
];

// Judo stages
export const JUDO_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "poules", label: "Tour préliminaire / Poules" },
  { value: "trente_deuxiemes", label: "32èmes de finale" },
  { value: "seiziemes", label: "16èmes de finale" },
  { value: "huitiemes", label: "8èmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "repechage", label: "Repêchage" },
  { value: "demies", label: "Demi-finales" },
  { value: "bronze", label: "Combat pour le bronze" },
  { value: "finale", label: "Finale" },
];

// CrossFit/Hyrox stages
export const CROSSFIT_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "qualifications", label: "Qualifications / Heat" },
  { value: "semifinal", label: "Demi-finale" },
  { value: "finale", label: "Finale" },
];

// Triathlon stages
export const TRIATHLON_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "natation", label: "Natation" },
  { value: "transition_1", label: "Transition 1 (T1)" },
  { value: "velo", label: "Vélo" },
  { value: "transition_2", label: "Transition 2 (T2)" },
  { value: "course", label: "Course à pied" },
  { value: "sprint_finish", label: "Sprint Finish" },
  { value: "finale", label: "Finale" },
];

// Padel stages (similar to tennis tournaments)
export const PADEL_STAGES: CompetitionStage[] = [
  { value: "", label: "Aucune" },
  { value: "poules", label: "Phase de poules" },
  { value: "trente_deuxiemes", label: "32èmes de finale" },
  { value: "seiziemes", label: "16èmes de finale" },
  { value: "huitiemes", label: "8èmes de finale" },
  { value: "quarts", label: "Quarts de finale" },
  { value: "demies", label: "Demi-finales" },
  { value: "petite_finale", label: "Match pour la 3ème place" },
  { value: "finale", label: "Finale" },
  { value: "classement_5", label: "Match de classement (5ème-8ème)" },
  { value: "classement_9", label: "Match de classement (9ème-12ème)" },
  { value: "classement_13", label: "Match de classement (13ème-16ème)" },
];

// Get appropriate stages for a sport
export const getCompetitionStagesBySport = (sportType: string): CompetitionStage[] => {
  if (["XV", "7", "XIII", "touch", "academie", "national_team"].includes(sportType)) {
    return TEAM_SPORT_STAGES;
  }
  
  const baseSport = sportType.split('_')[0].toLowerCase();
  
  switch (baseSport) {
    case "football":
    case "handball":
    case "volleyball":
    case "basketball":
      return TEAM_SPORT_STAGES;
    case "judo":
      return JUDO_STAGES;
    case "ski":
    case "snow":
      return SKI_STAGES;
    case "surf":
      return SURF_STAGES;
    case "crossfit":
      return CROSSFIT_STAGES;
    case "triathlon":
      return TRIATHLON_STAGES;
    case "padel":
      return PADEL_STAGES;
    case "tennis":
      return TENNIS_STAGES;
    case "natation":
    case "aviron":
    case "athletisme":
    case "bowling":
      return INDIVIDUAL_SPORT_STAGES;
    default:
      return TEAM_SPORT_STAGES;
  }
};

// Get label for any competition stage value (universal)
export const getCompetitionStageLabel = (stage: string): string => {
  const allStages: Record<string, string> = {
    // Team sport
    poules: "Phase de poules",
    poules_1: "Poules - Match 1",
    poules_2: "Poules - Match 2",
    poules_3: "Poules - Match 3",
    // Shared
    seiziemes: "16èmes",
    huitiemes: "8èmes",
    quarts: "Quarts",
    demies: "Demi-finales",
    petite_finale: "3ème place",
    finale: "Finale",
    // Individual
    series: "Séries / Qualif.",
    repechages: "Repêchages",
    finale_b: "Finale B",
    qualifications: "Qualifications",
    // Ski
    manche_1: "Manche 1",
    manche_2: "Manche 2",
    super_finale: "Super Finale",
    // Judo
    trente_deuxiemes: "32èmes",
    repechage: "Repêchage",
    bronze: "Bronze",
    // CrossFit
    semifinal: "Demi-finale",
    // Triathlon
    natation: "Natation",
    transition_1: "T1",
    velo: "Vélo",
    transition_2: "T2",
    course: "Course",
    sprint_finish: "Sprint Finish",
    // Tennis
    premier_tour: "1er tour",
    deuxieme_tour: "2ème tour",
    troisieme_tour: "3ème tour",
    // Surf
    round_1: "Round 1",
    round_2: "Round 2",
    round_3: "Round 3",
    round_4: "Round 4",
    round_5: "Round 5",
    // Padel classement
    classement_5: "Classement 5ème-8ème",
    classement_9: "Classement 9ème-12ème",
    classement_13: "Classement 13ème-16ème",
  };
  return allStages[stage] || stage;
};

// Get flat list of all competition names for a sport
export const getCompetitionsFlatList = (sportType: string): string[] => {
  const categories = getCompetitionsBySport(sportType);
  return categories.flatMap(cat => cat.options);
};
