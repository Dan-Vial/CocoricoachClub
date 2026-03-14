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
import { Plus, Trash2, BarChart3, Zap, Car, Calendar, Users, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  question: string;
  options: string[];
  pollType: string;
}

const TEMPLATES: PollTemplate[] = [
  {
    id: "availability_match",
    icon: <Users className="h-4 w-4" />,
    label: "Disponibilité match",
    question: "🏟️ Êtes-vous disponible pour le prochain match ?",
    options: ["✅ Disponible", "❌ Absent", "❓ Incertain"],
    pollType: "availability_match",
  },
  {
    id: "availability_training",
    icon: <Dumbbell className="h-4 w-4" />,
    label: "Présence entraînement",
    question: "🏃 Serez-vous présent à l'entraînement ?",
    options: ["✅ Présent", "❌ Absent"],
    pollType: "availability_training",
  },
  {
    id: "carpooling",
    icon: <Car className="h-4 w-4" />,
    label: "Covoiturage",
    question: "🚗 Covoiturage pour le déplacement",
    options: ["🚗 Je peux conduire", "🙋 Je cherche une place", "👌 Pas besoin"],
    pollType: "carpooling",
  },
  {
    id: "schedule",
    icon: <Calendar className="h-4 w-4" />,
    label: "Choix horaire",
    question: "🕐 Quel horaire vous convient ?",
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
    setHasDeadline(false);
    setDeadline("");
  };

  const createPoll = useMutation({
    mutationFn: async (template?: PollTemplate) => {
      if (!user) throw new Error("Non connecté");
      
      const q = template?.question || question.trim();
      const opts = template?.options || options.filter(o => o.trim());
      const pType = template?.pollType || "custom";
      
      if (!q) throw new Error("Question requise");
      if (opts.length < 2) throw new Error("Minimum 2 options");

      // Create message first
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

      // Create poll
      const { data: poll, error: pollErr } = await supabase
        .from("polls")
        .insert({
          conversation_id: conversationId,
          message_id: msg.id,
          created_by: user.id,
          question: q,
          poll_type: pType,
          allow_multiple: template ? false : allowMultiple,
          expires_at: hasDeadline && deadline ? new Date(deadline).toISOString() : null,
          category_id: categoryId,
        })
        .select()
        .single();
      if (pollErr) throw pollErr;

      // Update message with poll_id
      await supabase.from("messages").update({ poll_id: poll.id }).eq("id", msg.id);

      // Create options
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

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Créer un sondage
          </DialogTitle>
          <DialogDescription>Sondage rapide ou personnalisé</DialogDescription>
        </DialogHeader>

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
            <ScrollArea className="max-h-[350px]">
              <div className="grid gap-2 pr-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => createPoll.mutate(t)}
                    disabled={createPoll.isPending}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left w-full"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.question}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.options.map((o, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted">{o}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4 pr-2">
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
                  onClick={() => createPoll.mutate()}
                  disabled={createPoll.isPending || !question.trim() || options.filter(o => o.trim()).length < 2}
                  className="w-full"
                >
                  Créer le sondage
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
