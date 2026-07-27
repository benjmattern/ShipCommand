export interface Microservice {
  id: string;
  name: string;
  displayOrder: number;
  active: boolean;
}

export const microservices: Microservice[] = [
  'Scan',
  'Verify',
  'Manifest',
  'PEW',
  'Monitoring',
  'Sampling',
  'Fraud',
  'Trusted Scales',
  'Mailer Review',
  'Pricing',
  'Enterprise Pricing',
  'Letters and Flats',
  'Data',
  'Reporting',
  'Account Management',
  'Payment',
].map((name, index) => ({
  id: name.toLowerCase().replace(/ /g, '-'),
  name,
  displayOrder: index + 1,
  active: true,
}));

const aliases: Record<string, string[]> = {
  scans: ['scan'],
  'scan verify': ['scan', 'verify'],
  'scans/verify': ['scan', 'verify'],
  'verify manifest': ['verify', 'manifest'],
  verfiy: ['verify'],
  'monitoring (new)': ['monitoring'],
  'malier review': ['mailer-review'],
  'mailer reivew': ['mailer-review'],
  mr: ['mailer-review'],
  'acct mgmt': ['account-management'],
  'account mgmt': ['account-management'],
  ep: ['enterprise-pricing'],
  'reporting (test only)': ['reporting'],
  'reportring': ['reporting'],
  'reporting(?)': ['reporting'],
  'data (test only)': ['data'],
  'data services': ['data'],
  'pricing (test only)': ['pricing'],
  'pricing and/or scans': ['pricing', 'scan'],
  'lf manifest': ['manifest'],
  'lf payment': ['payment'],
  'lf data': ['data'],
  'l&f': ['letters-and-flats'],
};

const idsByName = new Map(microservices.map((service) => [service.name.toLowerCase(), service.id]));
const namesById = new Map(microservices.map((service) => [service.id, service.name]));

export interface NormalizedServices {
  microserviceIds: string[];
  testingSupportMicroserviceIds: string[];
  unknownLabels: string[];
}

export function normalizeServiceValues(rawValue: string | undefined): NormalizedServices {
  const ids = new Set<string>();
  const testingSupportIds = new Set<string>();
  const unknownLabels = new Set<string>();

  String(rawValue || '')
    .split(/[,;\r\n]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((label) => {
      const normalizedLabel = label.toLowerCase();
      const matchedIds = aliases[normalizedLabel] ?? (idsByName.has(normalizedLabel) ? [idsByName.get(normalizedLabel)!] : []);
      if (matchedIds.length) {
        matchedIds.forEach((id) => ids.add(id));
        if (normalizedLabel.includes('(test only)')) matchedIds.forEach((id) => testingSupportIds.add(id));
      }
      else unknownLabels.add(label);
    });

  return {
    microserviceIds: microservices.filter((service) => ids.has(service.id)).map((service) => service.id),
    testingSupportMicroserviceIds: microservices.filter((service) => testingSupportIds.has(service.id)).map((service) => service.id),
    unknownLabels: Array.from(unknownLabels),
  };
}

export function getMicroserviceName(id: string) {
  return namesById.get(id);
}

export function getMicroserviceNames(ids: string[]) {
  const selected = new Set(ids);
  return microservices.filter((service) => selected.has(service.id)).map((service) => service.name);
}
