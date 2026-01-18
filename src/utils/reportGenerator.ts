// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Expense } from "../types";
import { CATEGORY_COLORS } from "./uiUtils";

// User Metadata (Ideally passed from AuthContext, but hardcoded/mocked for now if not available)
interface ReportMetadata {
  userName: string;
  email?: string;
  generatedDate: Date;
  period: string; // e.g., "October 2023"
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Important for loading local/public images in some contexts
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

export const generateMonthlyReport = async (
  expenses: Expense[],
  metadata: ReportMetadata,
  chartImage?: string // Base64 image string of the chart
) => {
  // Dynamic Import
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- 1. Header & Branding ---
  // --- 1. Header & Branding ---
  // Logo: Load from public/pwa-512x512.png
  try {
    const logoUrl = "/pwa-512x512.png";
    const img = await loadImage(logoUrl);
    // Draw image (x: 20, y: 20, w: 14, h: 14) to match previous approx size/position
    doc.addImage(img, "PNG", 20, 20, 14, 14);
  } catch (error) {
    console.warn("Failed to load logo image:", error);
    // Fallback: Simple placeholder or nothing
    doc.setFillColor(33, 33, 33);
    doc.circle(27, 27, 7, "F");
  }
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 33, 33);
  doc.text("Expenses.", 38, 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Statement of Accounts", pageWidth - 20, 20, { align: "right" });
  doc.text(metadata.period, pageWidth - 20, 26, { align: "right" });

  // Divider Line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  // --- 2. Executive Summary Box ---
  const totalOutflow = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const txCount = expenses.length;
  // Calculate top category
  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

  // Draw Box Background
  doc.setFillColor(248, 250, 252); // Very Light Slate
  doc.setDrawColor(226, 232, 240); // Light Border
  doc.roundedRect(14, 45, pageWidth - 28, 50, 3, 3, "FD"); // Increased height for user info

  // User Info (Top Left of Box)
  const boxX = 24;
  const boxY = 55;
  
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont("helvetica", "bold");
  doc.text(metadata.userName, boxX, boxY);
  
  if (metadata.email) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFont("helvetica", "normal");
    doc.text(metadata.email, boxX, boxY + 5);
  }

  // Divider inside box
  doc.setDrawColor(200, 200, 200);
  doc.line(24, boxY + 12, pageWidth - 24, boxY + 12);

  // Metrics (Below User Info)
  const metricsY = boxY + 24;
  
  // Total Outflow
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Label Color
  doc.setFont("helvetica", "bold"); // Bold Label
  doc.text("TOTAL OUTFLOW", boxX, metricsY);
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Value Color
  doc.text(`Rs. ${totalOutflow.toLocaleString("en-IN")}`, boxX, metricsY + 8);

  // Transaction Count
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Label Color
  doc.text("TRANSACTIONS", boxX + 60, metricsY);
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(txCount.toString(), boxX + 60, metricsY + 8);

  // Top Category
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TOP CATEGORY", boxX + 110, metricsY);
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const topCatPercent = totalOutflow > 0 ? Math.round((topCategory[1] / totalOutflow) * 100) : 0;
  doc.text(`${topCategory[0]} (${topCatPercent}%)`, boxX + 110, metricsY + 8);


  // --- 3. Chart Visual & Legend ---
  let tableStartY = 105; // Default if no chart
  
  if (chartImage) {
      // 3.1 Draw Chart Image
      const imgProps = doc.getImageProperties(chartImage);
      const pdfImgWidth = 100; // Fixed width
      const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width; // Auto height
      
      const xPos = (pageWidth - pdfImgWidth) / 2;
      const yPos = 110; 
      
      doc.addImage(chartImage, "PNG", xPos, yPos, pdfImgWidth, pdfImgHeight);

      // 3.2 Draw Native Legend
      // Calculate category metrics again for the legend to ensure sync with report data
      const legendData = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1]) // Sort by amount desc
        .map(([category, amount]) => ({
            category,
            amount,
            percent: totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0,
            color: CATEGORY_COLORS[category] || "#6b7280"
        }));

      // Legend Position: Right side of the chart or below?
      // Given the chart is centered, let's put it below the chart for clean layout
      let legendY = yPos + pdfImgHeight + 10;
      const dotSize = 3;
      
      // Draw Legend Items
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      const itemHeight = 6;
      // Center the legend block roughly
      const legendXStart = 80; 

      legendData.forEach((item) => {
          // Dot
          doc.setFillColor(item.color);
          // Text baseline is bottom-left by default? No, doc.text(x,y) in jsPDF places baseline at y.
          // Circle is drawn at center (x,y).
          // If font size is 9, approx height is ~3-4mm. 
          // Center of text height (approx 1/3 of fontSize in mm above baseline) is roughly y - 1.
          
          doc.circle(legendXStart, legendY - 1.5, dotSize / 2, "F");
          
          // Text: Category (Purple) - 25%
          doc.setTextColor(50, 50, 50);
          const text = `${item.category} (${Math.round(item.percent)}%)`;
          doc.text(text, legendXStart + 5, legendY);
          
          legendY += itemHeight;
      });

      // Update table start position
      tableStartY = legendY + 10;
  }

  // --- 4. The Ledger (Table) ---
  const tableData = expenses.sort((a, b) => {
      // Sort by date desc
      const dA = a.date instanceof Date ? a.date : (a.date as any).toDate();
      const dB = b.date instanceof Date ? b.date : (b.date as any).toDate();
      return dB.getTime() - dA.getTime();
  }).map(e => {
      const dateObj = e.date instanceof Date ? e.date : (e.date as any).toDate();
      return [
          format(dateObj, "MMM dd, yyyy"),
          e.note || e.category, 
          e.category,
          `${Number(e.amount).toLocaleString("en-IN")}` 
      ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["Date", "Particulars", "Category", "Amount (Rs.)"]], // Safe Currency Symbol
    body: tableData,
    theme: "grid", // Cleaner grid theme
    headStyles: {
        fillColor: [15, 23, 42], // Slate 900
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left"
    },
    styles: {
        fontSize: 10,
        cellPadding: 5,
        valign: "middle",
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
    },
    columnStyles: {
        3: { halign: "right", fontStyle: "bold" } 
    },
    didDrawPage: () => {
        // Footer (Page Numbers)
        const str = "Page " + doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(str, pageWidth / 2, pageHeight - 10, { align: "center" });
    }
  });

  // Save the PDF
  // Save the PDF
  const safeDate = format(metadata.generatedDate, "yyyy-MM-dd");
  const filename = `Statement_${safeDate}.pdf`;

  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  // Mobile Native Share (if available) - Prevents "Open in Chrome"
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Monthly Expense Report",
        text: `Here is the expense report for ${metadata.period}`,
      });
      return;
    } catch (error) {
      if ((error as any).name !== "AbortError") {
        console.error("Share failed", error);
      }
      // If user canceled or failed, we might want to fallback or just stop. 
      // Usually if they cancel share, they don't want a download.
      // But if it failed technically, maybe fallback.
      // Let's fallback only on technical failure, not user cancel.
      if ((error as any).name === "AbortError") return;
    }
  }

  // Fallback: Force Download
  try {
     // Use standard save which works well on Desktop
    doc.save(filename);
  } catch (e) {
    // Ultimate Fallback: Direct Link Click
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
