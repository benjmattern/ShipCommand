export const romVendors = ['LMI', 'Peraton', 'AFS', 'HII'] as const;

export type RomVendor = typeof romVendors[number];
export type RomCostType = 'Expense' | 'Capital';

export interface RomLineItemDefinition {
  code: string;
  description: string;
  costType: RomCostType;
}

export const romLineItems: RomLineItemDefinition[] = [
  { code: '001.000', description: 'ROM/Commitment Estimates', costType: 'Expense' },
  { code: '002.000', description: 'Change Control', costType: 'Expense' },
  { code: '003.000', description: 'Develop Requirements', costType: 'Expense' },
  { code: '004.000', description: 'Develop Design', costType: 'Capital' },
  { code: '005.000', description: 'Develop and Unit Test', costType: 'Capital' },
  { code: '006.000', description: 'Develop SIT Plan/Scripts', costType: 'Capital' },
  { code: '007.000', description: 'Develop CAT Plan/Scripts', costType: 'Capital' },
  { code: '008.000', description: 'Perform SIT', costType: 'Capital' },
  { code: '009.000', description: 'Perform CAT', costType: 'Capital' },
  { code: '010.000', description: 'Deploy To Production', costType: 'Expense' },
  { code: '011.000', description: 'Project Management', costType: 'Expense' },
  { code: '012.001', description: 'Post Implementation Support', costType: 'Expense' },
  { code: '012.002', description: 'Project Administration Support', costType: 'Expense' },
];

export interface RomSubmission {
  id: string;
  createdAt: string;
  vendor: RomVendor;
  taskOrder?: string;
  clin?: string;
  eBuyNumber?: string;
  financeNumber?: string;
  hourlyRate: number | null;
  project: string;
  projectRequestId?: string;
  projectRequestNumber?: string;
  hoursByCode: Record<string, number>;
  expenseHours: number;
  capitalHours: number;
  totalHours: number;
  totalCost: number;
}

export function calculateRomTotals(hoursByCode: Record<string, number>, hourlyRate: number | null) {
  const totalFor = (costType: RomCostType) => romLineItems
    .filter((item) => item.costType === costType)
    .reduce((sum, item) => sum + (hoursByCode[item.code] || 0), 0);
  const expenseHours = totalFor('Expense');
  const capitalHours = totalFor('Capital');
  const totalHours = expenseHours + capitalHours;

  return {
    expenseHours,
    capitalHours,
    totalHours,
    totalCost: totalHours * (hourlyRate ?? 0),
  };
}
