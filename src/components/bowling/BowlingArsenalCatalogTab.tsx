import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Upload, Image as ImageIcon, Loader2, X, Plus, Users, CircleDot, Check } from "lucide-react";
import { getCoverTypeLabel, getCoreTypeLabel, BOWLING_BALL_BRANDS, COVER_TYPES, CORE_TYPES, BALL_WEIGHTS } from "@/lib/constants/bowlingBallBrands";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveBallCatalogImages } from "@/lib/bowling/bowlingBallImageResolver";
import { format } from "date-fns";

interface BowlingArsenalCatalogTabProps {
  categoryId: string;
}

export function BowlingArsenalCatalogTab({ categoryId }: BowlingArsenalCatalogTabProps) {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [coverFilter, setCoverFilter] = useState<string>("all");
  const [coreFilter, setCoreFilter] = useState<string>("all");
  const [uploadingBallId, setUploadingBallId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Add ball dialog state
  const [addBallOpen, setAddBallOpen] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newCoverType, setNewCoverType] = useState("");
  const [newCoreType, setNewCoreType] = useState("");
  const [newRg, setNewRg] = useState("");
  const [newDifferential, setNewDifferential] = useState("");
  const [newFactorySurface, setNewFactorySurface] = useState("");
  const [newBallImageFile, setNewBallImageFile] = useState<File | null>(null);
  const addBallImageRef = useRef<HTMLInputElement>(null);

  // Arsenal assignment dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedBallIds, setSelectedBallIds] = useState<string[]>([]);
  const [assignWeight, setAssignWeight] = useState("");
  const [arsenalSearch, setArsenalSearch] = useState("");
  const [arsenalBrandFilter, setArsenalBrandFilter] = useState<string>("all");

  // Player arsenal view state
  const [selectedViewPlayerId, setSelectedViewPlayerId] = useState<string | null>(null);
  // Fetch players for the category
  const { data: players = [] } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: balls, isLoading } = useQuery({
    queryKey: ["bowling_ball_catalog_full"],
    queryFn: async () => {
      const [{ data, error }, { data: storageFiles, error: storageError }] = await Promise.all([
        supabase
          .from("bowling_ball_catalog" as any)
          .select("*")
          .order("brand")
          .order("model"),
        supabase.storage
          .from("bowling-ball-images")
          .list("balls", { limit: 500, sortBy: { column: "name", order: "asc" } }),
      ]);

      if (error) throw error;
      if (storageError) {
        return (data as any[]).map((ball: any) => ({
          ...ball,
          resolved_image_url: ball.image_url,
          image_version: ball.updated_at || ball.created_at || ball.id,
        }));
      }

      const latestFileByBallId = new Map<string, { path: string; updatedAt: string }>();
      for (const file of storageFiles || []) {
        const ballId = file.name.replace(/\.[^.]+$/, "");
        const updatedAt = file.updated_at || file.created_at || "";
        const existing = latestFileByBallId.get(ballId);
        if (!existing || updatedAt > existing.updatedAt) {
          latestFileByBallId.set(ballId, { path: `balls/${file.name}`, updatedAt });
        }
      }

      return (data as any[]).map((ball: any) => {
        const fallbackFile = latestFileByBallId.get(ball.id);
        const fallbackUrl = fallbackFile
          ? supabase.storage.from("bowling-ball-images").getPublicUrl(fallbackFile.path).data.publicUrl
          : null;
        return {
          ...ball,
          resolved_image_url: ball.image_url || fallbackUrl,
          image_version: fallbackFile?.updatedAt || ball.updated_at || ball.created_at || ball.id,
        };
      });
    },
  });

  // --- Mutations ---

  const addBallMutation = useMutation({
    mutationFn: async () => {
      if (!newBrand || !newModel) throw new Error("Marque et modèle requis");

      const { data, error } = await supabase
        .from("bowling_ball_catalog" as any)
        .insert({
          brand: newBrand,
          model: newModel,
          cover_type: newCoverType || "reactive",
          core_type: newCoreType || "symmetric",
          rg: newRg ? parseFloat(newRg) : null,
          differential: newDifferential ? parseFloat(newDifferential) : null,
          factory_surface: newFactorySurface || null,
          is_system: false,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Upload image if provided
      if (newBallImageFile && data) {
        const ballId = (data as any).id;
        const ext = newBallImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `balls/${ballId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("bowling-ball-images")
          .upload(filePath, newBallImageFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("bowling-ball-images")
          .getPublicUrl(filePath);

        await supabase
          .from("bowling_ball_catalog" as any)
          .update({ image_url: urlData.publicUrl } as any)
          .eq("id", ballId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_ball_catalog_full"] });
      toast.success("Boule ajoutée au catalogue");
      resetAddBallForm();
      setAddBallOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'ajout"),
  });

  const assignBallsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayerId || selectedBallIds.length === 0) throw new Error("Sélectionnez un joueur et au moins une boule");

      const inserts = selectedBallIds.map((ballId) => ({
        player_id: selectedPlayerId,
        category_id: categoryId,
        ball_catalog_id: ballId,
        weight_lbs: assignWeight ? parseInt(assignWeight) : null,
        games_played: 0,
      }));

      const { error } = await supabase.from("player_bowling_arsenal" as any).insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_arsenal"] });
      toast.success(`${selectedBallIds.length} boule(s) ajoutée(s) à l'arsenal`);
      resetAssignForm();
      setAssignOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'assignation"),
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ ballId, file }: { ballId: string; file: File }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `balls/${ballId}.${ext}`;

      const { data: existingFiles } = await supabase.storage
        .from("bowling-ball-images")
        .list("balls", { limit: 500, sortBy: { column: "name", order: "asc" } });

      const oldPaths = (existingFiles || [])
        .filter((existingFile) => existingFile.name.startsWith(`${ballId}.`) && `balls/${existingFile.name}` !== filePath)
        .map((existingFile) => `balls/${existingFile.name}`);

      if (oldPaths.length > 0) {
        await supabase.storage.from("bowling-ball-images").remove(oldPaths);
      }

      const { error: uploadError } = await supabase.storage
        .from("bowling-ball-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("bowling-ball-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("bowling_ball_catalog" as any)
        .update({ image_url: urlData.publicUrl } as any)
        .eq("id", ballId);
      if (updateError) throw updateError;

      return urlData.publicUrl;
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

  const removeImageMutation = useMutation({
    mutationFn: async (ballId: string) => {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from("bowling-ball-images")
        .list("balls", { limit: 500, sortBy: { column: "name", order: "asc" } });
      if (listError) throw listError;

      const pathsToRemove = (existingFiles || [])
        .filter((file) => file.name.startsWith(`${ballId}.`))
        .map((file) => `balls/${file.name}`);

      if (pathsToRemove.length > 0) {
        await supabase.storage.from("bowling-ball-images").remove(pathsToRemove);
      }

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

  // --- Helpers ---

  const resetAddBallForm = () => {
    setNewBrand("");
    setNewModel("");
    setNewCoverType("");
    setNewCoreType("");
    setNewRg("");
    setNewDifferential("");
    setNewFactorySurface("");
    setNewBallImageFile(null);
  };

  const resetAssignForm = () => {
    setSelectedPlayerId("");
    setSelectedBallIds([]);
    setAssignWeight("");
    setArsenalSearch("");
  };

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

  const toggleBallSelection = (ballId: string) => {
    setSelectedBallIds((prev) =>
      prev.includes(ballId) ? prev.filter((id) => id !== ballId) : [...prev, ballId]
    );
  };

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

  const arsenalFiltered = useMemo(() => {
    if (!balls) return [];
    if (!arsenalSearch) return balls;
    const q = arsenalSearch.toLowerCase();
    return balls.filter((b: any) => b.brand.toLowerCase().includes(q) || b.model.toLowerCase().includes(q));
  }, [balls, arsenalSearch]);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAddBallOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une boule
        </Button>
        <Button onClick={() => setAssignOpen(true)} variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Créer un arsenal pour un joueur
        </Button>
      </div>

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
              <div className="relative aspect-square bg-muted/30 flex items-center justify-center">
                {ball.resolved_image_url ? (
                  <>
                    <img
                      src={`${ball.resolved_image_url}?t=${encodeURIComponent(ball.image_version || ball.id)}`}
                      alt={`${ball.brand} ${ball.model}`}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

      {/* ===== ADD BALL DIALOG ===== */}
      <Dialog open={addBallOpen} onOpenChange={setAddBallOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5" />
              Ajouter une boule au catalogue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Marque *</Label>
              <Select value={newBrand} onValueChange={setNewBrand}>
                <SelectTrigger><SelectValue placeholder="Choisir une marque" /></SelectTrigger>
                <SelectContent>
                  {BOWLING_BALL_BRANDS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modèle *</Label>
              <Input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Ex: Hyroad Pearl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coque</Label>
                <Select value={newCoverType} onValueChange={setNewCoverType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {COVER_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Noyau</Label>
                <Select value={newCoreType} onValueChange={setNewCoreType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {CORE_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>RG</Label>
                <Input type="number" step="0.01" value={newRg} onChange={e => setNewRg(e.target.value)} placeholder="2.50" />
              </div>
              <div>
                <Label>Différentiel</Label>
                <Input type="number" step="0.001" value={newDifferential} onChange={e => setNewDifferential(e.target.value)} placeholder="0.050" />
              </div>
            </div>
            <div>
              <Label>Surface d'usine</Label>
              <Input value={newFactorySurface} onChange={e => setNewFactorySurface(e.target.value)} placeholder="Ex: 500/1000 Grit" />
            </div>
            <div>
              <Label>Photo</Label>
              <input
                ref={addBallImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Fichier trop volumineux (max 5 Mo)");
                      return;
                    }
                    setNewBallImageFile(file);
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => addBallImageRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {newBallImageFile ? "Changer" : "Choisir une image"}
                </Button>
                {newBallImageFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">{newBallImageFile.name}</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetAddBallForm(); setAddBallOpen(false); }}>Annuler</Button>
            <Button
              onClick={() => addBallMutation.mutate()}
              disabled={!newBrand || !newModel || addBallMutation.isPending}
            >
              {addBallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGN ARSENAL DIALOG ===== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Créer un arsenal pour un joueur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Joueur *</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un joueur" /></SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.first_name, p.name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Poids par défaut (lbs)</Label>
              <Select value={assignWeight} onValueChange={setAssignWeight}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {BALL_WEIGHTS.map(w => (
                    <SelectItem key={w} value={w.toString()}>{w} lbs</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sélectionner les boules ({selectedBallIds.length} sélectionnée{selectedBallIds.length !== 1 ? "s" : ""})</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Filtrer les boules..." value={arsenalSearch} onChange={e => setArsenalSearch(e.target.value)} />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
              {arsenalFiltered.map((ball: any) => {
                const isSelected = selectedBallIds.includes(ball.id);
                return (
                  <div
                    key={ball.id}
                    className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => toggleBallSelection(ball.id)}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    {ball.resolved_image_url ? (
                      <img
                        src={`${ball.resolved_image_url}?t=${encodeURIComponent(ball.image_version || ball.id)}`}
                        alt={ball.model}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <CircleDot className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ball.brand} {ball.model}</p>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-[10px] h-4">{getCoverTypeLabel(ball.cover_type)}</Badge>
                        <Badge variant="outline" className="text-[10px] h-4">{getCoreTypeLabel(ball.core_type)}</Badge>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetAssignForm(); setAssignOpen(false); }}>Annuler</Button>
            <Button
              onClick={() => assignBallsMutation.mutate()}
              disabled={!selectedPlayerId || selectedBallIds.length === 0 || assignBallsMutation.isPending}
            >
              {assignBallsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Ajouter {selectedBallIds.length} boule{selectedBallIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
