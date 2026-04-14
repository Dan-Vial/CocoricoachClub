import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Plus, Trash2, ExternalLink, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface FisCalendarSyncProps {
  categoryId: string;
}

export function FisCalendarSync({ categoryId }: FisCalendarSyncProps) {
  const queryClient = useQueryClient();
  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");

  const { data: feeds = [] } = useQuery({
    queryKey: ["fis_calendar_feeds", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fis_calendar_feeds")
        .select("*")
        .eq("category_id", categoryId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addFeed = useMutation({
    mutationFn: async (url: string) => {
      // Parse URL params for metadata
      const urlObj = new URL(url);
      const seasonCode = urlObj.searchParams.get("seasoncode");
      const sectorCode = urlObj.searchParams.get("sectorcode");
      const disciplineCode = urlObj.searchParams.get("disciplinecode");
      const disciplineCodes = disciplineCode ? disciplineCode.split(",") : [];

      const { error } = await supabase.from("fis_calendar_feeds").insert({
        category_id: categoryId,
        feed_url: url,
        season_code: seasonCode,
        sector_code: sectorCode,
        discipline_codes: disciplineCodes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_feeds", categoryId] });
      setFeedUrl("");
      setAddFeedOpen(false);
      toast.success("Flux FIS ajouté");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Ce flux est déjà configuré");
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    },
  });

  const deleteFeed = useMutation({
    mutationFn: async (feedId: string) => {
      const { error } = await supabase.from("fis_calendar_feeds").delete().eq("id", feedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_feeds", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_events", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      toast.success("Flux supprimé");
    },
  });

  const syncFeed = useMutation({
    mutationFn: async (feed: any) => {
      const { data, error } = await supabase.functions.invoke("sync-fis-calendar", {
        body: {
          feed_id: feed.id,
          feed_url: feed.feed_url,
          category_id: categoryId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_feeds", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_events", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches_annual", categoryId] });
      toast.success(
        `Synchronisation terminée : ${data.created} ajoutées, ${data.updated} mises à jour, ${data.deleted} supprimées`
      );
    },
    onError: () => toast.error("Erreur lors de la synchronisation"),
  });

  const syncAllFeeds = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const feed of feeds) {
        const { data, error } = await supabase.functions.invoke("sync-fis-calendar", {
          body: {
            feed_id: feed.id,
            feed_url: feed.feed_url,
            category_id: categoryId,
          },
        });
        if (error) throw error;
        results.push(data);
      }
      return results;
    },
    onSuccess: (results: any[]) => {
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_feeds", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["fis_calendar_events", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["matches_annual", categoryId] });
      const total = results.reduce(
        (acc, r) => ({
          created: acc.created + (r.created || 0),
          updated: acc.updated + (r.updated || 0),
          deleted: acc.deleted + (r.deleted || 0),
        }),
        { created: 0, updated: 0, deleted: 0 }
      );
      toast.success(
        `Sync complète : ${total.created} ajoutées, ${total.updated} mises à jour, ${total.deleted} supprimées`
      );
    },
    onError: () => toast.error("Erreur lors de la synchronisation"),
  });

  const getSectorLabel = (code: string | null) => {
    const map: Record<string, string> = { SB: "Snowboard", AL: "Ski Alpin", CC: "Ski de Fond", FS: "Freestyle", NK: "Nordique" };
    return code ? map[code] || code : "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Flux Calendrier FIS
          </h4>
          {feeds.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {feeds.length} flux
            </Badge>
          )}
        </div>
        <div className="flex gap-1.5">
          {feeds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => syncAllFeeds.mutate()}
              disabled={syncAllFeeds.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${syncAllFeeds.isPending ? "animate-spin" : ""}`} />
              Synchroniser tout
            </Button>
          )}
          <Dialog open={addFeedOpen} onOpenChange={setAddFeedOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
                <Plus className="h-3 w-3" />
                Ajouter un flux
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un flux calendrier FIS</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>URL du flux iCal FIS</Label>
                  <Input
                    placeholder="https://data.fis-ski.com/services/public/icalendar-feed-fis-events.html?..."
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Rendez-vous sur{" "}
                    <a
                      href="https://data.fis-ski.com/services/public/icalendar-feed-fis-events.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline inline-flex items-center gap-0.5"
                    >
                      data.fis-ski.com <ExternalLink className="h-2.5 w-2.5" />
                    </a>{" "}
                    pour configurer et copier l'URL de votre flux.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAddFeedOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addFeed.mutate(feedUrl)}
                    disabled={!feedUrl.includes("fis-ski.com") || addFeed.isPending}
                  >
                    {addFeed.isPending ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Aucun flux configuré. Ajoutez un flux FIS pour importer automatiquement le calendrier des compétitions.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {feeds.map((feed: any) => (
            <div
              key={feed.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-muted/30 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {feed.sector_code && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {getSectorLabel(feed.sector_code)}
                    </Badge>
                  )}
                  {feed.season_code && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      Saison {feed.season_code}
                    </Badge>
                  )}
                  {feed.discipline_codes?.map((d: string) => (
                    <Badge key={d} variant="secondary" className="text-[10px] h-4">
                      {d}
                    </Badge>
                  ))}
                </div>
                {feed.last_synced_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Dernière sync : {format(new Date(feed.last_synced_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => syncFeed.mutate(feed)}
                  disabled={syncFeed.isPending}
                >
                  <RefreshCw className={`h-3 w-3 ${syncFeed.isPending ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Supprimer ce flux et toutes les compétitions associées ?")) {
                      deleteFeed.mutate(feed.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
