import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateEWMASeries, transformToDailyLoadData } from "@/lib/trainingLoadCalculations";

interface PlayerAwcrTabProps {
  playerId: string;
  categoryId: string;
}

export function PlayerAwcrTab({ playerId, categoryId }: PlayerAwcrTabProps) {
  const { data: awcrData } = useQuery({
    queryKey: ["awcr_tracking", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("*")
        .eq("player_id", playerId)
        .order("session_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch team AWCR average
  const { data: teamAwcrAvg } = useQuery({
    queryKey: ["team_awcr_avg", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awcr_tracking")
        .select("awcr, training_load")
        .eq("category_id", categoryId)
        .not("awcr", "is", null);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const avgAwcr = data.reduce((sum, row) => sum + (row.awcr || 0), 0) / data.length;
      const avgLoad = data.reduce((sum, row) => sum + (row.training_load || 0), 0) / data.length;
      
      return { avgAwcr, avgLoad };
    },
  });

  const chartData = awcrData?.map((entry) => ({
    date: new Date(entry.session_date).toLocaleDateString("fr-FR"),
    awcr: entry.awcr,
    chargeAigue: entry.acute_load,
    chargeChroniique: entry.chronic_load,
    charge: entry.training_load,
  }));

  // Calculate EWMA data for table
  const ewmaResults = awcrData && awcrData.length > 0 
    ? calculateEWMASeries(transformToDailyLoadData(awcrData, []), "sRPE")
    : [];

  return (
    <div className="space-y-6">
      {chartData && chartData.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle>Évolution AWCR</CardTitle>
            <p className="text-sm text-muted-foreground">
              Zone optimale: 0.8 - 1.3 (zone verte)
            </p>
            {teamAwcrAvg && awcrData && awcrData.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                AWCR moyen équipe: {teamAwcrAvg.avgAwcr.toFixed(2)} | 
                Dernier AWCR: {awcrData[awcrData.length - 1].awcr?.toFixed(2)}
                {awcrData[awcrData.length - 1].awcr && (
                  <span className={`ml-2 font-semibold ${
                    Math.abs(awcrData[awcrData.length - 1].awcr - 1.0) < Math.abs(teamAwcrAvg.avgAwcr - 1.0)
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}>
                    ({Math.abs(awcrData[awcrData.length - 1].awcr - 1.0) < Math.abs(teamAwcrAvg.avgAwcr - 1.0) 
                      ? "Plus proche de l'optimal" 
                      : "Similaire à l'équipe"})
                  </span>
                )}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0.8} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <ReferenceLine y={1.3} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="awcr"
                  stroke="hsl(var(--primary))"
                  name="AWCR"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {chartData && chartData.length > 0 && (
        <Card className="bg-gradient-card shadow-md">
          <CardHeader>
            <CardTitle>Évolution des charges</CardTitle>
            {teamAwcrAvg && (
              <p className="text-sm text-muted-foreground">
                Charge moyenne équipe: {teamAwcrAvg.avgLoad.toFixed(0)}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="charge"
                  stroke="hsl(var(--primary))"
                  name="Charge"
                />
                <Line
                  type="monotone"
                  dataKey="chargeAigue"
                  stroke="hsl(var(--accent))"
                  name="Charge Aiguë"
                />
                <Line
                  type="monotone"
                  dataKey="chargeChroniique"
                  stroke="hsl(var(--secondary))"
                  name="Charge Chronique"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle>Historique EWMA</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Ratio EWMA = Charge Aiguë (7j) / Charge Chronique (28j) | Zone optimale: 0.85 - 1.30
          </p>
        </CardHeader>
        <CardContent>
          {awcrData && awcrData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>RPE</TableHead>
                    <TableHead>Durée (min)</TableHead>
                    <TableHead>sRPE</TableHead>
                    <TableHead>EWMA Aiguë (7j)</TableHead>
                    <TableHead>EWMA Chronique (28j)</TableHead>
                    <TableHead>Ratio EWMA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ewmaResults.map((result) => {
                    const sourceData = awcrData.find(d => d.session_date === result.date);
                    return (
                      <TableRow key={result.date}>
                        <TableCell>
                          {new Date(result.date).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>{sourceData?.rpe}/10</TableCell>
                        <TableCell>{sourceData?.duration_minutes}</TableCell>
                        <TableCell className="font-semibold">{sourceData?.training_load}</TableCell>
                        <TableCell>{result.acute.toFixed(1)}</TableCell>
                        <TableCell>{result.chronic.toFixed(1)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              result.ratio < 0.85 || result.ratio > 1.3
                                ? "text-destructive"
                                : "text-primary"
                            }`}
                          >
                            {result.ratio.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucune donnée EWMA disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
