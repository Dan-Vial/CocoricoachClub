import { useState } from "react";
import { resolveBallCatalogImages } from "@/lib/bowling/bowlingBallImageResolver";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CircleDot, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { getCoverTypeLabel, getCoreTypeLabel, BALL_WEIGHTS, COVER_TYPES } from "@/lib/constants/bowlingBallBrands";
import { format } from "date-fns";
import { BowlingBallCatalogBrowser } from "./BowlingBallCatalogBrowser";

interface PlayerBowlingArsenalProps {
  playerId: string;
  categoryId: string;
  isViewer?: boolean;
}

// Drilling layout: drilling_angle x pin_pap_distance x val_angle

export function PlayerBowlingArsenal({ playerId, categoryId, isViewer }: PlayerBowlingArsenalProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [editingBall, setEditingBall] = useState<any>(null);
  const [selectedCatalogBall, setSelectedCatalogBall] = useState<any>(null);
  const [weight, setWeight] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currentSurface, setCurrentSurface] = useState("");
  const [gamesPlayed, setGamesPlayed] = useState("0");
  const [customName, setCustomName] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customRg, setCustomRg] = useState("");
  const [customDifferential, setCustomDifferential] = useState("");
  const [customIntermediateDiff, setCustomIntermediateDiff] = useState("");
  const [drillingAngle, setDrillingAngle] = useState("");
  const [pinPapDistance, setPinPapDistance] = useState("");
  const [valAngle, setValAngle] = useState("");
  const queryClient = useQueryClient();

  const { data: arsenal, isLoading } = useQuery({
    queryKey: ["bowling_arsenal", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_ball_catalog" as any)
        .select("*");
      if (error) throw error;
      const catalogBalls = data as any[];
      const catalogMap = new Map(catalogBalls.map((b: any) => [b.id, b]));

      // Resolve images from storage for balls without image_url
      const imageMap = await resolveBallCatalogImages(catalogBalls);

      const { data: arsenalData, error: arsenalError } = await supabase
        .from("player_bowling_arsenal" as any)
        .select("*")
        .eq("player_id", playerId)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (arsenalError) throw arsenalError;

      return (arsenalData as any[]).map((item: any) => {
        const cat = item.ball_catalog_id ? catalogMap.get(item.ball_catalog_id) : null;
        const resolvedImageUrl = item.ball_catalog_id ? imageMap.get(item.ball_catalog_id) || null : null;
        return {
          ...item,
          catalogBall: cat ? { ...cat, image_url: cat.image_url || resolvedImageUrl } : null,
          resolvedImageUrl,
        };
      });
    },
  });

  const addBall = useMutation({
    mutationFn: async () => {
      const insertData: any = {
        player_id: playerId,
        category_id: categoryId,
        weight_lbs: weight ? parseInt(weight) : null,
        purchase_date: purchaseDate || null,
        current_surface: currentSurface || null,
        games_played: parseInt(gamesPlayed) || 0,
        custom_rg: customRg ? parseFloat(customRg) : null,
        custom_differential: customDifferential ? parseFloat(customDifferential) : null,
        custom_intermediate_diff: customIntermediateDiff ? parseFloat(customIntermediateDiff) : null,
        drilling_layout: (drillingAngle || pinPapDistance || valAngle)
          ? `${drillingAngle || "?"}x${pinPapDistance || "?"}x${valAngle || "?"}`
          : null,
      };

      if (selectedCatalogBall) {
        insertData.ball_catalog_id = selectedCatalogBall.id;
      } else {
        insertData.custom_ball_name = customName;
        insertData.custom_ball_brand = customBrand;
      }

      const { error } = await supabase.from("player_bowling_arsenal" as any).insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_arsenal", playerId] });
      toast.success("Boule ajoutée à l'arsenal");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateBall = useMutation({
    mutationFn: async () => {
      if (!editingBall) return;
      const updateData: any = {
        weight_lbs: weight ? parseInt(weight) : null,
        purchase_date: purchaseDate || null,
        current_surface: currentSurface || null,
        games_played: parseInt(gamesPlayed) || 0,
        custom_rg: customRg ? parseFloat(customRg) : null,
        custom_differential: customDifferential ? parseFloat(customDifferential) : null,
        custom_intermediate_diff: customIntermediateDiff ? parseFloat(customIntermediateDiff) : null,
        drilling_layout: (drillingAngle || pinPapDistance || valAngle)
          ? `${drillingAngle || "?"}x${pinPapDistance || "?"}x${valAngle || "?"}`
          : null,
      };
      const { error } = await supabase
        .from("player_bowling_arsenal" as any)
        .update(updateData)
        .eq("id", editingBall.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_arsenal", playerId] });
      toast.success("Boule mise à jour");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const removeBall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_bowling_arsenal" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bowling_arsenal", playerId] });
      toast.success("Boule retirée");
    },
  });

  const clearFormFields = () => {
    setEditingBall(null);
    setSelectedCatalogBall(null);
    setWeight("");
    setPurchaseDate("");
    setCurrentSurface("");
    setGamesPlayed("0");
    setCustomName("");
    setCustomBrand("");
    setCustomRg("");
    setCustomDifferential("");
    setCustomIntermediateDiff("");
    setDrillingAngle("");
    setPinPapDistance("");
    setValAngle("");
  };

  const resetForm = () => {
    setIsAddOpen(false);
    clearFormFields();
  };

  const handleSelectFromCatalog = (ball: any) => {
    setSelectedCatalogBall(ball);
    setCurrentSurface(ball.factory_surface || "");
    if (ball.rg) setCustomRg(ball.rg.toString());
    if (ball.differential) setCustomDifferential(ball.differential.toString());
    if (ball.intermediate_diff) setCustomIntermediateDiff(ball.intermediate_diff.toString());
    setIsCatalogOpen(false);
  };

  const handleEditBall = (item: any) => {
    setEditingBall(item);
    setSelectedCatalogBall(item.catalogBall || null);
    setWeight(item.weight_lbs?.toString() || "");
    setPurchaseDate(item.purchase_date || "");
    setCurrentSurface(item.current_surface || "");
    setGamesPlayed(item.games_played?.toString() || "0");
    setCustomName(item.custom_ball_name || "");
    setCustomBrand(item.custom_ball_brand || "");
    setCustomRg(item.custom_rg?.toString() || "");
    setCustomDifferential(item.custom_differential?.toString() || "");
    setCustomIntermediateDiff(item.custom_intermediate_diff?.toString() || "");
    // Parse drilling_layout "XXxXXxXX"
    const layout = item.drilling_layout || item.balance_type || "";
    const parts = layout.split("x");
    setDrillingAngle(parts[0] && parts[0] !== "?" ? parts[0] : "");
    setPinPapDistance(parts[1] && parts[1] !== "?" ? parts[1] : "");
    setValAngle(parts[2] && parts[2] !== "?" ? parts[2] : "");
    setIsAddOpen(true);
  };

  const getBallDisplayName = (item: any) => {
    if (item.catalogBall) {
      return `${item.catalogBall.brand} ${item.catalogBall.model}`;
    }
    return `${item.custom_ball_brand || ""} ${item.custom_ball_name || "Custom"}`.trim();
  };

  const getCoreType = (item: any) => {
    return item.catalogBall?.core_type || null;
  };

  const isFormValid = editingBall || selectedCatalogBall || customName;

  const formContent = (
    <div className="space-y-4">
      {/* Ball selection - only for new balls */}
      {!editingBall && (
        <>
          {selectedCatalogBall ? (
            <div className="p-3 border rounded-lg bg-accent/10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
                  {(selectedCatalogBall.resolved_image_url || selectedCatalogBall.image_url) ? (
                    <img src={selectedCatalogBall.resolved_image_url || selectedCatalogBall.image_url} alt={`${selectedCatalogBall.brand} ${selectedCatalogBall.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <CircleDot className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedCatalogBall.brand} {selectedCatalogBall.model}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-xs">{getCoverTypeLabel(selectedCatalogBall.cover_type)}</Badge>
                    <Badge variant="secondary" className="text-xs">{getCoreTypeLabel(selectedCatalogBall.core_type)}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCatalogBall(null)}>
                  Changer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => setIsCatalogOpen(true)}>
                🎳 Choisir dans le catalogue
              </Button>
              <p className="text-xs text-center text-muted-foreground">ou saisir manuellement</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Marque</Label>
                  <Input value={customBrand} onChange={e => setCustomBrand(e.target.value)} placeholder="Storm..." />
                </div>
                <div>
                  <Label className="text-xs">Modèle</Label>
                  <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="DNA..." />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {editingBall && (
        <div className="p-3 border rounded-lg bg-accent/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
              {(editingBall.catalogBall?.image_url || editingBall.resolvedImageUrl) ? (
                <img src={editingBall.catalogBall?.image_url || editingBall.resolvedImageUrl} alt={getBallDisplayName(editingBall)} className="h-full w-full object-cover" />
              ) : (
                <CircleDot className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="font-semibold">{getBallDisplayName(editingBall)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Poids</Label>
          <Select value={weight} onValueChange={setWeight}>
            <SelectTrigger><SelectValue placeholder="lbs" /></SelectTrigger>
            <SelectContent>
              {BALL_WEIGHTS.map(w => (
                <SelectItem key={w} value={w.toString()}>{w} lbs</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Surface actuelle</Label>
          <Input value={currentSurface} onChange={e => setCurrentSurface(e.target.value)} placeholder="1500 Grit..." />
        </div>
      </div>

      <div>
        <Label className="text-xs">Layout de perçage</Label>
        <div className="flex items-center gap-1.5 mt-1">
          <Input
            value={drillingAngle}
            onChange={e => setDrillingAngle(e.target.value)}
            placeholder="50"
            className="w-16 text-center text-sm"
          />
          <span className="text-xs font-medium text-muted-foreground">×</span>
          <Input
            value={pinPapDistance}
            onChange={e => setPinPapDistance(e.target.value)}
            placeholder={'4"½'}
            className="w-16 text-center text-sm"
          />
          <span className="text-xs font-medium text-muted-foreground">×</span>
          <Input
            value={valAngle}
            onChange={e => setValAngle(e.target.value)}
            placeholder="40"
            className="w-16 text-center text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Angle perçage × Pin-PAP × Angle VAL</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">RG</Label>
          <Input type="number" step="0.001" value={customRg} onChange={e => setCustomRg(e.target.value)} placeholder="2.540" />
        </div>
        <div>
          <Label className="text-xs">Différentiel</Label>
          <Input type="number" step="0.001" value={customDifferential} onChange={e => setCustomDifferential(e.target.value)} placeholder="0.050" />
        </div>
        <div>
          <Label className="text-xs">Diff. Int.</Label>
          <Input type="number" step="0.001" value={customIntermediateDiff} onChange={e => setCustomIntermediateDiff(e.target.value)} placeholder="0.012" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Date d'achat</Label>
          <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Parties jouées</Label>
          <Input type="number" value={gamesPlayed} onChange={e => setGamesPlayed(e.target.value)} min="0" />
        </div>
      </div>


      <Button
        className="w-full"
        onClick={() => editingBall ? updateBall.mutate() : addBall.mutate()}
        disabled={(editingBall ? updateBall.isPending : addBall.isPending) || !isFormValid}
      >
        {editingBall
          ? (updateBall.isPending ? "Mise à jour..." : "Enregistrer les modifications")
          : (addBall.isPending ? "Ajout..." : "Ajouter à mon arsenal")}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CircleDot className="h-5 w-5" />
            Mon Arsenal
          </CardTitle>
          {!isViewer && (
            <Button size="sm" onClick={() => { console.log("[Arsenal] Ajouter clicked"); clearFormFields(); setIsAddOpen(true); }} className="gap-1 cursor-pointer">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : !arsenal || arsenal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune boule dans l'arsenal. Ajoutez votre première boule !
          </p>
        ) : (
          <div className="space-y-3">
            {arsenal.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                {/* Ball image */}
                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
                  {item.catalogBall?.image_url ? (
                    <img src={item.catalogBall.image_url} alt={getBallDisplayName(item)} className="h-full w-full object-cover" />
                  ) : (
                    <CircleDot className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{getBallDisplayName(item)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.weight_lbs && (
                      <Badge variant="outline" className="text-xs">{item.weight_lbs} lbs</Badge>
                    )}
                    {item.catalogBall && (
                      <>
                        <Badge variant="secondary" className="text-xs">{getCoverTypeLabel(item.catalogBall.cover_type)}</Badge>
                        <Badge variant="secondary" className="text-xs">{getCoreTypeLabel(item.catalogBall.core_type)}</Badge>
                      </>
                    )}
                    {(item.drilling_layout || item.balance_type) && (
                      <Badge variant="outline" className="text-xs">
                        🎯 {item.drilling_layout || item.balance_type}
                      </Badge>
                    )}
                    {item.current_surface && (
                      <Badge variant="outline" className="text-xs">Surface: {item.current_surface}</Badge>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {item.custom_rg && <span>RG: {item.custom_rg}</span>}
                    {item.custom_differential && <span>Diff: {item.custom_differential}</span>}
                    {item.custom_intermediate_diff && <span>Int: {item.custom_intermediate_diff}</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    {item.games_played > 0 && <span>{item.games_played} parties</span>}
                    {item.purchase_date && <span>Achat: {format(new Date(item.purchase_date), "dd/MM/yyyy")}</span>}
                  </div>
                </div>
                {!isViewer && (
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditBall(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeBall.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit ball dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsAddOpen(true); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBall ? "Modifier la boule" : "Ajouter une boule"}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Catalog browser dialog */}
      <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catalogue de boules</DialogTitle>
          </DialogHeader>
          <BowlingBallCatalogBrowser onSelect={handleSelectFromCatalog} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
