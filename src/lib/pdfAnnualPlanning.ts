import jsPDF from "jspdf";
import {
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  format,
  startOfDay,
} from "date-fns";
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
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const lightenRgb = (rgb: [number, number, number], factor: number): [number, number, number] => {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
};

// Stack overlapping cycles into rows within one category band
function computeCycleLanes(cycles: PeriodizationCycle[]): Map<string, number> {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );
  const lanes: { end: Date }[] = [];
  const result = new Map<string, number>();
  for (const c of sorted) {
    const cs = new Date(c.start_date);
    const ce = new Date(c.end_date);
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].end < cs) {
        lanes[i] = { end: ce };
        result.set(c.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push({ end: ce });
      result.set(c.id, lanes.length - 1);
    }
  }
  return result;
}

// Compute daily load (intensity * volume / 25) capped at 1
function computeDailyLoad(
  cycles: PeriodizationCycle[],
  rangeStart: Date,
  rangeEnd: Date,
): number[] {
  const days = differenceInDays(rangeEnd, rangeStart) + 1;
  const loads = new Array(days).fill(0);
  for (const c of cycles) {
    const cs = startOfDay(new Date(c.start_date));
    const ce = startOfDay(new Date(c.end_date));
    const intensity = c.intensity || 0;
    const volume = c.volume || 0;
    if (intensity === 0 && volume === 0) continue;
    const score = ((intensity + volume) / 10); // 0..1
    for (let d = 0; d < days; d++) {
      const day = new Date(rangeStart);
      day.setDate(day.getDate() + d);
      if (day >= cs && day <= ce) {
        loads[d] = Math.min(1, loads[d] + score * 0.5);
      }
    }
  }
  return loads;
}

function loadColor(load: number): [number, number, number] {
  // Green → Yellow → Orange → Red
  if (load <= 0) return [240, 240, 240];
  if (load <= 0.25) return [134, 197, 94];
  if (load <= 0.5) return [234, 179, 8];
  if (load <= 0.75) return [249, 115, 22];
  return [220, 38, 38];
}

