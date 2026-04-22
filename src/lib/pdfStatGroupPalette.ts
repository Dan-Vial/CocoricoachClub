/**
 * RGB tints for PDF rendering of stat sub-groups.
 * Index-aligned with `STAT_GROUP_PALETTE` in src/lib/statSubGroups.ts so that
 * sub-blocks displayed in the UI (Mêlées/Touches, Portage/Franchissements, etc.)
 * use the same color identity in exported PDFs.
 *
 * Each entry provides:
 *  - head:   header band background (light tint)
 *  - body:   row/tile background (very light tint)
 *  - border: outline color
 *  - accent: title/label text color (saturated)
 */
export interface PdfStatGroupColor {
  head: [number, number, number];
  body: [number, number, number];
  border: [number, number, number];
  accent: [number, number, number];
}

export const PDF_STAT_GROUP_PALETTE: PdfStatGroupColor[] = [
  // sky
  { head: [224, 242, 254], body: [240, 249, 255], border: [125, 211, 252], accent: [12, 74, 110] },
  // violet
  { head: [237, 233, 254], body: [245, 243, 255], border: [196, 181, 253], accent: [76, 29, 149] },
  // amber
  { head: [254, 243, 199], body: [255, 251, 235], border: [252, 211, 77], accent: [120, 53, 15] },
  // rose
  { head: [255, 228, 230], body: [255, 241, 242], border: [253, 164, 175], accent: [136, 19, 55] },
  // emerald
  { head: [209, 250, 229], body: [236, 253, 245], border: [110, 231, 183], accent: [6, 78, 59] },
  // cyan
  { head: [207, 250, 254], body: [236, 254, 255], border: [103, 232, 249], accent: [22, 78, 99] },
];

export function pdfGroupColor(index: number): PdfStatGroupColor {
  return PDF_STAT_GROUP_PALETTE[index % PDF_STAT_GROUP_PALETTE.length];
}
