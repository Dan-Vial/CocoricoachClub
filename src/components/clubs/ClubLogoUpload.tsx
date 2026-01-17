import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClubLogoUploadProps {
  clubId: string;
  currentLogoUrl: string | null;
  clubName: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}

export function ClubLogoUpload({ 
  clubId, 
  currentLogoUrl, 
  clubName, 
  size = "md",
  editable = true 
}: ClubLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const updateLogoMutation = useMutation({
    mutationFn: async (logoUrl: string | null) => {
      const { error } = await supabase
        .from("clubs")
        .update({ logo_url: logoUrl })
        .eq("id", clubId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      toast.success("Logo mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du logo");
    }
  });

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
      const fileName = `${clubId}-${Date.now()}.${fileExt}`;
      const filePath = `${clubId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("club-logos")
        .getPublicUrl(filePath);

      // Update club record
      await updateLogoMutation.mutateAsync(publicUrl);
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
    if (!currentLogoUrl) return;
    await updateLogoMutation.mutateAsync(null);
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
    <div className="relative group">
      <div 
        className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-border`}
      >
        {currentLogoUrl ? (
          <img 
            src={currentLogoUrl} 
            alt={`Logo ${clubName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-muted-foreground font-semibold text-sm">
            {getInitials(clubName)}
          </span>
        )}
      </div>

      {editable && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
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
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="h-4 w-4" />
          </Button>
          {currentLogoUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={handleRemoveLogo}
              disabled={isUploading}
            >
              <Trash2 className="h-4 w-4" />
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
  );
}
