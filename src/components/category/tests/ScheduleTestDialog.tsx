import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";

interface ScheduleTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  testCategoryLabel: string;
  testTypeLabel: string;
  testCategory: string;
  testType: string;
  testUnit: string;
}

export function ScheduleTestDialog({
  open,
  onOpenChange,
  categoryId,
  testCategoryLabel,
  testTypeLabel,
  testCategory,
  testType,
  testUnit,
}: ScheduleTestDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const queryClient = useQueryClient();

  const scheduleTest = useMutation({
    mutationFn: async () => {
      const testMeta = JSON.stringify([
        {
          test_category: testCategory,
          test_type: testType,
          result_unit: testUnit,
        },
      ]);

      const { error } = await supabase.from("training_sessions").insert({
        category_id: categoryId,
        session_date: date,
        session_start_time: startTime,
        session_end_time: endTime,
        training_type: "test",
        notes: `<!--TESTS:${testMeta}-->`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["today_sessions", categoryId] });
      toast.success(`Test "${testTypeLabel}" planifié au calendrier`);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de la planification");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Planifier un test
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium">{testCategoryLabel}</p>
            <p className="text-sm text-muted-foreground">{testTypeLabel}</p>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Heure de début</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure de fin</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => scheduleTest.mutate()}
            disabled={!date || scheduleTest.isPending}
          >
            {scheduleTest.isPending ? "Planification..." : "Planifier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
