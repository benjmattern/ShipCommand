import * as XLSX from 'xlsx';
import backlogWorkbookUrl from './data/BacklogData.xlsx?url';
import { formatRaidId } from './raid';
import { normalizeServiceValues } from './microservices';
import type { DataRecord, SourceKey } from './types';

type WorkbookRow = Record<string, string | number | undefined>;

function excelDate(value: string | number | undefined) {
  if (typeof value !== 'number') return value ? String(value) : undefined;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return undefined;
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
}

export async function loadBacklogRecords(): Promise<DataRecord[]> {
  const response = await fetch(backlogWorkbookUrl);
  if (!response.ok) throw new Error(`Unable to load BacklogData.xlsx (${response.status}).`);

  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<WorkbookRow>(firstSheet, { defval: '' });

  return rows
    .filter((row) => row.ID || row.Feature)
    .sort((a, b) => (Number(a['Priority #']) || Number.MAX_SAFE_INTEGER) - (Number(b['Priority #']) || Number.MAX_SAFE_INTEGER))
    .map((row, index) => {
      const fixedId = String(row.ID || `LOCAL-${index + 1}`).trim();
      const normalizedServices = normalizeServiceValues(String(row['Service(s)'] || ''));
      return {
        id: `excel-${fixedId}`,
        raidId: formatRaidId(fixedId),
        source: 'excel',
        title: String(row.Feature || 'Untitled RAID item').trim(),
        priority: index + 1,
        release: String(row.Release || '').trim() || undefined,
        status: String(row.Status || 'Unassigned').trim(),
        customer: String(row['Customer / Project'] || '').trim() || undefined,
        impactedMicroserviceIds: normalizedServices.microserviceIds,
        unknownServiceLabels: normalizedServices.unknownLabels.length ? normalizedServices.unknownLabels : undefined,
        updatedAt: excelDate(row['Date of Submission']),
        summary: String(row['Description\r\nIT Notes/Comments'] || '').trim() || undefined,
      };
    });
}

export function getConnectorLabels(): Array<{ key: SourceKey; label: string }> {
  return [
    { key: 'excel', label: 'Excel' },
    { key: 'sharepoint', label: 'SharePoint' },
    { key: 'servicenow', label: 'ServiceNow' },
  ];
}
