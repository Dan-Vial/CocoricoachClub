import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, Trash2 } from "lucide-react";

interface TapingDetailEditorProps {
  tapingInstructions: string[];
  tapingDiagramUrl?: string | null;
  onInstructionsChange: (instructions: string[]) => void;
  onDiagramUrlChange: (url: string | null) => void;
  injuryType?: string;
  phaseDescription?: string;
}

export function TapingDetailEditor({
  tapingInstructions,
  tapingDiagramUrl,
  onInstructionsChange,
  onDiagramUrlChange,
}: TapingDetailEditorProps) {
  const [viewingImage, setViewingImage] = useState(false);

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium flex items-center gap-2">
        🏷️ Taping / Strapping
      </Label>

      {/* Existing diagram preview (if any) — kept for backward compatibility */}
      {tapingDiagramUrl && (
        <div className="relative group">
          <img
            src={tapingDiagramUrl}
            alt="Schéma de taping"
            className="w-full max-h-48 object-contain rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setViewingImage(true)}
          />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewingImage(true)}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDiagramUrlChange(null)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Detailed instructions */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Instructions détaillées (une par ligne)
        </Label>
        <Textarea
          value={tapingInstructions.join("\n")}
          onChange={(e) =>
            onInstructionsChange(
              e.target.value.split("\n").filter((c) => c.trim())
            )
          }
          placeholder={`Ex:\n1. Préparer la peau (raser si nécessaire, nettoyer)\n2. Appliquer le pré-tape ou spray adhésif\n3. Poser l'ancre au niveau de...\n4. Appliquer la bande en tension de 50% vers...\n5. Lisser pour activer l'adhésif`}
          rows={6}
          className="text-sm"
        />
      </div>

      {/* Full-size image dialog */}
      <Dialog open={viewingImage} onOpenChange={setViewingImage}>
        <DialogContent className="max-w-3xl">
          {tapingDiagramUrl && (
            <img
              src={tapingDiagramUrl}
              alt="Schéma de taping"
              className="w-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
