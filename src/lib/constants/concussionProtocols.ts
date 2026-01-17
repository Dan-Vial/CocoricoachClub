// Concussion protocols by sport - based on federation guidelines

export interface ConcussionProtocolPhase {
  phase: number;
  name: string;
  description: string;
  minimumDays: number;
}

export interface SportConcussionProtocol {
  sportType: string;
  federation: string;
  hasProtocol: boolean;
  phases: ConcussionProtocolPhase[];
  notes: string;
  minimumTotalDays: number;
}

// World Rugby GRTP (Graduated Return to Play)
export const RUGBY_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  sportType: "rugby",
  federation: "World Rugby",
  hasProtocol: true,
  minimumTotalDays: 12,
  phases: [
    { phase: 1, name: "Repos complet", description: "Repos cognitif et physique complet (24-48h minimum)", minimumDays: 1 },
    { phase: 2, name: "Activité légère", description: "Marche, vélo stationnaire, natation légère (pas d'entraînement de résistance)", minimumDays: 1 },
    { phase: 3, name: "Exercice spécifique", description: "Exercices de course, exercices spécifiques au sport SANS CONTACT", minimumDays: 1 },
    { phase: 4, name: "Entraînement sans contact", description: "Exercices d'entraînement plus complexes, peut commencer l'entraînement de résistance", minimumDays: 1 },
    { phase: 5, name: "Entraînement avec contact", description: "Après autorisation médicale, participation aux entraînements normaux", minimumDays: 1 },
    { phase: 6, name: "Retour au jeu", description: "Participation complète aux matchs", minimumDays: 0 },
  ],
  notes: "Minimum 24h entre chaque phase. Retour à la phase précédente en cas de symptômes. Avis médical obligatoire pour phases 5-6."
};

// FFBB (Fédération Française de Basketball)
export const BASKETBALL_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  sportType: "basketball",
  federation: "FFBB / FIBA",
  hasProtocol: true,
  minimumTotalDays: 7,
  phases: [
    { phase: 1, name: "Repos complet", description: "Repos physique et cognitif (24-48h)", minimumDays: 1 },
    { phase: 2, name: "Activité aérobie légère", description: "Marche, vélo stationnaire à faible intensité", minimumDays: 1 },
    { phase: 3, name: "Exercice spécifique", description: "Tirs, dribbles, exercices individuels sans contact", minimumDays: 1 },
    { phase: 4, name: "Entraînement sans contact", description: "Exercices tactiques, passes, mouvements d'équipe", minimumDays: 1 },
    { phase: 5, name: "Entraînement complet", description: "Après autorisation médicale, entraînement avec contact", minimumDays: 1 },
    { phase: 6, name: "Retour au jeu", description: "Match officiel autorisé", minimumDays: 0 },
  ],
  notes: "Progression sur minimum 24h par phase. Certificat médical obligatoire pour le retour au jeu."
};

// FFHandball
export const HANDBALL_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  sportType: "handball",
  federation: "FFHandball / IHF",
  hasProtocol: true,
  minimumTotalDays: 7,
  phases: [
    { phase: 1, name: "Repos", description: "Repos complet physique et mental", minimumDays: 1 },
    { phase: 2, name: "Activité légère", description: "Marche, natation, vélo à faible intensité", minimumDays: 1 },
    { phase: 3, name: "Exercices spécifiques", description: "Passes, tirs sans opposition", minimumDays: 1 },
    { phase: 4, name: "Entraînement sans contact", description: "Tactique collective sans opposition", minimumDays: 1 },
    { phase: 5, name: "Entraînement avec contact", description: "Reprise progressive du contact après avis médical", minimumDays: 1 },
    { phase: 6, name: "Retour complet", description: "Compétition autorisée", minimumDays: 0 },
  ],
  notes: "Visite médicale obligatoire avant reprise du contact."
};

