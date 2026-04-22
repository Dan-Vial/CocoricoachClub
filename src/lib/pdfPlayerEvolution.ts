import jsPDF from "jspdf";
import { format } from "date-fns";

export interface MatchPoint {
  matchId: string;
  matchDate: string;
  matchLabel: string;
  value: number;
}

export interface StatEvolutionData {
  statKey: string;
  statLabel: string;
  isPercent: boolean;
  points: MatchPoint[];
}

const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const NEUTRAL: [number, number, number] = [100, 116, 139];
const HEADER_BG: [number, number, number] = [241, 245, 249];
const HEADER_TEXT: [number, number, number] = [71, 85, 105];
const TEXT_DARK: [number, number, number] = [30, 41, 59];
const ZEBRA: [number, number, number] = [248, 250, 252];
const GRID: [number, number, number] = [226, 232, 240];

/**
 * Compute progression % between two values.
 * If `from` is 0 → returns null (no baseline) so caller renders "—".
 */
export function computeProgressionPct(from: number, to: number): number | null {
  if (from === 0 && to === 0) return 0;
  if (from === 0) return null;
  return Math.round(((to - from) / Math.abs(from)) * 100);
}

/**
 * Draws a per-match evolution table for a single stat, with a coloured
 * progression-percentage column (green/red).
 *
 * Returns the new Y position after drawing.
 */
