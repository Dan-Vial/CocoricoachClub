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

  // Green background
  doc.setFillColor(21, 128, 61);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  const margin = 3;
  const fx = x + margin;
  const fy = y + 2;
  const fw = w - margin * 2;
  const fh = h - 4;

  // Field outline
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(fx, fy, fw, fh);

  // In-goal shading (lighter green)
  doc.setFillColor(34, 160, 80);
  doc.rect(fx, fy, fw * 0.05, fh, "F");
  doc.rect(fx + fw * 0.95, fy, fw * 0.05, fh, "F");

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
    doc.setLineWidth(line.thick ? 0.5 : 0.3);
    if (!line.solid) {
      const dashLen = 2, gapLen = 2;
      for (let dy = fy; dy < fy + fh; dy += dashLen + gapLen) {
        doc.line(lx, dy, lx, Math.min(dy + dashLen, fy + fh));
      }
    } else {
      doc.line(lx, fy, lx, fy + fh);
    }
    if (showLabels) {
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

  // Center circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.circle(fx + fw * 0.5, fy + fh * 0.5, fh * 0.14, "S");

  // Goals (both sides)
  doc.setDrawColor(255, 255, 255);
  const gy1 = fy + fh * 0.35, gy2 = fy + fh * 0.65;
  doc.setLineWidth(1);
  doc.line(fx + fw * 0.95, gy1, fx + fw * 0.95, gy2);
  doc.setLineWidth(0.5);
  doc.line(fx + fw * 0.05, gy1, fx + fw * 0.05, gy2);

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
