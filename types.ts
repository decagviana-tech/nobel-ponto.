
export type TimeRecordType = 'entry' | 'lunchStart' | 'lunchEnd' | 'snackStart' | 'snackEnd' | 'exit';

export interface Employee {
  id: string;
  name: string;
  role: string;
  pin: string;
  active: boolean;
  shortDayOfWeek?: number;
  standardDailyMinutes?: number;
  bankStartDate?: string;
}

export interface DailyRecord {
  date: string;
  employeeId: string;
  entry: string;
  lunchStart: string;
  lunchEnd: string;
  snackStart: string;
  snackEnd: string;
  exit: string;
  totalMinutes: number;
  balanceMinutes: number;
  location?: string;
}

export type TransactionType = 'PAYMENT' | 'CERTIFICATE' | 'ADJUSTMENT' | 'BONUS';

export interface BankTransaction {
  id: string;
  employeeId: string;
  date: string;
  type: TransactionType;
  amountMinutes: number;
  description: string;
  createdAt: string;
}

export interface GoogleConfig {
  scriptUrl: string;
  enabled: boolean;
}

export interface LocationConfig {
  useFixed: boolean;
  fixedName: string;
}

export enum ViewMode {
  CLOCK = 'CLOCK',
  SHEET = 'SHEET',
  DASHBOARD = 'DASHBOARD',
  AI_ASSISTANT = 'AI_ASSISTANT',
  EMPLOYEES = 'EMPLOYEES',
  SETTINGS = 'SETTINGS'
}
