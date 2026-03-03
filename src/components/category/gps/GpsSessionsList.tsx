import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2, Calendar, User, MapPin, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Json } from "@/integrations/supabase/types";

interface GpsSession {
  id: string;
  session_date: string;
  session_name: string | null;
  source: string | null;
  total_distance_m: number | null;
  high_speed_distance_m: number | null;
  sprint_distance_m: number | null;
  max_speed_ms: number | null;
  player_load: number | null;
  accelerations: number | null;
  decelerations: number | null;
  sprint_count: number | null;
  duration_minutes: number | null;
  raw_data: Json | null;
  players: {
    id: string;
    name: string;
    first_name: string | null;
    position: string | null;
  } | null;
}

interface GpsSessionsListProps {
  sessions: GpsSession[];
  isLoading: boolean;
  onRefresh: () => void;
  categoryId: string;
}

export function GpsSessionsList({ sessions, isLoading, onRefresh, categoryId }: GpsSessionsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<GpsSession | null>(null);

  const getPlayerFullName = (player: GpsSession['players']) => {
    if (!player) return 'Joueur inconnu';
    return player.first_name ? `${player.first_name} ${player.name}` : player.name;
  };

  const filteredSessions = sessions.filter(session => {
    const playerName = getPlayerFullName(session.players).toLowerCase();
    const sessionName = session.session_name?.toLowerCase() || '';
    const search = searchQuery.toLowerCase();
    
    return playerName.includes(search) || sessionName.includes(search);
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('gps_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Session GPS supprimée");
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteByDate = async (date: string) => {
    const sessionsForDate = sessionsByDate[date];
    if (!sessionsForDate?.length) return;
    
    try {
      const ids = sessionsForDate.map(s => s.id);
      const { error } = await supabase
        .from('gps_sessions')
        .delete()
        .in('id', ids);

      if (error) throw error;
      toast.success(`${ids.length} session(s) GPS supprimée(s)`);
      onRefresh();
    } catch (error) {
      console.error('Delete by date error:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // Parse raw_data to display all imported columns
  const getRawDataEntries = (rawData: Json | null): [string, string][] => {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return [];
    return Object.entries(rawData as Record<string, unknown>)
      .filter(([_, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]);
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'catapult':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Catapult</Badge>;
      case 'statsports':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">STATSports</Badge>;
      default:
        return <Badge variant="outline">Manuel</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Aucune donnée GPS</h3>
          <p className="text-sm text-muted-foreground">
            Importez un fichier CSV pour commencer à tracker les performances GPS
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group sessions by date
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = session.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, GpsSession[]>);

  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sessions GPS
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                  {sessionsByDate[date][0].session_name && (
                    <span className="text-muted-foreground font-normal">
                      - {sessionsByDate[date][0].session_name}
                    </span>
                  )}
                  {getSourceBadge(sessionsByDate[date][0].source)}
                  <Badge variant="secondary" className="text-xs">{sessionsByDate[date].length} joueur(s)</Badge>
                </h4>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Supprimer la séance
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer toute la séance GPS ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cela supprimera les {sessionsByDate[date].length} enregistrement(s) GPS du {format(new Date(date), 'd MMMM yyyy', { locale: fr })}. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteByDate(date)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer tout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joueur</TableHead>
                      <TableHead className="text-right">Distance</TableHead>
                      <TableHead className="text-right">HSR</TableHead>
                      <TableHead className="text-right">Sprint</TableHead>
                      <TableHead className="text-right">V. Max</TableHead>
                      <TableHead className="text-right">Load</TableHead>
                      <TableHead className="text-right">Acc/Dec</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsByDate[date].map(session => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {getPlayerFullName(session.players)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {session.total_distance_m 
                            ? `${Math.round(Number(session.total_distance_m))} m`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {session.high_speed_distance_m
                            ? `${Math.round(Number(session.high_speed_distance_m))} m`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {session.sprint_distance_m
                            ? `${Math.round(Number(session.sprint_distance_m))} m`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {session.max_speed_ms
                            ? `${Number(session.max_speed_ms).toFixed(1)} m/s`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {session.player_load
                            ? Number(session.player_load).toFixed(1)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {session.accelerations || session.decelerations
                            ? `${session.accelerations || 0}/${session.decelerations || 0}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDetailSession(session)}
                              title="Voir toutes les données"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(session.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Detail Dialog for raw_data */}
      <Dialog open={!!detailSession} onOpenChange={(open) => !open && setDetailSession(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {detailSession ? getPlayerFullName(detailSession.players) : 'Joueur inconnu'} - Données complètes
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {detailSession && (
              <div className="space-y-4">
                {/* Main metrics summary */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance totale</p>
                    <p className="font-medium">{detailSession.total_distance_m ? `${Math.round(Number(detailSession.total_distance_m))} m` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vitesse max</p>
                    <p className="font-medium">{detailSession.max_speed_ms ? `${Number(detailSession.max_speed_ms).toFixed(2)} m/s` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">HSR</p>
                    <p className="font-medium">{detailSession.high_speed_distance_m ? `${Math.round(Number(detailSession.high_speed_distance_m))} m` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sprint Distance</p>
                    <p className="font-medium">{detailSession.sprint_distance_m ? `${Math.round(Number(detailSession.sprint_distance_m))} m` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Player Load</p>
                    <p className="font-medium">{detailSession.player_load ? Number(detailSession.player_load).toFixed(1) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Accélérations / Décélérations</p>
                    <p className="font-medium">{detailSession.accelerations || 0} / {detailSession.decelerations || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sprints</p>
                    <p className="font-medium">{detailSession.sprint_count ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Durée</p>
                    <p className="font-medium">{detailSession.duration_minutes ? `${detailSession.duration_minutes} min` : '-'}</p>
                  </div>
                </div>

                {/* All raw CSV columns */}
                <div>
                  <h4 className="font-medium mb-2 text-sm">Toutes les données importées (CSV)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/2">Colonne</TableHead>
                          <TableHead>Valeur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getRawDataEntries(detailSession.raw_data).length > 0 ? (
                          getRawDataEntries(detailSession.raw_data).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell className="font-mono text-xs">{key}</TableCell>
                              <TableCell className="text-sm">{value}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                              Aucune donnée brute disponible
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