// FFVolley
export const VOLLEYBALL_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  sportType: "volleyball",
  federation: "FFVolley / FIVB",
  hasProtocol: true,
  minimumTotalDays: 6,
  phases: [
    { phase: 1, name: "Repos", description: "Repos complet", minimumDays: 1 },
    { phase: 2, name: "Activité légère", description: "Marche, vélo stationnaire", minimumDays: 1 },
    { phase: 3, name: "Exercices individuels", description: "Travail technique sans sauts", minimumDays: 1 },
    { phase: 4, name: "Entraînement collectif", description: "Exercices d'équipe, sauts progressifs", minimumDays: 1 },
    { phase: 5, name: "Entraînement complet", description: "Matchs d'entraînement", minimumDays: 1 },
    { phase: 6, name: "Retour au jeu", description: "Compétition officielle", minimumDays: 0 },
  ],
  notes: "Éviter les sauts et têtes/manchettes hautes pendant les premières phases."
};

// FFF (Football)
export const FOOTBALL_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  sportType: "football",
  federation: "FFF / FIFA",
  hasProtocol: true,
  minimumTotalDays: 7,
  phases: [
    { phase: 1, name: "Repos complet", description: "Aucune activité physique ou cognitive intense", minimumDays: 1 },
    { phase: 2, name: "Activité aérobie légère", description: "Marche, vélo stationnaire (pas de jeu de tête)", minimumDays: 1 },
    { phase: 3, name: "Exercices spécifiques", description: "Exercices de course, technique individuelle sans tête", minimumDays: 1 },
    { phase: 4, name: "Entraînement sans contact", description: "Exercices collectifs, passes au sol", minimumDays: 1 },
    { phase: 5, name: "Entraînement complet", description: "Entraînement normal avec jeu de tête progressif", minimumDays: 1 },
    { phase: 6, name: "Retour au jeu", description: "Match officiel après certificat médical", minimumDays: 0 },
  ],
  notes: "Éviter absolument les jeux de tête jusqu'à la phase 5. Certificat médical obligatoire."
};

// Sports without official protocol
export const NO_PROTOCOL: SportConcussionProtocol = {
  sportType: "other",
  federation: "N/A",
  hasProtocol: false,
  minimumTotalDays: 0,
  phases: [],
  notes: "Pas de protocole officiel de la fédération. Créez un protocole personnalisé dans la section Réathlétisation."
};

export const JUDO_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  ...NO_PROTOCOL,
  sportType: "judo",
  federation: "FFJDA",
  notes: "Consulter le médecin de la fédération. Aucun protocole standardisé GRTP pour le judo."
};

export const BOWLING_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  ...NO_PROTOCOL,
  sportType: "bowling",
  federation: "FFBSQ",
  notes: "Le bowling présente un risque minimal de commotion. Pas de protocole spécifique."
};

export const AVIRON_CONCUSSION_PROTOCOL: SportConcussionProtocol = {
  ...NO_PROTOCOL,
  sportType: "aviron",
  federation: "FFA (Fédération Française d'Aviron)",
  notes: "L'aviron présente un faible risque de commotion. Consulter un médecin en cas de choc à la tête. Suivre les recommandations générales de retour au sport."
};

// Get protocol by sport type
export function getConcussionProtocolForSport(sportType: string): SportConcussionProtocol {
  switch (sportType) {
    case "XV":
    case "7":
    case "academie":
    case "national_team":
      return RUGBY_CONCUSSION_PROTOCOL;
    case "basketball":
      return BASKETBALL_CONCUSSION_PROTOCOL;
    case "handball":
      return HANDBALL_CONCUSSION_PROTOCOL;
    case "volleyball":
      return VOLLEYBALL_CONCUSSION_PROTOCOL;
    case "football":
      return FOOTBALL_CONCUSSION_PROTOCOL;
    case "judo":
      return JUDO_CONCUSSION_PROTOCOL;
    case "bowling":
      return BOWLING_CONCUSSION_PROTOCOL;
    case "aviron":
      return AVIRON_CONCUSSION_PROTOCOL;
    default:
      return RUGBY_CONCUSSION_PROTOCOL;
  }
}

// Check if sport has official concussion protocol
export function hasConcussionProtocol(sportType: string): boolean {
  const protocol = getConcussionProtocolForSport(sportType);
  return protocol.hasProtocol;
}
