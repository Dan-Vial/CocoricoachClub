import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface BowlingPdfOptions {
  playerAvatarUrl?: string | null;
  oilPatternImageUrl?: string | null;
  oilPatternName?: string | null;
  competitionName?: string | null;
  ageCategory?: string | null;
  location?: string | null;
  competitionDate?: string | null;
}

async function loadImageAsBase64(url: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject();
      reader.readAsDataURL(blob);
    });
    // Get real dimensions via Image
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = dataUrl;
    });
    return { data: dataUrl, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

interface BowlingGameData {
  roundId: string;
  matchId: string;
  playerId: string;
  playerName: string;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  bowlingCategory?: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  individuelle: "Individuelle",
  doublette: "Doublette",
  equipe_4: "Équipe de 4",
  masters: "Masters",
  practice_officiel: "Practice officiel",
  practice_non_officiel: "Practice non officiel",
};

// PDF color palette
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  gold: [202, 138, 4] as [number, number, number],
  goldBg: [254, 243, 199] as [number, number, number],
  strike: [234, 179, 8] as [number, number, number],
  spare: [16, 185, 129] as [number, number, number],
  open: [244, 63, 94] as [number, number, number],
  header: [30, 41, 59] as [number, number, number],
  lightBg: [241, 245, 249] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  // Score color scale
  scoreRed: [239, 68, 68] as [number, number, number],
  scoreOrange: [249, 115, 22] as [number, number, number],
  scoreGreenLight: [74, 222, 128] as [number, number, number],
  scoreGreen: [22, 163, 74] as [number, number, number],
  scoreGold: [250, 204, 21] as [number, number, number],
  // Stat color scale
  statOrange: [194, 65, 12] as [number, number, number],
  statGreen: [21, 128, 61] as [number, number, number],
  statGreenDark: [20, 83, 45] as [number, number, number],
  statBlue: [29, 78, 216] as [number, number, number],
  statBlueDark: [30, 64, 175] as [number, number, number],
  statBlack: [17, 24, 39] as [number, number, number],
};

function getScoreColor(score: number): [number, number, number] {
  if (score >= 240) return COLORS.scoreGold;
  if (score >= 210) return COLORS.scoreGreen;
  if (score >= 180) return COLORS.scoreGreenLight;
  if (score >= 151) return COLORS.scoreOrange;
  return COLORS.scoreRed;
}

function getStatLevelColor(statType: string, value: number): [number, number, number] {
  const thresholds: Record<string, { max: number; color: [number, number, number] }[]> = {
    strike: [
      { max: 20, color: COLORS.statOrange },
      { max: 30, color: COLORS.statGreen },
      { max: 35, color: COLORS.statGreen },
      { max: 40, color: COLORS.statGreenDark },
      { max: 45, color: COLORS.statBlue },
      { max: 50, color: COLORS.statBlueDark },
      { max: Infinity, color: COLORS.statBlack },
    ],
    spare: [
      { max: 50, color: COLORS.statOrange },
      { max: 60, color: COLORS.statGreen },
      { max: 70, color: COLORS.statGreen },
      { max: 80, color: COLORS.statGreenDark },
      { max: 85, color: COLORS.statBlue },
      { max: 90, color: COLORS.statBlueDark },
      { max: Infinity, color: COLORS.statBlack },
    ],
    pocket: [
      { max: 50, color: COLORS.statOrange },
      { max: 60, color: COLORS.statGreen },
      { max: 65, color: COLORS.statGreen },
      { max: 70, color: COLORS.statGreenDark },
      { max: 75, color: COLORS.statBlue },
      { max: 80, color: COLORS.statBlueDark },
      { max: Infinity, color: COLORS.statBlack },
    ],
    singlePin: [
      { max: 70, color: COLORS.statOrange },
      { max: 75, color: COLORS.statGreen },
      { max: 80, color: COLORS.statGreen },
      { max: 85, color: COLORS.statGreenDark },
      { max: 90, color: COLORS.statBlue },
      { max: 95, color: COLORS.statBlueDark },
      { max: Infinity, color: COLORS.statBlack },
    ],
  };
  const levels = thresholds[statType];
  if (!levels) return COLORS.text;
  for (const l of levels) {
    if (value < l.max) return l.color;
  }
  return COLORS.text;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return 15;
  }
  return y;
}

