import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, User, Link2, Eye, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AddGatheringWellnessDialog } from "./AddGatheringWellnessDialog";
import { GatheringWellnessComparisonDialog } from "./GatheringWellnessComparisonDialog";

interface GatheringWellnessTabProps {
  categoryId: string;
}

const LOAD_COLORS: Record<string, string> = {
  full: "bg-green-500 text-white",
  adapted: "bg-yellow-500 text-black",
  light: "bg-orange-500 text-white",
  rest: "bg-red-500 text-white",
};

const LOAD_LABELS: Record<string, string> = {
  full: "Complète",
  adapted: "Adaptée",
  light: "Légère",
  rest: "Repos",
};

export function GatheringWellnessTab({ categoryId }: GatheringWellnessTabProps) {
  const [isAddPreOpen, setIsAddPreOpen] = useState(false);
  const [isAddDayOfOpen, setIsAddDayOfOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [comparisonData, setComparisonData] = useState<{
    preAssessment: any;
    dayOfAssessment: any;
  } | null>(null);

  // Fetch events for filter
  const { data: events } = useQuery({
    queryKey: ["national_team_events_wellness", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("national_team_events")
        .select("id, name, start_date")
        .eq("category_id", categoryId)
        .in("event_type", ["stage", "rassemblement"])
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch assessments
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["gathering_wellness", categoryId, selectedEventId],
    queryFn: async () => {
      let query = supabase
        .from("gathering_wellness_assessments")
        .select(`
          *,
          players(id, name),
          national_team_events(id, name, start_date)
        `)
        .eq("category_id", categoryId)
        .order("assessment_date", { ascending: false });

      if (selectedEventId !== "all") {
        query = query.eq("event_id", selectedEventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const preGatheringAssessments = assessments?.filter(a => a.assessment_type === "pre_gathering") || [];
  const dayOfAssessments = assessments?.filter(a => a.assessment_type === "day_of") || [];

  // Find linked assessments for comparison
  const findLinkedAssessment = (assessment: any) => {
    if (assessment.assessment_type === "day_of" && assessment.linked_assessment_id) {
      return assessments?.find(a => a.id === assessment.linked_assessment_id);
    }
    if (assessment.assessment_type === "pre_gathering") {
      return assessments?.find(a => a.linked_assessment_id === assessment.id);
    }
    return null;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "";
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const renderAssessmentTable = (data: any[], type: "pre_gathering" | "day_of") => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Joueur</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Événement</TableHead>
          <TableHead className="text-center">Fatigue</TableHead>
          <TableHead className="text-center">Sommeil</TableHead>
          <TableHead className="text-center">Stress</TableHead>
          <TableHead className="text-center">Motivation</TableHead>
          <TableHead>Douleurs</TableHead>
          <TableHead>Charge rec.</TableHead>
          <TableHead>Lien</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
              Aucun bilan enregistré
            </TableCell>
          </TableRow>
        ) : (
          data.map((assessment) => {
            const linkedAssessment = findLinkedAssessment(assessment);
            return (
              <TableRow key={assessment.id}>
                <TableCell className="font-medium">
                  {assessment.players?.name}
                </TableCell>
                <TableCell>
                  {format(new Date(assessment.assessment_date), "dd MMM yyyy", { locale: fr })}
                </TableCell>
                <TableCell>
                  {assessment.national_team_events?.name || "-"}
                </TableCell>
                <TableCell className={`text-center font-semibold ${getScoreColor(assessment.fatigue_level)}`}>
                  {assessment.fatigue_level}/5
                </TableCell>
                <TableCell className={`text-center font-semibold ${getScoreColor(assessment.sleep_quality)}`}>
                  {assessment.sleep_quality}/5
                </TableCell>
                <TableCell className={`text-center font-semibold ${getScoreColor(assessment.stress_level)}`}>
                  {assessment.stress_level}/5
                </TableCell>
                <TableCell className={`text-center font-semibold ${getScoreColor(assessment.motivation_level)}`}>
                  {assessment.motivation_level}/5
                </TableCell>
                <TableCell>
                  {assessment.has_pain ? (
                    <Badge variant="destructive" className="text-xs">
                      Oui ({assessment.pain_locations?.length || 0} zones)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Non</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {assessment.recommended_load && (
                    <Badge className={LOAD_COLORS[assessment.recommended_load]}>
                      {LOAD_LABELS[assessment.recommended_load]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {linkedAssessment ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setComparisonData({
                        preAssessment: type === "pre_gathering" ? assessment : linkedAssessment,
                        dayOfAssessment: type === "day_of" ? assessment : linkedAssessment,
                      })}
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-1" />
                      Comparer
                    </Button>
                  ) : type === "pre_gathering" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Open day of dialog with linked assessment
                        setIsAddDayOfOpen(true);
                      }}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Lier Jour J
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  // Stats
  const totalPre = preGatheringAssessments.length;
  const totalDayOf = dayOfAssessments.length;
  const linkedCount = dayOfAssessments.filter(a => a.linked_assessment_id).length;
  const playersWithPain = assessments?.filter(a => a.has_pain).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Bilans de Rassemblement</h3>
          <p className="text-sm text-muted-foreground">
            Suivi wellness détaillé avant et pendant les rassemblements
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddPreOpen(true)} variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Bilan Pré-Rassemblement
          </Button>
          <Button onClick={() => setIsAddDayOfOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Bilan Jour J
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bilans Pré-Rassemblement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPre}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Bilans Jour J
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDayOf}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Bilans Liés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Athlètes avec douleurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{playersWithPain}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Filtrer par événement:</span>
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Tous les événements" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les événements</SelectItem>
            {events?.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name} - {format(new Date(event.start_date), "dd/MM/yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tables */}
      <Tabs defaultValue="pre_gathering" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pre_gathering" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Pré-Rassemblement ({totalPre})
          </TabsTrigger>
          <TabsTrigger value="day_of" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Jour J ({totalDayOf})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre_gathering">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : (
                renderAssessmentTable(preGatheringAssessments, "pre_gathering")
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="day_of">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : (
                renderAssessmentTable(dayOfAssessments, "day_of")
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddGatheringWellnessDialog
        open={isAddPreOpen}
        onOpenChange={setIsAddPreOpen}
        categoryId={categoryId}
        assessmentType="pre_gathering"
      />

      <AddGatheringWellnessDialog
        open={isAddDayOfOpen}
        onOpenChange={setIsAddDayOfOpen}
        categoryId={categoryId}
        assessmentType="day_of"
      />

      {comparisonData && (
        <GatheringWellnessComparisonDialog
          open={!!comparisonData}
          onOpenChange={() => setComparisonData(null)}
          preAssessment={comparisonData.preAssessment}
          dayOfAssessment={comparisonData.dayOfAssessment}
        />
      )}
    </div>
  );
}
