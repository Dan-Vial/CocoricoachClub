import { supabase } from "@/integrations/supabase/client";

/**
 * Copies all exercises from a protocol's phases into player_rehab_exercises
 * for per-athlete customization.
 */
export async function copyProtocolExercisesToPlayer(
  playerRehabProtocolId: string,
  protocolId: string
) {
  // Fetch all phases with exercises
  const { data: phases, error: phasesError } = await supabase
    .from("protocol_phases")
    .select(`
      id,
      phase_number,
      protocol_exercises (*)
    `)
    .eq("protocol_id", protocolId)
    .order("phase_number");

  if (phasesError) {
    console.error("Error fetching protocol phases for copy:", phasesError);
    throw phasesError;
  }

  if (!phases || phases.length === 0) return;

  const exercisesToInsert: any[] = [];

  for (const phase of phases) {
    const exercises = (phase.protocol_exercises as any[]) || [];
    const sorted = [...exercises].sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0));

    for (const ex of sorted) {
      exercisesToInsert.push({
        player_rehab_protocol_id: playerRehabProtocolId,
        phase_id: phase.id,
        phase_number: phase.phase_number,
        source_exercise_id: ex.id,
        name: ex.name,
        description: ex.description || null,
        sets: ex.sets,
        reps: ex.reps || null,
        frequency: ex.frequency || null,
        exercise_order: ex.exercise_order || 0,
        image_url: ex.image_url || null,
        video_url: ex.video_url || null,
        notes: ex.notes || null,
      });
    }
  }

  if (exercisesToInsert.length > 0) {
    const { error } = await supabase
      .from("player_rehab_exercises")
      .insert(exercisesToInsert);

    if (error) {
      console.error("Error copying exercises to player:", error);
      throw error;
    }
  }

  return exercisesToInsert.length;
}
