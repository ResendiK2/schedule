const fs = require("fs");
const PDFDocument = require("pdfkit");
// Função para gerar o PDF
function generateSchedulePDF(scheduleData, outputPath) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  doc
    .fontSize(16)
    .text("Escala de Trabalho - " + scheduleData.month, { align: "center" });
  doc.moveDown();

  // Geração das escalas diárias
  scheduleData.days.forEach((day) => {
    doc.fontSize(14).text(`Dia ${day.date} (${day.weekday}):`);

    // Escala de sobreaviso do início do dia
    if (day.onCallShiftStart) {
      doc
        .fontSize(12)
        .text(`Sobreaviso 00:00 às 08:00: ${day.onCallShiftStart}`, {
          indent: 20,
        });
    }

    // Horário comercial
    doc
      .fontSize(12)
      .text(`Horário comercial: ${day.businessHoursDevs.join(", ")}`, {
        indent: 20,
      });

    // Escala de sobreaviso do fim do dia
    if (day.onCallShiftEnd) {
      doc
        .fontSize(12)
        .text(`Sobreaviso 17:00 às 00:00: ${day.onCallShiftEnd}`, {
          indent: 20,
        });
    }

    doc.moveDown();
  });

  doc.addPage();
  doc
    .fontSize(16)
    .text("Resumo de Horas Trabalhadas e Pagamentos", { align: "center" });
  doc.moveDown();

  // Geração da tabela de horas e pagamentos por desenvolvedor
  scheduleData.developers.forEach((dev) => {
    doc.fontSize(14).text(dev.name);

    doc
      .fontSize(12)
      .text(`Horas trabalhadas na 1ª semana: ${dev.weeklyHours[0]} horas`);
    doc
      .fontSize(12)
      .text(`Horas trabalhadas na 2ª semana: ${dev.weeklyHours[1]} horas`);
    doc
      .fontSize(12)
      .text(`Horas trabalhadas na 3ª semana: ${dev.weeklyHours[2]} horas`);
    doc
      .fontSize(12)
      .text(`Horas trabalhadas na 4ª semana: ${dev.weeklyHours[3]} horas`);

    doc.fontSize(12).text(`Total de horas no mês: ${dev.totalHours} horas`);
    doc.fontSize(12).text(`Total a ser pago: R$${dev.totalPayment.toFixed(2)}`);

    doc.moveDown();
  });

  // Total geral de horas e pagamentos
  doc.addPage();
  doc.fontSize(16).text("Totais Gerais", { align: "center" });
  doc.moveDown();

  doc
    .fontSize(12)
    .text(
      `Total de horas trabalhadas por todos: ${scheduleData.totalHours} horas`
    );
  doc
    .fontSize(12)
    .text(`Total geral a ser pago: R$${scheduleData.totalPayment.toFixed(2)}`);

  doc.end();
}

module.exports = {
  generateSchedulePDF,
};
