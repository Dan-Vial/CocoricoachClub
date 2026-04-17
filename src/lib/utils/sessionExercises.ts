interface SessionExerciseRow {
  training_session_id: string;
  player_id?: string | null;
  order_index?: number | null;
  exercise_name: string;
  group_id?: string | null;
}

const normalizeExerciseName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export function resolveSessionExerciseRows<T extends SessionExerciseRow>(
  rows: T[],
  playerId: string,
): T[] {
  const rowsBySession = new Map<string, T[]>();

  rows.forEach((row) => {
    const existing = rowsBySession.get(row.training_session_id) ?? [];
    existing.push(row);
    rowsBySession.set(row.training_session_id, existing);
  });

  const resolved: T[] = [];

  rowsBySession.forEach((sessionRows) => {
    const mine = sessionRows.filter((row) => row.player_id === playerId);
    if (mine.length > 0) {
      resolved.push(...mine);
      return;
    }

    const templateRows = sessionRows.filter((row) => !row.player_id);
    if (templateRows.length === 0) {
      return;
    }

    const seen = new Set<string>();
    templateRows.forEach((row) => {
      const key = [
        row.order_index ?? "",
        normalizeExerciseName(row.exercise_name),
        row.group_id ?? "",
      ].join("|");

      if (seen.has(key)) return;
      seen.add(key);
      resolved.push(row);
    });
  });

  return resolved;
}