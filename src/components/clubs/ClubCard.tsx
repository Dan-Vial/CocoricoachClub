import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Check, X, Camera, ImagePlus, ImageMinus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    logo_url: string | null;
    created_at: string;
  };
  onDelete: (clubId: string) => void;
}

export function ClubCard({ club, onDelete }: ClubCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(club.name);
  const [isUploading, setIsUploading] = useState(false);
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateClubMutation = useMutation({
    mutationFn: async (updates: { name?: string; logo_url?: string | null }) => {
      const { error } = await supabase
        .from("clubs")
        .update(updates)
        .eq("id", club.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", club.id] });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Le nom du club ne peut pas être vide");
      return;
    }
    await updateClubMutation.mutateAsync({ name: editedName.trim() });
    toast.success("Nom du club mis à jour");
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(club.name);
    setIsEditingName(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${club.id}-${Date.now()}.${fileExt}`;
      const filePath = `${club.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("club-logos")
        .getPublicUrl(filePath);

      await updateClubMutation.mutateAsync({ logo_url: publicUrl });
      toast.success("Logo mis à jour");
      setShowLogoOptions(false);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    await updateClubMutation.mutateAsync({ logo_url: null });
    toast.success("Logo supprimé");
    setShowLogoOptions(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="bg-gradient-card shadow-md hover:shadow-lg transition-all duration-300 group animate-fade-in"
    >
      <CardHeader>
        <CardTitle className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo with edit options */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoOptions(!showLogoOptions);
                }}
              >
                {club.logo_url ? (
                  <img 
                    src={club.logo_url} 
                    alt={`Logo ${club.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground font-semibold text-sm">
                    {getInitials(club.name)}
                  </span>
                )}
                
                {/* Camera icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Logo options dropdown */}
              {showLogoOptions && (
                <div 
                  className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg p-2 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Choisir photo
                  </Button>
                  {club.logo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
                      onClick={handleRemoveLogo}
                      disabled={isUploading}
                    >
                      <ImageMinus className="h-4 w-4" />
                      Supprimer photo
                    </Button>
                  )}
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>

            {/* Name with edit mode */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSaveName}
                    disabled={updateClubMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span 
                    className="text-foreground group-hover:text-primary transition-colors cursor-pointer truncate"
                    onClick={() => navigate(`/clubs/${club.id}`)}
                  >
                    {club.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Êtes-vous sûr de vouloir supprimer ${club.name} ?`)) {
                onDelete(club.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="cursor-pointer"
        onClick={() => navigate(`/clubs/${club.id}`)}
      >
        <p className="text-sm text-muted-foreground">
          Créé le {new Date(club.created_at).toLocaleDateString("fr-FR")}
        </p>
      </CardContent>

      {/* Click outside to close logo options */}
      {showLogoOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowLogoOptions(false)}
        />
      )}
    </Card>
  );
}