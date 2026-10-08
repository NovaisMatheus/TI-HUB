import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

async function extract(input: { data: Uint8Array; name: string }) {
  const data = Buffer.from(input.data);
  const name = String(input.name).toLowerCase();
  let text = '',
    mimeType = 'application/octet-stream',
    supported = true;
  if (data.subarray(0, 5).toString() === '%PDF-') {
    mimeType = 'application/pdf';
    const parser = new PDFParse({ data: new Uint8Array(data) });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (
    data.subarray(0, 2).toString() === 'PK' &&
    (/\.docx$/.test(name) || data.includes(Buffer.from('word/document.xml')))
  ) {
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    text = (await mammoth.extractRawText({ buffer: data })).value;
  } else if (
    data.subarray(0, 2).toString() === 'PK' &&
    (/\.xlsx$/.test(name) || data.includes(Buffer.from('xl/workbook.xml')))
  ) {
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(new Uint8Array(data).buffer);
    for (const sheet of book.worksheets) {
      text += `\n${sheet.name}\n`;
      sheet.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.text));
        text += cells.join(' | ') + '\n';
      });
    }
  } else if (/\.(txt|csv)$/.test(name) && !data.includes(0)) {
    mimeType = name.endsWith('.csv') ? 'text/csv' : 'text/plain';
    text = data.toString('utf8');
  } else {
    supported = false;
  }
  const status = !supported
    ? 'NAO_SUPORTADO'
    : !text.trim()
      ? 'SEM_TEXTO'
      : text.length > 200000
        ? 'TEXTO_PARCIAL'
        : 'EXTRAIDO';
  return { text: text.slice(0, 200000), status, mimeType };
}
process.once('message', (input: { data: Uint8Array; name: string }) => {
  extract(input)
    .then((result) => process.send?.(result))
    .catch(() =>
      process.send?.({ text: '', status: 'FALHA', mimeType: 'application/octet-stream' }),
    );
});