// ─── Page rendering ───
function renderHalfYearPage(
  pdf: jsPDF,
  data: AnnualPlanningPdfData,
  half: 0 | 1, // 0 = Jan-Jun, 1 = Jul-Dec
  pageNum: number,
  totalPages: number,
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // Header band
  pdf.setFillColor(28, 33, 50);
  pdf.rect(0, 0, pageW, 22, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(`Planification annuelle ${data.year}`, margin, 10);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const subtitle = [data.clubName, data.categoryName].filter(Boolean).join(" • ");
  if (subtitle) pdf.text(subtitle, margin, 16);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  const halfLabel = half === 0 ? "Semestre 1 — Janvier à Juin" : "Semestre 2 — Juillet à Décembre";
  pdf.text(halfLabel, pageW - margin, 10, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(`Page ${pageNum} / ${totalPages}`, pageW - margin, 16, { align: "right" });

  // Timeline geometry
  const labelWidth = 42;
  const timelineX = margin + labelWidth;
  const timelineW = pageW - margin - timelineX;
  const timelineY = 30;

  // Range
  const rangeStartMonth = half === 0 ? 0 : 6;
  const rangeEndMonth = half === 0 ? 5 : 11;
  const rangeStart = startOfMonth(new Date(data.year, rangeStartMonth, 1));
  const rangeEnd = endOfMonth(new Date(data.year, rangeEndMonth, 1));
  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
  const dayW = timelineW / totalDays;

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

  // Month headers
  pdf.setDrawColor(220, 220, 225);
  pdf.setLineWidth(0.2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(60, 60, 70);

  months.forEach((m) => {
    const ms = startOfMonth(m);
    const me = endOfMonth(m);
    const offsetStart = differenceInDays(ms, rangeStart);
    const monthW = (differenceInDays(me, ms) + 1) * dayW;
    const x = timelineX + offsetStart * dayW;

    // Alternating month background tint
    const idx = months.indexOf(m);
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 249, 252);
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(x, timelineY, monthW, pageH - timelineY - 30, "F");

    // Month label
    pdf.setTextColor(45, 50, 70);
    pdf.text(format(m, "MMMM", { locale: fr }).toUpperCase(), x + monthW / 2, timelineY - 2, {
      align: "center",
    });

    // Vertical separator
    pdf.setDrawColor(210, 213, 220);
    pdf.line(x, timelineY, x, pageH - 30);

    // Week ticks (every 7 days, lighter)
    pdf.setDrawColor(235, 237, 242);
    const monthDays = differenceInDays(me, ms) + 1;
    for (let d = 7; d < monthDays; d += 7) {
      const tx = x + d * dayW;
      pdf.line(tx, timelineY, tx, pageH - 30);
    }
  });

  // Draw final right border
  pdf.setDrawColor(210, 213, 220);
  pdf.line(timelineX + timelineW, timelineY, timelineX + timelineW, pageH - 30);

  // ─── Categories rows ───
  const orderedCats = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);

  // Compute available height per row (reserve 28mm for charge band + footer)
  const chargeBandH = 14;
  const footerReserve = 22;
  const availableH = pageH - timelineY - chargeBandH - footerReserve - 4;
  // Each row height adapts to lane count
  const cyclesByCat = new Map<string, PeriodizationCycle[]>();
  const lanesByCat = new Map<string, Map<string, number>>();
  const laneCountByCat = new Map<string, number>();

  orderedCats.forEach((cat) => {
    const catCycles = data.cycles.filter(
      (c) =>
        c.periodization_category_id === cat.id &&
        new Date(c.end_date) >= rangeStart &&
        new Date(c.start_date) <= rangeEnd,
    );
    cyclesByCat.set(cat.id, catCycles);
    const lanes = computeCycleLanes(catCycles);
    lanesByCat.set(cat.id, lanes);
    const max = catCycles.length > 0 ? Math.max(...Array.from(lanes.values())) + 1 : 1;
    laneCountByCat.set(cat.id, max);
  });

  const totalLanes = orderedCats.reduce((s, c) => s + (laneCountByCat.get(c.id) || 1), 0);
  const lanePx = Math.min(11, Math.max(7, availableH / Math.max(totalLanes, 1) - 1));
  const rowPadding = 2;

  let cursorY = timelineY + 6;

  for (const cat of orderedCats) {
    const lanes = lanesByCat.get(cat.id)!;
    const laneCount = laneCountByCat.get(cat.id) || 1;
    const rowH = laneCount * lanePx + rowPadding;
    const catRgb = hexToRgb(cat.color);

    // Row background (very faint)
    const lightCat = lightenRgb(catRgb, 0.93);
    pdf.setFillColor(...lightCat);
    pdf.rect(margin, cursorY, labelWidth - 2, rowH, "F");

    // Color dot + label
    pdf.setFillColor(...catRgb);
    pdf.circle(margin + 2.5, cursorY + rowH / 2, 1.4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(40, 45, 60);
    const labelMaxW = labelWidth - 8;
    const labelLines = pdf.splitTextToSize(cat.name, labelMaxW);
    const labelStartY = cursorY + rowH / 2 - ((labelLines.length - 1) * 2.6) / 2 + 1;
    labelLines.forEach((line: string, i: number) => {
      pdf.text(line, margin + 5.5, labelStartY + i * 2.6);
    });

    // Horizontal divider
    pdf.setDrawColor(225, 228, 235);
    pdf.line(margin, cursorY + rowH, pageW - margin, cursorY + rowH);

    // Render cycles
    const catCycles = cyclesByCat.get(cat.id)!;
    catCycles.forEach((cycle) => {
      const cs = new Date(cycle.start_date);
      const ce = new Date(cycle.end_date);
      const startD = Math.max(differenceInDays(cs, rangeStart), 0);
      const endD = Math.min(differenceInDays(ce, rangeStart), totalDays - 1);
      if (endD < 0 || startD > totalDays - 1) return;

      const x = timelineX + startD * dayW;
      const w = Math.max(2, (endD - startD + 1) * dayW);
      const lane = lanes.get(cycle.id) || 0;
      const y = cursorY + 1 + lane * lanePx;
      const h = lanePx - 1.2;

      const rgb = hexToRgb(cycle.color || cat.color);
      // Soft block fill
      pdf.setFillColor(...rgb);
      pdf.roundedRect(x, y, w, h, 1.2, 1.2, "F");

      // Cycle label
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(7.2, Math.max(5.5, h - 3)));
      const innerPad = 1.4;
      const textMaxW = w - innerPad * 2;
      if (textMaxW > 6) {
        const txt = pdf.splitTextToSize(cycle.name, textMaxW)[0] || "";
        pdf.text(txt, x + innerPad, y + h / 2 + 1.2);
      }

      // Intensity dots (right side)
      const intensity = cycle.intensity || 0;
      if (intensity > 0 && w > 18) {
        const dotR = 0.55;
        const dotSpacing = 1.6;
        const dotsW = 5 * dotSpacing;
        const startX = x + w - dotsW - 1;
        const dotY = y + h - 1.5;
        for (let i = 0; i < 5; i++) {
          if (i < intensity) {
            pdf.setFillColor(255, 255, 255);
          } else {
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(255, 255, 255);
          }
          pdf.circle(startX + i * dotSpacing, dotY, dotR, i < intensity ? "F" : "S");
        }
      }
    });

    cursorY += rowH + 1.5;
  }

  // ─── Competitions markers (above charge band) ───
  const compsBandY = pageH - footerReserve - chargeBandH - 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(120, 80, 0);
  pdf.text("COMPÉTITIONS", margin, compsBandY - 1);

  const filteredMatches = (data.matches || []).filter((m) => {
    if (!m.match_date) return false;
    if (m.event_type === "training") return false;
    const d = new Date(m.match_date);
    return d >= rangeStart && d <= rangeEnd;
  });

  filteredMatches.forEach((m) => {
    const d = new Date(m.match_date);
    const offsetD = differenceInDays(d, rangeStart);
    const cx = timelineX + offsetD * dayW + dayW / 2;
    const cy = compsBandY + 1.5;
    // Diamond marker
    pdf.setFillColor(217, 119, 6);
    pdf.setDrawColor(146, 64, 14);
    pdf.setLineWidth(0.3);
    const r = 1.6;
    pdf.triangle(cx, cy - r, cx - r, cy, cx + r, cy, "FD");
    pdf.triangle(cx, cy + r, cx - r, cy, cx + r, cy, "FD");
  });

  // ─── Charge globale band ───
  const chargeY = pageH - footerReserve - chargeBandH;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(60, 60, 70);
  pdf.text("CHARGE GLOBALE", margin, chargeY - 1);

  // Background
  pdf.setFillColor(245, 246, 250);
  pdf.rect(timelineX, chargeY, timelineW, chargeBandH - 4, "F");

  // Daily load
  const loads = computeDailyLoad(data.cycles, rangeStart, rangeEnd);
  const segH = chargeBandH - 4;
  for (let d = 0; d < totalDays; d++) {
    const x = timelineX + d * dayW;
    const c = loadColor(loads[d]);
    pdf.setFillColor(...c);
    pdf.rect(x, chargeY, dayW + 0.05, segH, "F");
  }

  // Charge legend
  pdf.setFontSize(6.2);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(110, 115, 130);
  const legY = chargeY + segH + 3;
  const palette: [string, [number, number, number]][] = [
    ["Repos", [200, 205, 215]],
    ["Légère", [134, 197, 94]],
    ["Modérée", [234, 179, 8]],
    ["Soutenue", [249, 115, 22]],
    ["Élevée", [220, 38, 38]],
  ];
  let lx = timelineX;
  palette.forEach(([label, rgb]) => {
    pdf.setFillColor(...rgb);
    pdf.rect(lx, legY - 2, 3, 2, "F");
    pdf.setTextColor(110, 115, 130);
    pdf.text(label, lx + 4, legY - 0.5);
    lx += pdf.getTextWidth(label) + 12;
  });

  // ─── Footer ───
  pdf.setDrawColor(220, 222, 230);
  pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(130, 135, 150);
  pdf.text(
    `Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    margin,
    pageH - 7,
  );
  pdf.text("CocoriCoach Club", pageW - margin, pageH - 7, { align: "right" });

  // Today marker if in range
  const today = startOfDay(new Date());
  if (today >= rangeStart && today <= rangeEnd) {
    const tx = timelineX + differenceInDays(today, rangeStart) * dayW;
    pdf.setDrawColor(220, 38, 38);
    pdf.setLineWidth(0.6);
    pdf.line(tx, timelineY, tx, chargeY + segH);
    pdf.setFillColor(220, 38, 38);
    pdf.triangle(tx - 1.6, timelineY - 1.6, tx + 1.6, timelineY - 1.6, tx, timelineY + 0.4, "F");
    pdf.setLineWidth(0.2);
  }
}

export function exportAnnualPlanningToPdf(data: AnnualPlanningPdfData) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  renderHalfYearPage(pdf, data, 0, 1, 2);
  pdf.addPage();
  renderHalfYearPage(pdf, data, 1, 2, 2);

  const fname = `planification-annuelle-${data.year}-${(data.categoryName || "categorie")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.pdf`;
  pdf.save(fname);
}
