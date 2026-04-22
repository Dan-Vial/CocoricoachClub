import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AthleticsMinima, AthleticsRecord } from "./recordsHelpers";
import { computeDelta } from "./recordsHelpers";
import { getMinimaLevel } from "./minimaLevels";
import { ATHLETISME_DISCIPLINES } from "@/lib/constants/sportTypes";

export interface MatrixExportPlayer {
  id: string;
  fullName: string;
  discipline: string | null;
  specialty: string | null;
  bestPerformance: number | null;
}

export interface MatrixExportData {
  clubName: string;
  categoryName: string;
  players: MatrixExportPlayer[];
  minimas: AthleticsMinima[];
  records: AthleticsRecord[];
}

const PRIMARY: [number, number, number] = [37, 99, 235]; // blue-600
const SUCCESS: [number, number, number] = [16, 185, 129]; // emerald-500
const DANGER: [number, number, number] = [239, 68, 68]; // red-500
const TEXT: [number, number, number] = [30, 41, 59]; // slate-800
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500

/**
 * Generates a PDF report comparing each athlete's best season performance
 * against their personal records and federation minimas (grouped by discipline).
 */
export function exportAthleticsMinimasReport(data: MatrixExportData) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // Group minimas by discipline+specialty
  const groups = new Map<
    string,
    { discipline: string; specialty: string | null; minimas: AthleticsMinima[] }
  >();
  data.minimas.forEach((m) => {
    const key = `${m.discipline}|${m.specialty || ""}`;
    if (!groups.has(key)) {
      groups.set(key, { discipline: m.discipline, specialty: m.specialty, minimas: [] });
    }
    groups.get(key)!.minimas.push(m);
  });
  groups.forEach((g) =>
    g.minimas.sort(
      (a, b) => (getMinimaLevel(a.level)?.rank || 0) - (getMinimaLevel(b.level)?.rank || 0)
    )
  );

  let y = margin;

  // ============ HEADER ============
  pdf.setFillColor(...PRIMARY);
  pdf.rect(0, 0, pageW, 24, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Rapport Minimas & Records — Athlétisme", margin, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`${data.clubName} • ${data.categoryName}`, margin, 19);
  pdf.setFontSize(8);
  pdf.text(
    `Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    pageW - margin,
    19,
    { align: "right" }
  );

  y = 32;
  pdf.setTextColor(...TEXT);

  // ============ GROUPS ============
  for (const [, group] of groups) {
    const discLabel =
      ATHLETISME_DISCIPLINES.find((d) => d.value === group.discipline)?.label ||
      group.discipline;
    const groupPlayers = data.players.filter((p) => {
      if (p.discipline !== group.discipline) return false;
      if (group.specialty) return p.specialty === group.specialty;
      return true;
    });
    if (groupPlayers.length === 0) continue;

    // page break check
    if (y > pageH - 40) {
      pdf.addPage();
      y = margin;
    }

    // Discipline header
    pdf.setFillColor(...PRIMARY);
    pdf.rect(margin, y, pageW - 2 * margin, 7, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(
      `${discLabel}${group.specialty ? ` — ${group.specialty}` : ""}`,
      margin + 2,
      y + 5
    );
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${groupPlayers.length} athlète${groupPlayers.length > 1 ? "s" : ""}`,
      pageW - margin - 2,
      y + 5,
      { align: "right" }
    );
    y += 9;

    // Table header row
    const colAthlete = 50;
    const colBest = 28;
    const minimaCount = group.minimas.length;
    const remaining = pageW - 2 * margin - colAthlete - colBest;
    const colMinima = minimaCount > 0 ? remaining / minimaCount : remaining;
    const rowH = 9;

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, pageW - 2 * margin, rowH, "F");
    pdf.setTextColor(...TEXT);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("Athlète", margin + 2, y + 5.5);
    pdf.text("Meilleure perf.", margin + colAthlete + colBest / 2, y + 5.5, { align: "center" });
    group.minimas.forEach((m, i) => {
      const lvl = getMinimaLevel(m.level);
      const cx = margin + colAthlete + colBest + i * colMinima + colMinima / 2;
      pdf.text(lvl?.label || m.level, cx, y + 4, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(`${m.target_value} ${m.unit}`, cx, y + 7.5, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
    });
    y += rowH;

    const lowerIsBetter = group.minimas[0]?.lower_is_better ?? true;
    const unit = group.minimas[0]?.unit || "";

    // Player rows
    for (const player of groupPlayers) {
      if (y > pageH - 12) {
        pdf.addPage();
        y = margin;
      }

      // Find player's record
      const playerRecord = data.records.find(
        (r) =>
          r.player_id === player.id &&
          r.discipline === group.discipline &&
          (r.specialty || "") === (group.specialty || player.specialty || "")
      );
      const pb = playerRecord?.personal_best ?? null;
      const sb = playerRecord?.season_best ?? null;
      let displayBest: number | null = player.bestPerformance ?? sb ?? pb ?? null;
      if (player.bestPerformance != null && sb != null) {
        displayBest = lowerIsBetter
          ? Math.min(player.bestPerformance, sb)
          : Math.max(player.bestPerformance, sb);
      }

      // Row background (zebra)
      pdf.setFillColor(250, 250, 252);
      pdf.rect(margin, y, pageW - 2 * margin, rowH, "F");

      // Athlete name + PB/SB
      pdf.setTextColor(...TEXT);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text(player.fullName, margin + 2, y + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      const refTexts: string[] = [];
      if (pb != null) refTexts.push(`PB: ${pb} ${unit}`);
      if (sb != null) refTexts.push(`SB: ${sb} ${unit}`);
      if (refTexts.length > 0) {
        pdf.text(refTexts.join(" • "), margin + 2, y + 7.5);
      }

      // Best perf
      pdf.setTextColor(...TEXT);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(
        displayBest != null ? `${displayBest.toFixed(2)} ${unit}` : "—",
        margin + colAthlete + colBest / 2,
        y + 5.5,
        { align: "center" }
      );

      // Each minima delta
      group.minimas.forEach((m, i) => {
        const cx = margin + colAthlete + colBest + i * colMinima + colMinima / 2;
        const delta = computeDelta(displayBest, m.target_value, m.lower_is_better, m.unit);
        if (!delta) {
          pdf.setTextColor(...MUTED);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text("—", cx, y + 5.5, { align: "center" });
          return;
        }
        const color = delta.isBetter ? SUCCESS : DANGER;
        // colored pill
        const pillW = Math.min(colMinima - 4, 26);
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(cx - pillW / 2, y + 1.5, pillW, 6, 1.5, 1.5, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(delta.display, cx, y + 5.5, { align: "center" });
      });

      y += rowH;
    }

    y += 4; // spacing between groups
  }

  // Footer pagination
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`Page ${i} / ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
    pdf.text("CocoriCoach Club — Athlétisme", margin, pageH - 5);
  }

  const fname = `minimas-records-${(data.categoryName || "categorie")
    .toLowerCase()
    .replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fname);
}
