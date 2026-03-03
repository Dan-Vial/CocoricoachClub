import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, addMonths, subMonths, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getSessionTypeLabel,
  getObjectiveLabel,
  getIntensityLabel,
  getVolumeLabel,
  getContactChargeLabel,
  TARGET_INTENSITIES,
} from "@/lib/constants/sessionBlockOptions";

interface TrainingLoadCalendarProps {
  categoryId: string;
}

type ViewMode = "week" | "month";

export function TrainingLoadCalendar({ categoryId }: TrainingLoadCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  }, [viewMode, currentDate]);

  const days = useMemo(() => eachDayOfInterval(dateRange), [dateRange]);

  // Fetch sessions with blocks for the period
  const { data: sessionsData } = useQuery({
    queryKey: ["load-calendar-sessions", categoryId, dateRange.start, dateRange.end],
    queryFn: async () => {
      const startStr = format(dateRange.start, "yyyy-MM-dd");
      const endStr = format(dateRange.end, "yyyy-MM-dd");

      const { data: sessions, error } = await supabase
        .from("training_sessions")
        .select("id, session_date, training_type, intensity")
        .eq("category_id", categoryId)
        .gte("session_date", startStr)
        .lte("session_date", endStr)
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

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  // Group blocks by day
  const dayData = useMemo(() => {
    if (!sessionsData) return new Map();
    const map = new Map<string, {
      sessions: any[];
      blocks: any[];
      summary: {
        sessionTypes: string[];
        objectives: string[];
        intensities: string[];
        volumes: string[];
        contactCharges: string[];
        avgRpe: number | null;
      };
    }>();

    days.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const daySessions = sessionsData.sessions.filter(s => s.session_date?.startsWith(dateStr));
      const dayBlocks = daySessions.flatMap(s =>
        sessionsData.blocks.filter(b => b.training_session_id === s.id)
      );

      // Get types from blocks first, fallback to session-level training_type
      const blockSessionTypes = [...new Set(dayBlocks.filter(b => b.session_type).map(b => b.session_type))];
      const blockTrainingTypes = [...new Set(dayBlocks.filter(b => b.training_type).map(b => b.training_type))];
      const sessionTrainingTypes = [...new Set(daySessions.filter(s => s.training_type).map(s => s.training_type))];
      const sessionTypes = blockSessionTypes.length > 0 
        ? blockSessionTypes 
        : blockTrainingTypes.length > 0 
          ? blockTrainingTypes 
          : sessionTrainingTypes;

      const objectives = [...new Set(dayBlocks.filter(b => b.objective).map(b => b.objective))];
      const intensities = dayBlocks.filter(b => b.target_intensity).map(b => b.target_intensity);
      const volumes = dayBlocks.filter(b => b.volume).map(b => b.volume);
      const contactCharges = dayBlocks.filter(b => b.contact_charge && b.contact_charge !== "aucun").map(b => b.contact_charge);

      // RPE: from blocks first, fallback to session-level intensity
      const blockRpeValues = dayBlocks.filter(b => b.intensity != null).map(b => b.intensity);
      const sessionRpeValues = daySessions.filter(s => s.intensity != null).map(s => s.intensity);
      const rpeValues = blockRpeValues.length > 0 ? blockRpeValues : sessionRpeValues;
      const avgRpe = rpeValues.length > 0 ? Math.round((rpeValues.reduce((a: number, b: number) => a + b, 0) / rpeValues.length) * 10) / 10 : null;

      if (daySessions.length > 0) {
        map.set(dateStr, {
          sessions: daySessions,
          blocks: dayBlocks,
          summary: { sessionTypes, objectives, intensities: [...new Set(intensities)], volumes: [...new Set(volumes)], contactCharges: [...new Set(contactCharges)], avgRpe },
        });
      }
    });

    return map;
  }, [sessionsData, days]);

  const getIntensityColor = (intensity: string): string => {
    const found = TARGET_INTENSITIES.find(i => i.value === intensity);
    return found?.color || "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendrier de charge
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semaine</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {viewMode === "week"
            ? `${format(dateRange.start, "d MMM", { locale: fr })} - ${format(dateRange.end, "d MMM yyyy", { locale: fr })}`
            : format(currentDate, "MMMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent>
        <div className={viewMode === "week" ? "grid grid-cols-7 gap-2" : "grid grid-cols-7 gap-1"}>
          {/* Day headers */}
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
            <div key={d} className="text-xs font-medium text-muted-foreground text-center p-1">{d}</div>
          ))}

          {/* Month padding */}
          {viewMode === "month" && (() => {
            const firstDow = (dateRange.start.getDay() + 6) % 7; // Monday=0
            return Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />);
          })()}

          {/* Day cells */}
          {days.map(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const data = dayData.get(dateStr);
            const isToday = isSameDay(day, new Date());

            return (
              <TooltipProvider key={dateStr}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`rounded-lg border p-2 min-h-[${viewMode === "week" ? "120px" : "60px"}] transition-colors ${
                      isToday ? "border-primary bg-primary/5" : data ? "border-border bg-muted/20" : "border-transparent"
                    }`}>
                      <div className="text-xs font-medium mb-1">{format(day, "d")}</div>
                      {data && (
                        <div className="space-y-1">
                          {data.summary.avgRpe !== null && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              RPE {data.summary.avgRpe}
                            </Badge>
                          )}
                          {data.summary.intensities.slice(0, 1).map(i => (
                            <Badge key={i} className={`text-[10px] px-1 py-0 ${getIntensityColor(i)}`}>
                              {getIntensityLabel(i)}
                            </Badge>
                          ))}
                          {viewMode === "week" && (
                            <>
                              {data.summary.sessionTypes.slice(0, 2).map(t => (
                                <Badge key={t} variant="outline" className="text-[10px] px-1 py-0 block w-fit">
                                  {getSessionTypeLabel(t)}
                                </Badge>
                              ))}
                              {data.summary.contactCharges.length > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 block w-fit text-orange-600">
                                  Contact: {getContactChargeLabel(data.summary.contactCharges[0])}
                                </Badge>
                              )}
                              {data.summary.sessionTypes.length === 0 && data.summary.avgRpe === null && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {data.sessions.length} séance(s)
                                </Badge>
                              )}
                            </>
                          )}
                          {viewMode === "month" && data.summary.sessionTypes.length === 0 && data.summary.avgRpe === null && (
                            <div className="w-2 h-2 rounded-full bg-primary mx-auto" />
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  {data && (
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{format(day, "EEEE d MMMM", { locale: fr })}</p>
                        <p className="text-xs">{data.sessions.length} séance(s)</p>
                        {data.summary.sessionTypes.length > 0 && (
                          <p className="text-xs">Types: {data.summary.sessionTypes.map(getSessionTypeLabel).join(", ")}</p>
                        )}
                        {data.summary.objectives.length > 0 && (
                          <p className="text-xs">Objectifs: {data.summary.objectives.map(getObjectiveLabel).join(", ")}</p>
                        )}
                        {data.summary.intensities.length > 0 && (
                          <p className="text-xs">Intensité: {data.summary.intensities.map(getIntensityLabel).join(", ")}</p>
                        )}
                        {data.summary.volumes.length > 0 && (
                          <p className="text-xs">Volume: {data.summary.volumes.map(getVolumeLabel).join(", ")}</p>
                        )}
                        {data.summary.contactCharges.length > 0 && (
                          <p className="text-xs">Contact: {data.summary.contactCharges.map(getContactChargeLabel).join(", ")}</p>
                        )}
                        {data.summary.avgRpe !== null && (
                          <p className="text-xs font-semibold">RPE moyen: {data.summary.avgRpe}/10</p>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
