import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { BarChart3, Dumbbell, Zap, Shield, CalendarRange } from "lucide-react";
import {
  getSessionTypeLabel,
  getObjectiveLabel,
  getIntensityLabel,
  getVolumeLabel,
  getContactChargeLabel,
  TARGET_INTENSITIES,
  VOLUME_OPTIONS,
  CONTACT_CHARGE_OPTIONS,
} from "@/lib/constants/sessionBlockOptions";

interface TrainingDistributionProps {
  categoryId: string;
}

export function TrainingDistribution({ categoryId }: TrainingDistributionProps) {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 28), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["training-distribution", categoryId, startDate, endDate],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, intensity")
        .eq("category_id", categoryId)
        .gte("session_date", startDate)
        .lte("session_date", endDate)
        .order("session_date");
      if (error) throw error;
      if (!sessions?.length) return { sessions: [], blocks: [] };

      const sessionIds = sessions.map(s => s.id);
      const { data: blocks } = await supabase
        .from("training_session_blocks")
        .select("*")
        .in("training_session_id", sessionIds)
        .order("block_order");

      return { sessions, blocks: blocks || [] };
    },
  });

  const stats = useMemo(() => {
    if (!data || data.blocks.length === 0) return null;

    const blocks = data.blocks;
    const totalBlocks = blocks.length;

    // Intensity distribution
    const intensityCounts = new Map<string, number>();
    blocks.forEach(b => {
      if (b.target_intensity) {
        intensityCounts.set(b.target_intensity, (intensityCounts.get(b.target_intensity) || 0) + 1);
      }
    });

    // Volume distribution
    const volumeCounts = new Map<string, number>();
    blocks.forEach(b => {
      if (b.volume) {
        volumeCounts.set(b.volume, (volumeCounts.get(b.volume) || 0) + 1);
      }
    });

    // Contact charge distribution
    const contactCounts = new Map<string, number>();
    blocks.forEach(b => {
      if (b.contact_charge && b.contact_charge !== "aucun") {
        contactCounts.set(b.contact_charge, (contactCounts.get(b.contact_charge) || 0) + 1);
      }
    });
    // Count "aucun" or missing as no contact
    const noContact = blocks.filter(b => !b.contact_charge || b.contact_charge === "aucun").length;
    if (noContact > 0) contactCounts.set("aucun", noContact);

    // Session type (thématique) distribution
    const typeCounts = new Map<string, number>();
    blocks.forEach(b => {
      const type = b.training_type || b.session_type;
      if (type) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    });

    // Objective distribution
    const objectiveCounts = new Map<string, number>();
    blocks.forEach(b => {
      if (b.objective) {
        objectiveCounts.set(b.objective, (objectiveCounts.get(b.objective) || 0) + 1);
      }
    });

    return {
      totalSessions: data.sessions.length,
      totalBlocks,
      intensityCounts,
      volumeCounts,
      contactCounts,
      typeCounts,
      objectiveCounts,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Répartition des entraînements
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Du</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-[140px] text-sm" max={endDate} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Au</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-[140px] text-sm" min={startDate} />
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de séance sur cette période</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Répartition des entraînements
          </h3>
          <p className="text-sm text-muted-foreground">
            {stats.totalSessions} séances · {stats.totalBlocks} blocs analysés
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarRange className="h-3 w-3" /> Du
            </Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-[140px] text-sm" max={endDate} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Au</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-[140px] text-sm" min={startDate} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Intensity Distribution */}
        <DistributionCard
          title="Intensité"
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          counts={stats.intensityCounts}
          total={stats.totalBlocks}
          items={TARGET_INTENSITIES.map(i => ({
            value: i.value,
            label: i.label,
            colorClass: i.color,
          }))}
          getLabel={getIntensityLabel}
        />

        {/* Volume Distribution */}
        <DistributionCard
          title="Volume"
          icon={<Dumbbell className="h-4 w-4 text-blue-500" />}
          counts={stats.volumeCounts}
          total={stats.totalBlocks}
          items={VOLUME_OPTIONS.map(v => ({
            value: v.value,
            label: v.label,
            colorClass: v.numericValue === 1 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                         v.numericValue === 2 ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" :
                         "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
          }))}
          getLabel={getVolumeLabel}
        />

        {/* Contact Charge Distribution */}
        <DistributionCard
          title="Charge de contact"
          icon={<Shield className="h-4 w-4 text-red-500" />}
          counts={stats.contactCounts}
          total={stats.totalBlocks}
          items={CONTACT_CHARGE_OPTIONS.map(c => ({
            value: c.value,
            label: c.label,
            colorClass: c.numericValue === 0 ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" :
                         c.numericValue === 1 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                         c.numericValue === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                         "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          }))}
          getLabel={getContactChargeLabel}
        />

        {/* Thématique Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Thématiques dominantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(stats.typeCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const pct = Math.round((count / stats.totalBlocks) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{getSessionTypeLabel(type)}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {stats.typeCounts.size === 0 && (
              <p className="text-sm text-muted-foreground">Aucune thématique renseignée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Objectives summary */}
      {stats.objectiveCounts.size > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Objectifs travaillés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(stats.objectiveCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([obj, count]) => (
                  <Badge key={obj} variant="secondary" className="gap-1">
                    {getObjectiveLabel(obj)}
                    <span className="text-xs opacity-70">×{count}</span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Reusable bar chart card */
function DistributionCard({
  title,
  icon,
  counts,
  total,
  items,
  getLabel,
}: {
  title: string;
  icon: React.ReactNode;
  counts: Map<string, number>;
  total: number;
  items: { value: string; label: string; colorClass: string }[];
  getLabel: (v: string) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(item => {
          const count = counts.get(item.value) || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          if (count === 0) return null;
          return (
            <div key={item.value} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <Badge className={`${item.colorClass} text-xs`}>{item.label}</Badge>
                <span className="text-muted-foreground">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.colorClass.includes("emerald") ? "bg-emerald-500" :
                    item.colorClass.includes("yellow") ? "bg-yellow-500" :
                    item.colorClass.includes("orange") ? "bg-orange-500" :
                    item.colorClass.includes("red") ? "bg-red-500" :
                    item.colorClass.includes("blue") ? "bg-blue-500" :
                    item.colorClass.includes("indigo") ? "bg-indigo-500" :
                    item.colorClass.includes("purple") ? "bg-purple-500" :
                    item.colorClass.includes("gray") ? "bg-gray-400" :
                    "bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {Array.from(counts.values()).every(c => c === 0) && (
          <p className="text-sm text-muted-foreground">Aucune donnée</p>
        )}
      </CardContent>
    </Card>
  );
}
