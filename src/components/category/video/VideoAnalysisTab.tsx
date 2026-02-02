import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Plus, Film, Users, BarChart3 } from "lucide-react";
import { AddVideoAnalysisDialog } from "./AddVideoAnalysisDialog";
import { VideoAnalysisList } from "./VideoAnalysisList";
import { VideoClipViewer } from "./VideoClipViewer";
import { PlayerClipsView } from "./PlayerClipsView";

interface VideoAnalysisTabProps {
  categoryId: string;
}

export function VideoAnalysisTab({ categoryId }: VideoAnalysisTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

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
                  <p className="text-xs text-muted-foreground">Vidéo + Stats + GPS</p>
                </div>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Analyse
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="analyses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyses" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Analyses Matchs
          </TabsTrigger>
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Tous les Clips
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vue Joueurs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses">
          {!selectedAnalysisId ? (
            <VideoAnalysisList
              analyses={videoAnalyses || []}
              onSelectAnalysis={setSelectedAnalysisId}
              onRefresh={refetch}
              categoryId={categoryId}
            />
          ) : (
            <VideoClipViewer
              analysisId={selectedAnalysisId}
              categoryId={categoryId}
              onBack={() => setSelectedAnalysisId(null)}
            />
          )}
        </TabsContent>

        <TabsContent value="clips">
          <VideoClipViewer
            categoryId={categoryId}
            showAllClips
          />
        </TabsContent>

        <TabsContent value="players">
          <PlayerClipsView categoryId={categoryId} />
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
