import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, UtensilsCrossed, AlertCircle, Edit2, Save, X, Phone, Mail, User } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface PlayerAdditionalInfoSectionProps {
  playerId: string;
  isViewer?: boolean;
}

interface PlayerAdditionalInfo {
  parent_contact_1_name: string | null;
  parent_contact_1_phone: string | null;
  parent_contact_1_email: string | null;
  parent_contact_1_relation: string | null;
  parent_contact_2_name: string | null;
  parent_contact_2_phone: string | null;
  parent_contact_2_email: string | null;
  parent_contact_2_relation: string | null;
  dietary_requirements: string | null;
  allergies: string | null;
  medical_notes: string | null;
  emergency_notes: string | null;
}

export function PlayerAdditionalInfoSection({ playerId, isViewer = false }: PlayerAdditionalInfoSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState<PlayerAdditionalInfo>({
    parent_contact_1_name: null,
    parent_contact_1_phone: null,
    parent_contact_1_email: null,
    parent_contact_1_relation: null,
    parent_contact_2_name: null,
    parent_contact_2_phone: null,
    parent_contact_2_email: null,
    parent_contact_2_relation: null,
    dietary_requirements: null,
    allergies: null,
    medical_notes: null,
    emergency_notes: null,
  });

  const { data: playerInfo, isLoading } = useQuery({
    queryKey: ["player-additional-info", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select(`
          parent_contact_1_name,
          parent_contact_1_phone,
          parent_contact_1_email,
          parent_contact_1_relation,
          parent_contact_2_name,
          parent_contact_2_phone,
          parent_contact_2_email,
          parent_contact_2_relation,
          dietary_requirements,
          allergies,
          medical_notes,
          emergency_notes
        `)
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data as PlayerAdditionalInfo;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PlayerAdditionalInfo) => {
      const { error } = await supabase
        .from("players")
        .update(data)
        .eq("id", playerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-additional-info", playerId] });
      toast.success("Informations mises à jour");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleStartEdit = () => {
    if (playerInfo) {
      setFormData(playerInfo);
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (playerInfo) {
      setFormData(playerInfo);
    }
  };

  const hasParentContacts = playerInfo?.parent_contact_1_name || playerInfo?.parent_contact_2_name;
  const hasDietaryInfo = playerInfo?.dietary_requirements || playerInfo?.allergies;
  const hasMedicalInfo = playerInfo?.medical_notes || playerInfo?.emergency_notes;

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Informations Complémentaires
            </CardTitle>
          </CollapsibleTrigger>
          {!isViewer && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Enregistrer
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-6">
                {/* Parent Contact 1 */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Parent/Tuteur 1
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="parent1_name">Nom</Label>
                      <Input
                        id="parent1_name"
                        value={formData.parent_contact_1_name || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_1_name: e.target.value || null })}
                        placeholder="Nom complet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent1_relation">Relation</Label>
                      <Input
                        id="parent1_relation"
                        value={formData.parent_contact_1_relation || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_1_relation: e.target.value || null })}
                        placeholder="Ex: Père, Mère, Tuteur..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent1_phone">Téléphone</Label>
                      <Input
                        id="parent1_phone"
                        type="tel"
                        value={formData.parent_contact_1_phone || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_1_phone: e.target.value || null })}
                        placeholder="+33 6 XX XX XX XX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent1_email">Email</Label>
                      <Input
                        id="parent1_email"
                        type="email"
                        value={formData.parent_contact_1_email || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_1_email: e.target.value || null })}
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent Contact 2 */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact Parent/Tuteur 2
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="parent2_name">Nom</Label>
                      <Input
                        id="parent2_name"
                        value={formData.parent_contact_2_name || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_2_name: e.target.value || null })}
                        placeholder="Nom complet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent2_relation">Relation</Label>
                      <Input
                        id="parent2_relation"
                        value={formData.parent_contact_2_relation || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_2_relation: e.target.value || null })}
                        placeholder="Ex: Père, Mère, Tuteur..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent2_phone">Téléphone</Label>
                      <Input
                        id="parent2_phone"
                        type="tel"
                        value={formData.parent_contact_2_phone || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_2_phone: e.target.value || null })}
                        placeholder="+33 6 XX XX XX XX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent2_email">Email</Label>
                      <Input
                        id="parent2_email"
                        type="email"
                        value={formData.parent_contact_2_email || ""}
                        onChange={(e) => setFormData({ ...formData, parent_contact_2_email: e.target.value || null })}
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Dietary & Allergies */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    Régime Alimentaire
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="dietary">Régime spécial</Label>
                      <Textarea
                        id="dietary"
                        value={formData.dietary_requirements || ""}
                        onChange={(e) => setFormData({ ...formData, dietary_requirements: e.target.value || null })}
                        placeholder="Ex: Végétarien, Sans gluten, Halal..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="allergies">Allergies alimentaires</Label>
                      <Textarea
                        id="allergies"
                        value={formData.allergies || ""}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value || null })}
                        placeholder="Ex: Arachides, Lactose, Fruits de mer..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Notes */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Notes Médicales
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="medical">Notes médicales générales</Label>
                      <Textarea
                        id="medical"
                        value={formData.medical_notes || ""}
                        onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value || null })}
                        placeholder="Informations médicales importantes..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency">Notes d'urgence</Label>
                      <Textarea
                        id="emergency"
                        value={formData.emergency_notes || ""}
                        onChange={(e) => setFormData({ ...formData, emergency_notes: e.target.value || null })}
                        placeholder="Informations à connaître en cas d'urgence..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-6">
                {/* Parent Contacts Display */}
                {hasParentContacts ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Contacts Parentaux</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {playerInfo?.parent_contact_1_name && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{playerInfo.parent_contact_1_name}</span>
                            {playerInfo.parent_contact_1_relation && (
                              <Badge variant="secondary" className="text-xs">
                                {playerInfo.parent_contact_1_relation}
                              </Badge>
                            )}
                          </div>
                          {playerInfo.parent_contact_1_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${playerInfo.parent_contact_1_phone}`} className="hover:underline">
                                {playerInfo.parent_contact_1_phone}
                              </a>
                            </div>
                          )}
                          {playerInfo.parent_contact_1_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${playerInfo.parent_contact_1_email}`} className="hover:underline">
                                {playerInfo.parent_contact_1_email}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {playerInfo?.parent_contact_2_name && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{playerInfo.parent_contact_2_name}</span>
                            {playerInfo.parent_contact_2_relation && (
                              <Badge variant="secondary" className="text-xs">
                                {playerInfo.parent_contact_2_relation}
                              </Badge>
                            )}
                          </div>
                          {playerInfo.parent_contact_2_phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${playerInfo.parent_contact_2_phone}`} className="hover:underline">
                                {playerInfo.parent_contact_2_phone}
                              </a>
                            </div>
                          )}
                          {playerInfo.parent_contact_2_email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${playerInfo.parent_contact_2_email}`} className="hover:underline">
                                {playerInfo.parent_contact_2_email}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Dietary Info Display */}
                {hasDietaryInfo && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      Régime Alimentaire
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      {playerInfo?.dietary_requirements && (
                        <div>
                          <span className="text-sm font-medium">Régime: </span>
                          <span className="text-sm">{playerInfo.dietary_requirements}</span>
                        </div>
                      )}
                      {playerInfo?.allergies && (
                        <div className="flex items-start gap-2">
                          <Badge variant="destructive" className="text-xs shrink-0">Allergies</Badge>
                          <span className="text-sm">{playerInfo.allergies}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical Notes Display */}
                {hasMedicalInfo && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Notes Médicales
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      {playerInfo?.medical_notes && (
                        <p className="text-sm">{playerInfo.medical_notes}</p>
                      )}
                      {playerInfo?.emergency_notes && (
                        <div className="flex items-start gap-2 mt-2 pt-2 border-t">
                          <Badge variant="outline" className="text-xs shrink-0 border-destructive text-destructive">
                            Urgence
                          </Badge>
                          <span className="text-sm">{playerInfo.emergency_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!hasParentContacts && !hasDietaryInfo && !hasMedicalInfo && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune information complémentaire renseignée</p>
                    {!isViewer && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={handleStartEdit}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Ajouter des informations
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
