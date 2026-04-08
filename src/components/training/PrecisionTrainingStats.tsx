import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Target, CalendarIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PrecisionTrainingStatsProps {
  categoryId: string;
}

export function PrecisionTrainingStats({ categoryId }: PrecisionTrainingStatsProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");
  const [selectedExercise, setSelectedExercise] = useState<string>("all");

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["precision-training-stats", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precision_training")
        .select("*, players(id, name, first_name)")
        .eq("category_id", categoryId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter((row: any) => {
      if (dateFrom && isBefore(new Date(row.session_date), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(row.session_date), endOfDay(dateTo))) return false;
      if (selectedPlayerId !== "all" && row.player_id !== selectedPlayerId) return false;
      if (selectedExercise !== "all" && row.exercise_label !== selectedExercise) return false;
      return true;
    });
  }, [rawData, dateFrom, dateTo, selectedPlayerId, selectedExercise]);

  const players = useMemo(() => {
    if (!rawData) return [];
    const map = new Map<string, string>();
    rawData.forEach((r: any) => {
      const p = r.players as any;
      if (p) map.set(p.id, [p.first_name, p.name].filter(Boolean).join(" "));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawData]);

  const exerciseLabels = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.map((r: any) => r.exercise_label))].sort();
  }, [rawData]);

  // Global stats
  const totalAttempts = filtered.reduce((s: number, r: any) => s + (r.attempts || 0), 0);
  const totalSuccesses = filtered.reduce((s: number, r: any) => s + (r.successes || 0), 0);
  const globalRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

  // Per exercise breakdown
  const byExercise = useMemo(() => {
    const map = new Map<string, { attempts: number; successes: number }>();
    filtered.forEach((r: any) => {
      const key = r.exercise_label || "Inconnu";
      const prev = map.get(key) || { attempts: 0, successes: 0 };
      map.set(key, {
        attempts: prev.attempts + (r.attempts || 0),
        successes: prev.successes + (r.successes || 0),
      });
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({
        label,
        ...v,
        rate: v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [filtered]);

  // Per player breakdown
  const byPlayer = useMemo(() => {
    const map = new Map<string, { name: string; attempts: number; successes: number }>();
    filtered.forEach((r: any) => {
      const p = r.players as any;
      const name = p ? [p.first_name, p.name].filter(Boolean).join(" ") : "Inconnu";
      const prev = map.get(r.player_id) || { name, attempts: 0, successes: 0 };
      map.set(r.player_id, {
        name,
        attempts: prev.attempts + (r.attempts || 0),
        successes: prev.successes + (r.successes || 0),
      });
    });
    return Array.from(map.values())
      .map((v) => ({
        ...v,
        rate: v.attempts > 0 ? Math.round((v.successes / v.attempts) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [filtered]);

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (!rawData || rawData.length === 0) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Aucune donnée de précision enregistrée.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Les stats apparaîtront quand les athlètes saisiront leurs résultats d'exercices de précision.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Athlète</label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Exercice</label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {exerciseLabels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Du</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} /></PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Au</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} disabled={(d) => dateFrom ? d < dateFrom : false} /></PopoverContent>
              </Popover>
            </div>

            {(dateFrom || dateTo || selectedPlayerId !== "all" || selectedExercise !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSelectedPlayerId("all"); setSelectedExercise("all"); }}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Enregistrements</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Tentatives</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{totalSuccesses}</p>
            <p className="text-xs text-muted-foreground">Réussites</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="pt-4 pb-3 text-center">
            <p className={cn("text-2xl font-bold", globalRate >= 70 ? "text-emerald-500" : globalRate >= 50 ? "text-amber-500" : "text-destructive")}>
              {globalRate}%
            </p>
            <p className="text-xs text-muted-foreground">Taux de réussite</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - By exercise */}
      {byExercise.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Réussite par exercice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, byExercise.length * 40)}>
              <BarChart data={byExercise} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Taux"]} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Player ranking */}
      {byPlayer.length > 1 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Classement par athlète
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byPlayer.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{p.successes}/{p.attempts}</span>
                    <Badge className={cn(
                      p.rate >= 70 ? "bg-emerald-500/20 text-emerald-700" :
                      p.rate >= 50 ? "bg-amber-500/20 text-amber-700" :
                      "bg-destructive/20 text-destructive"
                    )}>
                      {p.rate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
