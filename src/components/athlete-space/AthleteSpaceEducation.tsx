import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Moon, Apple, Activity, Shield } from "lucide-react";

interface Props {
  sportType?: string;
}

const RECOVERY_TIPS = [
  { title: "Sommeil", icon: Moon, content: "Vise 8 à 9h de sommeil. Évite les écrans 1h avant de dormir. La chambre doit être fraîche (18-20°C) et sombre." },
  { title: "Hydratation", content: "Bois minimum 2L d'eau par jour. Après l'entraînement, bois 1.5x le poids perdu en eau dans les 2h." },
  { title: "Bains froids", content: "10-12 min à 10-15°C après les séances intenses. Réduit l'inflammation et accélère la récupération." },
  { title: "Étirements", content: "15 min de stretching passif après chaque séance. Focus sur les ischio-jambiers, quadriceps et hanches." },
];

const NUTRITION_TIPS = [
  { title: "Avant l'entraînement", icon: Apple, content: "Repas riche en glucides 3h avant (pâtes, riz, pain). Snack 1h avant (banane, barre céréales)." },
  { title: "Après l'entraînement", content: "Dans les 30 min: protéines (20-30g) + glucides. Exemples: lait chocolaté, yaourt + fruits, sandwich." },
  { title: "Jour de match", content: "Petit-déjeuner copieux 3-4h avant. Glucides complexes + protéines. Hydratation dès le matin." },
  { title: "Jour de repos", content: "Ne réduis pas trop les calories. Ton corps récupère et a besoin d'énergie pour réparer les muscles." },
];

const MOBILITY_EXERCISES = [
  { title: "Hanches", content: "90/90, hip circles, pigeon stretch. 2 séries de 30 secondes chaque côté." },
  { title: "Épaules", content: "Wall slides, band pull-aparts, bras croisés. 2 séries de 10 reps." },
  { title: "Chevilles", content: "Flexion dorsale au mur, cercles de cheville, marche sur pointes. 2x15 reps." },
  { title: "Colonne", content: "Cat-cow, rotations thoraciques, child's pose. 2 séries de 10 reps." },
];

const getSportTips = (sportType?: string): { title: string; content: string }[] => {
  const sport = sportType?.toLowerCase() || "";
  
  if (sport.includes("rugby") || sport === "xv" || sport === "7" || sport === "xiii") {
    return [
      { title: "Plaquage", content: "Garde la tête du bon côté, épaule en contact, pousse avec les jambes. Ne plaque jamais la tête en premier." },
      { title: "Mêlée", content: "Dos droit, pieds écartés largeur d'épaules, pousse horizontalement. Travaille ta force de cou." },
      { title: "Courses de soutien", content: "Reste profond en soutien, communique, offre des options de passe courte." },
    ];
  }
  if (sport.includes("foot") || sport.includes("soccer")) {
    return [
      { title: "Prévention ACL", content: "Travaille les réceptions sur une jambe, les changements de direction contrôlés et le renforcement des ischio-jambiers." },
      { title: "Endurance intermittente", content: "Alterne courses haute intensité (15s) et récupération active (15s). Simule les efforts de match." },
    ];
  }
  if (sport.includes("athlé") || sport.includes("athletics")) {
    return [
      { title: "Échauffement spécifique", content: "Gammes athlétiques progressives: montées de genoux, talons-fesses, pas chassés, accélérations." },
      { title: "Récupération entre séries", content: "Marche active entre les sprints. Ne t'assois pas. Garde les muscles chauds." },
    ];
  }

  return [
    { title: "Échauffement", content: "15 min minimum: cardio léger, mobilité articulaire, activation musculaire, gestes spécifiques progressifs." },
    { title: "Retour au calme", content: "5-10 min de footing léger puis étirements. Aide à éliminer les déchets métaboliques." },
  ];
};

export function AthleteSpaceEducation({ sportType }: Props) {
  const sportTips = getSportTips(sportType);

  const sections = [
    { title: "Récupération", icon: Moon, tips: RECOVERY_TIPS, color: "text-accent" },
    { title: "Nutrition", icon: Apple, tips: NUTRITION_TIPS, color: "text-status-optimal" },
    { title: "Mobilité", icon: Activity, tips: MOBILITY_EXERCISES, color: "text-warning" },
    { title: "Conseils sport", icon: Shield, tips: sportTips, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <p className="font-semibold">Micro-éducation</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Conseils personnalisés pour optimiser tes performances, ta récupération et ta santé.
          </p>
        </CardContent>
      </Card>

      {sections.map(section => (
        <Card key={section.title} className="bg-gradient-card shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <section.icon className={`h-4 w-4 ${section.color}`} />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section.tips.map((tip, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold mb-0.5">{tip.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
