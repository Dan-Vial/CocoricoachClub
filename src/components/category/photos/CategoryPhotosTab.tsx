import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Plus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CategoryPhotosTabProps {
  categoryId: string;
}

export function CategoryPhotosTab({ categoryId }: CategoryPhotosTabProps) {
  const { isViewer } = useViewerModeContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["category-photos", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_photos")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const uploads = Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} dépasse 5 Mo`);
        }
        const ext = file.name.split(".").pop();
        const path = `${categoryId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("category-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("category-photos")
          .getPublicUrl(path);

        const { error: dbError } = await supabase
          .from("category_photos")
          .insert({
            category_id: categoryId,
            uploaded_by: user.id,
            file_url: publicUrl,
          });
        if (dbError) throw dbError;
      });

      await Promise.all(uploads);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-photos", categoryId] });
      toast.success("Photo(s) ajoutée(s)");
      setUploading(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de l'upload");
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: { id: string; file_url: string }) => {
      // Extract storage path from URL
      const urlParts = photo.file_url.split("/category-photos/");
      if (urlParts[1]) {
        await supabase.storage.from("category-photos").remove([urlParts[1]]);
      }
      const { error } = await supabase
        .from("category_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-photos", categoryId] });
      toast.success("Photo supprimée");
      setSelectedPhoto(null);
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploading(true);
      uploadMutation.mutate(e.target.files);
      e.target.value = "";
    }
  };

  const selectedPhotoData = photos?.find((p) => p.id === selectedPhoto);

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Galerie photos
          </CardTitle>
          {!isViewer && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {uploading ? "Upload..." : "Ajouter des photos"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Chargement...</p>
        ) : !photos || photos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucune photo pour cette catégorie</p>
            {!isViewer && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter la première photo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer border border-border hover:border-primary transition-colors"
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.caption || "Photo"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {!isViewer && (
                  <button
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: photo.id, file_url: photo.file_url });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {format(new Date(photo.created_at), "dd MMM yyyy", { locale: fr })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-2">
          {selectedPhotoData && (
            <div className="relative">
              <img
                src={selectedPhotoData.file_url}
                alt={selectedPhotoData.caption || "Photo"}
                className="w-full max-h-[80vh] object-contain rounded"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {format(new Date(selectedPhotoData.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
