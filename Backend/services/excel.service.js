const ExcelJS = require('exceljs');

async function buildHistoryWorkbook(sheets) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MapNexus — Nakhon Phanom Lifestyle Travel Platform';
  workbook.created = new Date();

  sheets.forEach(({ title, unit, rows }) => {
    const sheet = workbook.addWorksheet(title.slice(0, 31));
    sheet.columns = [
      { header: 'วันที่', key: 'date', width: 16 },
      { header: `ค่า (${unit})`, key: 'value', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow({ date: r.date, value: r.value }));
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildHistoryWorkbook };
