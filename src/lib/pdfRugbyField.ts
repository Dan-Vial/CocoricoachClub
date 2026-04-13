import jsPDF from "jspdf";

/**
 * Draws a regulation rugby field with all lines on a jsPDF document.
 * Returns the inner field bounds { fx, fy, fw, fh } for placing markers.
 */
export function drawPdfRugbyField(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { showLabels?: boolean; showLegend?: boolean }
): { fx: number; fy: number; fw: number; fh: number } {
  const showLabels = options?.showLabels !== false;

  // Base green background
  doc.setFillColor(26, 122, 66);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  const margin = 3;
  const fx = x + margin;
  const fy = y + 2;
  const fw = w - margin * 2;
  const fh = h - 4;

  // Alternating grass stripes (lighter/darker bands)
  const stripeCount = 10;
  const stripeW = fw / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(34, 140, 72);
    } else {
      doc.setFillColor(30, 120, 60);
    }
    doc.rect(fx + i * stripeW, fy, stripeW, fh, "F");
  }

  // In-goal shading (darker green)
  doc.setFillColor(22, 100, 50);
  doc.rect(fx, fy, fw * 0.05, fh, "F");
  doc.rect(fx + fw * 0.95, fy, fw * 0.05, fh, "F");

  // Surround area (slightly darker outside)
  doc.setFillColor(18, 90, 45);
  doc.rect(x, y, margin, h, "F");
  doc.rect(x + w - margin, y, margin, h, "F");
  doc.rect(x, y, w, 2, "F");
  doc.rect(x, y + h - 2, w, 2, "F");

  // Field outline - thick white border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.7);
  doc.rect(fx, fy, fw, fh);

  // All regulation lines
  const fieldLines: { pct: number; label: string; solid: boolean; thick: boolean }[] = [
    { pct: 0, label: "BM", solid: true, thick: false },
    { pct: 0.05, label: "En-but", solid: true, thick: true },
    { pct: 0.1, label: "5m", solid: false, thick: false },
    { pct: 0.15, label: "10m", solid: false, thick: false },
    { pct: 0.27, label: "22m", solid: true, thick: false },
    { pct: 0.45, label: "40m", solid: false, thick: false },
    { pct: 0.5, label: "½", solid: true, thick: true },
    { pct: 0.55, label: "40m", solid: false, thick: false },
    { pct: 0.73, label: "22m", solid: true, thick: false },
    { pct: 0.85, label: "10m", solid: false, thick: false },
    { pct: 0.9, label: "5m", solid: false, thick: false },
    { pct: 0.95, label: "En-but", solid: true, thick: true },
    { pct: 1, label: "BM", solid: true, thick: false },
  ];

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4);
  fieldLines.forEach((line) => {
    const lx = fx + line.pct * fw;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(line.thick ? 0.6 : 0.3);
    if (!line.solid) {
      const dashLen = 2, gapLen = 2;
      for (let dy = fy; dy < fy + fh; dy += dashLen + gapLen) {
        doc.line(lx, dy, lx, Math.min(dy + dashLen, fy + fh));
      }
    } else {
      doc.line(lx, fy, lx, fy + fh);
    }
    if (showLabels) {
      doc.setFontSize(3.5);
      doc.setTextColor(255, 255, 255);
      doc.text(line.label, lx, y + h + 3, { align: "center" });
    }
  });

  // Width marks (5m and 15m from each touchline)
  [5, 15].forEach(wm => {
    const yTop = fy + (wm / 70) * fh;
    const yBot = fy + ((70 - wm) / 70) * fh;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    for (let dx = fx; dx < fx + fw; dx += 5) {
      doc.line(dx, yTop, Math.min(dx + 1.5, fx + fw), yTop);
      doc.line(dx, yBot, Math.min(dx + 1.5, fx + fw), yBot);
    }
  });

  // Center spot (small dot, no circle - rugby, not football)
  doc.setFillColor(255, 255, 255);
  const centerX = fx + fw * 0.5;
  const centerY = fy + fh * 0.5;
  doc.circle(centerX, centerY, 0.8, "F");

  // 22m drop-out spots
  [0.27, 0.73].forEach(pct => {
    const spotX = fx + pct * fw;
    doc.setFillColor(255, 255, 255);
    doc.circle(spotX, centerY, 0.6, "F");
  });

  // Goal posts - H shape (both sides)
  [0.05, 0.95].forEach(pct => {
    const gx = fx + pct * fw;
    const postTop = fy + fh * 0.38;
    const postBot = fy + fh * 0.62;
    // Crossbar
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1.2);
    doc.line(gx, postTop, gx, postBot);
    // Uprights extending outward
    const outward = pct < 0.5 ? -1 : 1;
    const upLen = Math.min(8, fw * 0.04);
    doc.setLineWidth(0.6);
    doc.line(gx, postTop, gx + outward * upLen, postTop);
    doc.line(gx, postBot, gx + outward * upLen, postBot);
  });

  // "Ligne de touche" labels
  if (showLabels) {
    doc.setFontSize(3);
    doc.setTextColor(255, 255, 255);
    doc.text("Ligne de touche", fx + fw / 2, fy - 0.5, { align: "center" });
    doc.text("Ligne de touche", fx + fw / 2, fy + fh + 2.5, { align: "center" });
  }

  return { fx, fy, fw, fh };
}

