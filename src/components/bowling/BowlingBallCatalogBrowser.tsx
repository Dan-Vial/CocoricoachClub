import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CircleDot } from "lucide-react";
import { getCoverTypeLabel, getCoreTypeLabel, BOWLING_BALL_BRANDS } from "@/lib/constants/bowlingBallBrands";
import { resolveBallCatalogImages } from "@/lib/bowling/bowlingBallImageResolver";

interface BowlingBallCatalogBrowserProps {
  onSelect: (ball: any) => void;
}

export function BowlingBallCatalogBrowser({ onSelect }: BowlingBallCatalogBrowserProps) {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [coverFilter, setCoverFilter] = useState<string>("all");

  const { data: balls, isLoading } = useQuery({
    queryKey: ["bowling_ball_catalog_with_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bowling_ball_catalog" as any)
        .select("*")
        .order("brand")
        .order("model");
      if (error) throw error;
      const catalogBalls = data as any[];
      const imageMap = await resolveBallCatalogImages(catalogBalls);
      return catalogBalls.map((b: any) => ({
        ...b,
        resolved_image_url: imageMap.get(b.id) || b.image_url || null,
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!balls) return [];
    return balls.filter((b: any) => {
      if (brandFilter !== "all" && b.brand !== brandFilter) return false;
      if (coverFilter !== "all" && b.cover_type !== coverFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return b.brand.toLowerCase().includes(q) || b.model.toLowerCase().includes(q);
      }
      return true;
    });
  }, [balls, search, brandFilter, coverFilter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Marque" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {BOWLING_BALL_BRANDS.map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={coverFilter} onValueChange={setCoverFilter}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Cover" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="pearl">Pearl</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="urethane">Uréthane</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.map((ball: any) => (
            <button
              key={ball.id}
              onClick={() => onSelect(ball)}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Ball image */}
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border">
                  {ball.resolved_image_url ? (
                    <img src={ball.resolved_image_url} alt={`${ball.brand} ${ball.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <CircleDot className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{ball.brand} {ball.model}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-xs">{getCoverTypeLabel(ball.cover_type)}</Badge>
                        <Badge variant="outline" className="text-xs">{getCoreTypeLabel(ball.core_type)}</Badge>
                      </div>
                    </div>
                    {ball.rg && (
                      <div className="text-right text-xs text-muted-foreground">
                        <p>RG: {ball.rg}</p>
                        <p>Diff: {ball.differential}</p>
                        {ball.intermediate_diff && <p>Int: {ball.intermediate_diff}</p>}
                      </div>
                    )}
                  </div>
                  {ball.factory_surface && (
                    <p className="text-xs text-muted-foreground mt-1">Surface: {ball.factory_surface}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune boule trouvée</p>
          )}
        </div>
      )}
    </div>
  );
}
