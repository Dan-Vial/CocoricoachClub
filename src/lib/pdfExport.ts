import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getTrainingTypeLabel } from "@/lib/constants/trainingTypes";
import { getObjectiveLabel } from "@/lib/constants/sessionBlockOptions";

// Color palette for PDF exports
const colors = {
  primary: [34, 67, 120] as [number, number, number],
  secondary: [59, 130, 246] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
};

export interface PdfCustomSettings {
  logo_url?: string | null;
  club_name_override?: string | null;
  header_color?: string | null;
  accent_color?: string | null;
  show_logo?: boolean;
  show_club_name?: boolean;
  show_category_name?: boolean;
  show_date?: boolean;
  footer_text?: string | null;
}

// Fetch PDF settings for a category (falls back to club-level settings)
export const fetchPdfSettings = async (categoryId: string): Promise<PdfCustomSettings | null> => {
  try {
    // First try category-level settings
    const { data } = await supabase
      .from("pdf_settings")
      .select("*")
      .eq("category_id", categoryId)
      .maybeSingle();
    if (data) return data;

    // Fall back to club-level settings
    const { data: catData } = await supabase
      .from("categories")
      .select("club_id")
      .eq("id", categoryId)
      .single();
    if (catData?.club_id) {
      const { data: clubSettings } = await (supabase
        .from("pdf_settings")
        .select("*") as any)
        .eq("club_id", catData.club_id)
        .is("category_id", null)
        .maybeSingle();
      return clubSettings || null;
    }
    return null;
  } catch {
    return null;
  }
};

// Parse hex color to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

// Detect image format from base64 data URL
const detectImageFormat = (dataUrl: string): string => {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  return "PNG"; // default
};

// Load image as base64 for jsPDF - robust CORS handling
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;

  // Add cache-busting to avoid CORS preflight caching issues
  const cacheBustedUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();

  // Strategy 1: fetch blob directly (most reliable for CORS)
  try {
    const response = await fetch(cacheBustedUrl, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // fetch failed, try Image element
  }

  // Strategy 2: Image element + canvas
  try {
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
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
};

interface PdfExportOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  filename?: string;
}

// Draw PDF header with title (enhanced with custom settings)
export const drawPdfHeader = (
  pdf: jsPDF, 
  title: string, 
  subtitle: string, 
  date: string,
  customSettings?: PdfCustomSettings | null,
  logoBase64?: string | null
): number => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const headerColor = customSettings?.header_color ? hexToRgb(customSettings.header_color) : colors.primary;
  
  pdf.setFillColor(...headerColor);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  let xOffset = margin;
  
  // Draw logo if available
  if (customSettings?.show_logo !== false && logoBase64) {
    try {
      const fmt = detectImageFormat(logoBase64);
      pdf.addImage(logoBase64, fmt, margin, 4, 27, 27);
      xOffset = margin + 32;
    } catch {
      // Logo failed, continue without it
    }
  }
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, xOffset, 15);
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  if (customSettings?.show_club_name !== false || customSettings?.show_category_name !== false) {
    pdf.text(subtitle, xOffset, 24);
  }
  
  if (customSettings?.show_date !== false) {
    pdf.setFontSize(9);
    pdf.text(date, xOffset, 31);
  }
  
  pdf.setTextColor(...colors.dark);
  
  // Footer text on each page
  if (customSettings?.footer_text) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.muted);
    pdf.text(customSettings.footer_text, pageWidth / 2, pageHeight - 5, { align: "center" });
    pdf.setTextColor(...colors.dark);
  }
  
  return 45;
};

// Helper to prepare PDF with custom settings (with club fallback)
export const preparePdfWithSettings = async (categoryId: string) => {
  const settings = await fetchPdfSettings(categoryId);
  let logoBase64: string | null = null;
  let effectiveSettings: PdfCustomSettings | null = settings;

  // If no custom logo, try to fallback to club logo
  const logoUrl = settings?.logo_url;
  let clubLogoUrl: string | null = null;
  let clubName: string | null = null;
  let categoryName: string | null = null;
  let seasonName: string | null = null;
  let clubId: string | null = null;

  try {
    const { data: catInfo } = await supabase
      .from("categories")
      .select("name, club_id, clubs(name, logo_url)")
      .eq("id", categoryId)
      .single();
    
    if (catInfo) {
      const club = catInfo.clubs as any;
      clubLogoUrl = club?.logo_url || null;
      clubName = club?.name || null;
      categoryName = catInfo.name || null;
      clubId = catInfo.club_id || null;
    }
  } catch {
    // ignore
  }

  // Fetch active season for the club
  if (clubId) {
    try {
      const { data: season } = await supabase
        .from("seasons")
        .select("name")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .maybeSingle();
      if (season) {
        seasonName = season.name;
      }
    } catch {
      // ignore
    }
  }

  const finalLogoUrl = logoUrl || clubLogoUrl;
  if (finalLogoUrl && (settings?.show_logo !== false)) {
    logoBase64 = await loadImageAsBase64(finalLogoUrl);
  }

  // Build effective settings with club fallback
  if (!effectiveSettings) {
    effectiveSettings = {
      show_logo: true,
      show_club_name: true,
      show_category_name: true,
      show_date: true,
      club_name_override: clubName,
    };
  } else if (!effectiveSettings.club_name_override && clubName) {
    effectiveSettings = { ...effectiveSettings, club_name_override: clubName };
  }

  return { settings: effectiveSettings, logoBase64, clubName, categoryName, seasonName };
};

