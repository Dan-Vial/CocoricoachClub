/**
 * Strips hidden test metadata (<!--TESTS:...-->) from session notes
 * and returns only the user-visible portion.
 */
export function getDisplayNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(/<!--TESTS:.*?-->/g, "").trim();
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
