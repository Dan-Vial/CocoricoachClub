import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Video,
  Film,
  Calendar,
  MoreVertical,
  Trash2,
  ExternalLink,
  Plus,
  Eye,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { AddClipDialog } from "./AddClipDialog";
import { getVideoTerminology } from "@/lib/constants/videoActionTypes";

interface VideoAnalysis {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_source: string | null;
  created_at: string;
  matches: {
    id: string;
    opponent: string;
    match_date: string;
    is_home: boolean;
    score_home: number | null;
    score_away: number | null;
  } | null;
}

interface VideoAnalysisListProps {
  analyses: VideoAnalysis[];
  onSelectAnalysis: (id: string) => void;
  onEditAnalysis?: (analysis: VideoAnalysis) => void;
  onRefresh: () => void;
  categoryId: string;
  sportType?: string;
}

export function VideoAnalysisList({
  analyses,
  onSelectAnalysis,
  onEditAnalysis,
  onRefresh,
  categoryId,
  sportType,
}: VideoAnalysisListProps) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addClipAnalysisId, setAddClipAnalysisId] = useState<string | null>(null);

  // Fetch clip counts per analysis
  const { data: clipCounts } = useQuery({
    queryKey: ["clip-counts", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_clips")
        .select("video_analysis_id")
        .eq("category_id", categoryId);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((clip) => {
        counts[clip.video_analysis_id] = (counts[clip.video_analysis_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("video_analyses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Analyse supprimée");
      queryClient.invalidateQueries({ queryKey: ["video-analyses"] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const getSourceBadge = (source: string | null) => {
    const colors: Record<string, string> = {
      veo: "bg-purple-500/10 text-purple-500",
      hudl: "bg-orange-500/10 text-orange-500",
      youtube: "bg-red-500/10 text-red-500",
      vimeo: "bg-blue-500/10 text-blue-500",
    };
    return colors[source || ""] || "bg-muted text-muted-foreground";
  };

  if (analyses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune analyse vidéo</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Créez une analyse pour lier vidéos, stats et données GPS d'un match
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedAnalysis = analyses.find((a) => a.id === addClipAnalysisId);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyses.map((analysis) => {
          const match = analysis.matches;
          const clipCount = clipCounts?.[analysis.id] || 0;

          return (
            <Card key={analysis.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-1">
                      {analysis.title}
                    </CardTitle>
                    {match && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(match.match_date), "dd MMM yyyy", { locale: fr })}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {analysis.video_url && (
                        <DropdownMenuItem
                          onClick={() => window.open(analysis.video_url!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ouvrir la vidéo
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(analysis.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Match Info */}
                {match && (
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {match.is_home ? "vs" : "@"} {match.opponent}
                    </span>
                    {(match.score_home !== null || match.score_away !== null) && (
                      <Badge variant="outline">
                        {match.score_home} - {match.score_away}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Badges */}
                <div className="flex items-center gap-2">
                  <Badge className={getSourceBadge(analysis.video_source)}>
                    {analysis.video_source?.toUpperCase() || "N/A"}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    {clipCount} clip{clipCount !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {analysis.video_url && onEditAnalysis && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEditAnalysis(analysis)}
                    >
                      <Scissors className="h-4 w-4 mr-1" />
                      Découper
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAddClipAnalysisId(analysis.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Clip
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectAnalysis(analysis.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette analyse ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les clips associés seront également supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Clip Dialog */}
      {addClipAnalysisId && selectedAnalysis && (
        <AddClipDialog
          open={!!addClipAnalysisId}
          onOpenChange={() => setAddClipAnalysisId(null)}
          analysisId={addClipAnalysisId}
          categoryId={categoryId}
          matchId={selectedAnalysis.matches?.id || ""}
          sportType={sportType}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["clip-counts"] });
            queryClient.invalidateQueries({ queryKey: ["video-clips"] });
            setAddClipAnalysisId(null);
          }}
        />
      )}
    </>
  );
}
