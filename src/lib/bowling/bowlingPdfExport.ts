import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { FrameData } from "@/components/athlete-portal/BowlingScoreSheet";

interface ArsenalBallData {
  name: string;
  drillingLayout?: string | null;
  imageUrl?: string | null;
  weightLbs?: number | null;
  coverType?: string | null;
  coreType?: string | null;
  rg?: number | null;
  differential?: number | null;
  intermediateDiff?: number | null;
  currentSurface?: string | null;
}

interface BowlingPdfOptions {
  playerAvatarUrl?: string | null;
  oilPatternImageUrl?: string | null;
  oilPatternName?: string | null;
  competitionName?: string | null;
  ageCategory?: string | null;
  location?: string | null;
  competitionDate?: string | null;
  arsenalBalls?: ArsenalBallData[];
  medals?: BowlingPdfMedal[];
}

interface BowlingPdfMedal {
  medal_type: string;
  rank?: number | null;
  custom_title?: string | null;
  team_label?: string | null;
}

async function loadImageAsBase64(url: string): Promise<{ data: string; width: number; height: number; format: "PNG" | "JPEG" } | null> {
  if (!url) return null;

  const cacheBustedUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();

  const getDimensions = async (dataUrl: string) => {
    return new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = dataUrl;
    });
  };

  const normalizeFormat = (dataUrl: string): "PNG" | "JPEG" => {
    if (dataUrl.startsWith("data:image/png")) return "PNG";
    return "JPEG";
  };

  try {
    const response = await fetch(cacheBustedUrl, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject();
        reader.readAsDataURL(blob);
      });

      let finalDataUrl = dataUrl;
      if (dataUrl.startsWith("data:image/webp")) {
        finalDataUrl = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(dataUrl);
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            } catch {
              resolve(dataUrl);
            }
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      }

      const dims = await getDimensions(finalDataUrl);
      return { data: finalDataUrl, width: dims.width, height: dims.height, format: normalizeFormat(finalDataUrl) };
    }
  } catch {
    // fallback below
  }

  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ data: dataUrl, width: img.naturalWidth || 1, height: img.naturalHeight || 1, format: "PNG" });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = cacheBustedUrl;
    });
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
  blockDebriefing?: string;
  blockId?: string;
  roundDate?: string;
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
  strike: [0, 0, 0] as [number, number, number], // Black for strikes
  spare: [22, 163, 74] as [number, number, number], // Green for spares
  open: [244, 63, 94] as [number, number, number],
  splitBg: [220, 38, 38] as [number, number, number], // Red bg for splits
  header: [30, 41, 59] as [number, number, number],
  lightBg: [241, 245, 249] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  scoreRed: [239, 68, 68] as [number, number, number],
  scoreOrange: [249, 115, 22] as [number, number, number],
  scoreGreenLight: [74, 222, 128] as [number, number, number],
  scoreGreen: [22, 163, 74] as [number, number, number],
  scoreGold: [250, 204, 21] as [number, number, number],
  statOrange: [194, 65, 12] as [number, number, number],
  statGreen: [21, 128, 61] as [number, number, number],
  statGreenDark: [20, 83, 45] as [number, number, number],
  statBlue: [29, 78, 216] as [number, number, number],
  statBlueDark: [30, 64, 175] as [number, number, number],
  statBlack: [17, 24, 39] as [number, number, number],
  statNoire2Bg: [0, 0, 0] as [number, number, number],
  statNoire2Text: [220, 38, 38] as [number, number, number],
};

function getScoreColor(score: number): [number, number, number] {
  if (score >= 240) return COLORS.scoreGold;
  if (score >= 210) return COLORS.scoreGreen;
  if (score >= 180) return COLORS.scoreGreenLight;
  if (score >= 151) return COLORS.scoreOrange;
  return COLORS.scoreRed;
}

