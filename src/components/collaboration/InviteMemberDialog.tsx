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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const invitationSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "coach", "prepa_physique", "doctor", "administratif"]),
});

type InvitationForm = z.infer<typeof invitationSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
}

export function InviteMemberDialog({ open, onOpenChange, clubId }: InviteMemberDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [allCategories, setAllCategories] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: "",
      role: "coach",
    },
  });

  const { data: club } = useQuery({
    queryKey: ["club-for-invitation", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("name, client_id")
        .eq("id", clubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch client limits (max_staff_per_category)
  const { data: clientLimits } = useQuery({
    queryKey: ["client-limits", club?.client_id],
    queryFn: async () => {
      if (!club?.client_id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("max_staff_users, max_staff_per_category")
        .eq("id", club.client_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!club?.client_id,
    staleTime: 0,
  });

  // Fetch current staff count per club (global)
  const { data: currentStaffCount = 0 } = useQuery({
    queryKey: ["club-staff-count", clubId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("club_members")
          .select("id", { count: "exact", head: true })
          .eq("club_id", clubId);
        if (error) {
          console.error("[InviteMemberDialog] Staff count error:", error);
          return 0;
        }
        return count || 0;
      } catch (e) {
        console.error("[InviteMemberDialog] Unexpected error:", e);
        return 0;
      }
    },
    enabled: open,
    staleTime: 0,
  });

  // Use max_staff_per_category if set, fallback to max_staff_users
  const maxStaff = clientLimits?.max_staff_per_category ?? clientLimits?.max_staff_users ?? null;
  const isStaffFull = maxStaff !== null && currentStaffCount >= maxStaff;

  const { data: categories = [] } = useQuery({
    queryKey: ["club-categories-for-invitation", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("club_id", clubId)
        .order("name");
      if (error) throw error;
      return data;
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
    setAllCategories(true);
    setSelectedCategories([]);
    form.reset();
    onOpenChange(false);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: InvitationForm) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non authentifié");

      const assignedCategories = allCategories ? null : selectedCategories;

      const { data: invitation, error } = await (supabase as any)
        .from("club_invitations")
        .insert({
          club_id: clubId,
          email: data.email,
          role: data.role,
          invited_by: user.user.id,
          assigned_categories: assignedCategories,
        })
        .select("token")
        .single();
      
      if (error) throw error;

      const invitationLink = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
      
      try {
        const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
          body: {
            email: data.email,
            invitationType: "collaborator",
            inviterName: profile?.full_name || user.user.email,
            clubName: club?.name || "Votre club",
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
      queryClient.invalidateQueries({ queryKey: ["club-invitations", clubId] });
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
    if (!allCategories && selectedCategories.length === 0) {
      toast.error("Veuillez sélectionner au moins une catégorie");
      return;
    }
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un Membre</DialogTitle>
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
            {isStaffFull && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limite de staff atteinte ({currentStaffCount}/{maxStaff}). Retirez un membre existant avant d'en inviter un nouveau.
                </AlertDescription>
              </Alert>
            )}

            {maxStaff !== null && !isStaffFull && (
              <p className="text-xs text-muted-foreground">
                Staff : {currentStaffCount}/{maxStaff} membre(s) utilisé(s)
              </p>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="exemple@email.com"
                disabled={isStaffFull}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as any)}
                disabled={isStaffFull}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">Accès complet + gestion des membres</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="coach">
                    <div>
                      <div className="font-medium">Coach</div>
                      <div className="text-xs text-muted-foreground">Accès aux données d'entraînement et joueurs</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="prepa_physique">
                    <div>
                      <div className="font-medium">Préparateur Physique</div>
                      <div className="text-xs text-muted-foreground">Accès programmes, séances et données physiques</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="doctor">
                    <div>
                      <div className="font-medium">Médecin</div>
                      <div className="text-xs text-muted-foreground">Accès médical complet et protocoles</div>
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

            <div className="space-y-3">
              <Label>Accès aux catégories</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-categories"
                  checked={allCategories}
                  onCheckedChange={(checked) => {
                    setAllCategories(!!checked);
                    if (checked) setSelectedCategories([]);
                  }}
                  disabled={isStaffFull}
                />
                <label htmlFor="all-categories" className="text-sm font-medium cursor-pointer">
                  Toutes les catégories
                </label>
              </div>
              {!allCategories && (
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune catégorie disponible</p>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                          {cat.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
              <p className="text-muted-foreground">
                Un lien d'invitation permanent sera généré. La personne devra créer un compte pour accéder aux données.
              </p>
              <p className="text-green-600 font-medium text-xs">
                ✓ Les liens n'expirent jamais
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || isStaffFull}>
                {isSubmitting ? "Envoi..." : "Envoyer l'Invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
