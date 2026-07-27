export function formatRaidId(value: string | number) {
  const baseId = String(value).replace(/^RAID\s+ID\s*/i, '').trim();
  return `RAID ID ${baseId}`;
}
