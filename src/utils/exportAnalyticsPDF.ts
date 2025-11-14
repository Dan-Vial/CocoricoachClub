import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportAnalyticsToPDF(
  categoryName: string,
  activeTab: string
) {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = 20;

    // En-tête
    pdf.setFontSize(20);
    pdf.text("Rapport d'Analyse", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    pdf.setFontSize(12);
    pdf.text(`Catégorie: ${categoryName}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    const date = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    pdf.setFontSize(10);
    pdf.text(`Date: ${date}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 15;

    // Capturer le contenu selon l'onglet actif
    let elementToCapture: HTMLElement | null = null;

    if (activeTab === "evolution") {
      elementToCapture = document.querySelector('[role="tabpanel"][data-state="active"]');
    } else if (activeTab === "comparison") {
      elementToCapture = document.querySelector('[role="tabpanel"][data-state="active"]');
    } else if (activeTab === "risk") {
      elementToCapture = document.querySelector('[role="tabpanel"][data-state="active"]');
    }

    if (elementToCapture) {
      const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Vérifier si l'image tient sur une page
      if (imgHeight + currentY > pageHeight - 20) {
        // Si trop grand, ajuster la taille
        const scaledHeight = pageHeight - currentY - 20;
        const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
        pdf.addImage(imgData, "PNG", 10, currentY, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, "PNG", 10, currentY, imgWidth, imgHeight);
      }
    }

    // Sauvegarder le PDF
    const fileName = `Analyse_${categoryName.replace(/\s+/g, "_")}_${activeTab}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de l'export PDF:", error);
    return { success: false, error };
  }
}