function getStatLevelColors(statType: string, value: number): { bg: [number, number, number]; text: [number, number, number] } {
  const NOIRE2 = { bg: COLORS.statNoire2Bg, text: COLORS.statNoire2Text };
  const WHITE_TEXT = COLORS.white;
  const thresholds: Record<string, { max: number; bg: [number, number, number]; text: [number, number, number] }[]> = {
    strike: [
      { max: 20, bg: COLORS.statOrange, text: WHITE_TEXT },
      { max: 30, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 35, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 40, bg: COLORS.statGreenDark, text: WHITE_TEXT },
      { max: 45, bg: COLORS.statBlue, text: WHITE_TEXT },
      { max: 50, bg: COLORS.statBlueDark, text: WHITE_TEXT },
      { max: 55, bg: COLORS.statBlack, text: WHITE_TEXT },
      { max: Infinity, bg: NOIRE2.bg, text: NOIRE2.text },
    ],
    spare: [
      { max: 50, bg: COLORS.statOrange, text: WHITE_TEXT },
      { max: 60, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 70, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 80, bg: COLORS.statGreenDark, text: WHITE_TEXT },
      { max: 85, bg: COLORS.statBlue, text: WHITE_TEXT },
      { max: 90, bg: COLORS.statBlueDark, text: WHITE_TEXT },
      { max: 95, bg: COLORS.statBlack, text: WHITE_TEXT },
      { max: Infinity, bg: NOIRE2.bg, text: NOIRE2.text },
    ],
    pocket: [
      { max: 50, bg: COLORS.statOrange, text: WHITE_TEXT },
      { max: 60, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 65, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 70, bg: COLORS.statGreenDark, text: WHITE_TEXT },
      { max: 75, bg: COLORS.statBlue, text: WHITE_TEXT },
      { max: 80, bg: COLORS.statBlueDark, text: WHITE_TEXT },
      { max: 85, bg: COLORS.statBlack, text: WHITE_TEXT },
      { max: Infinity, bg: NOIRE2.bg, text: NOIRE2.text },
    ],
    singlePin: [
      { max: 70, bg: COLORS.statOrange, text: WHITE_TEXT },
      { max: 75, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 80, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 85, bg: COLORS.statGreenDark, text: WHITE_TEXT },
      { max: 90, bg: COLORS.statBlue, text: WHITE_TEXT },
      { max: 95, bg: COLORS.statBlueDark, text: WHITE_TEXT },
      { max: 100, bg: COLORS.statBlack, text: WHITE_TEXT },
      { max: Infinity, bg: NOIRE2.bg, text: NOIRE2.text },
    ],
    firstBallGte8: [
      { max: 50, bg: COLORS.statOrange, text: WHITE_TEXT },
      { max: 65, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 75, bg: COLORS.statGreen, text: WHITE_TEXT },
      { max: 85, bg: COLORS.statGreenDark, text: WHITE_TEXT },
      { max: 88, bg: COLORS.statBlue, text: WHITE_TEXT },
      { max: 92, bg: COLORS.statBlack, text: WHITE_TEXT },
      { max: Infinity, bg: NOIRE2.bg, text: NOIRE2.text },
    ],
  };
  const levels = thresholds[statType];
  if (!levels) return { bg: COLORS.text, text: COLORS.white };
  for (const l of levels) {
    if (value < l.max) return { bg: l.bg, text: l.text };
  }
  return { bg: COLORS.text, text: COLORS.white };
}

// Backward-compatible wrapper
function getStatLevelColor(statType: string, value: number): [number, number, number] {
  return getStatLevelColors(statType, value).bg;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return 15;
  }
  return y;
}

