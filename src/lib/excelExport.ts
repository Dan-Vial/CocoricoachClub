import ExcelJS from "exceljs";
import { format } from "date-fns";
import { preparePdfWithSettings, type PdfCustomSettings } from "@/lib/pdfExport";

/**
 * Shared Excel export helpers — same branding as PDF exports
 */

const hexToArgb = (hex: string): string => {
  const h = hex.replace("#", "");
  return `FF${h.toUpperCase()}`;
};

interface ExcelBranding {
  clubName: string;
  categoryName: string;
  seasonName: string;
  headerColor: string; // hex
  accentColor: string; // hex
  footerText: string | null;
}

export async function getExcelBranding(categoryId: string): Promise<ExcelBranding> {
  const { settings, clubName, categoryName, seasonName } = await preparePdfWithSettings(categoryId);
  return {
    clubName: settings?.club_name_override || clubName || "",
    categoryName: categoryName || "",
    seasonName: seasonName || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    headerColor: settings?.header_color || "#224378",
    accentColor: settings?.accent_color || "#3B82F6",
    footerText: settings?.footer_text || null,
  };
}

export function addBrandedHeader(
  sheet: ExcelJS.Worksheet,
  title: string,
  branding: ExcelBranding,
  extraInfo?: [string, string][],
): number {
  const colCount = Math.max(6, (sheet.columns?.length || 6));

  // Title row with header color background
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(branding.headerColor) } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(1).height = 36;

  // Subtitle row with lighter tint
  sheet.mergeCells(2, 1, 2, colCount);
  const subCell = sheet.getCell("A2");
  subCell.value = `${branding.clubName}  •  ${branding.categoryName}  •  ${branding.seasonName}`;
  subCell.font = { size: 11, italic: true, color: { argb: "FFFFFFFF" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(branding.accentColor) } };
  subCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // Extra info rows
  let row = 4;
  const infos: [string, string][] = [
    ["Date d'export", format(new Date(), "dd/MM/yyyy HH:mm")],
    ...(extraInfo || []),
  ];

  infos.forEach(([label, value]) => {
    const r = sheet.getRow(row);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true, size: 10, color: { argb: "FF64748B" } };
    r.getCell(2).value = value;
    r.getCell(2).font = { size: 10 };
    row++;
  });

  return row + 1; // next data row
}

export function styleDataHeaderRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  colCount: number,
  headerColor: string,
) {
  const row = sheet.getRow(rowNum);
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(headerColor) } };
  row.alignment = { horizontal: "center", vertical: "middle" };
  row.height = 24;
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = {
      bottom: { style: "thin", color: { argb: "FF334155" } },
    };
  }
}

export function addZebraRows(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  colCount: number,
) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      }
    }
  }
}

export function addFooter(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  colCount: number,
  footerText: string | null,
) {
  if (!footerText) return;
  const r = rowNum + 1;
  sheet.mergeCells(r, 1, r, colCount);
  const cell = sheet.getCell(r, 1);
  cell.value = footerText;
  cell.font = { size: 8, italic: true, color: { argb: "FF94A3B8" } };
  cell.alignment = { horizontal: "center" };
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
