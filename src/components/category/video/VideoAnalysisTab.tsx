import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { Video, Plus, Film, Users, BarChart3, Scissors, Tag } from "lucide-react";
import { AddVideoAnalysisDialog } from "./AddVideoAnalysisDialog";
import { VideoAnalysisList } from "./VideoAnalysisList";
import { VideoClipViewer } from "./VideoClipViewer";
import { PlayerClipsView } from "./PlayerClipsView";
import { VideoAnalysisEditor } from "./VideoAnalysisEditor";
import { DirectClipImport } from "./DirectClipImport";

interface VideoAnalysisTabProps {
  categoryId: string;
  sportType?: string;
}

export function VideoAnalysisTab({ categoryId, sportType }: VideoAnalysisTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);
  const [showDirectImport, setShowDirectImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: videoAnalyses, isLoading, refetch } = useQuery({
    queryKey: ["video-analyses", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_analyses")
        .select(`
          *,
          matches(id, opponent, match_date, is_home, score_home, score_away)
        `)
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clipCount } = useQuery({
    queryKey: ["video-clips-count", categoryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("video_clips")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);
      if (error) throw error;
      return count || 0;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videoAnalyses?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Film className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clipCount}</p>
                <p className="text-sm text-muted-foreground">Clips</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Synchronisation</p>
                  <p className="text-xs text-muted-foreground">
                    Vidéo + Stats{sportType?.toLowerCase().includes("aviron") || 
                      sportType?.toLowerCase().includes("football") || 
                      sportType?.toLowerCase().includes("rugby") ? " + GPS" : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowDirectImport(true)}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Importer Clips
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Analyse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Direct Import Mode */}
      {showDirectImport && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Import Direct de Clips
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowDirectImport(false)}>
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DirectClipImport
              categoryId={categoryId}
              sportType={sportType}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["video-clips-count"] });
                queryClient.invalidateQueries({ queryKey: ["video-analyses"] });
                setShowDirectImport(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="analyses" className="space-y-4">
        <div className="flex justify-center">
          <ColoredSubTabsList colorKey="video" className="inline-flex w-max">
            <ColoredSubTabsTrigger 
              value="analyses" 
              colorKey="video"
              icon={<Video className="h-4 w-4" />}
            >
              Analyses Matchs
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="themes" 
              colorKey="video"
              icon={<Tag className="h-4 w-4" />}
            >
              Par Thème
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="clips" 
              colorKey="video"
              icon={<Film className="h-4 w-4" />}
            >
              Tous les Clips
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="players" 
              colorKey="video"
              icon={<Users className="h-4 w-4" />}
            >
              Vue Joueurs
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="analyses">
          {editingAnalysisId ? (
            (() => {
              const analysis = videoAnalyses?.find(a => a.id === editingAnalysisId);
              return analysis ? (
                <VideoAnalysisEditor
                  analysisId={editingAnalysisId}
                  analysisTitle={analysis.title}
                  categoryId={categoryId}
                  matchId={analysis.matches?.id}
                  videoUrl={analysis.video_url}
                  sportType={sportType}
                  onBack={() => setEditingAnalysisId(null)}
                  onClipCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["video-clips"] });
                    queryClient.invalidateQueries({ queryKey: ["video-clips-count"] });
                  }}
                />
              ) : null;
            })()
          ) : !selectedAnalysisId ? (
            <VideoAnalysisList
              analyses={videoAnalyses || []}
              onSelectAnalysis={setSelectedAnalysisId}
              onEditAnalysis={(analysis) => setEditingAnalysisId(analysis.id)}
              onRefresh={refetch}
              categoryId={categoryId}
              sportType={sportType}
            />
          ) : (
            <VideoClipViewer
              analysisId={selectedAnalysisId}
              categoryId={categoryId}
              sportType={sportType}
              onBack={() => setSelectedAnalysisId(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="clips">
          <VideoClipViewer
            categoryId={categoryId}
            sportType={sportType}
            showAllClips
          />
        </TabsContent>

        <TabsContent value="players">
          <PlayerClipsView categoryId={categoryId} sportType={sportType} />
        </TabsContent>
      </Tabs>

      <AddVideoAnalysisDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categoryId={categoryId}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
        }}
      />
    </div>
  );
}