export async function exportBowlingPdf(playerName: string, games: BowlingGameData[], options?: BowlingPdfOptions) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Load images in parallel
  const [avatarBase64, oilBase64] = await Promise.all([
    options?.playerAvatarUrl ? loadImageAsBase64(options.playerAvatarUrl) : Promise.resolve(null),
    options?.oilPatternImageUrl ? loadImageAsBase64(options.oilPatternImageUrl) : Promise.resolve(null),
  ]);

  // ===================== HEADER =====================
  const hasSubInfo = !!(options?.competitionName || options?.ageCategory || options?.location || options?.competitionDate);
  const headerH = avatarBase64 ? 35 : (hasSubInfo ? 30 : 28);
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Player avatar (circular clip via rounded rect)
  let textStartX = margin;
  if (avatarBase64) {
    try {
      const imgSize = 25;
      const imgX = margin;
      const imgY = 5;
      doc.setFillColor(...COLORS.white);
      doc.circle(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2 + 1, "F");
      doc.addImage(avatarBase64.data, "JPEG", imgX, imgY, imgSize, imgSize);
      textStartX = margin + imgSize + 5;
    } catch {
      // If image fails, just skip
    }
  }

  // Build title line with competition info
  const titleParts = [`Statistiques Bowling - ${playerName}`];
  const subParts: string[] = [];
  if (options?.competitionName) subParts.push(options.competitionName);
  if (options?.ageCategory) subParts.push(options.ageCategory);
  if (options?.location) subParts.push(options.location);
  if (options?.competitionDate) {
    try {
      subParts.push(format(new Date(options.competitionDate), "dd MMMM yyyy", { locale: fr }));
    } catch { subParts.push(options.competitionDate); }
  }

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(titleParts[0], textStartX, avatarBase64 ? 14 : 10);
  if (subParts.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subParts.join(" | "), textStartX, avatarBase64 ? 21 : 17);
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Rapport genere le ${format(new Date(), "dd MMMM yyyy", { locale: fr })} - ${games.length} parties`, textStartX, avatarBase64 ? 27 : 23);
  y = headerH + 7;

  // ===================== OIL PATTERN =====================
  if (oilBase64 || options?.oilPatternName) {
    y = checkPageBreak(doc, y, 55);
    drawSectionTitle(doc, margin, y, contentWidth, "HUILAGE");
    y += 12;

    if (options?.oilPatternName) {
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(options.oilPatternName, margin, y + 4);
      y += 8;
    }

    if (oilBase64) {
      try {
        const maxH = 60;
        const maxW = contentWidth;
        const aspect = oilBase64.width / oilBase64.height;
        let imgW = maxW;
        let imgH = imgW / aspect;
        if (imgH > maxH) {
          imgH = maxH;
          imgW = imgH * aspect;
        }
        doc.addImage(oilBase64.data, "PNG", margin + (contentWidth - imgW) / 2, y, imgW, imgH);
        y += imgH + 5;
      } catch {
        // skip
      }
    }
    y += 3;
  }

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
  drawSectionTitle(doc, margin, y, contentWidth, "VUE D'ENSEMBLE");
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

  // Detailed stats table with color coding
  const statsRowsDef: { label1: string; value1: string; stat1?: string; pct1?: number; label2: string; value2: string; stat2?: string; pct2?: number }[] = [
    { label1: "% Strikes", value1: `${avgStrikeRate.toFixed(1)}%`, stat1: "strike", pct1: avgStrikeRate, label2: "% Spares", value2: `${avgSpareRate.toFixed(1)}%`, stat2: "spare", pct2: avgSpareRate },
    { label1: "% Poches", value1: `${avgPocketRate.toFixed(1)}%`, stat1: "pocket", pct1: avgPocketRate, label2: "% Quilles seules", value2: `${singlePinConvRate.toFixed(1)}%`, stat2: "singlePin", pct2: singlePinConvRate },
    { label1: "% Conv. splits", value1: `${splitConvRate.toFixed(1)}%`, label2: "% Frames ouvertes", value2: `${openFramePercentage.toFixed(1)}%` },
    { label1: "Strikes total", value1: String(totalStrikes), label2: "Spares total", value2: String(totalSpares) },
    { label1: "Splits total", value1: String(totalSplits), label2: "Frames ouvertes", value2: String(totalOpenFrames) },
  ];

  statsRowsDef.forEach((row, i) => {
    const rowY = y + i * 7;
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(margin, rowY, contentWidth, 7, "F");
    }
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(row.label1, margin + 2, rowY + 5);
    doc.setFont("helvetica", "bold");
    if (row.stat1 && row.pct1 !== undefined) {
      doc.setTextColor(...getStatLevelColor(row.stat1, row.pct1));
    }
    doc.text(row.value1, margin + contentWidth / 2 - 5, rowY + 5, { align: "right" });
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text(row.label2, margin + contentWidth / 2 + 5, rowY + 5);
    doc.setFont("helvetica", "bold");
    if (row.stat2 && row.pct2 !== undefined) {
      doc.setTextColor(...getStatLevelColor(row.stat2, row.pct2));
    }
    doc.text(row.value2, margin + contentWidth - 2, rowY + 5, { align: "right" });
  });
  y += statsRowsDef.length * 7 + 8;

  // ===================== SECTION 2: ANALYSE PAR FRAME =====================
  y = checkPageBreak(doc, y, 80);
  drawSectionTitle(doc, margin, y, contentWidth, "ANALYSE PAR FRAME");
  y += 12;

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
          doc.setFillColor(...COLORS.goldBg);
          doc.setDrawColor(...COLORS.gold);
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

    // Frame distribution bars (all frames including 9, 10, 11, 12)
    y = checkPageBreak(doc, y, frameStats.length * 7 + 15);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Repartition par frame", margin, y + 4);
    y += 8;

    frameStats.forEach(f => {
      y = checkPageBreak(doc, y, 8);
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
  doc.addPage();
  y = 15;
  drawSectionTitle(doc, margin, y, contentWidth, "HISTORIQUE DES PARTIES");
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

  sortedMatches.forEach(([, { matchDate, opponent, games: matchGames }]) => {
    const matchTotalScore = matchGames.reduce((s, g) => s + g.score, 0);
    const matchAvg = matchTotalScore / matchGames.length;
    const matchHigh = Math.max(...matchGames.map(g => g.score));

    // Check if we need a new page for the match block (title + at least some rows)
    y = checkPageBreak(doc, y, 35);

    // Match header bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const dateStr = matchDate ? format(new Date(matchDate), "dd MMM yyyy", { locale: fr }) : "-";
    doc.text(`${opponent || "Competition"} - ${dateStr}`, margin + 3, y + 6.5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${matchGames.length} parties | Moy: ${matchAvg.toFixed(1)} | High: ${matchHigh}`, margin + contentWidth - 3, y + 6.5, { align: "right" });
    y += 13;

    // Each game row with score grid + stats
    matchGames.forEach((game) => {
      // Determine labels
      const phaseLabel = game.phase ? (PHASE_LABELS[game.phase] || game.phase) : "";
      const catLabel = game.bowlingCategory ? (CATEGORY_LABELS[game.bowlingCategory] || game.bowlingCategory) : "";
      const infoTags = [catLabel, phaseLabel].filter(Boolean).join(" | ");

      // Need space for: info line (4) + score grid (14) + stats row (7) + spacing (4) = ~29
      y = checkPageBreak(doc, y, 30);
      if (y === 15) {
        // Re-draw section title after page break
        drawSectionTitle(doc, margin, y, contentWidth, "HISTORIQUE DES PARTIES (suite)");
        y += 12;
      }

      // Info line: Partie N - Category | Phase
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Partie ${game.roundNumber}`, margin, y + 3);
      if (infoTags) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(` - ${infoTags}`, margin + doc.getTextWidth(`Partie ${game.roundNumber}`) + 1, y + 3);
      }
      y += 6;

      // Score grid (10 frames)
      if (game.frames && game.frames.length === 10) {
        drawScoreGrid(doc, margin, y, contentWidth, game.frames, game.score);
        y += 16;
      } else {
        // Just show score
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Score: ${game.score}`, margin, y + 5);
        y += 8;
      }

      // Stats row with color coding
      drawGameStatsRow(doc, margin, y, contentWidth, game);
      y += 9;
    });

    // Separator between matches
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
  });

  // ===================== SECTION 4: RECAPITULATIF PAR PARTIE =====================
  y = checkPageBreak(doc, y, 40);
  if (y > 200) {
    doc.addPage();
    y = 15;
  }
  drawSectionTitle(doc, margin, y, contentWidth, "RECAPITULATIF - STATS PAR PARTIE");
  y += 12;

  // Table header
  const recapCols = [
    { label: "Partie", w: 8 },
    { label: "Competition", w: 32 },
    { label: "Score", w: 16 },
    { label: "%X", w: 14 },
    { label: "%/", w: 14 },
    { label: "%Poche", w: 16 },
    { label: "Open", w: 14 },
    { label: "Splits", w: 16 },
    { label: "Phase", w: 22 },
    { label: "Format", w: 28 },
  ];

  const drawRecapHeader = (startY: number) => {
    doc.setFillColor(...COLORS.header);
    doc.rect(margin, startY, contentWidth, 7, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    let cx = margin;
    recapCols.forEach(col => {
      doc.text(col.label, cx + 1, startY + 5);
      cx += col.w;
    });
    return startY + 8;
  };

  y = drawRecapHeader(y);

  let gameIndex = 0;
  sortedMatches.forEach(([, { matchDate, opponent, games: matchGames }]) => {
    matchGames.forEach((game) => {
      gameIndex++;
      y = checkPageBreak(doc, y, 7);
      if (y === 15) {
        drawSectionTitle(doc, margin, y, contentWidth, "RECAPITULATIF (suite)");
        y += 12;
        y = drawRecapHeader(y);
      }

      if (gameIndex % 2 === 0) {
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      // Score background color
      const scoreColor = getScoreColor(game.score);
      doc.setFillColor(...scoreColor);
      const scoreColX = margin + recapCols[0].w + recapCols[1].w;
      doc.rect(scoreColX, y, recapCols[2].w, 6.5, "F");

      doc.setFontSize(6);
      let cx = margin;

      // # 
      doc.setTextColor(...COLORS.text);
      doc.setFont("helvetica", "normal");
      doc.text(String(gameIndex), cx + 1, y + 4.5);
      cx += recapCols[0].w;

      // Competition
      const oppText = (opponent || "-").length > 16 ? (opponent || "-").substring(0, 15) + "..." : (opponent || "-");
      doc.text(oppText, cx + 1, y + 4.5);
      cx += recapCols[1].w;

      // Score (on colored bg)
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.text(String(game.score), cx + 1, y + 4.5);
      cx += recapCols[2].w;

      // %X with color
      const xColor = getStatLevelColor("strike", game.strikePercentage);
      doc.setTextColor(...xColor);
      doc.setFont("helvetica", "bold");
      doc.text(`${game.strikePercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[3].w;

      // %/ with color
      const spColor = getStatLevelColor("spare", game.sparePercentage);
      doc.setTextColor(...spColor);
      doc.text(`${game.sparePercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[4].w;

      // %Poche with color
      const pocketColor = getStatLevelColor("pocket", game.pocketPercentage);
      doc.setTextColor(...pocketColor);
      doc.setFont("helvetica", "bold");
      doc.text(`${game.pocketPercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[5].w;

      // Open
      doc.text(String(game.openFrames), cx + 1, y + 4.5);
      cx += recapCols[6].w;

      // Splits
      doc.text(`${game.splitCount}(${game.splitConverted})`, cx + 1, y + 4.5);
      cx += recapCols[7].w;

      // Phase
      const phaseText = game.phase ? (PHASE_LABELS[game.phase] || game.phase) : "-";
      doc.text(phaseText.length > 10 ? phaseText.substring(0, 9) + "..." : phaseText, cx + 1, y + 4.5);
      cx += recapCols[8].w;

      // Format
      const catText = game.bowlingCategory ? (CATEGORY_LABELS[game.bowlingCategory] || game.bowlingCategory) : "-";
      doc.text(catText.length > 14 ? catText.substring(0, 13) + "..." : catText, cx + 1, y + 4.5);

      y += 6.5;
    });
  });

  // Score color legend
  y += 4;
  y = checkPageBreak(doc, y, 10);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  const scoreLegends = [
    { color: COLORS.scoreRed, label: "<150" },
    { color: COLORS.scoreOrange, label: "151-179" },
    { color: COLORS.scoreGreenLight, label: "180-209" },
    { color: COLORS.scoreGreen, label: "210-239" },
    { color: COLORS.scoreGold, label: "240+" },
  ];
  let slx = margin;
  doc.setTextColor(...COLORS.muted);
  doc.text("Scores:", slx, y + 2.5);
  slx += 14;
  scoreLegends.forEach(l => {
    doc.setFillColor(...l.color);
    doc.rect(slx, y, 3, 3, "F");
    doc.setTextColor(...COLORS.muted);
    doc.text(l.label, slx + 4, y + 2.5);
    slx += 18;
  });

  // Footer
  y += 8;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(`Rapport bowling de ${playerName} - ${totalGames} parties - Moyenne: ${avgScore.toFixed(1)} - High: ${highGame}`, pageWidth / 2, y, { align: "center" });

  // Save
  const fileName = `bowling_${playerName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

// ===================== DRAWING HELPERS =====================

function drawSectionTitle(doc: jsPDF, x: number, y: number, width: number, title: string) {
  doc.setFillColor(...COLORS.header);
  doc.rect(x, y, width, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 3, y + 5.5);
}

function drawScoreGrid(doc: jsPDF, x: number, y: number, totalWidth: number, frames: FrameData[], totalScore: number) {
  const frameW = (totalWidth - 18) / 10; // 18 = space for total column
  const frameH = 14;

  for (let i = 0; i < 10; i++) {
    const fx = x + i * frameW;
    const frame = frames[i];
    const isTenth = i === 9;

    // Frame border
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.white);
    doc.rect(fx, y, frameW, frameH, "FD");

    // Frame number
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(String(i + 1), fx + 1, y + 3);

    // Throws
    if (frame && frame.throws.length > 0) {
      const throwCount = isTenth ? Math.min(frame.throws.length, 3) : Math.min(frame.throws.length, 2);
      const throwW = frameW / (isTenth ? 3 : 2);

      for (let t = 0; t < throwCount; t++) {
        const throwVal = frame.throws[t]?.value || "";
        const tx = fx + t * throwW;

        // Color the throw cell
        if (throwVal === "X") {
          doc.setFillColor(...COLORS.strike);
          doc.rect(tx, y + 4, throwW, 4, "F");
          doc.setTextColor(...COLORS.white);
        } else if (throwVal === "/") {
          doc.setFillColor(...COLORS.spare);
          doc.rect(tx, y + 4, throwW, 4, "F");
          doc.setTextColor(...COLORS.white);
        } else {
          doc.setTextColor(...COLORS.text);
        }

        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        if (throwVal) {
          doc.text(throwVal, tx + throwW / 2, y + 7, { align: "center" });
        }
      }

      // Cumulative score
      if (frame.cumulativeScore !== undefined) {
        doc.setTextColor(...COLORS.text);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(frame.cumulativeScore), fx + frameW / 2, y + 12.5, { align: "center" });
      }
    }
  }

  // Total box
  const totalX = x + 10 * frameW + 2;
  const totalW = 16;
  const scoreColor = getScoreColor(totalScore);
  doc.setFillColor(...scoreColor);
  doc.roundedRect(totalX, y, totalW, frameH, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(String(totalScore), totalX + totalW / 2, y + 9, { align: "center" });
}

function drawGameStatsRow(doc: jsPDF, x: number, y: number, width: number, game: BowlingGameData) {
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, width, 7, "F");

  const items = [
    { label: "Strikes:", value: `${game.strikes} (${game.strikePercentage.toFixed(0)}%)`, statType: "strike", pct: game.strikePercentage },
    { label: "Spares:", value: `${game.spares} (${game.sparePercentage.toFixed(0)}%)`, statType: "spare", pct: game.sparePercentage },
    { label: "Open:", value: String(game.openFrames), statType: "", pct: 0 },
    { label: "Splits:", value: `${game.splitCount}(${game.splitConverted})`, statType: "", pct: 0 },
    { label: "Poche:", value: `${game.pocketPercentage.toFixed(0)}%`, statType: "pocket", pct: game.pocketPercentage },
  ];

  const itemW = width / items.length;
  items.forEach((item, i) => {
    const ix = x + i * itemW;
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, ix + 1, y + 3);

    if (item.statType) {
      const color = getStatLevelColor(item.statType, item.pct);
      doc.setTextColor(...color);
    } else {
      doc.setTextColor(...COLORS.text);
    }
    doc.setFont("helvetica", "bold");
    doc.text(item.value, ix + 1 + doc.getTextWidth(item.label) + 1, y + 3);
  });
}

// ===================== DATA COMPUTATION =====================

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

  // Frames 1-9
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

  // Frame 11 (bonus throw after strike on frame 10)
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

  // Frame 12 (3rd throw after XX)
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
    start: computePhase(start, "Debut (1-3)"),
    mid: computePhase(mid, "Milieu (4-6)"),
    end: computePhase(end, "Fin (7-9)"),
    moneyTime: computePhase(moneyTime, "Money Time (10-12)"),
  };
}
