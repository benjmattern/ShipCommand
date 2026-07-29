import { isIsoDate } from './releaseSchedules';
import type { IsoDate } from './releaseScheduleTypes';

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDateOnly(value: IsoDate | null) {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

export function formatScheduleRange(startDate: IsoDate | null, endDate: IsoDate | null) {
  const start = formatDateOnly(startDate);
  const end = formatDateOnly(endDate);

  if (start && end) return `${start} – ${end}`;
  if (start) return `Starts ${start}`;
  if (end) return `Ends ${end}`;
  return 'Not scheduled';
}