export async function exportBowlingPdf(playerName: string, games: BowlingGameData[], options?: BowlingPdfOptions, existingDoc?: jsPDF) {
  const doc = existingDoc || new jsPDF("p", "mm", "a4");
  const isNewDoc = !existingDoc;
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;
  const medals = options?.medals || [];

  const getMedalLabel = (medal: BowlingPdfMedal) => {
    if (medal.custom_title?.trim()) return medal.custom_title.trim();

    const baseLabel =
      medal.medal_type === "gold"
        ? "Médaille d'Or"
        : medal.medal_type === "silver"
          ? "Médaille d'Argent"
          : medal.medal_type === "bronze"
            ? "Médaille de Bronze"
            : medal.medal_type === "ranking"
              ? medal.rank
                ? `${medal.rank}e place`
                : "Classement"
              : medal.medal_type === "title"
                ? "Titre"
                : medal.medal_type;

    return medal.team_label ? `${baseLabel} ${medal.team_label}` : baseLabel;
  };

  const getMedalColors = (type: string): { fill: [number, number, number]; stroke: [number, number, number] } => {
    if (type === "gold") return { fill: [245, 158, 11], stroke: [180, 83, 9] };
    if (type === "silver") return { fill: [203, 213, 225], stroke: [100, 116, 139] };
    if (type === "bronze") return { fill: [194, 101, 55], stroke: [154, 52, 18] };
    if (type === "ranking") return { fill: [96, 165, 250], stroke: [29, 78, 216] };
    return { fill: [34, 197, 94], stroke: [21, 128, 61] };
  };

  // Load images in parallel
  const arsenalBalls = options?.arsenalBalls || [];
  const imagePromises: Promise<{ data: string; width: number; height: number; format: "PNG" | "JPEG" } | null>[] = [
    options?.playerAvatarUrl ? loadImageAsBase64(options.playerAvatarUrl) : Promise.resolve(null),
    options?.oilPatternImageUrl ? loadImageAsBase64(options.oilPatternImageUrl) : Promise.resolve(null),
    ...arsenalBalls.map(b => b.imageUrl ? loadImageAsBase64(b.imageUrl) : Promise.resolve(null)),
  ];
  const imageResults = await Promise.all(imagePromises);
  const avatarBase64 = imageResults[0];
  const oilBase64 = imageResults[1];
  const arsenalImages = imageResults.slice(2);

  // ===================== HEADER =====================
  const hasSubInfo = !!(options?.competitionName || options?.ageCategory || options?.location || options?.competitionDate);
  const hasMedals = medals.length > 0;
  const visibleMedals = medals.slice(0, 2);
  const estimatedTextStartX = avatarBase64 ? margin + 30 : margin;
  const medalLabels = visibleMedals.map(getMedalLabel);
  const medalTextMaxWidth = pageWidth - estimatedTextStartX - margin - 18;
  const medalLineCounts = medalLabels.map((label) => Math.max(1, doc.splitTextToSize(label, medalTextMaxWidth).length));
  const medalsBlockH = hasMedals
    ? visibleMedals.reduce((total, _medal, index) => total + 10 + (medalLineCounts[index] - 1) * 4, 0) + 4
    : 0;
  const headerH = (avatarBase64 ? 35 : (hasSubInfo ? 30 : 28)) + medalsBlockH;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerH, "F");

  let textStartX = margin;
  if (avatarBase64) {
    try {
      const imgSize = 25;
      const imgX = margin;
      const imgY = 5;
      const cx = imgX + imgSize / 2;
      const cy = imgY + imgSize / 2;
      const r = imgSize / 2;
      // White circle border
      doc.setFillColor(...COLORS.white);
      doc.circle(cx, cy, r + 1, "F");
      // Clip image to circle
      doc.saveGraphicsState();
      doc.circle(cx, cy, r, null as any);
      (doc as any).clip();
      (doc as any).discardPath();
      doc.addImage(avatarBase64.data, avatarBase64.format, imgX, imgY, imgSize, imgSize);
      doc.restoreGraphicsState();
      textStartX = margin + imgSize + 5;
    } catch {
      // skip
    }
  }

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

  if (hasMedals) {
    let medalY = avatarBase64 ? 31 : 27;

    visibleMedals.forEach((medal, index) => {
      const labelLines = doc.splitTextToSize(medalLabels[index], medalTextMaxWidth);
      const rowH = 10 + (labelLines.length - 1) * 4;
      const { fill, stroke } = getMedalColors(medal.medal_type);
      const icon =
        medal.medal_type === "gold"
          ? "1"
          : medal.medal_type === "silver"
            ? "2"
            : medal.medal_type === "bronze"
              ? "3"
              : medal.medal_type === "ranking"
                ? medal.rank ? String(medal.rank) : "#"
                : "★";

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...stroke);
      doc.roundedRect(textStartX, medalY, pageWidth - textStartX - margin, rowH, 3, 3, "FD");

      doc.setFillColor(...fill);
      doc.circle(textStartX + 6, medalY + rowH / 2, 3.2, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(icon, textStartX + 6, medalY + rowH / 2 + 1.1, { align: "center" });

      doc.setTextColor(...stroke);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(labelLines, textStartX + 12, medalY + 4.4);

      medalY += rowH + 3;
    });

    if (medals.length > visibleMedals.length) {
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`+${medals.length - visibleMedals.length} autre(s) médaille(s)`, textStartX, medalY + 1);
    }
  }
  y = headerH + 7;

  // ===================== OIL PATTERN =====================
  if (oilBase64 || options?.oilPatternName) {
    let oilY = y;
    drawSectionTitle(doc, margin, oilY, contentWidth, "HUILAGE");
    oilY += 14;

    if (options?.oilPatternName) {
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(options.oilPatternName, pageWidth / 2, oilY + 4, { align: "center" });
      oilY += 12;
    }

    if (oilBase64) {
      try {
        // Calculate available space: leave room for arsenal below
        const arsenalNeededH = arsenalBalls.length > 0 ? 45 : 0;
        const maxH = (297 - oilY - 10 - arsenalNeededH) * 0.85;
        const availableW = contentWidth;
        const aspect = oilBase64.width / oilBase64.height;
        let imgW = availableW;
        let imgH = imgW / aspect;
        if (imgH > maxH) {
          imgH = maxH;
          imgW = imgH * aspect;
        }
        doc.addImage(oilBase64.data, oilBase64.format, margin + (contentWidth - imgW) / 2, oilY, imgW, imgH);
        oilY += imgH + 4;
      } catch {
        // skip
      }
    }
    y = oilY;
  }

  // ===================== ARSENAL =====================
  if (arsenalBalls.length > 0) {
    y += 4;
    drawSectionTitle(doc, margin, y, contentWidth, "ARSENAL");
    y += 14;

    const ballSize = 16; // circle diameter
    const ballSpacing = 4;
    const ballsPerRow = Math.floor((contentWidth + ballSpacing) / (ballSize + ballSpacing + 30));
    const colW = contentWidth / Math.min(arsenalBalls.length, Math.max(ballsPerRow, 2));

    for (let i = 0; i < arsenalBalls.length; i++) {
      const col = i % Math.max(ballsPerRow, 2);
      if (i > 0 && col === 0) {
        y += ballSize + 10;
        y = checkPageBreak(doc, y, ballSize + 10);
      }

      const bx = margin + col * colW;
      const ball = arsenalBalls[i];
      const imgData = arsenalImages[i];

      // Draw circular ball image or placeholder
      const cx = bx + ballSize / 2;
      const cy = y + ballSize / 2;
      const radius = ballSize / 2;

      if (imgData) {
        try {
          // Draw circular clip area background
          doc.setFillColor(230, 230, 230);
          doc.circle(cx, cy, radius, "F");
          // Add image (square crop into circle area)
          doc.addImage(imgData.data, imgData.format, bx, y, ballSize, ballSize);
          // Draw circle border on top
          doc.setDrawColor(...COLORS.border);
          doc.setLineWidth(0.5);
          doc.circle(cx, cy, radius, "S");
        } catch {
          doc.setFillColor(200, 200, 200);
          doc.circle(cx, cy, radius, "F");
          doc.setTextColor(...COLORS.white);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("🎳", cx, cy + 1, { align: "center" });
        }
      } else {
        // Placeholder circle
        doc.setFillColor(200, 200, 200);
        doc.circle(cx, cy, radius, "F");
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.5);
        doc.circle(cx, cy, radius, "S");
      }

      // Ball name
      const textX = bx + ballSize + 3;
      const maxTextW = colW - ballSize - 6;
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const displayName = ball.name.length > 25 ? ball.name.substring(0, 24) + "..." : ball.name;
      doc.text(displayName, textX, y + 4);

      // Weight + cover/core type line
      const detailParts: string[] = [];
      if (ball.weightLbs) detailParts.push(`${ball.weightLbs} lbs`);
      if (ball.coverType) detailParts.push(ball.coverType);
      if (ball.coreType) detailParts.push(ball.coreType);
      if (detailParts.length > 0) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(detailParts.join("  |  "), textX, y + 8.5);
      }

      // RG / Diff / Layout line
      const specParts: string[] = [];
      if (ball.rg) specParts.push(`RG: ${ball.rg}`);
      if (ball.differential) specParts.push(`Diff: ${ball.differential}`);
      if (ball.intermediateDiff) specParts.push(`Int: ${ball.intermediateDiff}`);
      if (ball.drillingLayout) specParts.push(`Layout: ${ball.drillingLayout}`);
      if (specParts.length > 0) {
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.muted);
        doc.text(specParts.join("  |  "), textX, y + 12.5);
      }

      // Surface
      if (ball.currentSurface) {
        doc.setFontSize(6);
        doc.text(`Surface: ${ball.currentSurface}`, textX, y + 16);
      }
    }
    y += ballSize + 12;
  }

  // Start a new page for the overview
  doc.addPage();
  y = 15;

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

  // ---- Side by side: Stats (left) + Référentiel (right) ----
  const colGap = 4;
  const leftColW = (contentWidth - colGap) / 2;
  const rightColW = (contentWidth - colGap) / 2;
  const leftX = margin;
  const rightX = margin + leftColW + colGap;
  const sideStartY = y;

  // === LEFT: Statistiques détaillées ===
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Statistiques detaillees", leftX + 2, y + 4);
  y += 7;

  const statsRows: { label: string; value: string; stat?: string; pct?: number }[] = [
    { label: "% Strikes", value: `${avgStrikeRate.toFixed(1)}%`, stat: "strike", pct: avgStrikeRate },
    { label: "% Spares", value: `${avgSpareRate.toFixed(1)}%`, stat: "spare", pct: avgSpareRate },
    { label: "% Poches", value: `${avgPocketRate.toFixed(1)}%`, stat: "pocket", pct: avgPocketRate },
    { label: "% Quilles seules", value: `${singlePinConvRate.toFixed(1)}%`, stat: "singlePin", pct: singlePinConvRate },
    { label: "% Conv. splits", value: `${splitConvRate.toFixed(1)}%` },
    { label: "% Frames ouvertes", value: `${openFramePercentage.toFixed(1)}%` },
  ];

  statsRows.forEach((row, i) => {
    const rowY = y + i * 6.5;
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(leftX, rowY, leftColW, 6.5, "F");
    }
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(row.label, leftX + 2, rowY + 4.5);
    doc.setFont("helvetica", "bold");
    if (row.stat && row.pct !== undefined) {
      // Draw colored badge
      const colors = getStatLevelColors(row.stat, row.pct);
      const tw = doc.getTextWidth(row.value);
      const badgeW = tw + 4;
      const badgeX = leftX + leftColW - badgeW - 2;
      doc.setFillColor(...colors.bg);
      doc.roundedRect(badgeX, rowY + 0.5, badgeW, 5.5, 1, 1, "F");
      doc.setTextColor(...colors.text);
      doc.text(row.value, badgeX + badgeW / 2, rowY + 4.5, { align: "center" });
    } else {
      doc.setTextColor(...COLORS.text);
      doc.text(row.value, leftX + leftColW - 3, rowY + 4.5, { align: "right" });
    }
  });

  // Totals below stats
  const totalsStartY = y + statsRows.length * 6.5 + 3;
  doc.setDrawColor(...COLORS.border);
  doc.line(leftX, totalsStartY - 1, leftX + leftColW, totalsStartY - 1);
  const totalsRows = [
    { label: "Strikes total", value: String(totalStrikes) },
    { label: "Spares total", value: String(totalSpares) },
    { label: "Splits", value: String(totalSplits) },
    { label: "Frames ouvertes", value: String(totalOpenFrames) },
  ];
  totalsRows.forEach((row, i) => {
    const rowY = totalsStartY + i * 6;
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(row.label, leftX + 2, rowY + 4);
    doc.setFont("helvetica", "bold");
    doc.text(row.value, leftX + leftColW - 3, rowY + 4, { align: "right" });
  });

  // === RIGHT: Référentiel de performance ===
  let ry = sideStartY;
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Referentiel de performance", rightX + 2, ry + 4);
  ry += 7;

  // Table header
  const refCols = ["Niveau", "Poches", "Strikes", "Spares", "9/", ">=8"];
  const refColW = rightColW / refCols.length;
  doc.setFillColor(...COLORS.header);
  doc.rect(rightX, ry, rightColW, 6, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  refCols.forEach((col, i) => {
    doc.text(col, rightX + i * refColW + refColW / 2, ry + 4, { align: "center" });
  });
  ry += 6;

  // Référentiel rows with colored backgrounds
  const refRows: { label: string; bg: [number, number, number]; textColor: [number, number, number]; pocket: string; strike: string; spare: string; single: string; fb8: string }[] = [
    { label: "Orange", bg: [194, 65, 12], textColor: COLORS.white, pocket: "<50%", strike: "<20%", spare: "<50%", single: "<70%", fb8: "<50%" },
    { label: "Verte 1", bg: [21, 128, 61], textColor: COLORS.white, pocket: "50-60%", strike: "20-30%", spare: "50-60%", single: "70-75%", fb8: "50-65%" },
    { label: "Verte 2", bg: [21, 128, 61], textColor: COLORS.white, pocket: "60-65%", strike: "30-35%", spare: "60-70%", single: "75-80%", fb8: "65-75%" },
    { label: "Verte 3", bg: [20, 83, 45], textColor: COLORS.white, pocket: "65-70%", strike: "35-40%", spare: "70-80%", single: "80-85%", fb8: "75-85%" },
    { label: "Bleue 1", bg: [29, 78, 216], textColor: COLORS.white, pocket: "70-75%", strike: "40-45%", spare: "80-85%", single: "85-90%", fb8: "85-88%" },
    { label: "Bleue 2", bg: [30, 64, 175], textColor: COLORS.white, pocket: "75-80%", strike: "45-50%", spare: "85-90%", single: "90-95%", fb8: "85-88%" },
    { label: "Noire 1", bg: [17, 24, 39], textColor: COLORS.white, pocket: "80-85%", strike: "50-55%", spare: "90-95%", single: "95-99%", fb8: "88-92%" },
    { label: "Noire 2", bg: [0, 0, 0], textColor: [220, 38, 38], pocket: ">=85%", strike: ">=55%", spare: ">=95%", single: "100%", fb8: ">=92%" },
  ];

  refRows.forEach((row) => {
    const vals = [row.label, row.pocket, row.strike, row.spare, row.single, row.fb8];
    doc.setFillColor(...row.bg);
    doc.rect(rightX, ry, rightColW, 6, "F");
    doc.setTextColor(...row.textColor);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    vals.forEach((val, i) => {
      doc.text(val, rightX + i * refColW + refColW / 2, ry + 4, { align: "center" });
    });
    ry += 6;
  });

  // Determine bottom of both columns
  const leftBottom = totalsStartY + totalsRows.length * 6 + 4;
  const rightBottom = ry + 2;
  y = Math.max(leftBottom, rightBottom) + 4;

  // === Score Evolution Bars ===
  if (games.length >= 2) {
    y = checkPageBreak(doc, y, 40);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Evolution des scores", margin + 2, y + 4);
    y += 8;

    const scoreLabelH = 6; // space reserved for score labels above bars
    const barAreaH = 30;
    const barMaxH = barAreaH;
    const minBase = 100;
    const maxScore = Math.max(...games.map(g => g.score), 300);
    const range = maxScore - minBase;
    const maxBars = Math.min(games.length, 80);
    const barGap = 1;
    const barW = Math.max(2, Math.min(8, (contentWidth - maxBars * barGap) / maxBars));

    const barsStartX = margin + (contentWidth - maxBars * (barW + barGap)) / 2;

    // Draw bars with score labels
    for (let i = 0; i < maxBars; i++) {
      const game = games[i];
      const clampedScore = Math.max(game.score, minBase);
      const h = range > 0 ? ((clampedScore - minBase) / range) * barMaxH : barMaxH * 0.5;
      const barH = Math.max(h, 2);
      const bx = barsStartX + i * (barW + barGap);
      const by = y + scoreLabelH + barAreaH - barH;

      const color = getScoreColor(game.score);
      doc.setFillColor(...color);
      doc.roundedRect(bx, by, barW, barH, 0.5, 0.5, "F");

      // Score label above bar
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(barW >= 5 ? 5 : 4);
      doc.setFont("helvetica", "bold");
      doc.text(String(game.score), bx + barW / 2, by - 1, { align: "center" });
    }
    y += scoreLabelH + barAreaH + 3;

    // Score legend
    const scoreLegends = [
      { color: COLORS.scoreRed, label: "<150" },
      { color: COLORS.scoreOrange, label: "151-179" },
      { color: COLORS.scoreGreenLight, label: "180-209" },
      { color: COLORS.scoreGreen, label: "210-239" },
      { color: COLORS.scoreGold, label: "240+" },
    ];
    let slx = margin + contentWidth / 2 - 40;
    doc.setFontSize(5.5);
    scoreLegends.forEach(l => {
      doc.setFillColor(...l.color);
      doc.circle(slx + 1, y + 1, 1.2, "F");
      doc.setTextColor(...COLORS.muted);
      doc.setFont("helvetica", "normal");
      doc.text(l.label, slx + 3, y + 2);
      slx += 16;
    });
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(5.5);
    doc.text(`${games.length} parties`, margin + contentWidth / 2, y + 7, { align: "center" });
    y += 12;
  }
  y += 4;

  // ===================== SECTION 2: ANALYSE PAR FRAME =====================
  y = checkPageBreak(doc, y, 80);
  drawSectionTitle(doc, margin, y, contentWidth, "ANALYSE PAR FRAME");
  y += 12;

  const gamesWithFrames = games.filter(g => g.frames && g.frames.length === 10);
  if (gamesWithFrames.length > 0) {
    const frameStats = computeFrameStats(gamesWithFrames);
    const phases = computePhases(frameStats);

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

    // Frame distribution bars
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

      doc.setFillColor(226, 232, 240);
      doc.rect(barX, y, barW, barH, "F");

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

  // ===================== SECTION 3: HISTORIQUE DES PARTIES (grouped by Bloc) =====================
  doc.addPage();
  y = 15;
  drawSectionTitle(doc, margin, y, contentWidth, "HISTORIQUE DES PARTIES");
  y += 12;

  // Group by blockId (each block = distinct category/phase grouping), fallback to matchId for legacy data
  const groupedByBlock = games.reduce<Record<string, { matchDate: string; roundDate: string; opponent: string; bowlingCategory: string; phase: string; games: BowlingGameData[] }>>((acc, game) => {
    const key = game.blockId || `match_${game.matchId}_${game.bowlingCategory || ""}_${game.phase || ""}`;
    if (!acc[key]) {
      acc[key] = {
        matchDate: game.matchDate,
        roundDate: game.roundDate || game.matchDate,
        opponent: game.matchOpponent,
        bowlingCategory: game.bowlingCategory || "",
        phase: game.phase || "",
        games: [],
      };
    }
    acc[key].games.push(game);
    return acc;
  }, {});

  const sortedMatches = Object.entries(groupedByBlock).sort(([, a], [, b]) => {
    const dateA = a.roundDate || a.matchDate;
    const dateB = b.roundDate || b.matchDate;
    return dateA.localeCompare(dateB);
  });

  sortedMatches.forEach(([, { matchDate, roundDate, opponent, bowlingCategory, phase, games: matchGames }], blocIndex) => {
    const matchTotalScore = matchGames.reduce((s, g) => s + g.score, 0);
    const matchAvg = matchTotalScore / matchGames.length;
    const matchHigh = Math.max(...matchGames.map(g => g.score));

    // Build bloc title: "Bloc N: Category, Phase, Date"
    const effectiveDate = roundDate || matchDate;
    const dateStr = effectiveDate ? format(new Date(effectiveDate), "dd MMM yyyy", { locale: fr }) : "-";
    const catLabel = bowlingCategory ? (CATEGORY_LABELS[bowlingCategory] || bowlingCategory) : "";
    const phaseLabel = phase ? (PHASE_LABELS[phase] || phase) : "";
    const blocTitleParts = [`Bloc ${blocIndex + 1}`];
    if (catLabel) blocTitleParts.push(catLabel);
    if (phaseLabel) blocTitleParts.push(phaseLabel);
    if (opponent) blocTitleParts.push(`vs ${opponent}`);
    const blocTitle = blocTitleParts.join(" - ");
    const blocSubtitle = dateStr !== "-" ? dateStr : "";

    // Check space
    y = checkPageBreak(doc, y, 40);

    // Bloc header bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(blocTitle, margin + 3, y + 5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const subParts = [];
    if (blocSubtitle) subParts.push(blocSubtitle);
    subParts.push(`${matchGames.length} parties | Moy: ${matchAvg.toFixed(1)} | High: ${matchHigh}`);
    doc.text(subParts.join(" — "), margin + 3, y + 10);
    y += 15;

    // Separator line under bloc header
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 1, margin + contentWidth, y - 1);

    // Each game row with score grid + stats
    matchGames.forEach((game) => {
      const gamePhaseLabel = game.phase ? (PHASE_LABELS[game.phase] || game.phase) : "";
      const gameCatLabel = game.bowlingCategory ? (CATEGORY_LABELS[game.bowlingCategory] || game.bowlingCategory) : "";
      const infoTags = [gameCatLabel, gamePhaseLabel].filter(Boolean).join(" | ");

      y = checkPageBreak(doc, y, 30);
      if (y === 15) {
        // No repeat title on continuation pages
      }

      // Info line: Partie N
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

    // Block debriefing/bilan - use the first game's blockDebriefing (same for all games in a block)
    const blockDebriefing = matchGames.find(g => g.blockDebriefing)?.blockDebriefing;
    if (blockDebriefing) {
      y = checkPageBreak(doc, y, 18);
      // Debriefing box
      doc.setFillColor(237, 242, 255); // Light blue background
      doc.setDrawColor(...COLORS.primary);
      doc.setLineWidth(0.3);
      
      // Calculate text height
      const maxTextWidth = contentWidth - 10;
      const lines = doc.splitTextToSize(blockDebriefing, maxTextWidth);
      const textH = lines.length * 4;
      const boxH = Math.max(textH + 10, 14);
      
      y = checkPageBreak(doc, y, boxH + 4);
      doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, "FD");
      
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("BILAN DU BLOC", margin + 4, y + 5);
      
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(lines, margin + 4, y + 9);
      
      y += boxH + 3;
    }

    // Separator between blocs
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
  });

  // ===================== SECTION 4: RECAPITULATIF PAR PARTIE =====================
  y = checkPageBreak(doc, y, 40);
  if (y > 200) {
    doc.addPage();
    y = 15;
  }
  drawSectionTitle(doc, margin, y, contentWidth, "RECAPITULATIF - STATS PAR PARTIE");
  y += 12;

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
  sortedMatches.forEach(([, { matchDate, roundDate, opponent, bowlingCategory, phase, games: matchGames }]) => {
    matchGames.forEach((game) => {
      gameIndex++;
      y = checkPageBreak(doc, y, 7);
      if (y === 15) {
        y = drawRecapHeader(y);
      }

      if (gameIndex % 2 === 0) {
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      const scoreColor = getScoreColor(game.score);
      doc.setFillColor(...scoreColor);
      const scoreColX = margin + recapCols[0].w + recapCols[1].w;
      doc.rect(scoreColX, y, recapCols[2].w, 6.5, "F");

      doc.setFontSize(6);
      let cx = margin;

      doc.setTextColor(...COLORS.text);
      doc.setFont("helvetica", "normal");
      doc.text(String(gameIndex), cx + 1, y + 4.5);
      cx += recapCols[0].w;

      const oppText = (opponent || "-").length > 16 ? (opponent || "-").substring(0, 15) + "..." : (opponent || "-");
      doc.text(oppText, cx + 1, y + 4.5);
      cx += recapCols[1].w;

      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.text(String(game.score), cx + 1, y + 4.5);
      cx += recapCols[2].w;

      const xColors = getStatLevelColors("strike", game.strikePercentage);
      doc.setTextColor(...xColors.bg);
      doc.setFont("helvetica", "bold");
      doc.text(`${game.strikePercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[3].w;

      const spColors = getStatLevelColors("spare", game.sparePercentage);
      doc.setTextColor(...spColors.bg);
      doc.text(`${game.sparePercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[4].w;

      const pocketColors = getStatLevelColors("pocket", game.pocketPercentage);
      doc.setTextColor(...pocketColors.bg);
      doc.setFont("helvetica", "bold");
      doc.text(`${game.pocketPercentage.toFixed(0)}%`, cx + 1, y + 4.5);
      cx += recapCols[5].w;

      doc.setTextColor(...COLORS.text);
      doc.setFont("helvetica", "bold");
      doc.text(String(game.openFrames), cx + 1, y + 4.5);
      cx += recapCols[6].w;

      doc.text(`${game.splitCount}(${game.splitConverted})`, cx + 1, y + 4.5);
      cx += recapCols[7].w;

      const phaseText = game.phase ? (PHASE_LABELS[game.phase] || game.phase) : "-";
      doc.text(phaseText.length > 10 ? phaseText.substring(0, 9) + "..." : phaseText, cx + 1, y + 4.5);
      cx += recapCols[8].w;

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

  if (isNewDoc) {
    const fileName = `bowling_${playerName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  }
  return doc;
}

export interface TeamPlayerData {
  playerId: string;
  playerName: string;
  avatarUrl?: string | null;
  games: BowlingGameData[];
  arsenalBalls?: ArsenalBallData[];
  oilPatternName?: string | null;
  oilPatternImageUrl?: string | null;
  medals?: BowlingPdfMedal[];
}

export async function exportBowlingTeamPdf(
  teamPlayers: TeamPlayerData[],
  options?: Omit<BowlingPdfOptions, "playerAvatarUrl" | "arsenalBalls">
) {
  const doc = new jsPDF("p", "mm", "a4");

  for (let i = 0; i < teamPlayers.length; i++) {
    const player = teamPlayers[i];
    if (player.games.length === 0) continue;

    if (i > 0) {
      doc.addPage();
    }

    const playerOptions = {
      ...options,
      playerAvatarUrl: player.avatarUrl,
      arsenalBalls: player.arsenalBalls,
      medals: player.medals,
      // Use per-player oil pattern if assigned, otherwise fallback to shared options
      oilPatternName: player.oilPatternName ?? options?.oilPatternName,
      oilPatternImageUrl: player.oilPatternImageUrl ?? options?.oilPatternImageUrl,
    };

    await exportBowlingPdf(
      player.playerName,
      player.games,
      playerOptions,
      doc
    );
  }

  const fileName = `bowling_equipe_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

function drawSectionTitle(doc: jsPDF, x: number, y: number, width: number, title: string) {
  doc.setFillColor(...COLORS.header);
  doc.rect(x, y, width, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 3, y + 5.5);
}

function drawScoreGrid(doc: jsPDF, x: number, y: number, totalWidth: number, frames: FrameData[], totalScore: number) {
  const frameW = (totalWidth - 18) / 10;
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
        const isSplit = frame.throws[t]?.isSplit === true;

        if (throwVal === "X") {
          // Strike: white X on black background
          doc.setFillColor(...COLORS.strike);
          doc.rect(tx, y + 4, throwW, 4, "F");
          doc.setTextColor(...COLORS.white);
        } else if (throwVal === "/") {
          // Spare: white / on green background
          doc.setFillColor(...COLORS.spare);
          doc.rect(tx, y + 4, throwW, 4, "F");
          doc.setTextColor(...COLORS.white);
        } else if (isSplit) {
          // Split: red background
          doc.setFillColor(...COLORS.splitBg);
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
