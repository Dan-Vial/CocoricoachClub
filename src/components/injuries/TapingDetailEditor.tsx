import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Sparkles, ZoomIn, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BODY_PARTS = [
  "cheville", "genou", "cuisse (quadriceps)", "cuisse (ischio-jambiers)", 
  "hanche", "adducteurs", "mollet", "pied", "épaule", "coude", 
  "poignet", "main / doigts", "dos (lombaire)", "dos (thoracique)", 
  "cou / cervicales", "abdominaux"
];

const TAPING_TYPES = [
  { value: "kinesiology", label: "Kinesiotape (décharge / soutien)" },
  { value: "rigid", label: "Tape rigide (strapping)" },
  { value: "mcconnell", label: "McConnell (correctif)" },
  { value: "lymphatic", label: "Drainage lymphatique" },
  { value: "preventive", label: "Prévention / maintien" },
];

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
  injuryType,
  phaseDescription,
}: TapingDetailEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [bodyPart, setBodyPart] = useState("");
  const [tapingType, setTapingType] = useState("");
  const [viewingImage, setViewingImage] = useState(false);

  const handleGenerateDiagram = async () => {
    if (!bodyPart || !tapingType) {
      toast.error("Sélectionnez la zone du corps et le type de tape");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-taping-diagram", {
        body: {
          bodyPart,
          injuryType: injuryType || "blessure",
          tapingType: TAPING_TYPES.find(t => t.value === tapingType)?.label || tapingType,
          phaseDescription: phaseDescription || "",
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onDiagramUrlChange(data.imageUrl);
        toast.success("Schéma de taping généré");
      }

      if (data?.instructions) {
        const newInstructions = data.instructions
          .split("\n")
          .filter((l: string) => l.trim())
          .slice(0, 10);
        if (newInstructions.length > 0 && tapingInstructions.length === 0) {
          onInstructionsChange(newInstructions);
        }
      }
    } catch (err: any) {
      console.error("Error generating diagram:", err);
      toast.error("Erreur lors de la génération du schéma");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium flex items-center gap-2">
        🏷️ Taping / Strapping
      </Label>

      {/* Taping configuration for diagram generation */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Zone du corps</Label>
          <Select value={bodyPart} onValueChange={setBodyPart}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {BODY_PARTS.map(part => (
                <SelectItem key={part} value={part}>{part}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type de tape</Label>
          <Select value={tapingType} onValueChange={setTapingType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {TAPING_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate diagram button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerateDiagram}
        disabled={generating || !bodyPart || !tapingType}
        className="w-full gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération du schéma...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Générer un schéma de taping (IA)
          </>
        )}
      </Button>

      {/* Diagram preview */}
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
          Instructions détaillées (un par ligne)
        </Label>
        <Textarea
          value={tapingInstructions.join("\n")}
          onChange={(e) =>
            onInstructionsChange(
              e.target.value.split("\n").filter((c) => c.trim())
            )
          }
          placeholder={`Ex:\n1. Préparer la peau (raser si nécessaire, nettoyer)\n2. Appliquer le pré-tape ou spray adhésif\n3. Poser l'ancre au niveau de...\n4. Appliquer la bande en tension de 50% vers...\n5. Lisser pour activer l'adhésif`}
          rows={5}
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
