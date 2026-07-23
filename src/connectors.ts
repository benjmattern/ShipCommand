import type { DataRecord, SourceKey } from './types';

const sampleRecords: DataRecord[] = [
  {
    id: 'excel-1',
    source: 'excel',
    title: 'Shipment manifest sample',
    status: 'Draft',
    updatedAt: '2026-07-23',
    summary: 'Imported from a local spreadsheet for proof-of-concept review.',
  },
  {
    id: 'sharepoint-1',
    source: 'sharepoint',
    title: 'Tracking issue list',
    status: 'In Review',
    updatedAt: '2026-07-22',
    summary: 'Pulling from a SharePoint list to test the common render shape.',
  },
  {
    id: 'servicenow-1',
    source: 'servicenow',
    title: 'Auto-generated incident report',
    status: 'Queued',
    updatedAt: '2026-07-21',
    summary: 'Simulating a ServiceNow report payload for the initial adapter layer.',
  },
];

export function getRecordsForSource(source: SourceKey | 'all' = 'all') {
  if (source === 'all') {
    return sampleRecords;
  }

  return sampleRecords.filter((record) => record.source === source);
}

export function getConnectorLabels(): Array<{ key: SourceKey; label: string }> {
  return [
    { key: 'excel', label: 'Excel' },
    { key: 'sharepoint', label: 'SharePoint' },
    { key: 'servicenow', label: 'ServiceNow' },
  ];
}
