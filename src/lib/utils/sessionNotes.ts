/**
 * Strips hidden test metadata (<!--TESTS:...-->) from session notes
 * and returns only the user-visible portion.
 */
export function getDisplayNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\n?<!--TESTS:.*?-->/g, "")
    .replace(/\n?<!--PRECISION_EXERCISE:.*?-->/g, "")
    .replace(/\n?\[precision_exercise:.*?\]/g, "")
    .trim();
}

/**
 * Parses test config from session notes metadata.
 */
export function parseTestsFromNotes(notes: string | null | undefined): Array<{ test_category: string; test_type: string; result_unit?: string }> {
  if (!notes) return [];
  const match = notes.match(/<!--TESTS:(.*?)-->/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

export function parsePrecisionExerciseFromNotes(notes: string | null | undefined): { id: string | null; label: string } | null {
  if (!notes) return null;

  // New format: <!--PRECISION_EXERCISE:{"id":"...","label":"..."}-->
  const match = notes.match(/<!--PRECISION_EXERCISE:(.*?)-->/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (!parsed || typeof parsed.label !== "string" || !parsed.label.trim()) {
        return null;
      }
      return {
        id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id : null,
        label: parsed.label.trim(),
      };
    } catch {
      return null;
    }
  }

  // Legacy format: [precision_exercise:category|label]
  const legacyMatch = notes.match(/\[precision_exercise:(.*?)\|(.*?)\]/);
  if (legacyMatch) {
    return {
      id: legacyMatch[1] || null,
      label: legacyMatch[2] || "Précision",
    };
  }

  return null;
}
