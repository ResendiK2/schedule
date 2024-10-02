const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");

// Função para gerar o PDF
async function gerarPDF(escalas, resumoSemanal) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  const { width, height } = page.getSize();
  const fontSize = 12;

  let yPosition = height - 20;

  // Título
  page.drawText("Escalas de Desenvolvedores - Mês: Outubro", {
    x: 50,
    y: yPosition,
    size: fontSize,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;

  // Adicionando as escalas ao PDF
  Object.keys(escalas).forEach((dia) => {
    page.drawText(`Dia ${dia}:`, { x: 50, y: yPosition, size: fontSize });
    yPosition -= 20;
    page.drawText(
      `  Sobreaviso 00:00 às 08:00: ${escalas[dia].sobreaviso_manha}`,
      { x: 70, y: yPosition, size: fontSize }
    );
    yPosition -= 20;
    page.drawText(`  Horário comercial: ${escalas[dia].comercial.join(", ")}`, {
      x: 70,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;
    page.drawText(
      `  Sobreaviso 17:00 às 00:00: ${escalas[dia].sobreaviso_noite}`,
      { x: 70, y: yPosition, size: fontSize }
    );
    yPosition -= 40;
  });

  // Salvar o PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("escala-desenvolvedores.pdf", pdfBytes);
}

// Função principal para gerar o PDF a partir dos dados otimizados
async function gerarRelatorio() {
  const escalas = {}; // Gerar as escalas com base no resultado da otimização
  const resumoSemanal = {}; // Gerar o resumo semanal com base nas horas trabalhadas

  await gerarPDF(escalas, resumoSemanal);
}

module.exports = gerarRelatorio;
