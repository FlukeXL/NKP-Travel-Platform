function mnxExportHistoryToExcel(filename, sheetName, history, unit) {
  if (typeof XLSX === 'undefined') {
    alert('ไม่สามารถโหลดไลบรารีสำหรับสร้างไฟล์ Excel ได้ กรุณาลองใหม่');
    return;
  }
  if (!history?.length) {
    alert('ยังไม่มีข้อมูลย้อนหลังให้ดาวน์โหลด');
    return;
  }
  const rows = history.map((h) => ({
    'วันที่': h.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
    [`ค่า (${unit})`]: h.value,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel sheet name limit
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

window.mnxExportHistoryToExcel = mnxExportHistoryToExcel;
