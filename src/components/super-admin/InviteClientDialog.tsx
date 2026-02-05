import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, UserPlus } from "lucide-react";

const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  notes: z.string().optional(),
});

type InvitationForm = z.infer<typeof invitationSchema>;

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteClientDialog({ open, onOpenChange }: InviteClientDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      name: "",
      notes: "",
    },
  });

  // Fetch current user profile for inviter name
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (data: InvitationForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non authentifié");

      // Create ambassador invitation (for club admin)
      const { data: invitation, error } = await supabase
        .from("ambassador_invitations")
        .insert({
          email: data.email,
          name: data.name,
          invited_by: user.user.id,
          status: "pending",
        })
        .select("token")
        .single();
      
      if (error) throw error;

      // Send invitation email via OneSignal
      const invitationLink = `${window.location.origin}/accept-ambassador-invitation?token=${invitation.token}`;
      
      try {
        const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
          body: {
            email: data.email,
            invitationType: "club_admin",
            inviterName: profile?.full_name || "CocoriCoach",
            invitationLink,
          },
        });

        if (emailError) {
          console.error("Email sending failed:", emailError);
          toast.warning("Invitation créée mais email non envoyé. Partagez le lien manuellement.");
        }
      } catch (e) {
        console.error("Email sending error:", e);
        toast.warning("Invitation créée mais email non envoyé. Partagez le lien manuellement.");
      }

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ambassador-invitations"] });
      toast.success("Invitation envoyée avec succès ! Un email a été envoyé au client.");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Ce client a déjà été invité");
      } else {
        toast.error("Erreur lors de l'envoi de l'invitation");
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: InvitationForm) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un nouveau client
          </DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email pour créer un nouveau compte administrateur de club.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du client / Organisation *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Club Sportif de Paris"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="contact@club.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes internes (optionnel)</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Informations sur le client..."
              rows={2}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <p className="font-medium">Processus d'onboarding</p>
                <p className="text-muted-foreground text-xs">
                  Le client recevra un email avec un lien pour créer son compte.
                  Il deviendra automatiquement administrateur de son club.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
