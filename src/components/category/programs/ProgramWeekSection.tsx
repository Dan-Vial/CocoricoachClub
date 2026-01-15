import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Copy, Trash2, Plus, X } from "lucide-react";
import { ProgramSessionCard } from "./ProgramSessionCard";

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  order_index: number;
  method: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  tempo?: string;
  rest_seconds: number;
  group_id?: string;
  group_order?: number;
  notes?: string;
}

interface ProgramSession {
  id: string;
  session_number: number;
  name: string;
  day_of_week?: number;
  exercises: ProgramExercise[];
}

interface ProgramWeek {
  id: string;
  week_number: number;
  name?: string;
  sessions: ProgramSession[];
}

interface ProgramWeekSectionProps {
  week: ProgramWeek;
  weekIndex: number;
  onUpdate: (week: ProgramWeek) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ProgramWeekSection({
  week,
  weekIndex,
  onUpdate,
  onDuplicate,
  onDelete,
}: ProgramWeekSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const addSession = () => {
    const newSession: ProgramSession = {
      id: crypto.randomUUID(),
      session_number: week.sessions.length + 1,
      name: `Séance ${week.sessions.length + 1}`,
      exercises: [],
    };
    onUpdate({
      ...week,
      sessions: [...week.sessions, newSession],
    });
  };

  const updateSession = (sessionIndex: number, updatedSession: ProgramSession) => {
    const newSessions = [...week.sessions];
    newSessions[sessionIndex] = updatedSession;
    onUpdate({ ...week, sessions: newSessions });
  };

  const deleteSession = (sessionIndex: number) => {
    if (week.sessions.length === 1) return;
    const newSessions = week.sessions.filter((_, i) => i !== sessionIndex);
    onUpdate({
      ...week,
      sessions: newSessions.map((s, i) => ({ ...s, session_number: i + 1 })),
    });
  };

  return (
    <div className="border rounded-lg bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
              <span className="font-medium">Semaine {week.week_number}</span>
              <span className="text-sm text-muted-foreground">
                {week.sessions.length} séance{week.sessions.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                title="Dupliquer la semaine"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive hover:text-destructive"
                title="Supprimer la semaine"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {week.sessions.map((session, sessionIndex) => (
              <ProgramSessionCard
                key={session.id}
                session={session}
                onUpdate={(updated) => updateSession(sessionIndex, updated)}
                onDelete={() => deleteSession(sessionIndex)}
                canDelete={week.sessions.length > 1}
              />
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={addSession}
            >
              <Plus className="h-4 w-4 mr-2" />
              Séance
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
