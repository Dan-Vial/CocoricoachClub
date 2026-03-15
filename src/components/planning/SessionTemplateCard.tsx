import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Dumbbell, Edit, Trash2, Copy } from "lucide-react";

interface SessionTemplateCardProps {
  template: {
    id: string;
    name: string;
    description?: string | null;
    session_type: string;
    duration_minutes?: number | null;
    intensity?: string | null;
    objectives?: string | null;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDragStart?: () => void;
}

const sessionTypeLabels: Record<string, string> = {
  training: "Entraînement",
  match: "Match",
  recovery: "Récupération",
  physical: "Prépa Physique",
  technical: "Technique",
  tactical: "Tactique",
  collectif: "Collectif",
  technique_individuelle: "Technique Individuelle",
  physique: "Physique",
  musculation: "Musculation",
  repos: "Repos",
  test: "Test",
  reathlétisation: "Réathlétisation",
  bowling_game: "Parties d'Entraînement",
  bowling_spare: "Entraînement Précision",
  bowling_practice: "Pratique Libre",
  bowling_technique: "Travail Technique",
  bowling_approche: "Travail d'Approche",
  bowling_release: "Travail de Lâcher",
};

const sessionTypeColors: Record<string, string> = {
  training: "bg-blue-500",
  match: "bg-rose-500",
  recovery: "bg-emerald-500",
  physical: "bg-orange-500",
  technical: "bg-purple-500",
  tactical: "bg-cyan-500",
  collectif: "bg-training-collectif",
  technique_individuelle: "bg-training-technique",
  physique: "bg-training-physique",
  musculation: "bg-training-musculation",
  repos: "bg-training-repos",
  test: "bg-training-test",
  reathlétisation: "bg-amber-500",
  bowling_game: "bg-green-600",
  bowling_spare: "bg-lime-500",
  bowling_practice: "bg-emerald-500",
  bowling_technique: "bg-teal-500",
  bowling_approche: "bg-cyan-500",
  bowling_release: "bg-blue-500",
};

const intensityColors: Record<string, string> = {
  low: "bg-green-500/20 text-green-700",
  medium: "bg-yellow-500/20 text-yellow-700",
  high: "bg-orange-500/20 text-orange-700",
  very_high: "bg-red-500/20 text-red-700",
};

export function SessionTemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onDragStart,
}: SessionTemplateCardProps) {
  const typeColor = sessionTypeColors[template.session_type] || "bg-muted";

  return (
    <Card
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow overflow-hidden"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("template", JSON.stringify(template));
        onDragStart?.();
      }}
    >
      <div className="flex">
        <div className={`w-1.5 ${typeColor}`} />
        <div className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {sessionTypeLabels[template.session_type] || template.session_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {template.duration_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {template.duration_minutes} min
            </div>
          )}
          {template.intensity && (
            <Badge className={intensityColors[template.intensity] || "bg-muted"}>
              {template.intensity === "low" && "Faible"}
              {template.intensity === "medium" && "Moyen"}
              {template.intensity === "high" && "Intense"}
              {template.intensity === "very_high" && "Très intense"}
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(template.id)}>
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(template.id)}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(template.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
