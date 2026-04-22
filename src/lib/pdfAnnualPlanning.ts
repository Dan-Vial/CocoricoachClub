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
  /** Month 0-11 the period starts at. Defaults to 0 (January). */
  startMonth?: number;
  /** Optional human label for the period (e.g. "Avril 2026 → Mars 2027"). */
  periodLabel?: string;
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

// Draws a refined gold trophy/cup icon centered on (cx, cy)
function drawTrophyIcon(pdf: jsPDF, cx: number, cy: number, size: number) {
  const gold: [number, number, number] = [230, 178, 36];
  const goldDark: [number, number, number] = [125, 88, 8];
  const goldLight: [number, number, number] = [255, 218, 110];
  const s = size;

  pdf.setLineWidth(0.18);
  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2]);

  // ── Base (pedestal) ──
  const baseW = s * 0.72;
  const baseH = s * 0.13;
  const baseY = cy + s * 0.45;
  pdf.setFillColor(goldDark[0], goldDark[1], goldDark[2]);
  pdf.rect(cx - baseW / 2, baseY, baseW, baseH, "FD");

  // ── Stem ──
  const stemW = s * 0.18;
  const stemH = s * 0.22;
  const stemY = baseY - stemH;
  pdf.setFillColor(gold[0], gold[1], gold[2]);
  pdf.rect(cx - stemW / 2, stemY, stemW, stemH, "FD");

  // ── Handles (left & right) — rendered as small ellipses behind the cup ──
  const handleW = s * 0.22;
  const handleH = s * 0.32;
  const handleCY = cy - s * 0.05;
  pdf.setFillColor(gold[0], gold[1], gold[2]);
  pdf.ellipse(cx - s * 0.42, handleCY, handleW / 2, handleH / 2, "FD");
  pdf.ellipse(cx + s * 0.42, handleCY, handleW / 2, handleH / 2, "FD");
  // Inner cutouts to hint at handle shape
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(255, 255, 255);
  pdf.ellipse(cx - s * 0.42, handleCY, handleW / 2 - s * 0.07, handleH / 2 - s * 0.07, "F");
  pdf.ellipse(cx + s * 0.42, handleCY, handleW / 2 - s * 0.07, handleH / 2 - s * 0.07, "F");

  // ── Cup bowl (main body) — rounded rectangle ──
  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2]);
  pdf.setFillColor(gold[0], gold[1], gold[2]);
  const bowlW = s * 0.62;
  const bowlH = s * 0.62;
  const bowlX = cx - bowlW / 2;
  const bowlY = cy - s * 0.42;
  pdf.roundedRect(bowlX, bowlY, bowlW, bowlH, s * 0.12, s * 0.12, "FD");

  // ── Highlight (light shine on left side of bowl) ──
  pdf.setFillColor(goldLight[0], goldLight[1], goldLight[2]);
  pdf.setDrawColor(goldLight[0], goldLight[1], goldLight[2]);
  pdf.roundedRect(
    bowlX + s * 0.08,
    bowlY + s * 0.08,
    s * 0.12,
    s * 0.36,
    s * 0.04,
    s * 0.04,
    "F",
  );
}

