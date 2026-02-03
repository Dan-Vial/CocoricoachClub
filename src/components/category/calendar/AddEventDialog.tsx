import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dumbbell, 
  Stethoscope, 
  Video, 
  ClipboardList, 
  Users, 
  Calendar,
  Swords 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onAddSession: () => void;
  onAddMatch: () => void;
  onAddMedical?: () => void;
  onAddVideoAnalysis?: () => void;
  sportType?: string;
}

const EVENT_TYPES = [
  {
    id: "session",
    label: "Séance d'entraînement",
    description: "Planifier un entraînement",
    icon: Dumbbell,
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    hoverColor: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  {
    id: "match",
    label: "Match / Compétition",
    description: "Ajouter un match ou une compétition",
    icon: Swords,
    color: "bg-rose-500",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    hoverColor: "hover:bg-rose-100 dark:hover:bg-rose-900/50",
  },
  {
    id: "medical",
    label: "Rendez-vous médical",
    description: "Consultation, bilan, suivi",
    icon: Stethoscope,
    color: "bg-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
    hoverColor: "hover:bg-sky-100 dark:hover:bg-sky-900/50",
  },
  {
    id: "video",
    label: "Analyse vidéo",
    description: "Session d'analyse vidéo",
    icon: Video,
    color: "bg-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    hoverColor: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
  },
  {
    id: "test",
    label: "Test physique",
    description: "Évaluation et tests de performance",
    icon: ClipboardList,
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    hoverColor: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
  },
  {
    id: "team",
    label: "Réunion d'équipe",
    description: "Briefing, débriefing, tactique",
    icon: Users,
    color: "bg-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    hoverColor: "hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
];

export function AddEventDialog({
  open,
  onOpenChange,
  date,
  onAddSession,
  onAddMatch,
  onAddMedical,
  onAddVideoAnalysis,
}: AddEventDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const handleEventClick = (eventType: string) => {
    switch (eventType) {
      case "session":
        onAddSession();
        break;
      case "match":
        onAddMatch();
        break;
      case "medical":
        if (onAddMedical) onAddMedical();
        break;
      case "video":
        if (onAddVideoAnalysis) onAddVideoAnalysis();
        break;
      case "test":
        // Opens session dialog with test type pre-selected
        onAddSession();
        break;
      case "team":
        onAddSession();
        break;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            Ajouter un événement
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {EVENT_TYPES.map((event) => {
            const Icon = event.icon;
            return (
              <Card
                key={event.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  event.bgColor,
                  event.borderColor,
                  event.hoverColor,
                  "hover:shadow-md hover:scale-[1.02]"
                )}
                onClick={() => handleEventClick(event.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      event.color
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {event.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
