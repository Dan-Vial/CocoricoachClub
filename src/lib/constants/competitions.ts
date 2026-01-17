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
    label: "Autres",
    options: [
      "Interclubs",
      "Animation départementale",
      "Stage technique",
      "Passage de grade",
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

// Get competitions by sport type
export const getCompetitionsBySport = (sportType: string): CompetitionCategory[] => {
  switch (sportType) {
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
    case "XV":
    case "7":
    case "academie":
    case "national_team":
    default:
      return RUGBY_COMPETITIONS;
  }
};

// Get flat list of all competition names for a sport
export const getCompetitionsFlatList = (sportType: string): string[] => {
  const categories = getCompetitionsBySport(sportType);
  return categories.flatMap(cat => cat.options);
};
