import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, BarChart3, Zap, Car, Calendar, Users, Dumbbell, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  categoryId: string;
}

interface PollTemplate {
  id: string;
  icon: React.ReactNode;
  label: string;
  questionTemplate: string;
  detailsPlaceholder?: string;
  options: string[];
  pollType: string;
}

const TEMPLATES: PollTemplate[] = [
  {
    id: "availability_match",
    icon: <Users className="h-4 w-4" />,
    label: "Disponibilité match / compétition",
    questionTemplate: "🏟️ Présence match {details}",
    detailsPlaceholder: "Ex: Samedi 15h à St Jory VS Grenade",
    options: ["✅ Disponible", "❌ Absent", "❓ Incertain"],
    pollType: "availability_match",
  },
  {
    id: "availability_training",
    icon: <Dumbbell className="h-4 w-4" />,
    label: "Présence entraînement",
    questionTemplate: "🏃 Présence entraînement {details}",
    detailsPlaceholder: "Ex: Mardi 19h terrain principal",
    options: ["✅ Présent", "❌ Absent"],
    pollType: "availability_training",
  },
  {
    id: "carpooling",
    icon: <Car className="h-4 w-4" />,
    label: "Covoiturage",
    questionTemplate: "🚗 Covoiturage {details}",
    detailsPlaceholder: "Ex: déplacement Toulouse samedi",
    options: ["🚗 Je peux conduire", "🙋 Je cherche une place", "👌 Pas besoin"],
    pollType: "carpooling",
  },
  {
    id: "schedule",
    icon: <Calendar className="h-4 w-4" />,
    label: "Choix horaire",
    questionTemplate: "🕐 Quel horaire vous convient ? {details}",
    detailsPlaceholder: "Ex: entraînement semaine prochaine",
    options: ["18h00", "19h00", "20h00"],
    pollType: "schedule",
  },
];

export function CreatePollDialog({ open, onOpenChange, conversationId, categoryId }: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PollTemplate | null>(null);
  const [templateDetails, setTemplateDetails] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setHasDeadline(false);
    setDeadline("");
    setSelectedTemplate(null);
    setTemplateDetails("");
  };

  const createPoll = useMutation({
    mutationFn: async ({ q, opts, pType }: { q: string; opts: string[]; pType: string }) => {
      if (!user) throw new Error("Non connecté");
      if (!q) throw new Error("Question requise");
      if (opts.length < 2) throw new Error("Minimum 2 options");

      const { data: msg, error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `📊 **Sondage** : ${q}`,
          message_type: "poll",
          is_announcement: false,
          read_by: [user.id],
        })
        .select()
        .single();
      if (msgErr) throw msgErr;

      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({
          conversation_id: conversationId,
          message_id: msg.id,
          created_by: user.id,
          question: q,
          poll_type: pType,
          allow_multiple: pType === "custom" ? allowMultiple : false,
          expires_at: hasDeadline && deadline ? new Date(deadline).toISOString() : null,
          category_id: categoryId,
        })
        .select()
        .single();
      if (pollErr) throw pollErr;

      await supabase.from("messages").update({ poll_id: poll.id }).eq("id", msg.id);

      const optionRows = opts.map((label, idx) => ({
        poll_id: poll.id,
        label: label.trim(),
        sort_order: idx,
      }));
      const { error: optErr } = await supabase.from("poll_options").insert(optionRows);
      if (optErr) throw optErr;

      return poll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Sondage créé !");
      resetForm();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleTemplateSend = () => {
    if (!selectedTemplate) return;
    const details = templateDetails.trim();
    const q = selectedTemplate.questionTemplate.replace("{details}", details ? `— ${details}` : "").trim();
    createPoll.mutate({ q, opts: selectedTemplate.options, pType: selectedTemplate.pollType });
  };

  const handleCustomSend = () => {
    createPoll.mutate({ q: question.trim(), opts: options.filter(o => o.trim()), pType: "custom" });
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Créer un sondage
          </DialogTitle>
          <DialogDescription>Sondage rapide ou personnalisé</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedTemplate ? (
            /* Template detail view */
            <div className="space-y-4 p-1">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplate(null); setTemplateDetails(""); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {selectedTemplate.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedTemplate.label}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTemplate.options.map((o, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted">{o}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Détails (optionnel)</Label>
                <Input
                  value={templateDetails}
                  onChange={(e) => setTemplateDetails(e.target.value)}
                  placeholder={selectedTemplate.detailsPlaceholder}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Aperçu : <span className="font-medium">
                    {selectedTemplate.questionTemplate.replace("{details}", templateDetails.trim() ? `— ${templateDetails.trim()}` : "").trim()}
                  </span>
                </p>
              </div>

              <Button
                onClick={handleTemplateSend}
                disabled={createPoll.isPending}
                className="w-full"
              >
                Envoyer le sondage
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="templates">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates" className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Rapide
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Personnalisé
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="mt-4">
                <div className="grid gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      disabled={createPoll.isPending}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left w-full"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {t.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.questionTemplate.replace("{details}", "...")}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.options.map((o, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted">{o}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Label>Question</Label>
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Posez votre question..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options de réponse</Label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const updated = [...options];
                            updated[idx] = e.target.value;
                            setOptions(updated);
                          }}
                          placeholder={`Option ${idx + 1}`}
                        />
                        {options.length > 2 && (
                          <Button variant="ghost" size="icon" onClick={() => removeOption(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {options.length < 6 && (
                      <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> Ajouter une option
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Vote multiple</Label>
                    <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Date limite</Label>
                    <Switch checked={hasDeadline} onCheckedChange={setHasDeadline} />
                  </div>
                  {hasDeadline && (
                    <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  )}

                  <Button
                    onClick={handleCustomSend}
                    disabled={createPoll.isPending || !question.trim() || options.filter(o => o.trim()).length < 2}
                    className="w-full"
                  >
                    Créer le sondage
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
