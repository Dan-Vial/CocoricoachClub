import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User } from "lucide-react";
import { toast } from "sonner";

interface PlayerAvatarUploadProps {
  playerId: string;
  playerName: string;
  currentAvatarUrl?: string | null;
}

export function PlayerAvatarUpload({
  playerId,
  playerName,
  currentAvatarUrl,
}: PlayerAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${playerId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("player-avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("player-avatars").getPublicUrl(fileName);

      // Update player record
      const { error: updateError } = await supabase
        .from("players")
        .update({ avatar_url: publicUrl })
        .eq("id", playerId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", playerId] });
      toast.success("Photo mise à jour");
      setUploading(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2MB");
      return;
    }

    uploadAvatar.mutate(file);
  };

  const getInitials = () => {
    return playerName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32">
        <AvatarImage src={currentAvatarUrl || undefined} alt={playerName} />
        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      <div>
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <label htmlFor="avatar-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            asChild
          >
            <span className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Upload..." : "Changer la photo"}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}
