import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import { getCoverTypeLabel, getCoreTypeLabel, BOWLING_BALL_BRANDS, COVER_TYPES, CORE_TYPES } from "@/lib/constants/bowlingBallBrands";
import { toast } from "sonner";

export function BowlingArsenalCatalogTab() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [coverFilter, setCoverFilter] = useState<string>("all");
  const [coreFilter, setCoreFilter] = useState<string>("all");
  const [uploadingBallId, setUploadingBallId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: balls, isLoading } = useQuery({
    queryKey: ["bowling_ball_catalog_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_ball_catalog" as any)
        .select("*")
        .order("brand")
        .order("model");
      if (error) throw error;
      return data as any[];
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ ballId, file }: { ballId: string; file: File }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `balls/${ballId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("bowling-ball-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("bowling-ball-images")
        .getPublicUrl(filePath);

      const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("bowling_ball_catalog" as any)
        .update({ image_url: imageUrl } as any)
        .eq("id", ballId);
      if (updateError) throw updateError;

      return imageUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_ball_catalog_full"] });
      toast.success("Photo enregistrée");
      setUploadingBallId(null);
    },
    onError: (err: any) => {
      toast.error("Erreur lors de l'upload : " + err.message);
      setUploadingBallId(null);
    },
  });

  const handleFileSelect = (ballId: string) => {
    setUploadingBallId(ballId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingBallId) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 5 Mo)");
        setUploadingBallId(null);
        return;
      }
      updateImageMutation.mutate({ ballId: uploadingBallId, file });
    }
    e.target.value = "";
  };

  const removeImageMutation = useMutation({
    mutationFn: async (ballId: string) => {
      const { error } = await supabase
        .from("bowling_ball_catalog" as any)
        .update({ image_url: null } as any)
        .eq("id", ballId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_ball_catalog_full"] });
      toast.success("Photo supprimée");
    },
  });

  const filtered = useMemo(() => {
    if (!balls) return [];
    return balls.filter((b: any) => {
      if (brandFilter !== "all" && b.brand !== brandFilter) return false;
      if (coverFilter !== "all" && b.cover_type !== coverFilter) return false;
      if (coreFilter !== "all" && b.core_type !== coreFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.brand.toLowerCase().includes(q) || b.model.toLowerCase().includes(q);
      }
      return true;
    });
  }, [balls, search, brandFilter, coverFilter, coreFilter]);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Rechercher une boule..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Marque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes marques</SelectItem>
            {BOWLING_BALL_BRANDS.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={coverFilter} onValueChange={setCoverFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Coque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes coques</SelectItem>
            {COVER_TYPES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={coreFilter} onValueChange={setCoreFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Noyau" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous noyaux</SelectItem>
            {CORE_TYPES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} boule{filtered.length !== 1 ? "s" : ""} trouvée{filtered.length !== 1 ? "s" : ""}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucune boule trouvée</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ball: any) => (
            <Card key={ball.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Image area */}
              <div className="relative aspect-square bg-muted/30 flex items-center justify-center">
                {ball.image_url ? (
                  <>
                    <img
                      src={ball.image_url}
                      alt={`${ball.brand} ${ball.model}`}
                      className="w-full h-full object-contain p-2"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => removeImageMutation.mutate(ball.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-xs">Pas de photo</span>
                  </div>
                )}
                {updateImageMutation.isPending && uploadingBallId === ball.id && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{ball.brand}</p>
                    <p className="text-sm text-muted-foreground">{ball.model}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleFileSelect(ball.id)}
                    disabled={updateImageMutation.isPending}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Photo
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">{getCoverTypeLabel(ball.cover_type)}</Badge>
                  <Badge variant="outline" className="text-xs">{getCoreTypeLabel(ball.core_type)}</Badge>
                </div>

                {(ball.rg || ball.differential) && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {ball.rg && <span>RG: {ball.rg}</span>}
                    {ball.differential && <span>Diff: {ball.differential}</span>}
                    {ball.intermediate_diff && <span>Int: {ball.intermediate_diff}</span>}
                  </div>
                )}

                {ball.factory_surface && (
                  <p className="text-xs text-muted-foreground">Surface: {ball.factory_surface}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
