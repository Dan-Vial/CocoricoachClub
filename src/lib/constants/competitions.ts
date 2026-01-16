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

// Judo competitions
export const JUDO_COMPETITIONS: CompetitionCategory[] = [
  {
    label: "Compétitions Jeunes",
    options: [
      "Minimes Départemental",
      "Minimes Régional",
      "Minimes National",
      "Cadets Départemental",
      "Cadets Régional",
      "Cadets National",
      "Juniors Départemental",
      "Juniors Régional",
      "Juniors National",
    ],
  },
  {
    label: "Compétitions Seniors Nationales",
    options: [
      "Championnat de France 1ère Division",
      "Championnat de France 2ème Division",
      "Coupe de France",
    ],
  },
  {
    label: "Compétitions Régionales",
    options: [
      "Championnat Régional",
      "Coupe Régionale",
    ],
  },
  {
    label: "Compétitions Départementales",
    options: [
      "Championnat Départemental",
      "Animation Départementale",
    ],
  },
  {
    label: "Autres",
    options: [
      "Tournois",
      "Stage technique",
      "Interclubs",
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
    case "judo":
      return JUDO_COMPETITIONS;
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
