import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Eye, Pencil, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/constants/trainingTypes";

interface SessionVignetteProps {
  session: {
    id: string;
    session_date: string;
    session_start_time: string | null;
    session_end_time: string | null;
    training_type: string;
    notes: string | null;
  };
  onPreview: () => void;
  onEdit: () => void;
  onFeedback: () => void;
  onDelete: () => void;
  isViewer: boolean;
  isDraggable?: boolean;
}

export function SessionVignette({
  session,
  onPreview,
  onEdit,
  onFeedback,
  onDelete,
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
          "rounded-lg px-2 py-1.5 text-white text-[11px] font-medium transition-all relative",
          bgColor,
          isDragging && "shadow-lg ring-2 ring-primary/50"
        )}
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
          {startTime && (
            <>
              <span className="font-bold">{startTime}</span>
              <span className="opacity-70">•</span>
            </>
          )}
          <span className="truncate opacity-90">{label}</span>
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
