import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, Satellite } from "lucide-react";
import { 
  MetricType, 
  EWMAResult, 
  METRICS_CONFIG,
  getRiskColor,
} from "@/lib/trainingLoadCalculations";

interface TrainingLoadChartProps {
  chartData: EWMAResult[];
  availableMetrics: MetricType[];
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  hasGpsData: boolean;
  isLoading?: boolean;
  showZones?: boolean;
  height?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as EWMAResult;
  if (!data) return null;

  const riskColor = getRiskColor(data.riskLevel);

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-medium text-sm mb-2">
        {format(parseISO(data.date), "EEEE d MMMM", { locale: fr })}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Charge brute:</span>
          <span className="font-semibold">{data.rawValue}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">EWMA Aiguë:</span>
          <span className="font-semibold">{data.acute}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">EWMA Chronique:</span>
          <span className="font-semibold">{data.chronic}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t">
          <span className="text-muted-foreground">Ratio:</span>
          <span className={`font-bold ${riskColor}`}>{data.ratio.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Zone:</span>
          <Badge 
            variant="secondary" 
            className={`text-xs ${
              data.riskLevel === "optimal" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
              data.riskLevel === "warning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {data.riskLevel === "optimal" ? "Optimale" : 
             data.riskLevel === "warning" ? "Vigilance" : "Danger"}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export function TrainingLoadChart({
  chartData,
  availableMetrics,
  selectedMetric,
  onMetricChange,
  hasGpsData,
  isLoading = false,
  showZones = true,
  height = 350,
}: TrainingLoadChartProps) {
  const [viewMode, setViewMode] = useState<"ratio" | "loads">("ratio");
  const metricConfig = METRICS_CONFIG[selectedMetric];

  // Format data for chart
  const formattedData = chartData.map(d => ({
    ...d,
    dateFormatted: format(parseISO(d.date), "dd/MM", { locale: fr }),
  }));

  // GPS metrics info
  const gpsMetrics = availableMetrics.filter(m => METRICS_CONFIG[m].isGps);
  const nonGpsMetrics = availableMetrics.filter(m => !METRICS_CONFIG[m].isGps);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-[300px] bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Charge d'entraînement
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {metricConfig.isGps && (
              <Badge variant="secondary" className="gap-1">
                <Satellite className="h-3 w-3" />
                GPS
              </Badge>
            )}
            <Select value={selectedMetric} onValueChange={(v) => onMetricChange(v as MetricType)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sélectionner métrique" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Charge interne
                </div>
                {nonGpsMetrics.map(m => (
                  <SelectItem key={m} value={m}>
                    {METRICS_CONFIG[m].label}
                  </SelectItem>
                ))}
                {gpsMetrics.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">
                      Charge externe GPS
                    </div>
                    {gpsMetrics.map(m => (
                      <SelectItem key={m} value={m}>
                        <span className="flex items-center gap-1">
                          <Satellite className="h-3 w-3" />
                          {METRICS_CONFIG[m].label}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Simple metric explanation tooltip - always visible */}
        <div 
          className="rounded-md px-3 py-2 text-sm"
          style={{ 
            backgroundColor: metricConfig.isGps 
              ? "hsl(var(--cyan-500) / 0.1)" 
              : "hsl(var(--primary) / 0.1)",
            color: metricConfig.isGps 
              ? "hsl(183, 65%, 35%)" 
              : "hsl(var(--primary))"
          }}
        >
          {metricConfig.description || `${metricConfig.label} - Suivi de la charge d'entraînement basé sur ${metricConfig.isGps ? 'les données GPS' : 'la perception de l\'effort (RPE)'}.`}
        </div>

        {/* View mode toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "ratio" | "loads")} className="mb-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="ratio">Ratio</TabsTrigger>
            <TabsTrigger value="loads">Charges</TabsTrigger>
          </TabsList>
        </Tabs>

        {formattedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>Aucune donnée de charge disponible</p>
            <p className="text-sm">Ajoutez des entrées RPE pour visualiser les tendances</p>
          </div>
        ) : (
          <>
            {viewMode === "ratio" ? (
              <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateFormatted" className="text-xs" />
                  <YAxis 
                    domain={[0.5, 2]} 
                    className="text-xs"
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {/* Colored zones */}
                  {showZones && (
                    <>
                      {/* Danger zone low */}
                      <ReferenceArea y1={0.5} y2={0.8} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
                      {/* Warning zone low */}
                      <ReferenceArea y1={0.8} y2={0.85} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
                      {/* Optimal zone */}
                      <ReferenceArea y1={0.85} y2={1.3} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
                      {/* Warning zone high */}
                      <ReferenceArea y1={1.3} y2={1.5} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
                      {/* Danger zone high */}
                      <ReferenceArea y1={1.5} y2={2} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
                    </>
                  )}

                  {/* Reference lines */}
                  <ReferenceLine y={0.85} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine y={1.0} stroke="hsl(var(--primary))" strokeDasharray="5 5" strokeWidth={1.5} />
                  <ReferenceLine y={1.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />

                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    name="Ratio EWMA"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dateFormatted" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="chronic"
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--muted-foreground))"
                    fillOpacity={0.3}
                    strokeWidth={1}
                    name="Chronique (28j)"
                  />
                  <Line
                    type="monotone"
                    dataKey="acute"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Aiguë (7j)"
                  />
                  <Line
                    type="monotone"
                    dataKey="rawValue"
                    stroke="hsl(var(--accent))"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={{ r: 1 }}
                    name="Charge brute"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {/* Legend info */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500/30" />
                <span>Zone optimale (0.85 - 1.30)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500/30" />
                <span>Zone vigilance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500/30" />
                <span>Zone danger</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
