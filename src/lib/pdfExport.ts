import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface PdfExportOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  filename?: string;
}

// Draw PDF header with title
export const drawPdfHeader = (
  pdf: jsPDF, 
  title: string, 
  subtitle: string, 
  date: string
): number => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, margin, 15);
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(subtitle, margin, 24);
  
  pdf.setFontSize(9);
  pdf.text(date, margin, 31);
  
  pdf.setTextColor(...colors.dark);
  return 45;
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

// Check if page break needed
export const checkPageBreak = (pdf: jsPDF, yPos: number, needed: number = 25): number => {
  if (yPos + needed > pdf.internal.pageSize.getHeight() - 15) {
    pdf.addPage();
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

// Export session details to PDF with enhanced design
export const exportSessionToPdf = (
  session: any,
  exercises: any[],
  categoryName: string
): void => {
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
  
  // Header with week number
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(session.training_type || "Séance", margin, 18);
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(categoryName, margin, 27);
  
  pdf.setFontSize(10);
  pdf.text(format(sessionDate, "EEEE dd MMMM yyyy", { locale: fr }), margin, 35);
  
  // Week number badge
  pdf.setFillColor(...colors.secondary);
  pdf.roundedRect(pageWidth - margin - 25, 10, 25, 15, 2, 2, 'F');
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text(`S${weekNum}`, pageWidth - margin - 17, 19.5);
  
  let yPos = 50;
  pdf.setTextColor(...colors.dark);
  
  // Session info card
  pdf.setFillColor(...colors.light);
  pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const infos = [
    session.session_start_time ? `🕐 ${session.session_start_time.slice(0, 5)}${session.session_end_time ? ` - ${session.session_end_time.slice(0, 5)}` : ""}` : null,
    session.intensity ? `💪 Intensité: ${session.intensity}/10` : null,
    exercises.length > 0 ? `📋 ${exercises.length} exercices` : null,
  ].filter(Boolean);
  
  let xInfo = margin + 5;
  infos.forEach((info) => {
    if (info) {
      pdf.text(info, xInfo, yPos + 12);
      xInfo += 55;
    }
  });
  yPos += 28;
  
  // Notes section
  if (session.notes) {
    pdf.setFillColor(255, 251, 235); // amber-50
    pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
    pdf.setDrawColor(234, 179, 8); // amber-500
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'S');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.dark);
    const noteLines = pdf.splitTextToSize(session.notes, contentWidth - 10);
    pdf.text(noteLines.slice(0, 2), margin + 5, yPos + 8);
    yPos += 20;
  }
  
  // Exercises section
  if (exercises && exercises.length > 0) {
    yPos = drawSectionTitle(pdf, "Programme d'exercices", yPos, margin);
    yPos += 2;
    
    const exerciseGroups = groupExercisesForPdf(exercises);
    
    exerciseGroups.forEach((group) => {
      yPos = checkPageBreak(pdf, yPos, 35);
      
      if (group.groupId) {
        // Grouped exercises (superset, circuit, etc.)
        const methodColor = methodColors[group.method] || colors.secondary;
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
        
        // Draw block container with colored border
        const blockHeight = 12 + group.exercises.length * 14;
        pdf.setDrawColor(...methodColor);
        pdf.setLineWidth(1);
        pdf.roundedRect(margin, yPos, contentWidth, blockHeight, 2, 2, 'S');
        
        // Block background
        pdf.setFillColor(methodColor[0], methodColor[1], methodColor[2], 0.1);
        pdf.roundedRect(margin + 0.5, yPos + 0.5, contentWidth - 1, blockHeight - 1, 2, 2, 'F');
        
        // Method badge
        pdf.setFillColor(...methodColor);
        pdf.roundedRect(margin + 3, yPos + 3, 25, 6, 1, 1, 'F');
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(methodLabel, margin + 5, yPos + 7);
        
        // Exercises count
        pdf.setTextColor(...colors.muted);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${group.exercises.length} exercices`, margin + 32, yPos + 7);
        
        let exY = yPos + 12;
        group.exercises.forEach((ex, exIdx) => {
          pdf.setTextColor(...methodColor);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text(`${exIdx + 1}.`, margin + 5, exY + 4);
          
          pdf.setTextColor(...colors.dark);
          pdf.setFont("helvetica", "normal");
          pdf.text(ex.exercise_name || "-", margin + 12, exY + 4);
          
          // Details
          pdf.setFontSize(7);
          pdf.setTextColor(...colors.muted);
          const details = [
            `${ex.sets || 0}×${ex.reps || 0}`,
            ex.weight_kg ? `${ex.weight_kg}kg` : null,
            ex.rest_seconds ? `${ex.rest_seconds}s repos` : null,
          ].filter(Boolean).join(" • ");
          pdf.text(details, margin + 80, exY + 4);
          
          exY += 14;
        });
        
        yPos += blockHeight + 5;
      } else {
        // Single exercise
        const ex = group.exercises[0];
        const method = ex.set_type || "normal";
        const methodColor = methodColors[method];
        
        if (methodColor && method !== "normal") {
          // Colored single exercise
          pdf.setDrawColor(...methodColor);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'S');
          pdf.setFillColor(methodColor[0], methodColor[1], methodColor[2], 0.05);
          pdf.roundedRect(margin + 0.3, yPos + 0.3, contentWidth - 0.6, 13.4, 2, 2, 'F');
        } else {
          // Normal exercise with light background
          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'F');
        }
        
        pdf.setTextColor(...colors.dark);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(ex.exercise_name || "-", margin + 4, yPos + 9);
        
        // Details on the right
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colors.muted);
        const details = [
          `${ex.sets || 0} × ${ex.reps || 0}`,
          ex.weight_kg ? `${ex.weight_kg}kg` : null,
          ex.rest_seconds ? `${ex.rest_seconds}s` : null,
          ex.tempo ? `T:${ex.tempo}` : null,
        ].filter(Boolean).join(" | ");
        const detailsWidth = pdf.getTextWidth(details);
        pdf.text(details, pageWidth - margin - detailsWidth - 4, yPos + 9);
        
        yPos += 18;
      }
    });
    
    // Totals
    yPos += 5;
    yPos = checkPageBreak(pdf, yPos, 15);
    
    let totalTonnage = 0;
    let totalSets = 0;
    exercises.forEach((ex) => {
      totalTonnage += (ex.weight_kg || 0) * (ex.sets || 0) * (ex.reps || 0);
      totalSets += ex.sets || 0;
    });
    
    pdf.setFillColor(...colors.dark);
    pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(`📊 Tonnage: ${totalTonnage.toLocaleString()} kg`, margin + 5, yPos + 8);
    pdf.text(`📋 ${exercises.length} exercices`, margin + 65, yPos + 8);
    pdf.text(`🔄 ${totalSets} séries`, margin + 110, yPos + 8);
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

// Export calendar to PDF
export const exportCalendarToPdf = async (
  sessions: any[],
  matches: any[],
  categoryName: string,
  dateRange?: { from: Date; to: Date }
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  
  const fromDate = dateRange?.from || new Date();
  const toDate = dateRange?.to || new Date();
  
  // Header
  let yPos = drawPdfHeader(
    pdf,
    "Calendrier Global",
    categoryName,
    `Du ${format(fromDate, "dd/MM/yyyy")} au ${format(toDate, "dd/MM/yyyy")}`
  );
  
  // Sessions
  if (sessions && sessions.length > 0) {
    yPos = drawSectionTitle(pdf, `Séances (${sessions.length})`, yPos, margin);
    
    const headers = ["Date", "Heure", "Type", "Intensité", "Notes"];
    const colWidths = [30, 25, 40, 25, 60];
    yPos = drawTableHeader(pdf, headers, colWidths, yPos, margin);
    
    sessions.slice(0, 50).forEach((session, i) => {
      yPos = checkPageBreak(pdf, yPos, 8);
      yPos = drawTableRow(pdf, [
        format(new Date(session.session_date), "dd/MM/yy"),
        session.session_start_time || "-",
        session.training_type || "-",
        session.intensity ? `${session.intensity}/10` : "-",
        (session.notes || "-").substring(0, 35),
      ], colWidths, yPos, i % 2 === 1, margin);
    });
    yPos += 8;
  }
  
  // Matches
  if (matches && matches.length > 0) {
    yPos = checkPageBreak(pdf, yPos, 30);
    yPos = drawSectionTitle(pdf, `Matchs (${matches.length})`, yPos, margin);
    
    const headers = ["Date", "Adversaire", "Lieu", "Compétition", "Score"];
    const colWidths = [30, 45, 35, 35, 35];
    yPos = drawTableHeader(pdf, headers, colWidths, yPos, margin);
    
    matches.forEach((match, i) => {
      yPos = checkPageBreak(pdf, yPos, 8);
      const score = match.score_home !== null && match.score_away !== null
        ? `${match.score_home} - ${match.score_away}`
        : "-";
      yPos = drawTableRow(pdf, [
        format(new Date(match.match_date), "dd/MM/yy"),
        match.opponent || "-",
        match.is_home ? "Domicile" : "Extérieur",
        match.competition || "-",
        score,
      ], colWidths, yPos, i % 2 === 1, margin);
    });
  }
  
  pdf.save(`calendrier-${categoryName.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

// Print function
export const printElement = (element: HTMLElement, title: string): void => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};
