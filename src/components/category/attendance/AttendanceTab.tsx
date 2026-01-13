import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Calendar, Users, TrendingUp, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";
import { PostSessionRpeDialog } from "./PostSessionRpeDialog";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface AttendanceTabProps {
  categoryId: string;
}

export function AttendanceTab({ categoryId }: AttendanceTabProps) {
  const { isViewer } = useViewerModeContext();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rpeDialogOpen, setRpeDialogOpen] = useState(false);
  const [presentPlayerIds, setPresentPlayerIds] = useState<string[]>([]);

  // Fetch recent sessions
  const { data: sessions } = useQuery({
    queryKey: ["training_sessions_attendance", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Fetch players
  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, position")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all attendance data for the category
  const { data: attendance } = useQuery({
    queryKey: ["training_attendance", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_attendance")
        .select("*, training_sessions(training_type)")
        .eq("category_id", categoryId)
        .order("attendance_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats per player
  const playerStats = players?.map((player) => {
    const playerAttendance = attendance?.filter((a) => a.player_id === player.id) || [];
    const present = playerAttendance.filter((a) => a.status === "present").length;
    const late = playerAttendance.filter((a) => a.status === "late").length;
    const absent = playerAttendance.filter((a) => a.status === "absent").length;
    const excused = playerAttendance.filter((a) => a.status === "excused").length;
    const total = playerAttendance.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      ...player,
      present,
      late,
      absent,
      excused,
      total,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  // Check if a session has attendance recorded
  const getSessionAttendanceCount = (sessionId: string, sessionDate: string) => {
    return attendance?.filter(
      (a) => a.training_session_id === sessionId || 
            (a.attendance_date === sessionDate && !a.training_session_id)
    ).length || 0;
  };

  const handleOpenAttendance = (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleAttendanceSaved = (playerIds: string[]) => {
    setPresentPlayerIds(playerIds);
    // Open RPE dialog after a small delay to let the attendance dialog close
    setTimeout(() => {
      setRpeDialogOpen(true);
    }, 100);
  };

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      collectif: "Collectif",
      musculation: "Musculation",
      physique: "Prépa physique",
      reathlétisation: "Réathlétisation",
      repos: "Repos",
      technique_individuelle: "Technique",
      test: "Test",
    };
    return labels[type] || type;
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 75) return "text-amber-600";
    return "text-red-600";
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-100 text-green-700">{rate}%</Badge>;
    if (rate >= 75) return <Badge className="bg-amber-100 text-amber-700">{rate}%</Badge>;
    return <Badge className="bg-red-100 text-red-700">{rate}%</Badge>;
  };

  // Calculate overall stats
  const totalSessions = sessions?.length || 0;
  const sessionsWithAttendance = sessions?.filter(
    (s) => getSessionAttendanceCount(s.id, s.session_date) > 0
  ).length || 0;
  const averageRate = playerStats?.length 
    ? Math.round(playerStats.reduce((acc, p) => acc + p.rate, 0) / playerStats.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Séances</p>
                <p className="text-2xl font-bold">{sessionsWithAttendance}/{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joueurs suivis</p>
                <p className="text-2xl font-bold">{players?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux moyen</p>
                <p className={`text-2xl font-bold ${getRateColor(averageRate)}`}>{averageRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Par séance
          </TabsTrigger>
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" />
            Par joueur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Séances récentes
              </CardTitle>
              <CardDescription>
                Cliquez sur une séance pour faire l'appel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sessions || sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune séance programmée
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const attendanceCount = getSessionAttendanceCount(session.id, session.session_date);
                    const hasAttendance = attendanceCount > 0;
                    const isToday = session.session_date === format(new Date(), "yyyy-MM-dd");
                    const isPast = new Date(session.session_date) < new Date();

                    return (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                          isToday ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => !isViewer && handleOpenAttendance(session)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[60px]">
                            <p className="text-sm font-medium">
                              {format(new Date(session.session_date), "dd MMM", { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.session_date), "EEE", { locale: fr })}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{getSessionTypeLabel(session.training_type)}</p>
                              {isToday && <Badge variant="default" className="text-xs">Aujourd'hui</Badge>}
                            </div>
                            {session.session_start_time && (
                              <p className="text-sm text-muted-foreground">
                                {session.session_start_time.slice(0, 5)}
                                {session.session_end_time && ` - ${session.session_end_time.slice(0, 5)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasAttendance ? (
                            <Badge className="bg-green-100 text-green-700">
                              {attendanceCount} présences
                            </Badge>
                          ) : isPast ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Non renseigné
                            </Badge>
                          ) : (
                            <Badge variant="outline">À venir</Badge>
                          )}
                          {!isViewer && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Statistiques par joueur
              </CardTitle>
              <CardDescription>
                Taux de présence basé sur toutes les séances enregistrées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!playerStats || playerStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun joueur dans cette catégorie
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Joueur</TableHead>
                        <TableHead className="text-center">Présent</TableHead>
                        <TableHead className="text-center">Retard</TableHead>
                        <TableHead className="text-center">Excusé</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Taux</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playerStats.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{player.name}</p>
                              {player.position && (
                                <p className="text-xs text-muted-foreground">{player.position}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-medium">
                            {player.present}
                          </TableCell>
                          <TableCell className="text-center text-orange-600 font-medium">
                            {player.late}
                          </TableCell>
                          <TableCell className="text-center text-amber-600 font-medium">
                            {player.excused}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-medium">
                            {player.absent}
                          </TableCell>
                          <TableCell className="text-center">
                            {player.total > 0 ? getRateBadge(player.rate) : "-"}
                          </TableCell>
                          <TableCell>
                            {player.total > 0 && (
                              <Progress 
                                value={player.rate} 
                                className="h-2"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SessionAttendanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={selectedSession}
        categoryId={categoryId}
        onAttendanceSaved={handleAttendanceSaved}
      />

      <PostSessionRpeDialog
        open={rpeDialogOpen}
        onOpenChange={setRpeDialogOpen}
        session={selectedSession}
        categoryId={categoryId}
        presentPlayerIds={presentPlayerIds}
      />
    </div>
  );
}
