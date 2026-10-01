import * as XLSX from 'xlsx';
import type { RomSubmission } from './romTypes';
import { romLineItems } from './romTypes';

function setText(sheet: XLSX.WorkSheet, address: string, value: string) {
  sheet[address] = { ...sheet[address], t: 's', v: value };
}

function setNumber(sheet: XLSX.WorkSheet, address: string, value: number) {
  sheet[address] = { ...sheet[address], t: 'n', v: value };
}

function setFormula(sheet: XLSX.WorkSheet, address: string, formula: string, value: number) {
  sheet[address] = { ...sheet[address], t: 'n', f: formula, v: value };
}

export function createRomWorkbook(template: ArrayBuffer, submission: RomSubmission) {
  const workbook = XLSX.read(template, { type: 'array', cellStyles: true });
  const sheet = workbook.Sheets.ROM;
  if (!sheet) throw new Error('The Quick ROM template is missing the ROM worksheet.');

  setText(sheet, 'C3', submission.vendor);
  setText(sheet, 'C4', submission.taskOrder ?? '');
  setText(sheet, 'C5', submission.clin ?? '');
  setText(sheet, 'C6', submission.eBuyNumber ?? '');
  setText(sheet, 'C7', submission.financeNumber ?? '');
  setNumber(sheet, 'C8', submission.hourlyRate ?? 0);
  setText(sheet, 'C10', submission.project);

  romLineItems.forEach((item, index) => {
    const row = 13 + index;
    const hours = submission.hoursByCode[item.code] || 0;
    setNumber(sheet, `D${row}`, hours);
    setFormula(sheet, `E${row}`, `D${row}*$C$8`, hours * (submission.hourlyRate ?? 0));
  });

  const rate = submission.hourlyRate ?? 0;
  setFormula(sheet, 'D27', 'D13+D14+D15+D22+D23+D24+D25', submission.expenseHours);
  setFormula(sheet, 'E27', 'SUM(E13:E15,E22:E25)', submission.expenseHours * rate);
  setFormula(sheet, 'D28', 'SUM(D16:D21)', submission.capitalHours);
  setFormula(sheet, 'E28', 'SUM(E16:E21)', submission.capitalHours * rate);
  setFormula(sheet, 'D29', 'D27+D28', submission.totalHours);
  setFormula(sheet, 'E29', 'SUM(E27:E28)', submission.totalCost);

  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true,
    compression: true,
  }) as ArrayBuffer;
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 45) || 'ROM';
}

export async function downloadRomWorkbook(templateUrl: string, submission: RomSubmission) {
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error('The Quick ROM Excel template could not be loaded.');
  const workbook = createRomWorkbook(await response.arrayBuffer(), submission);
  const blob = new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const project = submission.projectRequestNumber || submission.project;
  anchor.href = url;
  anchor.download = `Quick-ROM-${safeFilePart(submission.vendor)}-${safeFilePart(project)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
