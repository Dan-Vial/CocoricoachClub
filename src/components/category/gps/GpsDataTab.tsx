import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, MapPin, Activity, Zap, Timer, TrendingUp } from "lucide-react";
import { GpsImportDialog } from "./GpsImportDialog";
import { GpsSessionsList } from "./GpsSessionsList";
import { GpsAnalyticsDashboard } from "./GpsAnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GpsDataTabProps {
  categoryId: string;
}

export function GpsDataTab({ categoryId }: GpsDataTabProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
        <Button onClick={() => setImportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importer CSV
        </Button>
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

      {/* Main content tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
        </TabsList>

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
