import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "coach", "viewer", "physio", "doctor", "mental_coach", "prepa_physique", "administratif"]),
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
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  const { data: categoryInfo } = useQuery({
    queryKey: ["category-for-invitation", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, club_id, clubs(name)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data as { name: string; club_id: string; clubs: { name: string } | null };
    },
    enabled: open,
  });

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

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setLinkCopied(false);
    form.reset();
    onOpenChange(false);
  };

  const mutation = useMutation({
    mutationFn: async (data: InvitationForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non authentifié");

      const { data: invitation, error } = await supabase
        .from("category_invitations")
        .insert({
          category_id: categoryId,
          email: data.email,
          role: data.role,
          invited_by: user.user.id,
        })
        .select("token")
        .single();
      
      if (error) throw error;

      const invitationLink = `${window.location.origin}/accept-invitation?token=${invitation.token}&type=category`;
      
      try {
        const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
          body: {
            email: data.email,
            invitationType: "category_member",
            inviterName: profile?.full_name || user.user.email,
            clubName: categoryInfo?.clubs?.name || "Votre club",
            categoryName: categoryInfo?.name || "la catégorie",
            role: data.role,
            invitationLink,
          },
        });

        if (emailError) {
          console.error("Email sending failed:", emailError);
        }
      } catch (e) {
        console.error("Email sending error:", e);
      }

      return { invitation, invitationLink };
    },
    onSuccess: ({ invitationLink }) => {
      queryClient.invalidateQueries({ queryKey: ["category-invitations", categoryId] });
      setGeneratedLink(invitationLink);
      toast.success("Invitation créée ! Un email a été envoyé.");
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter à cette catégorie</DialogTitle>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Invitation envoyée !
              </p>
              <p className="text-xs text-muted-foreground">
                Si l'email ne fonctionne pas, copiez et partagez ce lien manuellement :
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={() => copyLink(generatedLink)}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Fermer</Button>
            </div>
          </div>
        ) : (
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
                  <SelectItem value="prepa_physique">
                    <div>
                      <div className="font-medium">Préparateur Physique</div>
                      <div className="text-xs text-muted-foreground">Accès programmes, séances et données physiques</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="administratif">
                    <div>
                      <div className="font-medium">Administratif</div>
                      <div className="text-xs text-muted-foreground">Accès documents, logistique et gestion administrative</div>
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Envoi..." : "Envoyer l'Invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
