import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, MapPin, Activity, Zap, Timer, TrendingUp, Target, BookTemplate } from "lucide-react";
import { GpsImportDialog } from "./GpsImportDialog";
import { GpsSessionsList } from "./GpsSessionsList";
import { GpsAnalyticsDashboard } from "./GpsAnalyticsDashboard";
import { GpsObjectivesDashboard } from "./GpsObjectivesDashboard";
import { GpsTemplatesManager } from "./GpsTemplatesManager";
import { WeeklyGpsRecommendations } from "./WeeklyGpsRecommendations";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { BarChart3 as AnalyticsIcon, Activity as SessionsIcon } from "lucide-react";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface GpsDataTabProps {
  categoryId: string;
}

export function GpsDataTab({ categoryId }: GpsDataTabProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { isViewer } = useViewerModeContext();

  const { data: gpsSessions, isLoading, refetch } = useQuery({
    queryKey: ['gps-sessions', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gps_sessions')
        .select(`
          *,
          players (
            id,
            name,
            position
          )
        `)
        .eq('category_id', categoryId)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: players } = useQuery({
    queryKey: ['players-for-gps', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, position')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: categoryData } = useQuery({
    queryKey: ['category-sport-type-gps-tab', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('rugby_type')
        .eq('id', categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch sessions with objectives (linked training sessions)
  const { data: sessionsWithObjectives } = useQuery({
    queryKey: ['gps-sessions-with-objectives', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gps_session_objectives')
        .select('training_session_id, position_group')
        .eq('category_id', categoryId);
      if (error) throw error;
      // Get unique training session IDs
      const sessionIds = [...new Set(data?.map(o => o.training_session_id) || [])];
      if (sessionIds.length === 0) return [];
      
      const { data: sessions, error: sessError } = await supabase
        .from('training_sessions')
        .select('id, session_date, training_type')
        .in('id', sessionIds)
        .order('session_date', { ascending: false })
        .limit(5);
      if (sessError) throw sessError;
      return sessions || [];
    },
  });

  const sportType = categoryData?.rugby_type || 'XV';

  // Calculate summary stats
  const summaryStats = gpsSessions ? {
    totalSessions: gpsSessions.length,
    avgDistance: gpsSessions.length > 0 
      ? Math.round(gpsSessions.reduce((acc, s) => acc + (Number(s.total_distance_m) || 0), 0) / gpsSessions.length)
      : 0,
    avgPlayerLoad: gpsSessions.length > 0
      ? Math.round(gpsSessions.reduce((acc, s) => acc + (Number(s.player_load) || 0), 0) / gpsSessions.length * 10) / 10
      : 0,
    maxSpeed: gpsSessions.length > 0
      ? Math.max(...gpsSessions.map(s => Number(s.max_speed_ms) || 0))
      : 0,
  } : null;

  return (
    <div className="space-y-6">
      {/* Header with import button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Data GPS
          </h2>
          <p className="text-sm text-muted-foreground">
            Importez et analysez les données de tracking GPS (Catapult, STATSports)
          </p>
        </div>
        {!isViewer && (
          <Button onClick={() => setImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summaryStats && summaryStats.totalSessions > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryStats.totalSessions}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Distance Moy.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryStats.avgDistance} m</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Player Load Moy.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryStats.avgPlayerLoad}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Vitesse Max
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryStats.maxSpeed.toFixed(1)} m/s</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Recommendations */}
      <WeeklyGpsRecommendations categoryId={categoryId} />

      {/* GPS Objectives Dashboards for recent sessions */}
      {sessionsWithObjectives && sessionsWithObjectives.length > 0 && (
        <div className="space-y-4">
          {sessionsWithObjectives.map(session => (
            <GpsObjectivesDashboard
              key={session.id}
              categoryId={categoryId}
              trainingSessionId={session.id}
              sportType={sportType}
              sessionDate={session.session_date}
            />
          ))}
        </div>
      )}

      {/* Main content tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <div className="flex justify-center">
          <ColoredSubTabsList colorKey="gps" className="inline-flex w-max">
            <ColoredSubTabsTrigger 
              value="sessions" 
              colorKey="gps"
              icon={<SessionsIcon className="h-4 w-4" />}
            >
              Sessions
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="analytics" 
              colorKey="gps"
              icon={<AnalyticsIcon className="h-4 w-4" />}
            >
              Analyse
            </ColoredSubTabsTrigger>
            <ColoredSubTabsTrigger 
              value="objectives" 
              colorKey="gps"
              icon={<Target className="h-4 w-4" />}
            >
              Objectifs & Templates
            </ColoredSubTabsTrigger>
          </ColoredSubTabsList>
        </div>

        <TabsContent value="sessions">
          <GpsSessionsList 
            sessions={gpsSessions || []} 
            isLoading={isLoading} 
            onRefresh={refetch}
            categoryId={categoryId}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <GpsAnalyticsDashboard 
            sessions={gpsSessions || []} 
            categoryId={categoryId}
          />
        </TabsContent>

        <TabsContent value="objectives">
          <GpsTemplatesManager
            categoryId={categoryId}
            sportType={sportType}
          />
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <GpsImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        categoryId={categoryId}
        players={players || []}
        onSuccess={() => {
          refetch();
          setImportDialogOpen(false);
        }}
      />
    </div>
  );
}
