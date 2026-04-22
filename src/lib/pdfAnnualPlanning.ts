import jsPDF from "jspdf";
import { format, getDaysInMonth, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface PeriodizationCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface PeriodizationCycle {
  id: string;
  periodization_category_id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  notes: string | null;
  cycle_type: string | null;
  intensity: number | null;
  volume: number | null;
}

interface MatchInfo {
  id: string;
  match_date: string;
  opponent?: string;
  competition?: string | null;
  is_finalized?: boolean | null;
  event_type?: string | null;
}

export interface AnnualPlanningPdfData {
  year: number;
  categoryName: string;
  clubName?: string;
  categories: PeriodizationCategory[];
  cycles: PeriodizationCycle[];
  matches: MatchInfo[];
}

// ─── Helpers ───
const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = (hex || "#888888").replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [136, 136, 136];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const luminance = (rgb: [number, number, number]) =>
  (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

const dayInitial = (date: Date): string => {
  const map = ["D", "L", "M", "M", "J", "V", "S"];
  return map[date.getDay()];
};

const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;

function cyclesActiveInMonth(
  cycles: PeriodizationCycle[],
  year: number,
  month: number,
): PeriodizationCycle[] {
  const ms = startOfMonth(new Date(year, month, 1));
  const me = endOfMonth(new Date(year, month, 1));
  return cycles.filter((c) => {
    const cs = startOfDay(new Date(c.start_date));
    const ce = startOfDay(new Date(c.end_date));
    return ce >= ms && cs <= me;
  });
}

function cycleForDay(
  monthCycles: PeriodizationCycle[],
  date: Date,
): PeriodizationCycle | null {
  const d = startOfDay(date);
  for (const c of monthCycles) {
    const cs = startOfDay(new Date(c.start_date));
    const ce = startOfDay(new Date(c.end_date));
    if (d >= cs && d <= ce) return c;
  }
  return null;
}

function monthThematicIntensity(
  cycles: PeriodizationCycle[],
  categoryId: string | null,
  year: number,
  month: number,
): { value: number | null; daysCovered: number } {
  const totalDays = getDaysInMonth(new Date(year, month, 1));
  let weighted = 0;
  let daysWithIntensity = 0;

  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(year, month, d);
    const dayCycles = cycles.filter((c) => {
      if (categoryId && c.periodization_category_id !== categoryId) return false;
      const cs = startOfDay(new Date(c.start_date));
      const ce = startOfDay(new Date(c.end_date));
      return day >= cs && day <= ce;
    });
    if (dayCycles.length === 0) continue;
    const dayIntensities = dayCycles
      .map((c) => c.intensity)
      .filter((v): v is number => v != null);
    if (dayIntensities.length === 0) continue;
    const dayMax =
      categoryId === null
        ? dayIntensities.reduce((a, b) => a + b, 0) / dayIntensities.length
        : Math.max(...dayIntensities);
    weighted += dayMax;
    daysWithIntensity++;
  }

  if (daysWithIntensity === 0) return { value: null, daysCovered: 0 };
  return { value: weighted / daysWithIntensity, daysCovered: daysWithIntensity };
}

function drawVerticalText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxLength: number,
) {
  if (!text) return;
  const safe = text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
  pdf.text(safe, x, y, { angle: 90 });
}

