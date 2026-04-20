import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { getRiskLevel } from "@/lib/trainingLoadCalculations";

interface PerformanceHeatmapProps {
  categoryId: string;
}

type MetricType = "awcr" | "ewma_ratio" | "wellness" | "training_load" | "soreness";

interface AwcrData {
  player_id: string;
  session_date: string;
  awcr: number | null;
  training_load: number | null;
  acute_load: number | null;
  chronic_load: number | null;
}

interface WellnessData {
  player_id: string;
  tracking_date: string;
  general_fatigue: number;
  sleep_quality: number;
  soreness_upper_body: number;
  soreness_lower_body: number;
}

export function PerformanceHeatmap({ categoryId }: PerformanceHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("awcr");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch data from 28 days before month start to compute Gabbett AWCR rolling averages
  const extendedStartDate = format(
    new Date(startOfMonth(selectedMonth).getTime() - 28 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data: awcrData } = useQuery({
    queryKey: ["heatmap-awcr", categoryId, selectedMonth],
    queryFn: async () => {
      const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("player_id, session_date, awcr, training_load, acute_load, chronic_load")
        .eq("category_id", categoryId)
        .gte("session_date", extendedStartDate)
        .lte("session_date", endDate);
      if (error) throw error;
      return data as AwcrData[];
    },
  });

  const { data: wellnessData, isLoading } = useQuery({
    queryKey: ["heatmap-wellness", categoryId, selectedMonth],
    queryFn: async () => {
      const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("wellness_tracking")
        .select("player_id, tracking_date, general_fatigue, sleep_quality, soreness_upper_body, soreness_lower_body")
        .eq("category_id", categoryId)
        .gte("tracking_date", startDate)
        .lte("tracking_date", endDate);
      if (error) throw error;
      return data as WellnessData[];
    },
  });

  const getMetricDescription = (metric: MetricType): string => {
    switch (metric) {
      case "awcr":
        return "Ratio AWCR (Gabbett) : Charge Aiguë / Charge Chronique. Zone optimale : 0.85 – 1.30.";
      case "ewma_ratio":
        return "Ratio EWMA : Moyenne mobile pondérée exponentiellement (λ=0.25 aiguë, λ=0.069 chronique). Zone optimale : 0.85 – 1.30.";
      case "training_load":
        return "Charge d'entraînement quotidienne (sRPE = RPE × Durée en minutes).";
      case "wellness":
        return "Moyenne de la fatigue générale et de la qualité du sommeil (échelle 1-5). Plus le score est bas, meilleur est le bien-être.";
      case "soreness":
        return "Moyenne des douleurs musculaires haut et bas du corps (échelle 1-5). Plus le score est bas, mieux c'est.";
    }
  };

  const getColorForValue = (value: number | null, metric: MetricType): string => {
    if (value === null) return "bg-muted/20";

    switch (metric) {
      case "awcr":
      case "ewma_ratio": {
        const riskLevel = getRiskLevel(value);
        if (riskLevel === "danger") return "bg-destructive";
        if (riskLevel === "warning") return "bg-warning";
        return "bg-success";
      }

      case "training_load":
        if (value < 200) return "bg-success/40";
        if (value < 400) return "bg-success";
        if (value < 600) return "bg-warning";
        if (value < 800) return "bg-destructive/60";
        return "bg-destructive";

      case "wellness":
        if (value <= 2) return "bg-success";
        if (value <= 3) return "bg-warning";
        return "bg-destructive";

      case "soreness":
        if (value <= 2) return "bg-success";
        if (value <= 3.5) return "bg-warning";
        return "bg-destructive";
    }
  };

  const getValueForCell = (playerId: string, date: Date): number | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    if (selectedMetric === "awcr") {
      // Gabbett AWCR: sum of last 7 days / (sum of last 28 days / 4)
      const dateMs = date.getTime();
      const playerRecords = awcrData?.filter((d) => d.player_id === playerId) ?? [];
      
      const sumForRange = (days: number) => {
        const startMs = dateMs - days * 24 * 60 * 60 * 1000;
        return playerRecords
          .filter((d) => {
            const dMs = new Date(d.session_date).getTime();
            return dMs > startMs && dMs <= dateMs;
          })
          .reduce((sum, r) => sum + (r.training_load ?? 0), 0);
      };
      
      const acute7 = sumForRange(7);
      const chronic28 = sumForRange(28);
      
      if (chronic28 === 0) return null;
      // Gabbett ratio = (7-day sum) / (28-day sum / 4) = acute weekly / chronic weekly average
      return Math.round((acute7 / (chronic28 / 4)) * 100) / 100;
    } else if (selectedMetric === "ewma_ratio") {
      // EWMA ratio from stored acute_load / chronic_load
      const records = awcrData?.filter(
        (d) => d.player_id === playerId && d.session_date === dateStr
      ) ?? [];
      if (records.length === 0) return null;
      const best = records.reduce((a, b) => {
        if (a.acute_load !== null && b.acute_load === null) return a;
        if (b.acute_load !== null && a.acute_load === null) return b;
        return (a.training_load ?? 0) >= (b.training_load ?? 0) ? a : b;
      });
      if (best.acute_load && best.chronic_load && best.chronic_load > 0) {
        return Math.round((best.acute_load / best.chronic_load) * 100) / 100;
      }
      return best.awcr ?? null;
    } else if (selectedMetric === "training_load") {
      const records = awcrData?.filter(
        (d) => d.player_id === playerId && d.session_date === dateStr
      ) ?? [];
      if (records.length === 0) return null;
      return records.reduce((sum, r) => sum + (r.training_load ?? 0), 0);
    } else if (selectedMetric === "wellness") {
      const record = wellnessData?.find(
        (d) => d.player_id === playerId && d.tracking_date === dateStr
      );
      return record ? (record.general_fatigue + record.sleep_quality) / 2 : null;
    } else if (selectedMetric === "soreness") {
      const record = wellnessData?.find(
        (d) => d.player_id === playerId && d.tracking_date === dateStr
      );
      return record ? (record.soreness_upper_body + record.soreness_lower_body) / 2 : null;
    }
    return null;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="awcr">AWCR (Gabbett)</SelectItem>
            <SelectItem value="ewma_ratio">EWMA</SelectItem>
            <SelectItem value="training_load">Charge d'entraînement</SelectItem>
            <SelectItem value="wellness">Wellness</SelectItem>
            <SelectItem value="soreness">Douleurs musculaires</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={format(selectedMonth, "yyyy-MM")}
          onValueChange={(value) => setSelectedMonth(new Date(value + "-01"))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              return (
                <SelectItem key={i} value={format(date, "yyyy-MM")}>
                  {format(date, "MMMM yyyy", { locale: fr })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Metric description */}
      <p className="text-sm text-muted-foreground italic">{getMetricDescription(selectedMetric)}</p>

      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>
            Heatmap - {selectedMetric === "awcr" ? "AWCR" : selectedMetric === "ewma_ratio" ? "EWMA" : selectedMetric === "training_load" ? "Charge" : selectedMetric === "wellness" ? "Wellness" : "Douleurs"} - {format(selectedMonth, "MMMM yyyy", { locale: fr })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-max">
            <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${daysInMonth.length}, 30px)` }}>
              {/* Header row with dates */}
              <div className="font-medium text-sm p-2 sticky left-0 bg-background z-10">Athlète</div>
              {daysInMonth.map((day) => (
                <div key={day.toISOString()} className="text-xs text-center p-1 font-medium">
                  {format(day, "d")}
                </div>
              ))}

              {/* Player rows */}
              {players?.map((player) => (
                <React.Fragment key={player.id}>
                  <div className="text-sm p-2 truncate sticky left-0 bg-background z-10 border-r">
                    {[player.first_name, player.name].filter(Boolean).join(" ")}
                  </div>
                  {daysInMonth.map((day) => {
                    const value = getValueForCell(player.id, day);
                    const color = getColorForValue(value, selectedMetric);
                    return (
                      <div
                        key={`${player.id}-${day.toISOString()}`}
                        className={`h-8 rounded transition-colors ${color} border border-border/20`}
                        title={value !== null ? `${format(day, "d MMM", { locale: fr })}: ${value.toFixed(2)}` : "Pas de données"}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex gap-6 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-success rounded" />
              <span>Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-warning rounded" />
              <span>Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-destructive rounded" />
              <span>Risque</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-muted/20 rounded border" />
              <span>Pas de données</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
