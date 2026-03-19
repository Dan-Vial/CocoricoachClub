import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Eye, Pencil, MessageSquare, Trash2, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/constants/trainingTypes";

// Map Tailwind bg-color classes to actual CSS colors
const TAILWIND_COLOR_MAP: Record<string, string> = {
  "bg-blue-500": "#3b82f6", "bg-blue-400": "#60a5fa", "bg-blue-600": "#2563eb",
  "bg-green-500": "#22c55e", "bg-green-600": "#16a34a", "bg-green-400": "#4ade80",
  "bg-red-500": "#ef4444", "bg-red-600": "#dc2626", "bg-red-400": "#f87171", "bg-red-700": "#b91c1c",
  "bg-orange-500": "#f97316", "bg-orange-600": "#ea580c", "bg-orange-400": "#fb923c",
  "bg-yellow-500": "#eab308", "bg-yellow-600": "#ca8a04", "bg-yellow-400": "#facc15",
  "bg-purple-500": "#a855f7", "bg-purple-600": "#9333ea",
  "bg-pink-500": "#ec4899", "bg-pink-400": "#f472b6",
  "bg-indigo-500": "#6366f1", "bg-indigo-600": "#4f46e5",
  "bg-teal-500": "#14b8a6", "bg-teal-600": "#0d9488",
  "bg-cyan-500": "#06b6d4",
  "bg-emerald-500": "#10b981",
  "bg-amber-500": "#f59e0b", "bg-amber-400": "#fbbf24",
  "bg-rose-500": "#f43f5e", "bg-rose-600": "#e11d48", "bg-rose-400": "#fb7185",
  "bg-violet-500": "#8b5cf6",
  "bg-fuchsia-500": "#d946ef",
  "bg-lime-500": "#84cc16",
  "bg-sky-500": "#0ea5e9", "bg-sky-400": "#38bdf8",
  "bg-slate-500": "#64748b",
  "bg-gray-400": "#9ca3af", "bg-gray-500": "#6b7280",
  "bg-primary": "#6366f1",
  // Custom training type colors from design system CSS variables
  "bg-training-collectif": "hsl(214, 70%, 50%)",
  "bg-training-technique": "hsl(188, 76%, 40%)",
  "bg-training-physique": "hsl(160, 60%, 42%)",
  "bg-training-musculation": "hsl(32, 70%, 50%)",
  "bg-training-repos": "hsl(214, 15%, 55%)",
  "bg-training-test": "hsl(45, 93%, 47%)",
};

function tailwindColorToHsl(colorClass: string): string {
  return TAILWIND_COLOR_MAP[colorClass] || "#6b7280";
}
interface SessionBlock {
  id: string;
  training_type: string;
  block_order: number;
}

interface SessionVignetteProps {
  session: {
    id: string;
    session_date: string;
    session_start_time: string | null;
    session_end_time: string | null;
    training_type: string;
    notes: string | null;
    created_by_player_id?: string | null;
  };
  blocks?: SessionBlock[];
  onPreview: () => void;
  onEdit: () => void;
  onFeedback: () => void;
  onDelete: () => void;
  onNotify?: () => void;
  isViewer: boolean;
  isDraggable?: boolean;
}

export function SessionVignette({
  session,
  blocks,
  onPreview,
  onEdit,
  onFeedback,
  onDelete,
  onNotify,
  isViewer,
  isDraggable = true,
}: SessionVignetteProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: { type: "session", session },
    disabled: isViewer || !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  const bgColor = getTrainingTypeColor(session.training_type);
  const label = getTrainingTypeLabel(session.training_type);
  const startTime = formatTime(session.session_start_time);
  const hasBlocks = blocks && blocks.length > 0;
  const isAthleteCreated = !!session.created_by_player_id;

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        zIndex: isHovered ? 50 : undefined,
      }}
      className={cn(
        "relative group",
        isDragging && "opacity-50",
        isHovered && "z-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Session Block */}
      <div
        className={cn(
          "rounded-lg px-2 py-1.5 text-white text-[11px] font-medium transition-all relative overflow-hidden",
          !hasBlocks && !isAthleteCreated && bgColor,
          isDragging && "shadow-lg ring-2 ring-primary/50",
          isAthleteCreated && !hasBlocks && "ring-2 ring-violet-400"
        )}
        style={
          isAthleteCreated && !hasBlocks
            ? { backgroundColor: "#8B5CF6" }
            : hasBlocks ? (() => {
          const uniqueBlocks = blocks.slice(0, 3);
          const colors = uniqueBlocks.map(b => {
            const colorClass = getTrainingTypeColor(b.training_type);
            return tailwindColorToHsl(colorClass);
          });
          if (colors.length === 1) return { backgroundColor: colors[0] };
          const stops = colors.map((c, i) => {
            const start = (i / colors.length) * 100;
            const end = ((i + 1) / colors.length) * 100;
            return `${c} ${start}%, ${c} ${end}%`;
          }).join(', ');
          return { background: `linear-gradient(to right, ${stops})` };
        })() : undefined}
      >
        {/* Drag handle - only visible and active when NOT hovered */}
        {!isHovered && !isDragging && isDraggable && !isViewer && (
          <div
            {...attributes}
            {...listeners}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Session content - hidden when hovered to show actions */}
        <div className={cn(
          "flex items-center gap-1.5 transition-opacity pointer-events-none",
          isHovered && !isDragging && "opacity-0"
        )}>
          {isAthleteCreated && (
            <User className="h-3 w-3 opacity-80 shrink-0" />
          )}
          {startTime && (
            <>
              <span className="font-bold">{startTime}</span>
              <span className="opacity-70">•</span>
            </>
          )}
          <span className="truncate opacity-90">
            {hasBlocks ? `${blocks.length} blocs` : label}
          </span>
        </div>

        {/* Hover Actions Overlay - displayed ON the session */}
        {isHovered && !isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/95 rounded-lg z-[100] animate-fade-in">
            {/* Preview */}
            <button
              onClick={(e) => handleActionClick(e, onPreview)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors group/btn"
              title="Aperçu"
            >
              <Eye className="h-4 w-4 text-muted-foreground group-hover/btn:text-foreground" />
            </button>
            
            {/* Edit */}
            {!isViewer && (
              <button
                onClick={(e) => handleActionClick(e, onEdit)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors group/btn"
                title="Modifier"
              >
                <Pencil className="h-4 w-4 text-muted-foreground group-hover/btn:text-foreground" />
              </button>
            )}
            
            {/* Feedback */}
            {!isViewer && (
              <button
                onClick={(e) => handleActionClick(e, onFeedback)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors group/btn"
                title="Retour / Commentaire"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground group-hover/btn:text-foreground" />
              </button>
            )}
            
            {/* Notify */}
            {!isViewer && onNotify && (
              <button
                onClick={(e) => handleActionClick(e, onNotify)}
                className="p-1.5 rounded-md hover:bg-primary/10 transition-colors group/btn"
                title="Notifier les athlètes"
              >
                <Bell className="h-4 w-4 text-muted-foreground group-hover/btn:text-primary" />
              </button>
            )}
            
            {/* Delete */}
            {!isViewer && (
              <button
                onClick={(e) => handleActionClick(e, onDelete)}
                className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors group/btn"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground group-hover/btn:text-destructive" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