// Draw section title
export const drawSectionTitle = (pdf: jsPDF, title: string, y: number, margin: number = 15): number => {
  pdf.setFillColor(...colors.light);
  pdf.rect(margin, y, pdf.internal.pageSize.getWidth() - margin * 2, 8, 'F');
  pdf.setTextColor(...colors.primary);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin + 3, y + 5.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...colors.dark);
  return y + 12;
};

// Draw table header
export const drawTableHeader = (
  pdf: jsPDF, 
  headers: string[], 
  colWidths: number[], 
  y: number, 
  margin: number = 15
): number => {
  const contentWidth = colWidths.reduce((a, b) => a + b, 0);
  pdf.setFillColor(...colors.dark);
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  
  let xPos = margin + 2;
  headers.forEach((header, i) => {
    pdf.text(header.substring(0, Math.floor(colWidths[i] / 3)), xPos, y + 5);
    xPos += colWidths[i];
  });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...colors.dark);
  return y + 7;
};

// Draw table row
export const drawTableRow = (
  pdf: jsPDF, 
  values: string[], 
  colWidths: number[], 
  y: number, 
  isAlternate: boolean,
  margin: number = 15,
  rowColors?: ([number, number, number] | null)[]
): number => {
  const contentWidth = colWidths.reduce((a, b) => a + b, 0);
  if (isAlternate) {
    pdf.setFillColor(...colors.light);
    pdf.rect(margin, y, contentWidth, 6, 'F');
  }
  
  pdf.setFontSize(7);
  let xPos = margin + 2;
  values.forEach((value, i) => {
    if (rowColors && rowColors[i]) {
      pdf.setTextColor(...rowColors[i]!);
      pdf.setFont("helvetica", "bold");
    } else {
      pdf.setTextColor(...colors.dark);
      pdf.setFont("helvetica", "normal");
    }
    pdf.text((value || "-").substring(0, Math.floor(colWidths[i] / 2.5)), xPos, y + 4);
    xPos += colWidths[i];
  });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...colors.dark);
  return y + 6;
};

// Check if page break needed (optionally draws footer on new pages)
export const checkPageBreak = (pdf: jsPDF, yPos: number, needed: number = 25, customSettings?: PdfCustomSettings | null): number => {
  if (yPos + needed > pdf.internal.pageSize.getHeight() - 15) {
    pdf.addPage();
    // Draw footer on new page
    if (customSettings?.footer_text) {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.muted);
      pdf.text(customSettings.footer_text, pageWidth / 2, pageHeight - 5, { align: "center" });
      pdf.setTextColor(...colors.dark);
    }
    return 20;
  }
  return yPos;
};

