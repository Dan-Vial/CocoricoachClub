import jsPDF from "jspdf";
import { format, getDaysInMonth, startOfDay } from "date-fns";
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

const lightenRgb = (rgb: [number, number, number], factor: number): [number, number, number] => [
  Math.round(rgb[0] + (255 - rgb[0]) * factor),
  Math.round(rgb[1] + (255 - rgb[1]) * factor),
  Math.round(rgb[2] + (255 - rgb[2]) * factor),
];

const luminance = (rgb: [number, number, number]) =>
  (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;

// French day initial (L M M J V S D)
const dayInitial = (date: Date): string => {
  const map = ["D", "L", "M", "M", "J", "V", "S"];
  return map[date.getDay()];
};

const isWeekend = (date: Date): boolean => date.getDay() === 0 || date.getDay() === 6;

// ─── Page rendering: full year calendar (months in columns, days 1-31 in rows) ───
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

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text(
    `Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`,
    pageW - margin,
    8,
    { align: "right" },
  );

  // ── Grid geometry ──
  const gridTop = 22;
  const footerH = 28;
  const gridBottom = pageH - footerH;
  const monthsCount = 12;

  // Each month column = "Day initial" sub-col + "Day number" sub-col + content cell
  // Simpler: 1 column per month, with day initial + day number on left side of each cell
  const totalCols = monthsCount;
  const colW = (pageW - margin * 2) / totalCols;

  // Header row height
  const headerRowH = 7;
  // 31 day rows
  const rowH = (gridBottom - gridTop - headerRowH) / 31;

  // ── Month headers ──
  const monthLabels = [
    "JANV.", "FÉVR.", "MARS", "AVRIL", "MAI", "JUIN",
    "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC.",
  ];

  for (let m = 0; m < 12; m++) {
    const x = margin + m * colW;
    pdf.setFillColor(28, 33, 50);
    pdf.rect(x, gridTop, colW, headerRowH, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(`${monthLabels[m]} ${data.year}`, x + colW / 2, gridTop + headerRowH / 2 + 1.4, {
      align: "center",
    });
  }

  // ── Build day cells ──
  // For each month and day, find the dominant cycle (highest priority: most recent or with content)
  // and matches. Render colored background + label centered (vertical text or short label).

  // Pre-compute matches per day
  const matchesByDate = new Map<string, MatchInfo[]>();
  (data.matches || []).forEach((m) => {
    if (!m.match_date) return;
    if (m.event_type === "training") return;
    const key = m.match_date.split("T")[0];
    if (!matchesByDate.has(key)) matchesByDate.set(key, []);
    matchesByDate.get(key)!.push(m);
  });

  // Sort categories so we draw consistently
  const orderedCats = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);
  const catById = new Map(orderedCats.map((c) => [c.id, c]));

  // For each day, determine the cycle blocks (we may have several stacked categories)
  // Strategy: for each day, list active cycles ordered by sort_order; we then show
  // up to 1 cycle's color (the most "specific" one) and we draw small color bars on the side.

  const today = startOfDay(new Date());

  for (let m = 0; m < 12; m++) {
    const x = margin + m * colW;
    const daysInMonth = getDaysInMonth(new Date(data.year, m, 1));

    for (let d = 1; d <= 31; d++) {
      const y = gridTop + headerRowH + (d - 1) * rowH;

      // Empty cell for days that don't exist in this month
      if (d > daysInMonth) {
        pdf.setFillColor(245, 246, 248);
        pdf.rect(x, y, colW, rowH, "F");
        pdf.setDrawColor(220, 222, 230);
        pdf.setLineWidth(0.15);
        pdf.rect(x, y, colW, rowH, "S");
        continue;
      }

      const date = new Date(data.year, m, d);
      const dateKey = format(date, "yyyy-MM-dd");
      const weekend = isWeekend(date);
      const isToday = date.getTime() === today.getTime();

      // Find active cycles for this day
      const activeCycles = data.cycles.filter((c) => {
        const cs = startOfDay(new Date(c.start_date));
        const ce = startOfDay(new Date(c.end_date));
        return date >= cs && date <= ce;
      });

      // Determine background color: blend of active cycle colors, or default
      let bgRgb: [number, number, number];
      if (activeCycles.length > 0) {
        // Average colors weighted equally
        const sum = activeCycles.reduce(
          (acc, c) => {
            const rgb = hexToRgb(c.color || catById.get(c.periodization_category_id)?.color || "#888888");
            return [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]] as [number, number, number];
          },
          [0, 0, 0] as [number, number, number],
        );
        bgRgb = [
          Math.round(sum[0] / activeCycles.length),
          Math.round(sum[1] / activeCycles.length),
          Math.round(sum[2] / activeCycles.length),
        ];
      } else {
        bgRgb = weekend ? [232, 234, 240] : [255, 255, 255];
      }

      // Fill cell background
      pdf.setFillColor(...bgRgb);
      pdf.rect(x, y, colW, rowH, "F");

      // Cell border
      pdf.setDrawColor(200, 203, 212);
      pdf.setLineWidth(0.15);
      pdf.rect(x, y, colW, rowH, "S");

      // Today highlight border
      if (isToday) {
        pdf.setDrawColor(220, 38, 38);
        pdf.setLineWidth(0.6);
        pdf.rect(x + 0.3, y + 0.3, colW - 0.6, rowH - 0.6, "S");
        pdf.setLineWidth(0.15);
      }

      // Determine text color based on background luminance
      const lum = luminance(bgRgb);
      const textRgb: [number, number, number] = lum > 0.6 ? [40, 45, 60] : [255, 255, 255];

      // Day initial
      const initial = dayInitial(date);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.min(6.5, rowH * 0.55));
      pdf.setTextColor(...textRgb);
      pdf.text(initial, x + 1.4, y + rowH / 2 + 1.1);

      // Day number
      pdf.setFont("helvetica", "normal");
      pdf.text(String(d), x + 4.6, y + rowH / 2 + 1.1);

      // Cycle label (right side, truncated)
      if (activeCycles.length > 0) {
        // Pick the cycle with the most "informative" name (longest non-empty)
        const labelCycle = activeCycles.reduce((best, c) =>
          (c.name?.length || 0) > (best.name?.length || 0) ? c : best,
          activeCycles[0],
        );
        const labelMaxW = colW - 9;
        if (labelMaxW > 6) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(Math.min(5.5, rowH * 0.5));
          const truncated = pdf.splitTextToSize(labelCycle.name || "", labelMaxW)[0] || "";
          pdf.text(truncated, x + colW - 1.4, y + rowH / 2 + 1, { align: "right" });
        }
      }

      // Competition marker
      const dayMatches = matchesByDate.get(dateKey);
      if (dayMatches && dayMatches.length > 0) {
        const mx = x + colW - 2;
        const my = y + 1.6;
        pdf.setFillColor(220, 38, 38);
        pdf.setDrawColor(120, 20, 20);
        pdf.setLineWidth(0.2);
        pdf.circle(mx, my, 0.9, "FD");
      }
    }
  }

  // ── Footer / Legend ──
  const legendY = gridBottom + 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(40, 45, 60);
  pdf.text("LÉGENDE — THÉMATIQUES", margin, legendY);

  // Categories swatches
  let lx = margin;
  let ly = legendY + 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  orderedCats.forEach((cat) => {
    const rgb = hexToRgb(cat.color);
    const labelW = pdf.getTextWidth(cat.name) + 8;
    if (lx + labelW > pageW - margin) {
      lx = margin;
      ly += 5;
    }
    pdf.setFillColor(...rgb);
    pdf.rect(lx, ly - 2.8, 4, 3.5, "F");
    pdf.setDrawColor(180, 183, 192);
    pdf.rect(lx, ly - 2.8, 4, 3.5, "S");
    pdf.setTextColor(60, 65, 80);
    pdf.text(cat.name, lx + 5, ly);
    lx += labelW + 4;
  });

  // Marker legend (right side)
  const rightLegendX = pageW - margin - 60;
  pdf.setFillColor(220, 38, 38);
  pdf.setDrawColor(120, 20, 20);
  pdf.circle(rightLegendX, legendY - 1, 0.9, "FD");
  pdf.setTextColor(60, 65, 80);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Compétition", rightLegendX + 2, legendY);

  pdf.setDrawColor(220, 38, 38);
  pdf.setLineWidth(0.6);
  pdf.rect(rightLegendX - 1.5, legendY + 2, 3, 3, "S");
  pdf.setLineWidth(0.15);
  pdf.text("Aujourd'hui", rightLegendX + 2, legendY + 4.5);

  // Footer line
  pdf.setDrawColor(220, 222, 230);
  pdf.line(margin, pageH - 6, pageW - margin, pageH - 6);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(130, 135, 150);
  pdf.text("CocoriCoach Club", pageW - margin, pageH - 2.5, { align: "right" });
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
