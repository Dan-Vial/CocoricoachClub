import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Calendar, Users, TrendingUp, ChevronRight, Filter, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";

import { useViewerModeContext } from "@/contexts/ViewerModeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AttendanceTabProps {
  categoryId: string;
}

export function AttendanceTab({ categoryId }: AttendanceTabProps) {
  const { isViewer } = useViewerModeContext();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState(() => {
    const date = subMonths(new Date(), 1);
    return format(date, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return format(date, "yyyy-MM-dd");
  });

  // Fetch recent sessions
  const { data: sessions } = useQuery({
    queryKey: ["training_sessions_attendance", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false })
        .limit(100);
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

  // Filter sessions by date range
  const filteredSessions = sessions?.filter((session) => {
    const sessionDate = parseISO(session.session_date);
    return isWithinInterval(sessionDate, {
      start: parseISO(startDate),
      end: parseISO(endDate),
    });
  });

  // Filter attendance by date range
  const filteredAttendance = attendance?.filter((a) => {
    const attendanceDate = parseISO(a.attendance_date);
    return isWithinInterval(attendanceDate, {
      start: parseISO(startDate),
      end: parseISO(endDate),
    });
  });

  // Calculate stats per player with date filtering
  const playerStats = players?.map((player) => {
    const playerAttendance = filteredAttendance?.filter((a) => a.player_id === player.id) || [];
    const present = playerAttendance.filter((a) => a.status === "present").length;
    const late = playerAttendance.filter((a) => a.status === "late").length;
    const lateJustified = playerAttendance.filter((a) => a.status === "late" && a.late_justified).length;
    const lateUnjustified = late - lateJustified;
    const absent = playerAttendance.filter((a) => a.status === "absent").length;
    const excused = playerAttendance.filter((a) => a.status === "excused").length;
    const total = playerAttendance.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      ...player,
      present,
      late,
      lateJustified,
      lateUnjustified,
      absent,
      excused,
      total,
      rate,
    };
  }).sort((a, b) => b.rate - a.rate);

  // Get detailed attendance counts for a session
  const getSessionAttendanceSummary = (sessionId: string, sessionDate: string) => {
    const sessionAtt = attendance?.filter(
      (a) => a.training_session_id === sessionId || 
            (a.attendance_date === sessionDate && !a.training_session_id)
    ) || [];
    return {
      total: sessionAtt.length,
      present: sessionAtt.filter(a => a.status === "present").length,
      absent: sessionAtt.filter(a => a.status === "absent").length,
      excused: sessionAtt.filter(a => a.status === "excused").length,
      late: sessionAtt.filter(a => a.status === "late").length,
    };
  };

  const handleOpenAttendance = (session: any) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };


  const getSessionLabel = (session: any) => {
    // Simplified display: just show "Séance" with time
    if (session.session_start_time && session.session_end_time) {
      return `Séance ${session.session_start_time.slice(0, 5)} - ${session.session_end_time.slice(0, 5)}`;
    } else if (session.session_start_time) {
      return `Séance ${session.session_start_time.slice(0, 5)}`;
    }
    return "Séance";
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
  const totalFilteredSessions = filteredSessions?.length || 0;
  const sessionsWithAttendance = filteredSessions?.filter(
    (s) => getSessionAttendanceSummary(s.id, s.session_date).total > 0
  ).length || 0;
  const averageRate = playerStats?.length 
    ? Math.round(playerStats.reduce((acc, p) => acc + p.rate, 0) / playerStats.length)
    : 0;
  const totalLate = playerStats?.reduce((acc, p) => acc + p.late, 0) || 0;
  const totalLateJustified = playerStats?.reduce((acc, p) => acc + p.lateJustified, 0) || 0;
  const totalLateUnjustified = totalLate - totalLateJustified;

  const setDatePreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "week":
        setStartDate(format(subMonths(now, 0), "yyyy-MM-dd").replace(/-\d{2}$/, "-" + String(now.getDate() - 7).padStart(2, "0")));
        break;
      case "month":
        setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
        break;
      case "3months":
        setStartDate(format(subMonths(now, 3), "yyyy-MM-dd"));
        break;
      case "season":
        // Assume season starts in September
        const seasonStart = new Date(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, 8, 1);
        setStartDate(format(seasonStart, "yyyy-MM-dd"));
        break;
    }
    setEndDate(format(now, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Période :</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">au</span>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDatePreset("week")}>
                7 jours
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("month")}>
                Ce mois
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("3months")}>
                3 mois
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDatePreset("season")}>
                Saison
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Séances</p>
                <p className="text-2xl font-bold">{sessionsWithAttendance}/{totalFilteredSessions}</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retards</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">{totalLate}</span>
                  <div className="text-xs">
                    <div className="text-green-600">✓ {totalLateJustified}</div>
                    <div className="text-red-600">✗ {totalLateUnjustified}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categorized Sessions */}
      {(() => {
        const today = format(new Date(), "yyyy-MM-dd");
        const todaySessions = filteredSessions?.filter(s => s.session_date === today) || [];
        const pastSessions = filteredSessions?.filter(s => s.session_date < today).sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        ) || [];
        const upcomingSessions = filteredSessions?.filter(s => s.session_date > today).sort((a, b) => 
          new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
        ) || [];

        const renderSessionItem = (session: any) => {
          const summary = getSessionAttendanceSummary(session.id, session.session_date);
          const hasAttendance = summary.total > 0;
          const isToday = session.session_date === today;
          const isPast = session.session_date < today;

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
                  <p className="font-medium">{getSessionLabel(session)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {hasAttendance ? (
                  <>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {summary.present} P
                    </Badge>
                    {summary.late > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        {summary.late} R
                      </Badge>
                    )}
                    {summary.absent > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        {summary.absent} A
                      </Badge>
                    )}
                    {summary.excused > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        {summary.excused} E
                      </Badge>
                    )}
                  </>
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
        };

        return (
          <Tabs defaultValue="today" className="space-y-4">
            <TabsList>
              <TabsTrigger value="today" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Aujourd'hui ({todaySessions.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="h-4 w-4" />
                À venir ({upcomingSessions.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                <Clock className="h-4 w-4" />
                Passées ({pastSessions.length})
              </TabsTrigger>
              <TabsTrigger value="players" className="gap-2">
                <Users className="h-4 w-4" />
                Par joueur
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Séances du jour
                  </CardTitle>
                  <CardDescription>
                    Cliquez sur une séance pour faire l'appel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todaySessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune séance aujourd'hui
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {todaySessions.map(renderSessionItem)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Séances à venir ({upcomingSessions.length})
                  </CardTitle>
                  <CardDescription>
                    Planifiez vos prochaines séances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingSessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune séance à venir sur cette période
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {upcomingSessions.map(renderSessionItem)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="past">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Séances passées ({pastSessions.length})
                  </CardTitle>
                  <CardDescription>
                    Historique des présences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pastSessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune séance passée sur cette période
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pastSessions.map(renderSessionItem)}
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
                    Du {format(parseISO(startDate), "dd/MM/yyyy")} au {format(parseISO(endDate), "dd/MM/yyyy")}
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
                            <TableHead className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                Retards
                              </div>
                            </TableHead>
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
                              <TableCell className="text-center">
                                <span className="text-green-600 font-medium">{player.present}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {player.late > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-auto p-1">
                                        <span className="text-orange-600 font-medium">{player.late}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3">
                                      <h4 className="font-medium mb-2 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Retards ({player.late})
                                      </h4>
                                      <div className="space-y-1 text-sm mb-2">
                                        <div className="flex items-center gap-2 text-green-600">
                                          <CheckCircle className="h-3 w-3" />
                                          Justifiés: {player.lateJustified}
                                        </div>
                                        <div className="flex items-center gap-2 text-red-600">
                                          <AlertCircle className="h-3 w-3" />
                                          Non justifiés: {player.lateUnjustified}
                                        </div>
                                      </div>
                                      <div className="border-t pt-2 space-y-1 max-h-32 overflow-y-auto">
                                        {filteredAttendance
                                          ?.filter(a => a.player_id === player.id && a.status === "late")
                                          .map(a => (
                                            <div key={a.id} className="text-xs flex justify-between">
                                              <span>{format(parseISO(a.attendance_date), "dd/MM/yyyy")}</span>
                                              <span className="text-muted-foreground">
                                                {a.late_minutes ? `${a.late_minutes}min` : ""} 
                                                {a.late_justified ? " ✓" : " ✗"}
                                                {a.late_reason ? ` - ${a.late_reason}` : ""}
                                              </span>
                                            </div>
                                          ))
                                        }
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {player.excused > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-auto p-1">
                                        <span className="text-amber-600 font-medium">{player.excused}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3">
                                      <h4 className="font-medium mb-2">Excusés ({player.excused})</h4>
                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {filteredAttendance
                                          ?.filter(a => a.player_id === player.id && a.status === "excused")
                                          .map(a => (
                                            <div key={a.id} className="text-xs flex justify-between">
                                              <span>{format(parseISO(a.attendance_date), "dd/MM/yyyy")}</span>
                                              <span className="text-muted-foreground">{a.absence_reason || "—"}</span>
                                            </div>
                                          ))
                                        }
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {player.absent > 0 ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-auto p-1">
                                        <span className="text-red-600 font-medium">{player.absent}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3">
                                      <h4 className="font-medium mb-2">Absences ({player.absent})</h4>
                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {filteredAttendance
                                          ?.filter(a => a.player_id === player.id && a.status === "absent")
                                          .map(a => (
                                            <div key={a.id} className="text-xs flex justify-between">
                                              <span>{format(parseISO(a.attendance_date), "dd/MM/yyyy")}</span>
                                              <span className="text-muted-foreground">{a.absence_reason || "—"}</span>
                                            </div>
                                          ))
                                        }
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
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
        );
      })()}

      <SessionAttendanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={selectedSession}
        categoryId={categoryId}
      />
    </div>
  );
}
