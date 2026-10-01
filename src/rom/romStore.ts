import type { RomSubmission } from './romTypes';

export const ROM_SUBMISSIONS_STORAGE_KEY = 'shipcommand.rom-submissions.v1';

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRomSubmission(value: unknown): value is RomSubmission {
  if (!value || typeof value !== 'object') return false;
  const submission = value as Partial<RomSubmission>;
  return typeof submission.id === 'string'
    && typeof submission.createdAt === 'string'
    && typeof submission.vendor === 'string'
    && typeof submission.project === 'string'
    && (submission.hourlyRate === null || typeof submission.hourlyRate === 'number')
    && typeof submission.hoursByCode === 'object'
    && submission.hoursByCode !== null
    && typeof submission.expenseHours === 'number'
    && typeof submission.capitalHours === 'number'
    && typeof submission.totalHours === 'number'
    && typeof submission.totalCost === 'number';
}

export function readRomSubmissions(storage: SessionStorageLike): RomSubmission[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(ROM_SUBMISSIONS_STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(isRomSubmission) : [];
  } catch {
    return [];
  }
}

export function writeRomSubmissions(storage: SessionStorageLike, submissions: RomSubmission[]) {
  try {
    storage.setItem(ROM_SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  } catch {
    // The form remains usable in memory when browser storage is unavailable.
  }
}