function renderCalendarPage(pdf: jsPDF, data: AnnualPlanningPdfData) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;

  // Build month sequence (12 months starting at startMonth)
  const startMonth = ((data.startMonth ?? 0) % 12 + 12) % 12;
  const monthsSeq: { year: number; month: number }[] = Array.from({ length: 12 }, (_, i) => {
    const totalMonth = startMonth + i;
    return { year: data.year + Math.floor(totalMonth / 12), month: totalMonth % 12 };
  });
  const lastMs = monthsSeq[11];
  const periodLabel = data.periodLabel ?? (
    startMonth === 0
      ? String(data.year)
      : `${data.year} → ${lastMs.year}`
  );

  // ── Header band ──
  pdf.setFillColor(28, 33, 50);
  pdf.rect(0, 0, pageW, 18, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`Planification annuelle ${periodLabel}`, margin, 8);

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

  const dayInitialW = 3.6;
  const dayNumberW = 4.4;
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
  const intensityScaleH = 9; // 0→10 color scale legend
  const legendH = 8;
  const footerH = legendH + intensityBlockH + intensityScaleH + competitionsBlockH + 4;

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
  for (let i = 0; i < 12; i++) {
    const { year: yy, month: mm } = monthsSeq[i];
    const cs = cyclesActiveInMonth(data.cycles, yy, mm).sort(
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
  for (let i = 0; i < 12; i++) {
    const { year: yy, month: mm } = monthsSeq[i];
    const x = gridLeft + i * monthWidth;
    pdf.setFillColor(28, 33, 50);
    pdf.rect(x, gridTop, monthWidth, monthHeaderH, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(`${monthLabels[mm]} ${yy}`, x + monthWidth / 2, gridTop + monthHeaderH / 2 + 1.4, {
      align: "center",
    });
  }

  // ── Each month ──
  for (let i = 0; i < 12; i++) {
    const { year: yy, month: mm } = monthsSeq[i];
    const xMonth = gridLeft + i * monthWidth;
    const daysInMonth = getDaysInMonth(new Date(yy, mm, 1));
    const monthCycles = monthCyclesArr[i];
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
      pdf.setFontSize(Math.min(8.5, dayRowH * 0.85));
      pdf.text(initial, xMonth + dayInitialW / 2, y + dayRowH / 2 + 1.2, { align: "center" });

      // Day number
      pdf.setFillColor(weekend ? 230 : 248, weekend ? 233 : 250, weekend ? 240 : 253);
      pdf.rect(xMonth + dayInitialW, y, dayNumberW, dayRowH, "F");
      pdf.setDrawColor(210, 213, 222);
      pdf.rect(xMonth + dayInitialW, y, dayNumberW, dayRowH, "S");
      pdf.setTextColor(40, 45, 60);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(8.5, dayRowH * 0.85));
      pdf.text(String(d), xMonth + dayInitialW + dayNumberW / 2, y + dayRowH / 2 + 1.2, { align: "center" });
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
        // Restrict the text band to the days actually colored (cycle range within this month)
        const cs = startOfDay(new Date(cycle.start_date));
        const ce = startOfDay(new Date(cycle.end_date));
        const monthStart = new Date(data.year, m, 1);
        const monthEnd = new Date(data.year, m, daysInMonth);
        const firstDay = cs < monthStart ? 1 : cs.getDate();
        const lastDay = ce > monthEnd ? daysInMonth : ce.getDate();
        const bandTop = gridTop + monthHeaderH + (firstDay - 1) * dayRowH;
        const bandBottom = gridTop + monthHeaderH + lastDay * dayRowH;
        const bandHeight = bandBottom - bandTop;
        const bandCenterY = (bandTop + bandBottom) / 2;

        const lum = luminance(colColor);
        const lightOnDark = lum <= 0.55;

        // Map cycle types to full labels (no abbreviation)
        const typeMap: Record<string, string> = {
          PG: "Préparation Générale",
          PS: "Préparation Spécifique",
          PC: "Préparation Compétition",
          recuperation: "Récupération",
          transition: "Transition",
          // Legacy/alternative keys
          general_prep: "Préparation Générale",
          specific_prep: "Préparation Spécifique",
          competition: "Préparation Compétition",
          recovery: "Récupération",
        };
        const typeFullLabel = cycle.cycle_type
          ? (typeMap[cycle.cycle_type] || cycle.cycle_type)
          : "";

        // ── Reserve 2 independent text lanes inside the colored band to avoid overlaps ──
        const innerPadding = Math.min(0.8, subColW * 0.08);
        const laneGap = Math.min(0.8, subColW * 0.08);
        const usableW = Math.max(2.4, subColW - innerPadding * 2);
        const hasTypeLabel = Boolean(typeFullLabel);
        const laneW = hasTypeLabel
          ? Math.max(1.1, (usableW - laneGap) / 2)
          : usableW;
        const leftLaneCenter = xCol + innerPadding + laneW / 2;
        const rightLaneCenter = hasTypeLabel
          ? xCol + innerPadding + laneW + laneGap + laneW / 2
          : xCol + innerPadding + laneW / 2;
        const titleY = bandBottom - 2;

        // ── Title (cycle name) — right lane only ──
        const titleFs = Math.max(3.2, Math.min(6.8, laneW * 0.82));
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(titleFs);
        pdf.setTextColor(...(lightOnDark ? ([255, 255, 255] as [number, number, number]) : ([30, 35, 50] as [number, number, number])));
        const titleMaxChars = Math.floor((bandHeight - 4) / (titleFs * 0.42));
        const titleX = rightLaneCenter + titleFs * 0.16;
        drawVerticalText(pdf, cycle.name, titleX, titleY, titleMaxChars);

        // ── Type label (Préparation Générale, etc.) — left lane only — gray italic, discreet ──
        if (hasTypeLabel) {
          const typeFs = Math.max(2.9, Math.min(5.2, laneW * 0.72));
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(typeFs);
          // Discreet gray, adapted for dark vs light cycle backgrounds
          pdf.setTextColor(...(lightOnDark ? ([220, 222, 228] as [number, number, number]) : ([110, 115, 130] as [number, number, number])));
          const typeMaxChars = Math.floor((bandHeight - 4) / (typeFs * 0.42));
          const typeX = leftLaneCenter + typeFs * 0.12;
          drawVerticalText(pdf, typeFullLabel, typeX, titleY, typeMaxChars);
        }
      }
    }

    // Competition markers (gold trophy + name) inside the cycles area
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(data.year, m, d);
      const dateKey = format(date, "yyyy-MM-dd");
      const dayMatches = matchesByDate.get(dateKey);
      if (dayMatches && dayMatches.length > 0) {
        const y = gridTop + monthHeaderH + (d - 1) * dayRowH;
        const cy = y + dayRowH / 2;
        const trophyX = xCyclesStart + 1.6;
        const trophySize = Math.min(2.4, dayRowH * 0.7);
        drawTrophyIcon(pdf, trophyX, cy, trophySize);

        // Match/competition name next to the trophy — black text, no background
        const firstMatch = dayMatches[0];
        const label = firstMatch.opponent || firstMatch.competition || "Compétition";
        const extra = dayMatches.length > 1 ? ` (+${dayMatches.length - 1})` : "";
        const fullLabel = `${label}${extra}`;
        const textX = trophyX + trophySize + 0.8;
        const availableW = (xCyclesStart + cyclesAreaW) - textX - 0.5;
        pdf.setFont("helvetica", "bold");
        const labelFs = Math.max(4.5, Math.min(6.5, dayRowH * 0.55));
        pdf.setFontSize(labelFs);
        const truncated = pdf.splitTextToSize(fullLabel, Math.max(8, availableW))[0] || fullLabel;
        // Determine text color based on cycle background luminance under this row
        const cycleHere = monthCycles.find((c) => {
          const cs = startOfDay(new Date(c.start_date));
          const ce = startOfDay(new Date(c.end_date));
          return date >= cs && date <= ce;
        });
        const bgRgb: [number, number, number] = cycleHere ? hexToRgb(cycleHere.color) : [255, 255, 255];
        const useWhite = luminance(bgRgb) <= 0.55;
        pdf.setTextColor(useWhite ? 255 : 0, useWhite ? 255 : 0, useWhite ? 255 : 0);
        pdf.text(truncated, textX, cy + labelFs * 0.18);
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
        if (catId === null) {
          // Aggregate row: green → yellow → red gradient based on intensity
          // 0 → green (76,175,80), 0.5 → amber (255,193,7), 1 → red (229,57,53)
          let r: number, g: number, b: number;
          if (t <= 0.5) {
            const u = t / 0.5;
            r = Math.round(76 + (255 - 76) * u);
            g = Math.round(175 + (193 - 175) * u);
            b = Math.round(80 + (7 - 80) * u);
          } else {
            const u = (t - 0.5) / 0.5;
            r = Math.round(255 + (229 - 255) * u);
            g = Math.round(193 + (57 - 193) * u);
            b = Math.round(7 + (53 - 7) * u);
          }
          pdf.setFillColor(r, g, b);
        } else {
          const r = Math.round(255 - (255 - color[0]) * t);
          const g = Math.round(255 - (255 - color[1]) * t);
          const b = Math.round(255 - (255 - color[2]) * t);
          pdf.setFillColor(r, g, b);
        }
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
  // Aggregate row uses a neutral gray label background; cell colors handled inside (green→red)
  drawIntensityRow(orderedCats.length, "Moyenne de tous les cycles", [90, 100, 120], null);

  // ── Intensity color scale 0 → 10 (shared with planning Charge view) ──
  const scaleTop = intRowsTop + intensityRows * intensityRowH + 2;
  const scaleLabelW = intLabelW;
  const scaleBarX = margin + scaleLabelW;
  const scaleBarW = gridRight - scaleBarX;
  const scaleBarH = 4.5;

  // Label cell
  pdf.setFillColor(240, 242, 246);
  pdf.rect(margin, scaleTop, scaleLabelW, scaleBarH, "F");
  pdf.setDrawColor(210, 213, 222);
  pdf.setLineWidth(0.1);
  pdf.rect(margin, scaleTop, scaleLabelW, scaleBarH, "S");
  pdf.setTextColor(40, 45, 60);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.text("Intensité de 0 à 10", margin + 2, scaleTop + scaleBarH / 2 + 1.2);

  // 11 colored cells (0..10)
  const cellW = scaleBarW / 11;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    let r: number, g: number, b: number;
    if (t <= 0.5) {
      const u = t / 0.5;
      r = Math.round(76 + (255 - 76) * u);
      g = Math.round(175 + (193 - 175) * u);
      b = Math.round(80 + (7 - 80) * u);
    } else {
      const u = (t - 0.5) / 0.5;
      r = Math.round(255 + (229 - 255) * u);
      g = Math.round(193 + (57 - 193) * u);
      b = Math.round(7 + (53 - 7) * u);
    }
    const x = scaleBarX + i * cellW;
    pdf.setFillColor(r, g, b);
    pdf.rect(x, scaleTop, cellW, scaleBarH, "F");
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.15);
    pdf.rect(x, scaleTop, cellW, scaleBarH, "S");
    // Number inside
    const useWhite = t > 0.55;
    pdf.setTextColor(useWhite ? 255 : 30, useWhite ? 255 : 35, useWhite ? 255 : 50);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.text(String(i), x + cellW / 2, scaleTop + scaleBarH / 2 + 1.1, { align: "center" });
  }
  // Sub-labels under the bar
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(5.8);
  pdf.setTextColor(110, 115, 130);
  pdf.text("Faible · récupération", scaleBarX + 1, scaleTop + scaleBarH + 3);
  pdf.text("Modérée", scaleBarX + scaleBarW / 2, scaleTop + scaleBarH + 3, { align: "center" });
  pdf.text("Élevée · maximale", scaleBarX + scaleBarW - 1, scaleTop + scaleBarH + 3, { align: "right" });

  // ── Competitions list ──
  let competitionsTop = scaleTop + scaleBarH + 6;
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

      // Gold trophy icon
      drawTrophyIcon(pdf, x + 1.6, y - 0.6, 2.4);

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
  drawTrophyIcon(pdf, rightLegendX, legendY - 1, 2.4);
  pdf.setTextColor(60, 65, 80);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Compétition", rightLegendX + 2, legendY);

  // (today legend removed per user request)

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