function renderCalendarPage(pdf: jsPDF, data: AnnualPlanningPdfData) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;

  // ── Header band ──
  pdf.setFillColor(28, 33, 50);
  pdf.rect(0, 0, pageW, 18, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`Planification annuelle ${data.year}`, margin, 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const subtitle = [data.clubName, data.categoryName].filter(Boolean).join(" • ");
  if (subtitle) pdf.text(subtitle, margin, 14);

  pdf.setFontSize(7.5);
  pdf.text(
    `Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`,
    pageW - margin,
    8,
    { align: "right" },
  );

  // ── Layout ──
  const monthsCount = 12;
  const gridLeft = margin;
  const gridRight = pageW - margin;
  const totalGridW = gridRight - gridLeft;

  const dayInitialW = 2.6;
  const dayNumberW = 3.2;
  const monthLabelW = dayInitialW + dayNumberW;

  // Build matches list (excluding training events) for footer rendering
  const sortedMatches = (data.matches || [])
    .filter((m) => m.match_date && m.event_type !== "training")
    .sort((a, b) => a.match_date.localeCompare(b.match_date));
  const compsRowsCount = Math.min(2, Math.ceil(sortedMatches.length / 6));
  const competitionsBlockH = sortedMatches.length === 0 ? 0 : 6 + compsRowsCount * 4.5;

  const intensityRowH = 5.5;
  const intensityRows = data.categories.length + 1;
  const intensityBlockH = 8 + intensityRows * intensityRowH;
  const legendH = 8;
  const footerH = legendH + intensityBlockH + competitionsBlockH + 4;

  const gridTop = 22;
  const gridBottom = pageH - footerH;
  const monthHeaderH = 7;
  const dayRowH = (gridBottom - gridTop - monthHeaderH) / 31;

  const monthWidth = totalGridW / monthsCount;
  const cyclesAreaW = monthWidth - monthLabelW;

  // Matches by day
  const matchesByDate = new Map<string, MatchInfo[]>();
  sortedMatches.forEach((m) => {
    const key = m.match_date.split("T")[0];
    if (!matchesByDate.has(key)) matchesByDate.set(key, []);
    matchesByDate.get(key)!.push(m);
  });

  // Order categories
  const orderedCats = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);

  // Cycles per month
  const cycleSortKey = (c: PeriodizationCycle) => {
    const cat = orderedCats.find((cc) => cc.id === c.periodization_category_id);
    const catOrder = cat?.sort_order ?? 999;
    return catOrder * 1e10 + new Date(c.start_date).getTime();
  };
  const monthCyclesArr: PeriodizationCycle[][] = [];
  for (let m = 0; m < 12; m++) {
    const cs = cyclesActiveInMonth(data.cycles, data.year, m).sort(
      (a, b) => cycleSortKey(a) - cycleSortKey(b),
    );
    monthCyclesArr.push(cs);
  }

  const monthLabels = [
    "JANV.", "FÉVR.", "MARS", "AVRIL", "MAI", "JUIN",
    "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC.",
  ];

  const today = startOfDay(new Date());

  // ── Month headers ──
  for (let m = 0; m < 12; m++) {
    const x = gridLeft + m * monthWidth;
    pdf.setFillColor(28, 33, 50);
    pdf.rect(x, gridTop, monthWidth, monthHeaderH, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(`${monthLabels[m]} ${data.year}`, x + monthWidth / 2, gridTop + monthHeaderH / 2 + 1.4, {
      align: "center",
    });
  }

  // ── Each month ──
  for (let m = 0; m < 12; m++) {
    const xMonth = gridLeft + m * monthWidth;
    const daysInMonth = getDaysInMonth(new Date(data.year, m, 1));
    const monthCycles = monthCyclesArr[m];
    const subCols = Math.max(1, monthCycles.length);
    const subColW = cyclesAreaW / subCols;
    const xCyclesStart = xMonth + monthLabelW;

    // Day-label cells
    for (let d = 1; d <= 31; d++) {
      const y = gridTop + monthHeaderH + (d - 1) * dayRowH;

      if (d > daysInMonth) {
        pdf.setFillColor(235, 237, 242);
        pdf.rect(xMonth, y, monthLabelW, dayRowH, "F");
        pdf.setDrawColor(220, 222, 230);
        pdf.setLineWidth(0.1);
        pdf.rect(xMonth, y, monthLabelW, dayRowH, "S");
        continue;
      }

      const date = new Date(data.year, m, d);
      const weekend = isWeekend(date);
      const initial = dayInitial(date);

      // Day initial
      pdf.setFillColor(weekend ? 220 : 240, weekend ? 224 : 244, weekend ? 232 : 250);
      pdf.rect(xMonth, y, dayInitialW, dayRowH, "F");
      pdf.setDrawColor(210, 213, 222);
      pdf.setLineWidth(0.08);
      pdf.rect(xMonth, y, dayInitialW, dayRowH, "S");
      pdf.setTextColor(weekend ? 120 : 60, weekend ? 30 : 65, weekend ? 30 : 80);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(5.5, dayRowH * 0.55));
      pdf.text(initial, xMonth + dayInitialW / 2, y + dayRowH / 2 + 1, { align: "center" });

      // Day number
      pdf.setFillColor(weekend ? 230 : 248, weekend ? 233 : 250, weekend ? 240 : 253);
      pdf.rect(xMonth + dayInitialW, y, dayNumberW, dayRowH, "F");
      pdf.setDrawColor(210, 213, 222);
      pdf.rect(xMonth + dayInitialW, y, dayNumberW, dayRowH, "S");
      pdf.setTextColor(40, 45, 60);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(5.5, dayRowH * 0.55));
      pdf.text(String(d), xMonth + dayInitialW + dayNumberW / 2, y + dayRowH / 2 + 1, { align: "center" });
    }

    // Cycle sub-columns
    for (let s = 0; s < subCols; s++) {
      const cycle = monthCycles[s] ?? null;
      const xCol = xCyclesStart + s * subColW;
      const colColor: [number, number, number] = cycle ? hexToRgb(cycle.color) : [255, 255, 255];

      for (let d = 1; d <= 31; d++) {
        const y = gridTop + monthHeaderH + (d - 1) * dayRowH;

        if (d > daysInMonth) {
          pdf.setFillColor(235, 237, 242);
          pdf.rect(xCol, y, subColW, dayRowH, "F");
          pdf.setDrawColor(220, 222, 230);
          pdf.setLineWidth(0.1);
          pdf.rect(xCol, y, subColW, dayRowH, "S");
          continue;
        }

        const date = new Date(data.year, m, d);
        const weekend = isWeekend(date);
        const cellHasCycle = cycle && cycleForDay([cycle], date) !== null;

        if (cellHasCycle) {
          pdf.setFillColor(...colColor);
        } else {
          pdf.setFillColor(weekend ? 235 : 252, weekend ? 237 : 253, weekend ? 242 : 255);
        }
        pdf.rect(xCol, y, subColW, dayRowH, "F");

        pdf.setDrawColor(210, 213, 222);
        pdf.setLineWidth(0.08);
        pdf.rect(xCol, y, subColW, dayRowH, "S");
      }

      if (s < subCols - 1) {
        pdf.setDrawColor(255, 255, 255);
        pdf.setLineWidth(0.4);
        pdf.line(
          xCol + subColW,
          gridTop + monthHeaderH,
          xCol + subColW,
          gridTop + monthHeaderH + 31 * dayRowH,
        );
      }

      if (cycle && cycle.name) {
        const colHeight = 31 * dayRowH;
        const colCenterX = xCol + subColW / 2;
        const colBottom = gridTop + monthHeaderH + colHeight - 2;
        const lum = luminance(colColor);
        pdf.setTextColor(...(lum > 0.55 ? ([30, 35, 50] as [number, number, number]) : ([255, 255, 255] as [number, number, number])));
        pdf.setFont("helvetica", "bold");
        const fs = Math.max(5, Math.min(7.5, subColW * 0.85));
        pdf.setFontSize(fs);
        const maxChars = Math.floor((colHeight - 4) / (fs * 0.42));
        drawVerticalText(pdf, cycle.name, colCenterX + fs * 0.35, colBottom, maxChars);
      }
    }

    // Competition markers (gold) inside the cycles area
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(data.year, m, d);
      const dateKey = format(date, "yyyy-MM-dd");
      const dayMatches = matchesByDate.get(dateKey);
      if (dayMatches && dayMatches.length > 0) {
        const y = gridTop + monthHeaderH + (d - 1) * dayRowH;
        const cx = xCyclesStart + cyclesAreaW / 2;
        const cy = y + dayRowH / 2;
        pdf.setFillColor(212, 160, 23); // gold
        pdf.setDrawColor(140, 100, 10);
        pdf.setLineWidth(0.3);
        pdf.circle(cx, cy, Math.min(1.5, dayRowH * 0.38), "FD");
      }

      if (date.getTime() === today.getTime()) {
        const y = gridTop + monthHeaderH + (d - 1) * dayRowH;
        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(0.5);
        pdf.rect(xMonth + 0.2, y + 0.2, monthWidth - 0.4, dayRowH - 0.4, "S");
        pdf.setLineWidth(0.15);
      }
    }
  }

  // ── Intensity rows block ──
  const intensityTop = gridBottom + 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(40, 45, 60);
  pdf.text("INTENSITÉ MOYENNE PAR MOIS (0-10)", margin, intensityTop);

  const intLabelW = 38;
  const intRowsTop = intensityTop + 3;
  const intColW = (gridRight - (margin + intLabelW)) / 12;

  const drawIntensityRow = (
    rowIndex: number,
    labelText: string,
    color: [number, number, number],
    catId: string | null,
  ) => {
    const y = intRowsTop + rowIndex * intensityRowH;

    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(margin, y, intLabelW, intensityRowH, "F");
    const lum = luminance(color);
    pdf.setTextColor(...(lum > 0.55 ? ([30, 35, 50] as [number, number, number]) : ([255, 255, 255] as [number, number, number])));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    const maxLabel = pdf.splitTextToSize(labelText, intLabelW - 3)[0] || labelText;
    pdf.text(maxLabel, margin + 2, y + intensityRowH / 2 + 1.2);

    for (let m = 0; m < 12; m++) {
      const x = margin + intLabelW + m * intColW;
      const { value } = monthThematicIntensity(data.cycles, catId, data.year, m);

      if (value === null) {
        pdf.setFillColor(245, 246, 248);
      } else {
        const t = Math.min(1, value / 10);
        const baseColor = catId === null ? ([60, 90, 200] as [number, number, number]) : color;
        const r = Math.round(255 - (255 - baseColor[0]) * t);
        const g = Math.round(255 - (255 - baseColor[1]) * t);
        const b = Math.round(255 - (255 - baseColor[2]) * t);
        pdf.setFillColor(r, g, b);
      }
      pdf.rect(x, y, intColW, intensityRowH, "F");
      pdf.setDrawColor(210, 213, 222);
      pdf.setLineWidth(0.1);
      pdf.rect(x, y, intColW, intensityRowH, "S");

      if (value !== null) {
        const t = Math.min(1, value / 10);
        const useWhite = t > 0.55;
        pdf.setTextColor(useWhite ? 255 : 30, useWhite ? 255 : 35, useWhite ? 255 : 50);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.text(value.toFixed(1), x + intColW / 2, y + intensityRowH / 2 + 1.2, {
          align: "center",
        });
      }
    }
  };

  orderedCats.forEach((cat, idx) => {
    drawIntensityRow(idx, cat.name, hexToRgb(cat.color), cat.id);
  });
  drawIntensityRow(orderedCats.length, "Mix global", [60, 90, 200], null);

  // ── Competitions list ──
  let competitionsTop = intRowsTop + intensityRows * intensityRowH + 4;
  if (sortedMatches.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 45, 60);
    pdf.text("COMPÉTITIONS", margin, competitionsTop);

    const itemY = competitionsTop + 3;
    const perRow = 6;
    const itemW = (gridRight - margin) / perRow;

    sortedMatches.slice(0, perRow * 2).forEach((mt, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = margin + col * itemW;
      const y = itemY + row * 4.5;

      // Gold pastille
      pdf.setFillColor(212, 160, 23);
      pdf.setDrawColor(140, 100, 10);
      pdf.setLineWidth(0.2);
      pdf.circle(x + 1.5, y - 0.6, 1.1, "FD");

      // Date + opponent/competition
      const dateLabel = format(new Date(mt.match_date), "dd/MM", { locale: fr });
      const label = mt.opponent || mt.competition || "Compétition";
      const fullText = `${dateLabel} · ${label}`;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(50, 55, 70);
      const maxTextW = itemW - 5;
      const truncated = pdf.splitTextToSize(fullText, maxTextW)[0] || fullText;
      pdf.text(truncated, x + 3.5, y);
    });

    competitionsTop = itemY + Math.min(2, Math.ceil(sortedMatches.length / perRow)) * 4.5;
  }

  // ── Legend ──
  const legendY = competitionsTop + 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(40, 45, 60);
  pdf.text("LÉGENDE", margin, legendY);

  let lx = margin + 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  orderedCats.forEach((cat) => {
    const rgb = hexToRgb(cat.color);
    const labelW2 = pdf.getTextWidth(cat.name) + 8;
    if (lx + labelW2 > pageW - margin - 60) return;
    pdf.setFillColor(...rgb);
    pdf.rect(lx, legendY - 2.6, 4, 3.2, "F");
    pdf.setDrawColor(180, 183, 192);
    pdf.rect(lx, legendY - 2.6, 4, 3.2, "S");
    pdf.setTextColor(60, 65, 80);
    pdf.text(cat.name, lx + 5, legendY);
    lx += labelW2 + 4;
  });

  const rightLegendX = pageW - margin - 55;
  pdf.setFillColor(212, 160, 23);
  pdf.setDrawColor(140, 100, 10);
  pdf.setLineWidth(0.2);
  pdf.circle(rightLegendX, legendY - 1, 1, "FD");
  pdf.setTextColor(60, 65, 80);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Compétition", rightLegendX + 2, legendY);

  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(0.5);
  pdf.rect(rightLegendX + 26, legendY - 2.4, 3, 3, "S");
  pdf.setLineWidth(0.15);
  pdf.text("Aujourd'hui", rightLegendX + 30, legendY);

  pdf.setDrawColor(220, 222, 230);
  pdf.line(margin, pageH - 5, pageW - margin, pageH - 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(130, 135, 150);
  pdf.text("CocoriCoach Club", pageW - margin, pageH - 1.8, { align: "right" });
}

export function exportAnnualPlanningToPdf(data: AnnualPlanningPdfData) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  renderCalendarPage(pdf, data);
  const fname = `planification-annuelle-${data.year}-${(data.categoryName || "categorie")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.pdf`;
  pdf.save(fname);
}
