/**
 * Weighted RPE Calculations Module
 * Calculates weighted average RPE based on session blocks and their durations
 */

export interface SessionBlock {
  id?: string;
  block_order: number;
  start_time?: string;
  end_time?: string;
  training_type: string;
  intensity?: number | null;
  notes?: string;
}

export interface WeightedRpeResult {
  weightedRpe: number;
  totalDuration: number;
  blockDetails: {
    training_type: string;
    duration: number;
    intensity: number;
    contribution: number; // percentage contribution to total
  }[];
  hasValidData: boolean;
}

/**
 * Parse time string (HH:MM) and return minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate duration in minutes between two time strings
 */
function calculateDurationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  // Handle cases where end is before start (shouldn't happen but safety)
  if (endMinutes <= startMinutes) return 0;
  
  return endMinutes - startMinutes;
}

/**
 * Calculate weighted average RPE from session blocks
 * Formula: Σ(duration × intensity) / Σ(duration)
 */
export function calculateWeightedRpe(blocks: SessionBlock[]): WeightedRpeResult {
  const validBlocks = blocks.filter(
    block => block.intensity != null && block.intensity > 0 && block.start_time && block.end_time
  );

  if (validBlocks.length === 0) {
    return {
      weightedRpe: 0,
      totalDuration: 0,
      blockDetails: [],
      hasValidData: false,
    };
  }

  let totalWeightedIntensity = 0;
  let totalDuration = 0;
  const blockDetails: WeightedRpeResult["blockDetails"] = [];

  validBlocks.forEach(block => {
    const duration = calculateDurationMinutes(block.start_time, block.end_time);
    const intensity = block.intensity || 0;
    
    if (duration > 0) {
      totalWeightedIntensity += duration * intensity;
      totalDuration += duration;
      
      blockDetails.push({
        training_type: block.training_type,
        duration,
        intensity,
        contribution: 0, // Will be calculated after we know total
      });
    }
  });

  // Calculate contribution percentage for each block
  blockDetails.forEach(detail => {
    detail.contribution = totalDuration > 0 
      ? Math.round((detail.duration / totalDuration) * 100) 
      : 0;
  });

  const weightedRpe = totalDuration > 0 
    ? Math.round((totalWeightedIntensity / totalDuration) * 100) / 100
    : 0;

  return {
    weightedRpe,
    totalDuration,
    blockDetails,
    hasValidData: totalDuration > 0,
  };
}

/**
 * Calculate RPE gap between planned (weighted) and actual (athlete reported)
 */
export function calculateRpeGap(
  plannedWeightedRpe: number,
  actualRpe: number
): {
  gap: number;
  status: "optimal" | "over" | "under";
  severity: "normal" | "warning" | "critical";
} {
  const gap = actualRpe - plannedWeightedRpe;
  
  let status: "optimal" | "over" | "under" = "optimal";
  let severity: "normal" | "warning" | "critical" = "normal";

  if (gap > 0) {
    status = "over"; // Athlete felt it was harder than planned
  } else if (gap < 0) {
    status = "under"; // Athlete felt it was easier than planned
  }

  const absGap = Math.abs(gap);
  if (absGap >= 3) {
    severity = "critical";
  } else if (absGap >= 2) {
    severity = "warning";
  }

  return { gap, status, severity };
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0min";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) return `${hours}h${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
}

/**
 * Check if multiple athletes have significant RPE gaps
 * Returns alert if more than threshold athletes report +2 or more
 */
export function checkTeamRpeAlert(
  athleteGaps: { playerId: string; playerName: string; gap: number }[],
  threshold: number = 5,
  gapThreshold: number = 2
): {
  hasAlert: boolean;
  message: string;
  affectedCount: number;
  affectedAthletes: { playerId: string; playerName: string; gap: number }[];
} {
  const affectedAthletes = athleteGaps.filter(a => a.gap >= gapThreshold);
  const hasAlert = affectedAthletes.length >= threshold;

  return {
    hasAlert,
    message: hasAlert 
      ? `${affectedAthletes.length} athlètes ont ressenti un effort supérieur de +${gapThreshold} points ou plus à l'intensité prévue`
      : "",
    affectedCount: affectedAthletes.length,
    affectedAthletes,
  };
}
