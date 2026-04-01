import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Copy, Trash2, Plus, Layers } from "lucide-react";
import { ProgramWeekSection } from "./ProgramWeekSection";

interface ProgramExercise {
  id: string;
  exercise_name: string;
  library_exercise_id?: string;
  exercise_category?: string;
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
  drop_sets?: any;
  cluster_sets?: any;
  is_rm_test?: boolean;
  rm_test_type?: string;
  target_velocity?: number;
  target_force_newton?: number | null;
  erg_data?: any;
  running_data?: any;
  bodyweight_data?: any;
}

interface ProgramSession {
  id: string;
  session_number: number;
  name: string;
  day_of_week?: number;
  scheduled_day?: number;
  exercises: ProgramExercise[];
}

interface ProgramWeek {
  id: string;
  week_number: number;
  name?: string;
  block_name?: string;
  block_order?: number;
  sessions: ProgramSession[];
}

export interface ProgramBlock {
  id: string;
  name: string;
  order: number;
  weeks: ProgramWeek[];
}

interface ProgramBlockSectionProps {
  block: ProgramBlock;
  blockIndex: number;
  onUpdate: (block: ProgramBlock) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function ProgramBlockSection({
  block,
  blockIndex,
  onUpdate,
  onDuplicate,
  onDelete,
  canDelete,
}: ProgramBlockSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(block.name);

  const addWeek = () => {
    const newWeek: ProgramWeek = {
      id: crypto.randomUUID(),
      week_number: block.weeks.length + 1,
      block_name: block.name,
      block_order: block.order,
      sessions: [{
        id: crypto.randomUUID(),
        session_number: 1,
        name: "Séance 1",
        exercises: [],
      }],
    };
    onUpdate({
      ...block,
      weeks: [...block.weeks, newWeek],
    });
  };

  const updateWeek = (weekIndex: number, updatedWeek: ProgramWeek) => {
    const newWeeks = [...block.weeks];
    newWeeks[weekIndex] = updatedWeek;
    onUpdate({ ...block, weeks: newWeeks });
  };

  const duplicateWeek = (weekIndex: number) => {
    const weekToDupe = block.weeks[weekIndex];
    const newWeek: ProgramWeek = {
      ...weekToDupe,
      id: crypto.randomUUID(),
      week_number: block.weeks.length + 1,
      sessions: weekToDupe.sessions.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        exercises: s.exercises.map((e) => ({
          ...e,
          id: crypto.randomUUID(),
          group_id: e.group_id ? crypto.randomUUID() : undefined,
        })),
      })),
    };
    onUpdate({ ...block, weeks: [...block.weeks, newWeek] });
  };

  const deleteWeek = (weekIndex: number) => {
    if (block.weeks.length === 1) return;
    const newWeeks = block.weeks.filter((_, i) => i !== weekIndex);
    onUpdate({
      ...block,
      weeks: newWeeks.map((w, i) => ({ ...w, week_number: i + 1 })),
    });
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    onUpdate({ ...block, name: editName });
  };

  const totalSessions = block.weeks.reduce((sum, w) => sum + w.sessions.length, 0);

  const BLOCK_COLORS = [
    { border: "border-blue-400/40", bg: "bg-blue-500/5", icon: "text-blue-500", label: "text-blue-600" },
    { border: "border-emerald-400/40", bg: "bg-emerald-500/5", icon: "text-emerald-500", label: "text-emerald-600" },
    { border: "border-amber-400/40", bg: "bg-amber-500/5", icon: "text-amber-500", label: "text-amber-600" },
    { border: "border-purple-400/40", bg: "bg-purple-500/5", icon: "text-purple-500", label: "text-purple-600" },
    { border: "border-rose-400/40", bg: "bg-rose-500/5", icon: "text-rose-500", label: "text-rose-600" },
    { border: "border-cyan-400/40", bg: "bg-cyan-500/5", icon: "text-cyan-500", label: "text-cyan-600" },
    { border: "border-orange-400/40", bg: "bg-orange-500/5", icon: "text-orange-500", label: "text-orange-600" },
    { border: "border-indigo-400/40", bg: "bg-indigo-500/5", icon: "text-indigo-500", label: "text-indigo-600" },
  ];
  const color = BLOCK_COLORS[blockIndex % BLOCK_COLORS.length];

  return (
    <div className={`border-2 rounded-xl bg-card ${color.border} ${color.bg}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-xl">
            <div className="flex items-center gap-3">
              <Layers className={`h-5 w-5 ${color.icon}`} />
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
              {isEditingName ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  className="h-7 w-48 text-sm font-semibold"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className={`font-semibold cursor-text ${color.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(true);
                    setEditName(block.name);
                  }}
                >
                  {block.name}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {block.weeks.length} sem. · {totalSessions} séance{totalSessions > 1 ? "s" : ""}
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
                title="Dupliquer le bloc"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive hover:text-destructive"
                  title="Supprimer le bloc"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-3">
            {block.weeks.map((week, weekIndex) => (
              <ProgramWeekSection
                key={week.id}
                week={week}
                weekIndex={weekIndex}
                onUpdate={(updated) => updateWeek(weekIndex, updated)}
                onDuplicate={() => duplicateWeek(weekIndex)}
                onDelete={() => deleteWeek(weekIndex)}
              />
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={addWeek}
            >
              <Plus className="h-4 w-4 mr-2" />
              Semaine
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