// Export DOM element to PDF using html2canvas
export const exportElementToPdf = async (
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> => {
  const { title, subtitle = "", orientation = "portrait", filename } = options;
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
  });
  
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  
  // Header
  let yPos = drawPdfHeader(pdf, title, subtitle, format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr }));
  
  // Calculate image dimensions
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // Add image (with pagination if needed)
  let remainingHeight = imgHeight;
  let sourceY = 0;
  const availableHeight = pageHeight - yPos - margin;
  
  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, "PNG", margin, yPos, imgWidth, imgHeight);
  } else {
    // Multi-page
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, availableHeight);
      const sliceRatio = sliceHeight / imgHeight;
      
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        yPos,
        imgWidth,
        imgHeight,
        undefined,
        undefined,
        0
      );
      
      remainingHeight -= availableHeight;
      if (remainingHeight > 0) {
        pdf.addPage();
        yPos = 15;
      }
    }
  }
  
  // Save
  const pdfFilename = filename || `${title.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(pdfFilename);
};

// Export weekly planning to PDF
export const exportWeeklyPlanningToPdf = (
  weekData: any[],
  weekStartDate: Date,
  categoryName: string
): void => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  
  // Header
  let yPos = drawPdfHeader(
    pdf,
    "Planning Hebdomadaire",
    categoryName,
    `Semaine du ${format(weekStartDate, "dd MMMM yyyy", { locale: fr })}`
  );
  
  // Days columns
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const colWidth = (pageWidth - margin * 2) / 7;
  
  // Draw day headers
  pdf.setFillColor(...colors.secondary);
  days.forEach((day, i) => {
    pdf.rect(margin + i * colWidth, yPos, colWidth - 1, 8, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    const textWidth = pdf.getTextWidth(day);
    pdf.text(day, margin + i * colWidth + (colWidth - textWidth) / 2, yPos + 5.5);
  });
  yPos += 10;
  
  // Draw events for each day
  pdf.setTextColor(...colors.dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  
  days.forEach((_, dayIndex) => {
    const dayEvents = weekData.filter((e: any) => e.day_of_week === dayIndex);
    let eventY = yPos;
    
    dayEvents.forEach((event: any) => {
      if (eventY < 180) {
        const x = margin + dayIndex * colWidth + 1;
        
        // Event box
        pdf.setFillColor(...(event.is_match ? colors.warning : colors.light));
        pdf.roundedRect(x, eventY, colWidth - 3, 12, 1, 1, 'F');
        
        pdf.setTextColor(...colors.dark);
        pdf.setFontSize(6);
        if (event.time_slot) {
          pdf.text(event.time_slot, x + 1, eventY + 3.5);
        }
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text((event.title || "").substring(0, 15), x + 1, eventY + 8);
        pdf.setFont("helvetica", "normal");
        if (event.location) {
          pdf.setFontSize(5);
          pdf.text(event.location.substring(0, 18), x + 1, eventY + 11);
        }
        
        eventY += 14;
      }
    });
  });
  
  pdf.save(`planning-hebdo-${format(weekStartDate, "yyyy-MM-dd")}.pdf`);
};

// Training method colors for PDF
const methodColors: Record<string, [number, number, number]> = {
  superset: [59, 130, 246], // blue-500
  biset: [99, 102, 241], // indigo-500
  triset: [168, 85, 247], // purple-500
  giant_set: [236, 72, 153], // pink-500
  drop_set: [239, 68, 68], // red-500
  rest_pause: [245, 158, 11], // amber-500
  pyramid_up: [16, 185, 129], // emerald-500
  pyramid_down: [20, 184, 166], // teal-500
  pyramid_full: [6, 182, 212], // cyan-500
  five_by_five: [14, 165, 233], // sky-500
  cluster: [249, 115, 22], // orange-500
  bulgarian: [217, 70, 239], // fuchsia-500
  amrap: [244, 63, 94], // rose-500
  for_time: [234, 88, 12], // orange-600
  circuit: [132, 204, 22], // lime-500
  tabata: [234, 179, 8], // yellow-500
  emom: [79, 70, 229], // indigo-600
  death_by: [220, 38, 38], // red-600
};

// Helper to get week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Group exercises by group_id
const groupExercisesForPdf = (exercises: any[]): { groupId: string | null; exercises: any[]; method: string }[] => {
  if (!exercises || exercises.length === 0) return [];
  
  const groups: { groupId: string | null; exercises: any[]; method: string }[] = [];
  const processedGroupIds = new Set<string>();

  exercises.forEach((exercise) => {
    if (exercise.group_id) {
      if (!processedGroupIds.has(exercise.group_id)) {
        processedGroupIds.add(exercise.group_id);
        const groupExercises = exercises
          .filter((ex) => ex.group_id === exercise.group_id)
          .sort((a, b) => (a.group_order || 0) - (b.group_order || 0));
        
        groups.push({
          groupId: exercise.group_id,
          exercises: groupExercises,
          method: exercise.set_type || exercise.method || "superset",
        });
      }
    } else {
      groups.push({
        groupId: null,
        exercises: [exercise],
        method: exercise.set_type || exercise.method || "normal",
      });
    }
  });

  return groups;
};

// Helper to resolve test label from TEST_CATEGORIES
const resolveTestLabel = (testType: string, allCategories: any[]): string => {
  for (const cat of allCategories) {
    const found = cat.tests?.find((t: any) => t.value === testType);
    if (found) return found.label;
  }
  return testType;
};

// Export session details to PDF with enhanced design
export const exportSessionToPdf = async (
  session: any,
  exercises: any[],
  categoryName: string,
  options?: {
    customSettings?: PdfCustomSettings | null;
    logoBase64?: string | null;
    blocks?: any[];
    testCategories?: any[];
    seasonName?: string | null;
  }
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const sessionDate = new Date(session.session_date);
  const weekNum = getWeekNumber(sessionDate);
  const customSettings = options?.customSettings;
  const logoBase64 = options?.logoBase64;

  const headerColor = customSettings?.header_color ? hexToRgb(customSettings.header_color) : colors.primary;
  const accentColor = customSettings?.accent_color ? hexToRgb(customSettings.accent_color) : colors.secondary;
  
  // --- HEADER ---
  pdf.setFillColor(...headerColor);
  pdf.rect(0, 0, pageWidth, 42, 'F');
  
  let xOffset = margin;
  
  // Logo
  if (customSettings?.show_logo !== false && logoBase64) {
    try {
      const fmt = detectImageFormat(logoBase64);
      pdf.addImage(logoBase64, fmt, margin, 5, 30, 30);
      xOffset = margin + 35;
    } catch { /* ignore */ }
  }
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(session.training_type || "Séance", xOffset, 16);
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const subtitleParts: string[] = [];
  if (customSettings?.show_club_name !== false && customSettings?.club_name_override) {
    subtitleParts.push(customSettings.club_name_override);
  }
  if (customSettings?.show_category_name !== false) {
    subtitleParts.push(categoryName);
  }
  if ((options as any)?.seasonName) {
    subtitleParts.push((options as any).seasonName);
  }
  if (subtitleParts.length > 0) {
    pdf.text(subtitleParts.join(" • "), xOffset, 25);
  }
  
  if (customSettings?.show_date !== false) {
    pdf.setFontSize(9);
    pdf.text(format(sessionDate, "EEEE dd MMMM yyyy", { locale: fr }), xOffset, 33);
  }
  
  // Week badge
  pdf.setFillColor(...accentColor);
  pdf.roundedRect(pageWidth - margin - 28, 8, 28, 16, 3, 3, 'F');
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`S${weekNum}`, pageWidth - margin - 21, 18);
  
  let yPos = 50;
  pdf.setTextColor(...colors.dark);
  
  // --- SESSION INFO CARD ---
  pdf.setFillColor(...colors.light);
  pdf.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const infos: string[] = [];
  if (session.session_start_time) {
    infos.push(`Horaire: ${session.session_start_time.slice(0, 5)}${session.session_end_time ? ` - ${session.session_end_time.slice(0, 5)}` : ""}`);
  }
  if (session.intensity) {
    infos.push(`Intensité: ${session.intensity}/10`);
  }
  if (exercises.length > 0) {
    infos.push(`${exercises.length} exercices`);
  }
  if (session.location) {
    infos.push(`Lieu: ${session.location}`);
  }
  
  let xInfo = margin + 5;
  infos.forEach((info) => {
    pdf.setTextColor(...colors.muted);
    pdf.setFontSize(8);
    pdf.text(info, xInfo, yPos + 11);
    xInfo += pdf.getTextWidth(info) + 10;
  });
  yPos += 24;
  
  // --- BLOCKS SECTION ---
  const blocks = options?.blocks;
  if (blocks && blocks.length > 0) {
    yPos = drawSectionTitle(pdf, "Blocs thématiques", yPos, margin);
    yPos += 3;
    
    // Import calculation
    const { calculateWeightedRpe: calcRpe, formatDuration: fmtDur } = await import("./weightedRpeCalculations");
    
    blocks.forEach((block: any, idx: number) => {
      const blockColor = trainingTypeColors[block.training_type] || accentColor;
      const blockHeight = 22;
      yPos = checkPageBreak(pdf, yPos, blockHeight + 4);
      
      // White card with colored left border
      pdf.setFillColor(252, 252, 253);
      pdf.roundedRect(margin, yPos, contentWidth, blockHeight, 2, 2, 'F');
      pdf.setDrawColor(230, 230, 235);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, yPos, contentWidth, blockHeight, 2, 2, 'S');
      
      // Colored left border (thick)
      pdf.setFillColor(blockColor[0], blockColor[1], blockColor[2]);
      pdf.roundedRect(margin, yPos, 3, blockHeight, 2, 0, 'F');
      
      // First row: Time range + Training type + RPE badge + Objective badge
      let xCursor = margin + 8;
      const row1Y = yPos + 7;
      
      // Time range badge
      if (block.start_time && block.end_time) {
        const timeText = `${(block.start_time || "").slice(0, 5)} – ${(block.end_time || "").slice(0, 5)}`;
        const timeWidth = pdf.getTextWidth(timeText) + 6;
        pdf.setFillColor(240, 240, 245);
        pdf.roundedRect(xCursor - 2, row1Y - 4.5, timeWidth + 4, 6, 1.5, 1.5, 'F');
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 60);
        pdf.text(timeText, xCursor + 1, row1Y);
        xCursor += timeWidth + 6;
      }
      
      // Training type label
      const typeLabel = getTrainingTypeLabel(block.training_type);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text(typeLabel, xCursor, row1Y);
      xCursor += pdf.getTextWidth(typeLabel) + 5;
      
      // RPE badge
      if (block.intensity) {
        const rpeText = `RPE ${block.intensity}`;
        const rpeWidth = pdf.getTextWidth(rpeText) + 4;
        pdf.setFillColor(240, 240, 245);
        pdf.roundedRect(xCursor, row1Y - 4.5, rpeWidth + 4, 6, 1.5, 1.5, 'F');
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 95);
        pdf.text(rpeText, xCursor + 2, row1Y);
        xCursor += rpeWidth + 6;
      }
      
      // Objective badge
      if (block.objective) {
        const objText = getObjectiveLabel(block.objective);
        const objWidth = pdf.getTextWidth(objText) + 4;
        pdf.setFillColor(240, 240, 245);
        pdf.roundedRect(xCursor, row1Y - 4.5, objWidth + 4, 6, 1.5, 1.5, 'F');
        pdf.setFontSize(7.5);
        pdf.text(objText, xCursor + 2, row1Y);
      }
      
      // Second row: Intensity, Volume, Contact badges
      const row2Y = yPos + 15;
      let xBadge = margin + 8;
      
      if (block.target_intensity) {
        const intLabels: Record<string, string> = { faible: "Faible", moderee: "Modérée", elevee: "Élevée", tres_elevee: "Très élevée" };
        const intText = `Intensité: ${intLabels[block.target_intensity] || block.target_intensity}`;
        const intWidth = pdf.getTextWidth(intText) + 4;
        // Green-tinted badge
        pdf.setFillColor(220, 252, 231);
        pdf.roundedRect(xBadge, row2Y - 4, intWidth + 4, 5.5, 1.5, 1.5, 'F');
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(22, 101, 52);
        pdf.text(intText, xBadge + 2, row2Y);
        xBadge += intWidth + 6;
      }
      
      if (block.volume) {
        const volLabels: Record<string, string> = { court: "Court", moyen: "Moyen", long: "Long" };
        const volText = `Vol: ${volLabels[block.volume] || block.volume}`;
        const volWidth = pdf.getTextWidth(volText) + 4;
        pdf.setFillColor(220, 252, 231);
        pdf.roundedRect(xBadge, row2Y - 4, volWidth + 4, 5.5, 1.5, 1.5, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(22, 101, 52);
        pdf.text(volText, xBadge + 2, row2Y);
        xBadge += volWidth + 6;
      }
      
      if (block.contact_charge && block.contact_charge !== "aucun") {
        const contactLabels: Record<string, string> = { faible: "Faible", modere: "Modéré", eleve: "Élevé" };
        const contactText = `Contact: ${contactLabels[block.contact_charge] || block.contact_charge}`;
        const contactWidth = pdf.getTextWidth(contactText) + 4;
        pdf.setFillColor(220, 252, 231);
        pdf.roundedRect(xBadge, row2Y - 4, contactWidth + 4, 5.5, 1.5, 1.5, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(22, 101, 52);
        pdf.text(contactText, xBadge + 2, row2Y);
      }
      
      yPos += blockHeight + 3;
    });
    yPos += 2;
    
    // --- WEIGHTED RPE SUMMARY CARD ---
    const weightedResult = calcRpe(blocks as any);
    if (weightedResult.hasValidData) {
      yPos = checkPageBreak(pdf, yPos, 30);
      
      const summaryHeight = 12 + weightedResult.blockDetails.length * 5;
      pdf.setFillColor(245, 247, 252);
      pdf.roundedRect(margin, yPos, contentWidth, summaryHeight, 3, 3, 'F');
      pdf.setDrawColor(200, 210, 230);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, yPos, contentWidth, summaryHeight, 3, 3, 'S');
      
      // Title row
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text("📊 RPE moyen pondéré", margin + 5, yPos + 6);
      
      // Total duration badge on right
      const totalDurText = fmtDur(weightedResult.totalDuration) + " au total";
      const durWidth = pdf.getTextWidth(totalDurText) + 6;
      pdf.setFillColor(235, 238, 245);
      pdf.roundedRect(pageWidth - margin - durWidth - 4, yPos + 1.5, durWidth + 4, 6, 1.5, 1.5, 'F');
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 95);
      pdf.text(totalDurText, pageWidth - margin - durWidth - 1, yPos + 5.5);
      
      // RPE value
      const rpeVal = weightedResult.weightedRpe.toFixed(1);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.dark);
      pdf.text(rpeVal, margin + 5, yPos + 16);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...colors.muted);
      const rpeValWidth = pdf.getTextWidth(rpeVal);
      pdf.text("/ 10", margin + 5 + rpeValWidth + 1, yPos + 16);
      
      // Block details
      let detailY = yPos + 12;
      weightedResult.blockDetails.forEach((detail) => {
        const detailLabel = getTrainingTypeLabel(detail.training_type);
        const detailInfo = `${fmtDur(detail.duration)} × RPE ${detail.intensity} = ${detail.contribution}%`;
        
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.dark);
        pdf.text(detailLabel, margin + 30, detailY + 5);
        
        pdf.setTextColor(...colors.muted);
        pdf.text(detailInfo, pageWidth - margin - pdf.getTextWidth(detailInfo) - 5, detailY + 5);
        
        detailY += 5;
      });
      
      yPos += summaryHeight + 6;
    }
  }
  
  // --- TESTS SECTION ---
  // Parse tests from notes metadata
  const testMatch = session.notes?.match(/<!--TESTS:(.*?)-->/);
  if (testMatch) {
    try {
      const parsedTests = JSON.parse(testMatch[1]);
      if (parsedTests && parsedTests.length > 0) {
        yPos = checkPageBreak(pdf, yPos, 20 + parsedTests.length * 10);
        yPos = drawSectionTitle(pdf, "Tests planifiés", yPos, margin);
        yPos += 2;
        
        const testCats = options?.testCategories || [];
        
        parsedTests.forEach((test: any, idx: number) => {
          yPos = checkPageBreak(pdf, yPos, 12);
          
          // Alternate rows
          if (idx % 2 === 0) {
            pdf.setFillColor(245, 248, 255);
            pdf.roundedRect(margin, yPos, contentWidth, 10, 1, 1, 'F');
          }
          
          pdf.setTextColor(...accentColor);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${idx + 1}.`, margin + 3, yPos + 7);
          
          const label = resolveTestLabel(test.test_type, testCats);
          pdf.setTextColor(...colors.dark);
          pdf.setFont("helvetica", "normal");
          pdf.text(label, margin + 12, yPos + 7);
          
          // Unit badge
          const unit = test.result_unit || "";
          if (unit) {
            pdf.setFontSize(7);
            pdf.setTextColor(...colors.muted);
            const unitText = `(${unit})`;
            const unitWidth = pdf.getTextWidth(unitText);
            pdf.text(unitText, pageWidth - margin - unitWidth - 4, yPos + 7);
          }
          
          yPos += 10;
        });
        yPos += 6;
      }
    } catch { /* ignore parse error */ }
  }
  
  // --- NOTES SECTION (cleaned) ---
  const cleanNotes = session.notes?.replace(/<!--TESTS:.*?-->/g, "").trim();
  if (cleanNotes) {
    yPos = checkPageBreak(pdf, yPos, 22);
    
    pdf.setFillColor(255, 251, 235);
    const noteLines = pdf.splitTextToSize(cleanNotes, contentWidth - 14);
    const noteHeight = Math.max(14, 8 + noteLines.length * 4);
    pdf.roundedRect(margin, yPos, contentWidth, noteHeight, 3, 3, 'F');
    
    pdf.setDrawColor(234, 179, 8);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, yPos, contentWidth, noteHeight, 3, 3, 'S');
    
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(180, 130, 0);
    pdf.text("Notes", margin + 5, yPos + 5);
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.dark);
    pdf.text(noteLines.slice(0, 5), margin + 5, yPos + 10);
    yPos += noteHeight + 6;
  }
  
  // --- EXERCISES SECTION ---
  if (exercises && exercises.length > 0) {
    yPos = checkPageBreak(pdf, yPos, 20);
    yPos = drawSectionTitle(pdf, "Programme d'exercices", yPos, margin);
    yPos += 2;
    
    const exerciseGroups = groupExercisesForPdf(exercises);
    
    exerciseGroups.forEach((group) => {
      yPos = checkPageBreak(pdf, yPos, 35);
      
      if (group.groupId) {
        const methodColor = methodColors[group.method] || accentColor;
        const methodLabel = {
          superset: "Superset",
          biset: "Biset",
          triset: "Triset",
          giant_set: "Giant Set",
          circuit: "Circuit",
          amrap: "AMRAP",
          for_time: "For Time",
          emom: "EMOM",
          tabata: "Tabata",
          bulgarian: "Bulgare",
          drop_set: "Drop Set",
          death_by: "Death By",
        }[group.method] || group.method;
        
        const blockHeight = 14 + group.exercises.length * 14;
        
        // Container with accent border
        pdf.setDrawColor(...methodColor);
        pdf.setLineWidth(1.2);
        pdf.roundedRect(margin, yPos, contentWidth, blockHeight, 3, 3, 'S');
        
        // Light fill (blend color with white for transparency effect)
        pdf.setFillColor(
          Math.round(methodColor[0] * 0.06 + 255 * 0.94),
          Math.round(methodColor[1] * 0.06 + 255 * 0.94),
          Math.round(methodColor[2] * 0.06 + 255 * 0.94)
        );
        pdf.roundedRect(margin + 0.5, yPos + 0.5, contentWidth - 1, blockHeight - 1, 3, 3, 'F');
        
        // Method badge
        pdf.setFillColor(...methodColor);
        const badgeWidth = pdf.getTextWidth(methodLabel) + 10;
        pdf.roundedRect(margin + 4, yPos + 3, badgeWidth, 7, 2, 2, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(methodLabel, margin + 9, yPos + 7.5);
        
        // Exercise count
        pdf.setTextColor(...colors.muted);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${group.exercises.length} exercices`, margin + badgeWidth + 10, yPos + 7.5);
        
        let exY = yPos + 14;
        group.exercises.forEach((ex, exIdx) => {
          pdf.setTextColor(...methodColor);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text(`${exIdx + 1}.`, margin + 6, exY + 4);
          
          pdf.setTextColor(...colors.dark);
          pdf.setFont("helvetica", "normal");
          pdf.text(ex.exercise_name || "-", margin + 14, exY + 4);
          
          pdf.setFontSize(7);
          pdf.setTextColor(...colors.muted);
          const details = [
            `${ex.sets || 0}×${ex.reps || 0}`,
            ex.weight_kg ? `${ex.weight_kg}kg` : null,
            ex.rest_seconds ? `${ex.rest_seconds}s repos` : null,
            ex.rpe ? `RPE ${ex.rpe}` : null,
          ].filter(Boolean).join(" • ");
          const detailsW = pdf.getTextWidth(details);
          pdf.text(details, pageWidth - margin - detailsW - 6, exY + 4);
          
          exY += 14;
        });
        
        yPos += blockHeight + 6;
      } else {
        // Single exercise
        const ex = group.exercises[0];
        const method = ex.set_type || "normal";
        const methodColor = methodColors[method];
        
        if (methodColor && method !== "normal") {
          pdf.setDrawColor(...methodColor);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'S');
          pdf.setFillColor(
            Math.round(methodColor[0] * 0.05 + 255 * 0.95),
            Math.round(methodColor[1] * 0.05 + 255 * 0.95),
            Math.round(methodColor[2] * 0.05 + 255 * 0.95)
          );
          pdf.roundedRect(margin + 0.3, yPos + 0.3, contentWidth - 0.6, 13.4, 2, 2, 'F');
        } else {
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'F');
        }
        
        pdf.setTextColor(...colors.dark);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(ex.exercise_name || "-", margin + 5, yPos + 9);
        
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.muted);
        const details = [
          `${ex.sets || 0} × ${ex.reps || 0}`,
          ex.weight_kg ? `${ex.weight_kg}kg` : null,
          ex.rest_seconds ? `${ex.rest_seconds}s` : null,
          ex.tempo ? `T:${ex.tempo}` : null,
          ex.rpe ? `RPE ${ex.rpe}` : null,
        ].filter(Boolean).join(" | ");
        const detailsWidth = pdf.getTextWidth(details);
        pdf.text(details, pageWidth - margin - detailsWidth - 5, yPos + 9);
        
        yPos += 18;
      }
    });
    
    // Totals bar
    yPos += 4;
    yPos = checkPageBreak(pdf, yPos, 16);
    
    let totalTonnage = 0;
    let totalSets = 0;
    exercises.forEach((ex) => {
      totalTonnage += (ex.weight_kg || 0) * (ex.sets || 0) * (ex.reps || 0);
      totalSets += ex.sets || 0;
    });
    
    pdf.setFillColor(...headerColor);
    pdf.roundedRect(margin, yPos, contentWidth, 14, 3, 3, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    
    const totals = [
      `Tonnage: ${totalTonnage.toLocaleString()} kg`,
      `${exercises.length} exercices`,
      `${totalSets} séries`,
    ].join("   •   ");
    pdf.text(totals, margin + 8, yPos + 9);
  }
  
  // --- FOOTER ---
  if (customSettings?.footer_text) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.muted);
    pdf.text(customSettings.footer_text, pageWidth / 2, pageHeight - 5, { align: "center" });
  }
  
  pdf.save(`seance-${session.training_type || "training"}-${format(sessionDate, "yyyy-MM-dd")}.pdf`);
};

// Export periodization to PDF
export const exportPeriodizationToPdf = (
  periods: any[],
  cycles: any[],
  objectives: any[],
  categoryName: string
): void => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  
  // Header
  let yPos = drawPdfHeader(
    pdf,
    "Périodisation",
    categoryName,
    format(new Date(), "dd/MM/yyyy", { locale: fr })
  );
  
  // Objectives
  if (objectives && objectives.length > 0) {
    yPos = drawSectionTitle(pdf, "Objectifs de charge", yPos, margin);
    
    const headers = ["Type", "Cible", "Min", "Max", "Unité"];
    const colWidths = [60, 35, 35, 35, 30];
    yPos = drawTableHeader(pdf, headers, colWidths, yPos, margin);
    
    objectives.forEach((obj, i) => {
      yPos = drawTableRow(pdf, [
        obj.objective_type || "-",
        String(obj.target_value || "-"),
        String(obj.min_value || "-"),
        String(obj.max_value || "-"),
        obj.unit || "-",
      ], colWidths, yPos, i % 2 === 1, margin);
    });
    yPos += 8;
  }
  
  // Periods
  if (periods && periods.length > 0) {
    yPos = checkPageBreak(pdf, yPos, 30);
    yPos = drawSectionTitle(pdf, "Périodes d'entraînement", yPos, margin);
    
    const headers = ["Période", "Type", "Début", "Fin", "Description"];
    const colWidths = [50, 35, 30, 30, 80];
    yPos = drawTableHeader(pdf, headers, colWidths, yPos, margin);
    
    periods.forEach((period, i) => {
      yPos = checkPageBreak(pdf, yPos, 8);
      yPos = drawTableRow(pdf, [
        period.name || "-",
        period.period_type || "-",
        period.start_date ? format(new Date(period.start_date), "dd/MM/yy") : "-",
        period.end_date ? format(new Date(period.end_date), "dd/MM/yy") : "-",
        (period.description || "-").substring(0, 50),
      ], colWidths, yPos, i % 2 === 1, margin);
    });
    yPos += 8;
  }
  
  // Cycles
  if (cycles && cycles.length > 0) {
    yPos = checkPageBreak(pdf, yPos, 30);
    yPos = drawSectionTitle(pdf, "Cycles d'entraînement", yPos, margin);
    
    const headers = ["Cycle", "Type", "Phase", "Début", "Fin", "Objectif"];
    const colWidths = [45, 30, 30, 25, 25, 70];
    yPos = drawTableHeader(pdf, headers, colWidths, yPos, margin);
    
    cycles.forEach((cycle, i) => {
      yPos = checkPageBreak(pdf, yPos, 8);
      yPos = drawTableRow(pdf, [
        cycle.name || "-",
        cycle.cycle_type || "-",
        cycle.training_phase || "-",
        cycle.start_date ? format(new Date(cycle.start_date), "dd/MM/yy") : "-",
        cycle.end_date ? format(new Date(cycle.end_date), "dd/MM/yy") : "-",
        (cycle.objective || "-").substring(0, 40),
      ], colWidths, yPos, i % 2 === 1, margin);
    });
  }
  
  pdf.save(`periodisation-${categoryName.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

// Training type colors for PDF (matching app colors)
const trainingTypeColors: Record<string, [number, number, number]> = {
  collectif: [34, 197, 94], // green-500
  physique: [59, 130, 246], // blue-500
  musculation: [168, 85, 247], // purple-500
  technique_individuelle: [245, 158, 11], // amber-500
  reathlétisation: [236, 72, 153], // pink-500
  repos: [100, 116, 139], // slate-500
  test: [14, 165, 233], // sky-500
  video: [99, 102, 241], // indigo-500
  tactique: [6, 182, 212], // cyan-500
  match: [239, 68, 68], // red-500
};

// Export calendar to PDF - visual monthly grid matching app display
export const exportCalendarToPdf = async (
  sessions: any[],
  matches: any[],
  categoryName: string,
  dateRange?: { from: Date; to: Date }
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Use current month if no date range specified
  const now = new Date();
  const currentMonth = dateRange?.from || new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Header
  const monthYear = format(currentMonth, "MMMM yyyy", { locale: fr });
  let yPos = drawPdfHeader(
    pdf,
    "Calendrier Global",
    categoryName,
    monthYear.charAt(0).toUpperCase() + monthYear.slice(1)
  );
  
  // Calendar grid setup
  const gridMargin = margin;
  const gridWidth = pageWidth - gridMargin * 2;
  const cellWidth = gridWidth / 7;
  const dayHeaders = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  
  // Draw day headers
  pdf.setFillColor(...colors.secondary);
  dayHeaders.forEach((day, i) => {
    pdf.rect(gridMargin + i * cellWidth, yPos, cellWidth, 8, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    const textWidth = pdf.getTextWidth(day);
    pdf.text(day, gridMargin + i * cellWidth + (cellWidth - textWidth) / 2, yPos + 5.5);
  });
  yPos += 8;
  
  // Get first day of month and calculate grid
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Get Monday of the first week
  let firstMondayOffset = firstDayOfMonth.getDay() - 1;
  if (firstMondayOffset < 0) firstMondayOffset = 6;
  const calendarStart = new Date(firstDayOfMonth);
  calendarStart.setDate(calendarStart.getDate() - firstMondayOffset);
  
  // Calculate cell height based on available space
  const weeksInMonth = Math.ceil((lastDayOfMonth.getDate() + firstMondayOffset) / 7);
  const availableHeight = pageHeight - yPos - margin;
  const cellHeight = Math.min(availableHeight / weeksInMonth, 28);
  
  // Draw calendar grid
  let currentDate = new Date(calendarStart);
  
  for (let week = 0; week < weeksInMonth; week++) {
    const weekY = yPos + week * cellHeight;
    
    for (let day = 0; day < 7; day++) {
      const cellX = gridMargin + day * cellWidth;
      const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth();
      const isToday = format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
      const dateStr = format(currentDate, "yyyy-MM-dd");
      
      // Cell background
      if (isToday) {
        pdf.setFillColor(59, 130, 246, 0.1); // primary/10
        pdf.rect(cellX, weekY, cellWidth, cellHeight, 'F');
      } else if (!isCurrentMonth) {
        pdf.setFillColor(241, 245, 249); // light gray
        pdf.rect(cellX, weekY, cellWidth, cellHeight, 'F');
      }
      
      // Cell border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.rect(cellX, weekY, cellWidth, cellHeight);
      
      // Date number
      pdf.setFontSize(8);
      pdf.setFont("helvetica", isToday ? "bold" : "normal");
      pdf.setTextColor(isCurrentMonth ? 30 : 150, isCurrentMonth ? 41 : 150, isCurrentMonth ? 59 : 150);
      pdf.text(String(currentDate.getDate()), cellX + 2, weekY + 5);
      
      // Find sessions and matches for this date
      const daySessions = sessions?.filter(s => s.session_date === dateStr) || [];
      const dayMatches = matches?.filter(m => m.match_date === dateStr) || [];
      
      let eventY = weekY + 8;
      const maxEvents = 3;
      let eventCount = 0;
      
      // Draw matches first (priority)
      dayMatches.forEach((match) => {
        if (eventCount >= maxEvents) return;
        
        pdf.setFillColor(239, 68, 68); // red-500
        pdf.roundedRect(cellX + 1.5, eventY, cellWidth - 3, 5, 1, 1, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "bold");
        const matchText = `⚔ ${(match.opponent || "Match").substring(0, 12)}`;
        pdf.text(matchText, cellX + 2.5, eventY + 3.5);
        
        eventY += 6;
        eventCount++;
      });
      
      // Draw sessions
      daySessions.forEach((session) => {
        if (eventCount >= maxEvents) return;
        
        const typeColor = trainingTypeColors[session.training_type] || colors.secondary;
        pdf.setFillColor(...typeColor);
        pdf.roundedRect(cellX + 1.5, eventY, cellWidth - 3, 5, 1, 1, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(5.5);
        pdf.setFont("helvetica", "normal");
        
        const timePrefix = session.session_start_time ? `${session.session_start_time.slice(0, 5)} ` : "";
        const typeLabel = session.training_type?.replace(/_/g, " ") || "Séance";
        const sessionText = `${timePrefix}${typeLabel}`.substring(0, 15);
        pdf.text(sessionText, cellX + 2.5, eventY + 3.5);
        
        eventY += 6;
        eventCount++;
      });
      
      // Show "+X more" if there are more events
      const totalEvents = daySessions.length + dayMatches.length;
      if (totalEvents > maxEvents) {
        pdf.setTextColor(...colors.muted);
        pdf.setFontSize(5);
        pdf.text(`+${totalEvents - maxEvents}`, cellX + cellWidth - 8, weekY + cellHeight - 2);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Legend at the bottom
  yPos = yPos + weeksInMonth * cellHeight + 5;
  if (yPos < pageHeight - 15) {
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.dark);
    pdf.text("Légende:", margin, yPos);
    
    let legendX = margin + 18;
    const legendItems = [
      { label: "Match", color: [239, 68, 68] as [number, number, number] },
      { label: "Collectif", color: [34, 197, 94] as [number, number, number] },
      { label: "Physique", color: [59, 130, 246] as [number, number, number] },
      { label: "Musculation", color: [168, 85, 247] as [number, number, number] },
    ];
    
    legendItems.forEach((item) => {
      pdf.setFillColor(...item.color);
      pdf.roundedRect(legendX, yPos - 3, 3, 3, 0.5, 0.5, 'F');
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...colors.dark);
      pdf.text(item.label, legendX + 4, yPos);
      legendX += pdf.getTextWidth(item.label) + 10;
    });
  }
  
  pdf.save(`calendrier-${categoryName.toLowerCase().replace(/\s+/g, "-")}-${format(currentMonth, "yyyy-MM")}.pdf`);
};

// Print function - uses html2canvas to capture exact visual appearance
export const printElement = async (element: HTMLElement, title: string): Promise<void> => {
  const html2canvas = (await import("html2canvas")).default;
  
  // Collect all elements to hide for printing
  const elementsToHide: { el: HTMLElement; originalDisplay: string; originalVisibility: string }[] = [];
  
  // Hide no-print elements
  element.querySelectorAll('[data-no-print], .no-print').forEach(el => {
    const htmlEl = el as HTMLElement;
    elementsToHide.push({ 
      el: htmlEl, 
      originalDisplay: htmlEl.style.display,
      originalVisibility: htmlEl.style.visibility 
    });
    htmlEl.style.display = 'none';
  });
  
  // Hide hover action buttons and overlays
  element.querySelectorAll('[data-hover-actions], .group-hover\\:opacity-100, .group-hover\\:flex').forEach(el => {
    const htmlEl = el as HTMLElement;
    elementsToHide.push({ 
      el: htmlEl, 
      originalDisplay: htmlEl.style.display,
      originalVisibility: htmlEl.style.visibility 
    });
    htmlEl.style.display = 'none';
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        // Remove interactive elements from cloned document
        clonedElement.querySelectorAll('[data-no-print], .no-print, [data-hover-actions]').forEach(el => el.remove());
        
        // Ensure all training type colors are preserved with inline styles
        clonedElement.querySelectorAll('[class*="bg-"]').forEach(el => {
          const computedStyle = window.getComputedStyle(el as Element);
          (el as HTMLElement).style.backgroundColor = computedStyle.backgroundColor;
        });
        
        // Preserve text colors
        clonedElement.querySelectorAll('[class*="text-"]').forEach(el => {
          const computedStyle = window.getComputedStyle(el as Element);
          (el as HTMLElement).style.color = computedStyle.color;
        });
        
        // Preserve borders
        clonedElement.querySelectorAll('[class*="border"]').forEach(el => {
          const computedStyle = window.getComputedStyle(el as Element);
          (el as HTMLElement).style.borderColor = computedStyle.borderColor;
          (el as HTMLElement).style.borderWidth = computedStyle.borderWidth;
          (el as HTMLElement).style.borderStyle = computedStyle.borderStyle;
        });
      }
    });

    const imgData = canvas.toDataURL("image/png");
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              display: flex; 
              justify-content: center; 
              align-items: flex-start;
              padding: 20px;
              background: white;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            img { 
              width: 100%; 
              max-width: 100%; 
              height: auto;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            @media print {
              body { padding: 10mm; }
              img { 
                width: 100%; 
                box-shadow: none;
                border-radius: 8px;
              }
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="${title}" />
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } finally {
    // Restore all hidden elements
    elementsToHide.forEach(({ el, originalDisplay, originalVisibility }) => {
      el.style.display = originalDisplay;
      el.style.visibility = originalVisibility;
    });
  }
};