/**
 * Draw rate color legend below the field
 */
export function drawPdfFieldLegend(doc: jsPDF, x: number, y: number) {
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  const legends = [
    { label: "≥ 70%", r: 34, g: 197, b: 94 },
    { label: "50-69%", r: 245, g: 158, b: 11 },
    { label: "< 50%", r: 239, g: 68, b: 68 },
  ];
  let lx = x;
  legends.forEach(l => {
    doc.setFillColor(l.r, l.g, l.b);
    doc.circle(lx, y, 1.5, "F");
    doc.setTextColor(30, 41, 59);
    doc.text(l.label, lx + 3, y + 1);
    lx += 20;
  });
}

/**
 * Draw a "Statistiques par zone" 3x3 grid table below cartography.
 * Returns the new Y position after the grid.
 */
export function drawPdfZoneStatsGrid(
  doc: jsPDF,
  kicks: Array<{ x: number; y: number; success: boolean }>,
  pageW: number,
  startY: number,
  pageH: number
): number {
  // Compute zone stats from kicks
  const zoneStats: Record<string, { success: number; total: number }> = {};
  // Coordinates are stored as % of a 600x400 SVG
  // Field inner area: x=20..580 (560px), y=14..386 (372px) within 600x400
  const svgW = 600, svgH = 400;
  const fLeft = 20, fRight = 580, fTop = 14, fBot = 386;
  const fW = fRight - fLeft; // 560
  const fH = fBot - fTop; // 372
  // Try line positions in SVG-% coordinates
  const rightTryLineSvgPct = (fLeft + 0.95 * fW) / svgW * 100; // ~92%
  const leftTryLineSvgPct = (fLeft + 0.05 * fW) / svgW * 100; // ~8%
  const fieldSvgSpan = rightTryLineSvgPct - leftTryLineSvgPct;
  const fieldCenterXSvgPct = (rightTryLineSvgPct + leftTryLineSvgPct) / 2; // ~50%
  const fieldCenterYSvgPct = (fTop + fH / 2) / svgH * 100; // ~50%
  const fieldHeightSvgPct = fH / svgH * 100; // ~93%

  kicks.forEach(kick => {
    // Determine which try line (posts) the kick is aimed at:
    // If kick is on the right half, posts are on the right (distance from right try line)
    // If kick is on the left half, posts are on the left (distance from left try line)
    const distFromRight = Math.abs(rightTryLineSvgPct - kick.x);
    const distFromLeft = Math.abs(kick.x - leftTryLineSvgPct);
    const distPct = Math.min(distFromRight, distFromLeft);
    const distM = Math.round((distPct / fieldSvgSpan) * 100);
    const row = distM < 22 ? "proche" : distM < 40 ? "moyen" : "loin";

    const lateralFromCenter = kick.y - fieldCenterYSvgPct;
    const lateralM = (lateralFromCenter / fieldHeightSvgPct) * 70;
    const col = lateralM < -10 ? "gauche" : lateralM > 10 ? "droite" : "centre";

    const key = `${row}-${col}`;
    if (!zoneStats[key]) zoneStats[key] = { success: 0, total: 0 };
    zoneStats[key].total++;
    if (kick.success) zoneStats[key].success++;
  });

  if (Object.keys(zoneStats).length === 0) return startY;

  let y = startY;
  if (y > pageH - 55) { doc.addPage(); y = 15; }

  // Title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Statistiques par zone", pageW / 2, y, { align: "center" });
  y += 5;

  const rows = ["proche", "moyen", "loin"];
  const cols = ["gauche", "centre", "droite"];
  const colLabels = ["Gauche", "Centre", "Droite"];
  const rowLabels = ["0-22m", "22-40m", "40m+"];
  const cellW = 40;
  const cellH = 11;
  const gridW = cellW * 3;
  const startX = pageW / 2 - gridW / 2;

  // Column headers
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  colLabels.forEach((l, i) => {
    doc.text(l, startX + i * cellW + cellW / 2, y, { align: "center" });
  });
  y += 4;

  rows.forEach((row, ri) => {
    cols.forEach((col, ci) => {
      const key = `${row}-${col}`;
      const zone = zoneStats[key];
      const cx = startX + ci * cellW;
      if (zone && zone.total > 0) {
        const zRate = Math.round((zone.success / zone.total) * 100);
        // Color-coded background
        if (zRate >= 70) doc.setFillColor(220, 252, 231);
        else if (zRate >= 40) doc.setFillColor(254, 249, 195);
        else doc.setFillColor(254, 226, 226);
        doc.roundedRect(cx + 1, y, cellW - 2, cellH, 1.5, 1.5, "F");
        // Text
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${zRate}%`, cx + cellW / 2, y + 5, { align: "center" });
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`(${zone.success}/${zone.total})`, cx + cellW / 2, y + 9, { align: "center" });
      } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cx + 1, y, cellW - 2, cellH, 1.5, 1.5, "F");
        doc.setTextColor(180, 190, 200);
        doc.setFontSize(9);
        doc.text("—", cx + cellW / 2, y + 6.5, { align: "center" });
      }
    });
    y += cellH + 1;
  });

  // Row labels below
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  rowLabels.forEach((l, i) => {
    doc.text(l, startX + i * cellW + cellW / 2, y + 2, { align: "center" });
  });
  y += 6;

  return y;
}

/**
 * Convert stored SVG-% coordinates (from a 600x400 RugbyFieldSVG click) 
 * to PDF field-relative positions.
 * SVG field inner area: x=20..580, y=14..386 within 600x400
 */
export function svgPctToPdfPos(
  kick: { x: number; y: number },
  fb: { fx: number; fy: number; fw: number; fh: number }
): { kx: number; ky: number } {
  const svgW = 600, svgH = 400;
  const fLeft = 20, fTop = 14;
  const fW = 560, fH = 372;
  // Convert SVG-% to field-relative fraction
  const svgPixelX = (kick.x / 100) * svgW;
  const svgPixelY = (kick.y / 100) * svgH;
  const fieldFracX = (svgPixelX - fLeft) / fW;
  const fieldFracY = (svgPixelY - fTop) / fH;
  return {
    kx: fb.fx + fieldFracX * fb.fw,
    ky: fb.fy + fieldFracY * fb.fh,
  };
}
