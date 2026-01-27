export type CsvParseResult = {
  rows: string[][];
  delimiter: "," | ";" | "\t";
};

const CANDIDATE_DELIMITERS: CsvParseResult["delimiter"][] = [",", ";", "\t"];

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped quotes "" inside quoted fields
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) count++;
  }

  return count;
}

function detectDelimiter(sampleLines: string[]): CsvParseResult["delimiter"] {
  const scores: Record<CsvParseResult["delimiter"], number> = {
    ",": 0,
    ";": 0,
    "\t": 0,
  };

  for (const line of sampleLines) {
    for (const d of CANDIDATE_DELIMITERS) {
      scores[d] += countDelimiterOutsideQuotes(line, d);
    }
  }

  const best = (Object.entries(scores) as [CsvParseResult["delimiter"], number][]) // typed
    .sort((a, b) => b[1] - a[1])[0];

  // Fallback to comma if nothing found
  return best?.[1] > 0 ? best[0] : ",";
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse a CSV/TSV text by detecting the delimiter (comma/semicolon/tab).
 * Important: we only split on ONE delimiter to avoid breaking French decimals like "20,11".
 */
export function parseCsvText(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\uFEFF/, "")) // remove BOM
    .filter((l) => l.trim().length > 0);

  const delimiter = detectDelimiter(lines.slice(0, 10));
  const rows = lines.map((line) => splitDelimitedLine(line, delimiter));

  return { rows, delimiter };
}
