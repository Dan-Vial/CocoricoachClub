import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, User, TrendingUp } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

type PeriodFilter = "7d" | "30d" | "this_month" | "last_month" | "all";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}

export function SuperAdminUsage() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const dateRange = (() => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { from: subDays(now, 7).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "30d":
        return { from: subDays(now, 30).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "this_month":
        return { from: startOfMonth(now).toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
      case "last_month": {
        const last = subMonths(now, 1);
        return { from: startOfMonth(last).toISOString().split("T")[0], to: endOfMonth(last).toISOString().split("T")[0] };
      }
      case "all":
        return { from: "2020-01-01", to: now.toISOString().split("T")[0] };
    }
  })();

  // Fetch all activity data
  const { data: activityData = [], isLoading } = useQuery({
    queryKey: ["super-admin-usage", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_activity_tracking")
        .select("user_id, duration_seconds, user_type, activity_date")
        .gte("activity_date", dateRange.from)
        .lte("activity_date", dateRange.to);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch clients with their clubs and user mappings
  const { data: clientsData = [] } = useQuery({
    queryKey: ["super-admin-usage-clients"],
    queryFn: async () => {
      // Get all clients
      const { data: clients, error: cErr } = await supabase
        .from("clients")
        .select("id, name, status")
        .order("name");
      if (cErr) throw cErr;

      // Get all clubs with client_id
      const { data: clubs, error: clErr } = await supabase
        .from("clubs")
        .select("id, client_id, user_id");
      if (clErr) throw clErr;

      // Get all club members
      const { data: clubMembers, error: cmErr } = await supabase
        .from("club_members")
        .select("club_id, user_id, role");
      if (cmErr) throw cmErr;

      // Get all category members with athlete role
      const { data: categoryMembers, error: catErr } = await supabase
        .from("category_members")
        .select("user_id, role, category_id");
      if (catErr) throw catErr;

      // Get categories to map to clubs
      const { data: categories, error: catErr2 } = await supabase
        .from("categories")
        .select("id, club_id");
      if (catErr2) throw catErr2;

      // Build category -> club mapping
      const catToClub = new Map<string, string>();
      (categories || []).forEach(c => catToClub.set(c.id, c.club_id));

      // Build client -> user mappings
      return (clients || []).map(client => {
        const clientClubs = (clubs || []).filter(c => c.client_id === client.id);
        const clientClubIds = new Set(clientClubs.map(c => c.id));

        // Staff users: club owners + club members (non-athlete)
        const staffUserIds = new Set<string>();
        clientClubs.forEach(c => staffUserIds.add(c.user_id));
        (clubMembers || []).forEach(cm => {
          if (clientClubIds.has(cm.club_id)) staffUserIds.add(cm.user_id);
        });

        // Athlete users: category_members with role 'athlete' in categories of client clubs
        const athleteUserIds = new Set<string>();
        (categoryMembers || []).forEach(cm => {
          if (cm.role === "athlete") {
            const clubId = catToClub.get(cm.category_id);
            if (clubId && clientClubIds.has(clubId)) {
              athleteUserIds.add(cm.user_id);
            }
          }
        });

        return {
          ...client,
          staffUserIds: Array.from(staffUserIds),
          athleteUserIds: Array.from(athleteUserIds),
        };
      });
    },
  });

  // Aggregate usage by client
  const clientUsage = clientsData.map(client => {
    let staffSeconds = 0;
    let athleteSeconds = 0;
    let staffActiveUsers = new Set<string>();
    let athleteActiveUsers = new Set<string>();

    activityData.forEach(a => {
      if (a.user_type === "staff" && client.staffUserIds.includes(a.user_id)) {
        staffSeconds += a.duration_seconds;
        staffActiveUsers.add(a.user_id);
      }
      if (a.user_type === "athlete" && client.athleteUserIds.includes(a.user_id)) {
        athleteSeconds += a.duration_seconds;
        athleteActiveUsers.add(a.user_id);
      }
      // Also count staff activity from athlete user IDs (they might use staff pages)
      if (a.user_type === "staff" && client.athleteUserIds.includes(a.user_id) && !client.staffUserIds.includes(a.user_id)) {
        // Don't double count - skip
      }
    });

    return {
      id: client.id,
      name: client.name,
      status: client.status,
      staffSeconds,
      athleteSeconds,
      totalSeconds: staffSeconds + athleteSeconds,
      staffActiveUsers: staffActiveUsers.size,
      athleteActiveUsers: athleteActiveUsers.size,
      totalStaff: client.staffUserIds.length,
      totalAthletes: client.athleteUserIds.length,
    };
  }).sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totalStaffTime = clientUsage.reduce((sum, c) => sum + c.staffSeconds, 0);
  const totalAthleteTime = clientUsage.reduce((sum, c) => sum + c.athleteSeconds, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Temps d'utilisation</h2>
          <p className="text-muted-foreground text-sm">
            Temps passé sur l'application par client
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="this_month">Ce mois-ci</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temps total</p>
                <p className="text-2xl font-bold">{formatDuration(totalStaffTime + totalAthleteTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff total</p>
                <p className="text-2xl font-bold">{formatDuration(totalStaffTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joueurs total</p>
                <p className="text-2xl font-bold">{formatDuration(totalAthleteTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Utilisation par client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : clientUsage.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune donnée d'utilisation</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        Staff
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <User className="h-4 w-4 text-green-500" />
                        Joueurs
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientUsage.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={client.status === "active" ? "default" : "secondary"}
                          className={client.status === "active" ? "bg-green-600" : client.status === "trial" ? "bg-amber-500" : ""}
                        >
                          {client.status === "active" ? "Actif" : client.status === "trial" ? "Essai" : client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <p className="font-semibold">{formatDuration(client.staffSeconds)}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.staffActiveUsers}/{client.totalStaff} actifs
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <p className="font-semibold">{formatDuration(client.athleteSeconds)}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.athleteActiveUsers}/{client.totalAthletes} actifs
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-bold">{formatDuration(client.totalSeconds)}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
