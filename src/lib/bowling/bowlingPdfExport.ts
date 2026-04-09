import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingGameData {
  roundId: string;
  matchId: string;
  playerId: string;
  playerName: string;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  score: number;
  strikes: number;
  spares: number;
  strikePercentage: number;
  sparePercentage: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
  pocketCount: number;
  pocketPercentage: number;
  singlePinCount: number;
  singlePinConverted: number;
  singlePinConversionRate: number;
  frames?: FrameData[];
}

const PHASE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  round_robin: "Round Robin",
  quart: "Quart de finale",
  demi: "Demi-finale",
  petite_finale: "Petite finale",
  finale: "Finale",
};

// PDF color palette
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  gold: [202, 138, 4] as [number, number, number],
  strike: [234, 179, 8] as [number, number, number],
  spare: [16, 185, 129] as [number, number, number],
  open: [244, 63, 94] as [number, number, number],
  header: [30, 41, 59] as [number, number, number],
  lightBg: [241, 245, 249] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 15;
  }
  return y;
}

export function exportBowlingPdf(playerName: string, games: BowlingGameData[]) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // ===================== HEADER =====================
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Statistiques Bowling - ${playerName}`, margin, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rapport généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })} • ${games.length} parties`, margin, 22);
  y = 35;

  // ===================== SECTION 1: VUE D'ENSEMBLE =====================
  const totalGames = games.length;
  const totalScore = games.reduce((s, g) => s + g.score, 0);
  const avgScore = totalScore / totalGames;
  const highGame = Math.max(...games.map(g => g.score));
  const lowGame = Math.min(...games.map(g => g.score));
  const totalStrikes = games.reduce((s, g) => s + g.strikes, 0);
  const totalSpares = games.reduce((s, g) => s + g.spares, 0);
  const totalOpenFrames = games.reduce((s, g) => s + g.openFrames, 0);
  const totalSplits = games.reduce((s, g) => s + g.splitCount, 0);
  const totalSplitsConverted = games.reduce((s, g) => s + g.splitConverted, 0);
  const totalPocket = games.reduce((s, g) => s + g.pocketCount, 0);
  const totalSinglePin = games.reduce((s, g) => s + g.singlePinCount, 0);
  const totalSinglePinConverted = games.reduce((s, g) => s + g.singlePinConverted, 0);
  const avgStrikeRate = games.reduce((s, g) => s + g.strikePercentage, 0) / totalGames;
  const avgSpareRate = games.reduce((s, g) => s + g.sparePercentage, 0) / totalGames;
  const avgPocketRate = games.reduce((s, g) => s + g.pocketPercentage, 0) / totalGames;
  const splitConvRate = totalSplits > 0 ? (totalSplitsConverted / totalSplits) * 100 : 0;
  const singlePinConvRate = totalSinglePin > 0 ? (totalSinglePinConverted / totalSinglePin) * 100 : 0;
  const totalFrames = totalGames * 10;
  const openFramePercentage = totalFrames > 0 ? (totalOpenFrames / totalFrames) * 100 : 0;

  // Section title
  doc.setFillColor(...COLORS.header);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("📊 VUE D'ENSEMBLE", margin + 3, y + 5.5);
  y += 12;

  // KPI boxes
  const kpiWidth = contentWidth / 4 - 2;
  const kpis = [
    { label: "Parties", value: String(totalGames) },
    { label: "Moyenne", value: avgScore.toFixed(1) },
    { label: "High Game", value: String(highGame) },
    { label: "Low Game", value: String(lowGame) },
  ];

  kpis.forEach((kpi, i) => {
    const x = margin + i * (kpiWidth + 2.7);
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x, y, kpiWidth, 18, 2, 2, "F");
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, x + kpiWidth / 2, y + 10, { align: "center" });
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + kpiWidth / 2, y + 15, { align: "center" });
  });
  y += 24;

  // Detailed stats table
  const statsRows = [
    ["% Strikes", `${avgStrikeRate.toFixed(1)}%`, "% Spares", `${avgSpareRate.toFixed(1)}%`],
    ["% Poches", `${avgPocketRate.toFixed(1)}%`, "% Quilles seules", `${singlePinConvRate.toFixed(1)}%`],
    ["% Conv. splits", `${splitConvRate.toFixed(1)}%`, "% Frames ouvertes", `${openFramePercentage.toFixed(1)}%`],
    ["Strikes total", String(totalStrikes), "Spares total", String(totalSpares)],
    ["Splits total", String(totalSplits), "Frames ouvertes", String(totalOpenFrames)],
  ];

  statsRows.forEach((row, i) => {
    const rowY = y + i * 7;
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(margin, rowY, contentWidth, 7, "F");
    }
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(row[0], margin + 2, rowY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], margin + contentWidth / 2 - 5, rowY + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(row[2], margin + contentWidth / 2 + 5, rowY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(row[3], margin + contentWidth - 2, rowY + 5, { align: "right" });
  });
  y += statsRows.length * 7 + 8;

  // ===================== SECTION 2: ANALYSE PAR FRAME =====================
  y = checkPageBreak(doc, y, 80);
  doc.setFillColor(...COLORS.header);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("🎯 ANALYSE PAR FRAME", margin + 3, y + 5.5);
  y += 12;

  // Compute frame stats
  const gamesWithFrames = games.filter(g => g.frames && g.frames.length === 10);
  if (gamesWithFrames.length > 0) {
    const frameStats = computeFrameStats(gamesWithFrames);
    const phases = computePhases(frameStats);

    // Phase performance
    if (phases) {
      const phaseItems = [
        { ...phases.start, isGold: false },
        { ...phases.mid, isGold: false },
        { ...phases.end, isGold: false },
        { ...phases.moneyTime, isGold: true },
      ];

      const phaseW = contentWidth / 4 - 2;
      phaseItems.forEach((p, i) => {
        const x = margin + i * (phaseW + 2.7);
        if (p.isGold) {
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(202, 138, 4);
          doc.roundedRect(x, y, phaseW, 30, 2, 2, "FD");
        } else {
          doc.setFillColor(...COLORS.lightBg);
          doc.roundedRect(x, y, phaseW, 30, 2, 2, "F");
        }
        doc.setTextColor(p.isGold ? COLORS.gold[0] : COLORS.text[0], p.isGold ? COLORS.gold[1] : COLORS.text[1], p.isGold ? COLORS.gold[2] : COLORS.text[2]);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(p.label, x + phaseW / 2, y + 5, { align: "center" });
        doc.setFontSize(14);
        doc.text(`${p.strikeRate.toFixed(1)}%`, x + phaseW / 2, y + 13, { align: "center" });
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text("% Strike", x + phaseW / 2, y + 17, { align: "center" });
        doc.setFontSize(7);
        doc.text(`Spare: ${p.spareRate.toFixed(0)}%`, x + phaseW / 2, y + 22, { align: "center" });
        doc.text(`Open: ${p.openRate.toFixed(0)}%`, x + phaseW / 2, y + 26, { align: "center" });
      });
      y += 36;
    }

    // Frame distribution bars
    y = checkPageBreak(doc, y, frameStats.length * 7 + 15);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Répartition par frame", margin, y + 4);
    y += 8;

    frameStats.forEach(f => {
      const total = f.totalGames;
      const strikeP = total > 0 ? (f.strikeCount / total) * 100 : 0;
      const spareP = total > 0 ? (f.spareCount / total) * 100 : 0;
      const openP = total > 0 ? (f.openCount / total) * 100 : 0;

      doc.setTextColor(...COLORS.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(f.label, margin, y + 4);

      const barX = margin + 22;
      const barW = contentWidth - 50;
      const barH = 5;

      // Background
      doc.setFillColor(226, 232, 240);
      doc.rect(barX, y, barW, barH, "F");

      // Strike segment
      let cx = barX;
      if (strikeP > 0) {
        const w = (strikeP / 100) * barW;
        doc.setFillColor(...COLORS.strike);
        doc.rect(cx, y, w, barH, "F");
        if (w > 8) {
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          doc.text(`${strikeP.toFixed(0)}%`, cx + w / 2, y + 3.5, { align: "center" });
        }
        cx += w;
      }
      if (spareP > 0) {
        const w = (spareP / 100) * barW;
        doc.setFillColor(...COLORS.spare);
        doc.rect(cx, y, w, barH, "F");
        if (w > 8) {
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          doc.text(`${spareP.toFixed(0)}%`, cx + w / 2, y + 3.5, { align: "center" });
        }
        cx += w;
      }
      if (openP > 0) {
        const w = (openP / 100) * barW;
        doc.setFillColor(...COLORS.open);
        doc.rect(cx, y, w, barH, "F");
        if (w > 8) {
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          doc.text(`${openP.toFixed(0)}%`, cx + w / 2, y + 3.5, { align: "center" });
        }
      }

      // Strike % text on right
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(`${strikeP.toFixed(0)}% X`, margin + contentWidth - 2, y + 4, { align: "right" });

      y += 7;
    });

    // Legend
    y += 2;
    const legends = [
      { color: COLORS.strike, label: "Strike" },
      { color: COLORS.spare, label: "Spare" },
      { color: COLORS.open, label: "Open" },
    ];
    let lx = margin + contentWidth / 2 - 25;
    legends.forEach(l => {
      doc.setFillColor(...l.color);
      doc.rect(lx, y, 3, 3, "F");
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(l.label, lx + 4, y + 2.5);
      lx += 22;
    });
    y += 10;
  }

  // ===================== SECTION 3: HISTORIQUE DES PARTIES =====================
  y = checkPageBreak(doc, y, 30);
  doc.setFillColor(...COLORS.header);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("📋 HISTORIQUE DES PARTIES", margin + 3, y + 5.5);
  y += 12;

  // Group by match
  const groupedByMatch = games.reduce<Record<string, { matchDate: string; opponent: string; games: BowlingGameData[] }>>((acc, game) => {
    if (!acc[game.matchId]) {
      acc[game.matchId] = { matchDate: game.matchDate, opponent: game.matchOpponent, games: [] };
    }
    acc[game.matchId].games.push(game);
    return acc;
  }, {});

  const sortedMatches = Object.entries(groupedByMatch).sort(([, a], [, b]) =>
    b.matchDate.localeCompare(a.matchDate)
  );

  // Table header
  const colWidths = [30, 35, 18, 18, 18, 18, 18, 25];
  const colLabels = ["Date", "Compétition", "Score", "%X", "%/", "Open", "Splits", "Phase"];
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(...COLORS.header);
    doc.rect(margin, startY, contentWidth, 7, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let cx = margin;
    colLabels.forEach((label, i) => {
      doc.text(label, cx + 1.5, startY + 5);
      cx += colWidths[i];
    });
    return startY + 8;
  };

  y = drawTableHeader(y);

  sortedMatches.forEach(([, { matchDate, opponent, games: matchGames }]) => {
    matchGames.forEach((game, gi) => {
      y = checkPageBreak(doc, y, 8);
      if (y === 15) {
        y = drawTableHeader(y);
      }

      if (gi % 2 === 0) {
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      doc.setTextColor(...COLORS.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let cx = margin;

      const dateStr = matchDate ? format(new Date(matchDate), "dd/MM/yyyy") : "-";
      doc.text(dateStr, cx + 1.5, y + 4.5);
      cx += colWidths[0];

      const oppText = opponent.length > 18 ? opponent.substring(0, 17) + "…" : opponent;
      doc.text(oppText, cx + 1.5, y + 4.5);
      cx += colWidths[1];

      doc.setFont("helvetica", "bold");
      doc.text(String(game.score), cx + 1.5, y + 4.5);
      cx += colWidths[2];

      doc.setFont("helvetica", "normal");
      doc.text(`${game.strikePercentage.toFixed(0)}%`, cx + 1.5, y + 4.5);
      cx += colWidths[3];

      doc.text(`${game.sparePercentage.toFixed(0)}%`, cx + 1.5, y + 4.5);
      cx += colWidths[4];

      doc.text(String(game.openFrames), cx + 1.5, y + 4.5);
      cx += colWidths[5];

      doc.text(`${game.splitCount}(${game.splitConverted})`, cx + 1.5, y + 4.5);
      cx += colWidths[6];

      const phaseLabel = game.phase ? (PHASE_LABELS[game.phase] || game.phase) : `P${game.roundNumber}`;
      const phaseText = phaseLabel.length > 12 ? phaseLabel.substring(0, 11) + "…" : phaseLabel;
      doc.text(phaseText, cx + 1.5, y + 4.5);

      y += 6.5;
    });
  });

  // Footer
  y += 5;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(`Rapport bowling de ${playerName} • ${totalGames} parties • Moyenne: ${avgScore.toFixed(1)} • High: ${highGame}`, pageWidth / 2, y, { align: "center" });

  // Save
  const fileName = `bowling_${playerName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

// ===================== HELPER FUNCTIONS =====================

interface FrameStats {
  frameNumber: number;
  label: string;
  strikeCount: number;
  spareCount: number;
  openCount: number;
  totalGames: number;
}

function computeFrameStats(gamesWithFrames: BowlingGameData[]): FrameStats[] {
  const stats: FrameStats[] = [];

  for (let i = 0; i < 9; i++) {
    let strikes = 0, spares = 0, opens = 0;
    gamesWithFrames.forEach(game => {
      const frame = game.frames![i];
      if (!frame || frame.throws.length === 0) return;
      if (frame.throws[0]?.value === "X") { strikes++; }
      else if (frame.throws[1]?.value === "/") { spares++; }
      else { opens++; }
    });
    stats.push({ frameNumber: i + 1, label: `F${i + 1}`, strikeCount: strikes, spareCount: spares, openCount: opens, totalGames: gamesWithFrames.length });
  }

  // Frame 10
  {
    let strikes = 0, spares = 0, opens = 0;
    gamesWithFrames.forEach(game => {
      const frame = game.frames![9];
      if (!frame) return;
      if (frame.throws[0]?.value === "X") { strikes++; }
      else if (frame.throws[1]?.value === "/") { spares++; }
      else { opens++; }
    });
    stats.push({ frameNumber: 10, label: "F10", strikeCount: strikes, spareCount: spares, openCount: opens, totalGames: gamesWithFrames.length });
  }

  // Frame 11
  {
    let eligible = 0, strikes = 0, spares = 0, opens = 0;
    gamesWithFrames.forEach(game => {
      const frame = game.frames![9];
      if (!frame || frame.throws.length < 2 || frame.throws[0]?.value !== "X") return;
      eligible++;
      if (frame.throws[1]?.value === "X") { strikes++; }
      else if (frame.throws.length >= 3 && frame.throws[2]?.value === "/") { spares++; }
      else { opens++; }
    });
    if (eligible > 0) stats.push({ frameNumber: 11, label: "F11", strikeCount: strikes, spareCount: spares, openCount: opens, totalGames: eligible });
  }

  // Frame 12
  {
    let eligible = 0, strikes = 0, nonStrikes = 0;
    gamesWithFrames.forEach(game => {
      const frame = game.frames![9];
      if (!frame || frame.throws.length < 3 || frame.throws[0]?.value !== "X" || frame.throws[1]?.value !== "X") return;
      eligible++;
      if (frame.throws[2]?.value === "X") { strikes++; } else { nonStrikes++; }
    });
    if (eligible > 0) stats.push({ frameNumber: 12, label: "F12", strikeCount: strikes, spareCount: nonStrikes, openCount: 0, totalGames: eligible });
  }

  return stats;
}

function computePhases(frameStats: FrameStats[]) {
  const avgRate = (frames: FrameStats[], key: "strikeCount" | "spareCount" | "openCount") =>
    frames.length > 0 ? frames.reduce((s, f) => s + (f[key] / f.totalGames) * 100, 0) / frames.length : 0;

  const computePhase = (frames: FrameStats[], label: string) => ({
    label,
    strikeRate: avgRate(frames, "strikeCount"),
    spareRate: avgRate(frames, "spareCount"),
    openRate: avgRate(frames, "openCount"),
  });

  const start = frameStats.filter(f => f.frameNumber >= 1 && f.frameNumber <= 3);
  const mid = frameStats.filter(f => f.frameNumber >= 4 && f.frameNumber <= 6);
  const end = frameStats.filter(f => f.frameNumber >= 7 && f.frameNumber <= 9);
  const moneyTime = frameStats.filter(f => f.frameNumber >= 10 && f.frameNumber <= 12);

  return {
    start: computePhase(start, "Début (1-3)"),
    mid: computePhase(mid, "Milieu (4-6)"),
    end: computePhase(end, "Fin (7-9)"),
    moneyTime: computePhase(moneyTime, "Money Time (10-12)"),
  };
}