export function drawStatEvolutionTable(
  doc: jsPDF,
  stat: StatEvolutionData,
  x: number,
  y: number,
  width: number,
  pageH: number
): number {
  const rowH = 6;
  const colDate = 28;
  const colMatch = width - colDate - 22 - 26;
  const colVal = 22;
  const colProg = 26;

  // Section title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(stat.statLabel, x, y);
  y += 4;

  // Header
  doc.setFillColor(...HEADER_BG);
  doc.rect(x, y, width, rowH, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...HEADER_TEXT);
  doc.text("Date", x + 1.5, y + 4);
  doc.text("Compétition", x + colDate + 1.5, y + 4);
  doc.text("Valeur", x + colDate + colMatch + colVal / 2, y + 4, { align: "center" });
  doc.text("Progression", x + colDate + colMatch + colVal + colProg / 2, y + 4, { align: "center" });
  y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  let prevValue: number | null = null;
  stat.points.forEach((pt, idx) => {
    if (y > pageH - 15) {
      doc.addPage();
      y = 15;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...ZEBRA);
      doc.rect(x, y, width, rowH, "F");
    }
    doc.setTextColor(...TEXT_DARK);
    const dateStr = pt.matchDate ? format(new Date(pt.matchDate), "dd/MM/yy") : "";
    doc.text(dateStr, x + 1.5, y + 4);
    const labelMaxChars = Math.floor(colMatch / 1.6);
    doc.text(pt.matchLabel.substring(0, labelMaxChars), x + colDate + 1.5, y + 4);
    const valStr = stat.isPercent ? `${pt.value}%` : String(pt.value);
    doc.text(valStr, x + colDate + colMatch + colVal / 2, y + 4, { align: "center" });

    // Progression cell with colored background
    const progCellX = x + colDate + colMatch + colVal;
    if (prevValue === null) {
      doc.setTextColor(...NEUTRAL);
      doc.text("—", progCellX + colProg / 2, y + 4, { align: "center" });
    } else {
      const pct = computeProgressionPct(prevValue, pt.value);
      if (pct === null) {
        // baseline 0 → show absolute delta with neutral colour
        doc.setTextColor(...NEUTRAL);
        const delta = pt.value - prevValue;
        doc.text(delta > 0 ? `+${delta}` : String(delta), progCellX + colProg / 2, y + 4, { align: "center" });
      } else {
        const color: [number, number, number] = pct > 0 ? GREEN : pct < 0 ? RED : NEUTRAL;
        // Light coloured pill background
        const tint = pct === 0 ? 0 : 0.18;
        if (tint > 0) {
          doc.setFillColor(
            Math.round(255 - (255 - color[0]) * tint),
            Math.round(255 - (255 - color[1]) * tint),
            Math.round(255 - (255 - color[2]) * tint)
          );
          doc.roundedRect(progCellX + 3, y + 1, colProg - 6, rowH - 2, 1, 1, "F");
        }
        doc.setTextColor(...color);
        doc.setFont("helvetica", "bold");
        doc.text(pct > 0 ? `+${pct}%` : `${pct}%`, progCellX + colProg / 2, y + 4, { align: "center" });
        doc.setFont("helvetica", "normal");
      }
    }
    prevValue = pt.value;
    y += rowH;
  });

  // Final overall progression badge
  if (stat.points.length >= 2) {
    const first = stat.points[0].value;
    const last = stat.points[stat.points.length - 1].value;
    const overall = computeProgressionPct(first, last);
    doc.setFontSize(7);
    if (overall !== null) {
      const color: [number, number, number] = overall > 0 ? GREEN : overall < 0 ? RED : NEUTRAL;
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Évolution globale : ${overall > 0 ? "+" : ""}${overall}% (${first} → ${last})`,
        x + 1.5,
        y + 4
      );
      doc.setFont("helvetica", "normal");
    } else {
      doc.setTextColor(...NEUTRAL);
      doc.text(`Évolution globale : ${first} → ${last}`, x + 1.5, y + 4);
    }
    y += 6;
  }

  return y + 2;
}

/**
 * Draws a small line chart for a single stat across matches.
 * Uses jsPDF primitives (no external dependency).
 *
 * Returns the new Y position after drawing.
 */
export function drawStatLineChart(
  doc: jsPDF,
  stat: StatEvolutionData,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const padL = 14;
  const padR = 6;
  const padT = 6;
  const padB = 12;
  const innerX = x + padL;
  const innerY = y + padT;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  // Chart frame
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height, "S");

  // Title
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Évolution — ${stat.statLabel}`, x + 2, y + 4);

  if (stat.points.length === 0) return y + height + 2;

  const values = stat.points.map((p) => p.value);
  let vMax = Math.max(...values, 1);
  let vMin = Math.min(...values, 0);
  if (vMax === vMin) {
    vMax = vMin + 1;
  }
  const range = vMax - vMin;

  // Y-axis (3 gridlines)
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...HEADER_TEXT);
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    const yPos = innerY + innerH - innerH * t;
    const val = Math.round((vMin + range * t) * 10) / 10;
    doc.setDrawColor(240, 244, 248);
    doc.line(innerX, yPos, innerX + innerW, yPos);
    doc.text(String(val), x + 2, yPos + 1.2);
  }

  // X-axis baseline
  doc.setDrawColor(...GRID);
  doc.line(innerX, innerY + innerH, innerX + innerW, innerY + innerH);

  // Plot line
  const xStep = stat.points.length > 1 ? innerW / (stat.points.length - 1) : 0;
  const points = stat.points.map((p, i) => {
    const px = innerX + i * xStep;
    const py = innerY + innerH - ((p.value - vMin) / range) * innerH;
    return { px, py, label: p.matchLabel, value: p.value };
  });

  // Color line based on overall trend
  const trendColor: [number, number, number] =
    stat.points.length >= 2 && stat.points[stat.points.length - 1].value > stat.points[0].value
      ? GREEN
      : stat.points.length >= 2 && stat.points[stat.points.length - 1].value < stat.points[0].value
      ? RED
      : [59, 130, 246];

  doc.setDrawColor(...trendColor);
  doc.setLineWidth(0.8);
  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1].px, points[i - 1].py, points[i].px, points[i].py);
  }

  // Dots + value labels
  doc.setFillColor(...trendColor);
  points.forEach((pt) => {
    doc.circle(pt.px, pt.py, 1.2, "F");
  });
  // Show value above each dot if room
  doc.setFontSize(6);
  doc.setTextColor(...TEXT_DARK);
  points.forEach((pt) => {
    const valStr = stat.isPercent ? `${pt.value}%` : String(pt.value);
    doc.text(valStr, pt.px, pt.py - 2, { align: "center" });
  });

  // X-axis labels (date short) — show only first / mid / last to avoid clutter
  doc.setFontSize(5.5);
  doc.setTextColor(...HEADER_TEXT);
  const xLabelIdx = stat.points.length <= 4
    ? stat.points.map((_, i) => i)
    : [0, Math.floor(stat.points.length / 2), stat.points.length - 1];
  xLabelIdx.forEach((i) => {
    const pt = points[i];
    const labelDate = stat.points[i].matchDate
      ? format(new Date(stat.points[i].matchDate), "dd/MM")
      : "";
    doc.text(labelDate, pt.px, innerY + innerH + 4, { align: "center" });
  });

  return y + height + 3;
}
