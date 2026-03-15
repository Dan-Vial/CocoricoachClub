import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface AddSessionTemplateDialogProps {
  categoryId: string;
  trigger?: React.ReactNode;
}

export function AddSessionTemplateDialog({ categoryId, trigger }: AddSessionTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState("training");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [intensity, setIntensity] = useState("");
  const [objectives, setObjectives] = useState("");
  const [warmupDescription, setWarmupDescription] = useState("");
  const [mainContent, setMainContent] = useState("");
  const [cooldownDescription, setCooldownDescription] = useState("");

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("session_templates").insert({
        category_id: categoryId,
        name,
        description: description || null,
        session_type: sessionType,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        intensity: intensity || null,
        objectives: objectives || null,
        warmup_description: warmupDescription || null,
        main_content: mainContent || null,
        cooldown_description: cooldownDescription || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-templates", categoryId] });
      toast.success("Template créé avec succès");
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast.error("Erreur lors de la création du template");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSessionType("training");
    setDurationMinutes("");
    setIntensity("");
    setObjectives("");
    setWarmupDescription("");
    setMainContent("");
    setCooldownDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un template de séance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du template *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Séance technique passes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-type">Type de séance</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Entraînement</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="recovery">Récupération</SelectItem>
                  <SelectItem value="physical">Prépa Physique</SelectItem>
                  <SelectItem value="technical">Technique</SelectItem>
                  <SelectItem value="tactical">Tactique</SelectItem>
                  <SelectItem value="bowling_game">Parties d'Entraînement</SelectItem>
                  <SelectItem value="bowling_spare">Entraînement Spares</SelectItem>
                  <SelectItem value="bowling_practice">Pratique Libre</SelectItem>
                  <SelectItem value="bowling_technique">Travail Technique</SelectItem>
                  <SelectItem value="bowling_approche">Travail d'Approche</SelectItem>
                  <SelectItem value="bowling_release">Travail de Lâcher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description générale de la séance..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Durée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intensity">Intensité</Label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Intense</SelectItem>
                  <SelectItem value="very_high">Très intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Objectifs de la séance..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warmup">Échauffement</Label>
            <Textarea
              id="warmup"
              value={warmupDescription}
              onChange={(e) => setWarmupDescription(e.target.value)}
              placeholder="Description de l'échauffement..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="main-content">Contenu principal</Label>
            <Textarea
              id="main-content"
              value={mainContent}
              onChange={(e) => setMainContent(e.target.value)}
              placeholder="Exercices et déroulé principal..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown">Retour au calme</Label>
            <Textarea
              id="cooldown"
              value={cooldownDescription}
              onChange={(e) => setCooldownDescription(e.target.value)}
              placeholder="Étirements, récupération..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => createTemplate.mutate()} disabled={!name || createTemplate.isPending}>
              {createTemplate.isPending ? "Création..." : "Créer le template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
