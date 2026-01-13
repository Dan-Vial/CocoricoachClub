import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { PeriodizationCalendar } from "./PeriodizationCalendar";
import { PeriodsSection } from "./PeriodsSection";
import { CyclesSection } from "./CyclesSection";
import { LoadObjectivesSection } from "./LoadObjectivesSection";
import { exportPeriodizationToPdf, printElement } from "@/lib/pdfExport";

interface PeriodizationTabProps {
  categoryId: string;
}

export function PeriodizationTab({ categoryId }: PeriodizationTabProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch data for PDF export
  const { data: periods } = useQuery({
    queryKey: ["training-periods", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_periods")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });

  const { data: cycles } = useQuery({
    queryKey: ["training-cycles", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_cycles")
        .select("*")
        .eq("category_id", categoryId)
        .order("start_date");
      if (error) throw error;
      return data;
    },
  });

  const handleExportPdf = () => {
    exportPeriodizationToPdf(
      periods || [],
      cycles || [],
      [], // No separate objectives table
      "Catégorie"
    );
    toast.success("PDF exporté avec succès");
  };

  const handlePrint = () => {
    if (contentRef.current) {
      printElement(contentRef.current, "Périodisation");
    }
  };

  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle>Gestion de la Périodisation</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrint} title="Imprimer">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExportPdf} title="Exporter PDF">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={contentRef}>
        <Tabs defaultValue="objectives" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="objectives">Objectifs</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="periods">Périodes</TabsTrigger>
            <TabsTrigger value="cycles">Cycles</TabsTrigger>
          </TabsList>

          <TabsContent value="objectives">
            <LoadObjectivesSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="calendar">
            <PeriodizationCalendar categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="periods">
            <PeriodsSection categoryId={categoryId} />
          </TabsContent>

          <TabsContent value="cycles">
            <CyclesSection categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
