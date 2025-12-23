import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "coach", "viewer", "physio", "doctor", "mental_coach"]),
});

type InvitationForm = z.infer<typeof invitationSchema>;

interface InviteCategoryMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
}

export function InviteCategoryMemberDialog({ open, onOpenChange, categoryId }: InviteCategoryMemberDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InvitationForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non authentifié");

      const { error } = await supabase.from("category_invitations").insert({
        category_id: categoryId,
        email: data.email,
        role: data.role,
        invited_by: user.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-invitations", categoryId] });
      toast.success("Invitation envoyée avec succès");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Cette personne a déjà été invitée");
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
          <DialogTitle>Inviter à cette catégorie</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="exemple@email.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Rôle</Label>
            <Select
              onValueChange={(value) => form.setValue("role", value as any)}
              defaultValue="viewer"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div>
                    <div className="font-medium">Viewer</div>
                    <div className="text-xs text-muted-foreground">Consultation uniquement</div>
                  </div>
                </SelectItem>
                <SelectItem value="coach">
                  <div>
                    <div className="font-medium">Coach</div>
                    <div className="text-xs text-muted-foreground">Peut consulter et modifier les données</div>
                  </div>
                </SelectItem>
                <SelectItem value="physio">
                  <div>
                    <div className="font-medium">Kinésithérapeute</div>
                    <div className="text-xs text-muted-foreground">Accès blessures et récupération</div>
                  </div>
                </SelectItem>
                <SelectItem value="doctor">
                  <div>
                    <div className="font-medium">Médecin</div>
                    <div className="text-xs text-muted-foreground">Accès médical complet</div>
                  </div>
                </SelectItem>
                <SelectItem value="mental_coach">
                  <div>
                    <div className="font-medium">Préparateur Mental</div>
                    <div className="text-xs text-muted-foreground">Accès wellness et suivi psychologique</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              La personne invitée aura accès <strong>uniquement à cette catégorie</strong>, 
              pas aux autres catégories du club.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Envoi..." : "Envoyer l'Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
