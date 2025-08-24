// src/utils/pdfReporteCumplimiento.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** Normaliza el label del artículo combinando código + título */
function getArticleLabel(meta = {}) {
  const code =
    meta.articulo_code ||
    meta.art_code ||
    meta.code ||
    meta.articulo || // a veces aquí viene el code
    null;

  const title =
    meta.articulo_titulo ||
    meta.art_title ||
    meta.title ||
    (!code && meta.articulo ? meta.articulo : null);

  if (code && title) return `${code} — ${title}`;
  if (code) return String(code);
  if (title) return String(title);
  return "-";
}

/** Mapea true/partial/false a Sí/Parcial/No */
function humanValue(v) {
  return String(v || "")
    .replace("true", "Sí")
    .replace("partial", "Parcial")
    .replace("false", "No");
}

/**
 * Genera el PDF de cumplimiento (misma plantilla que ResultDetail),
 * para usar tanto en Evaluación como en Resultados.
 *
 * @param {Object} o
 * @param {string} o.empresa
 * @param {string} o.normativa
 * @param {string|Date} [o.started_at]
 * @param {string|Date} [o.due_at]
 * @param {string} [o.status="open"]
 * @param {number} o.pct           // 0..100
 * @param {string} [o.nivel]       // si no viene, se deriva del pct
 * @param {Array}  o.controles     // [{ clave, pregunta, articulo/code/title... }, ...]
 * @param {Object} o.answers       // { [clave]: "true|partial|false" }
 * @param {Object} o.comments      // { [clave]: "..." }
 */
export function generarPdfCumplimiento(o) {
  const {
    empresa = "-",
    normativa = "-",
    started_at = "-",
    due_at = "-",
    status = "open",
    pct = 0,
    nivel: nivelIn,
    controles = [],
    answers = {},
    comments = {},
  } = o || {};

  const nivel = nivelIn ?? (pct >= 80 ? "Alto" : pct >= 60 ? "Medio" : pct >= 40 ? "Bajo" : "Crítico");

  const fecha = new Date().toISOString().slice(0, 10);
  const ACCENT = [91, 107, 255]; // violeta
  const margin = 40;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(`Informe de evaluación Preliminar — ${normativa}`, margin, y);
  y += 26;

  doc.setDrawColor(...ACCENT);
  doc.setFillColor(...ACCENT);
  doc.rect(margin, y, doc.internal.pageSize.getWidth() - margin * 2, 2, "F");
  y += 18;

  // Cabecera breve
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${empresa}`, margin, y); y += 16;
  doc.text(`Fecha: ${fecha}`, margin, y); y += 20;

  // Intro
  const intro =
    `Estimada empresa ${empresa},\n\n` +
    `Se ha llevado a cabo el análisis de la evaluación del cumplimiento de la normativa ${normativa} ` +
    `(Reglamento General de Protección de Datos), con el objetivo de determinar el nivel de madurez ` +
    `de la organización en materia de protección de datos personales y la libre circulación de los mismos ` +
    `dentro de la Unión Europea.\n\n` +
    `A continuación, se presenta un resumen de los hallazgos identificados durante la auditoría, junto con ` +
    `comentarios específicos sobre el nivel de implementación de los controles requeridos y las áreas que ` +
    `requieren mejora para alcanzar un cumplimiento integral y consistente.`;

  const introLines = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - margin * 2);
  doc.text(introLines, margin, y);
  y += introLines.length * 14 + 10;

  // Resumen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumen", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const resumen = [
    `Cumplimiento: ${Math.round(Number(pct) || 0)}%`,
    `Nivel: ${nivel}`,
    `Inicio: ${started_at ? new Date(started_at).toLocaleString() : "-"}`,
    `Vence: ${due_at ? new Date(due_at).toLocaleString() : "-"}`,
    `Estado: ${status}`,
  ];
  resumen.forEach((line) => { doc.text(line, margin, y); y += 14; });
  y += 6;

  // Incumplimientos (answers !== true)
  const incumplimientos = [];
  controles.forEach((meta) => {
    const k = meta.clave;
    const v = answers[k];
    if (v !== "true") {
      const recomendacion = v === "partial" ? "Revisar y completar este control." : "Implementar este control.";
      incumplimientos.push({
        control: meta.pregunta || `Control ${k}`,
        articulo: getArticleLabel(meta),
        recomendacion,
      });
    }
  });

  if (incumplimientos.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Controles no cumplidos", margin, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Control", "Artículo", "Recomendación"]],
      body: incumplimientos.map((i) => [i.control, i.articulo, i.recomendacion]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: "bold" },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 258 }, // control
        1: { cellWidth: 133 }, // artículo (código + título)
        2: { cellWidth: 100 }, // recomendación
      },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  // Detalle de respuestas
  const bodyRows = controles.map((meta, idx) => {
    const k = meta.clave;
    const v = humanValue(answers[k]);
    const c = (comments[k] || "").trim() || "-";
    return [
      meta.pregunta || `Control ${idx + 1}`,
      getArticleLabel(meta),
      v || "-",
      c,
    ];
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Detalle de respuestas", margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Control", "Artículo", "Respuesta", "Comentario"]],
    body: bodyRows,
    styles: { fontSize: 9, cellPadding: 5, valign: "top" },
    headStyles: { fillColor: [240, 240, 240], textColor: 33, fontStyle: "bold" },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 180 },
      1: { cellWidth: 100 },
      2: { cellWidth: 70 },
      3: { cellWidth: 140 },
    },
    didDrawPage: (data) => {
      const str = `Generado el ${fecha} — Leyes-App`;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 12);
    },
  });

  const safe = (s) => String(s || "").replace(/[^\w\-]+/g, "_");
  doc.save(`Informe_${safe(normativa)}_${fecha}.pdf`);
}
