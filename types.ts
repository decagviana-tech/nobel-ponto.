
export type TimeRecordType = 'entry' | 'lunchStart' | 'lunchEnd' | 'snackStart' | 'snackEnd' | 'exit';

export interface Employee {
  id: string;
  name: string;
  role: string; // e.g., 'Desenvolvedor', 'Gerente'
  pin: string; // Simple pin for access if needed later
  active: boolean;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  employeeId: string;
  entry: string; // HH:mm
  lunchStart: string; // HH:mm
  lunchEnd: string; // HH:mm
  snackStart: string; // HH:mm
  snackEnd: string; // HH:mm
  exit: string; // HH:mm
  totalMinutes: number;
  balanceMinutes: number;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export type TransactionType = 'PAYMENT' | 'CERTIFICATE' | 'ADJUSTMENT' | 'BONUS';

export interface BankTransaction {
  id: string;
  employeeId: string;
  date: string;
  type: TransactionType;
  amountMinutes: number; // Positive adds to bank, Negative removes
  description: string;
  createdAt: string;
}

export interface UserSettings {
  dailyTargetMinutes: number; // Default 480 (8 hours)
  weeklyTargetMinutes: number; // Default 2640 (44 hours)
}

export interface GoogleConfig {
  scriptUrl: string; // The Web App URL from Apps Script
  enabled: boolean;
}

export enum ViewMode {
  CLOCK = 'CLOCK',
  SHEET = 'SHEET',
  DASHBOARD = 'DASHBOARD',
  AI_ASSISTANT = 'AI_ASSISTANT',
  EMPLOYEES = 'EMPLOYEES',
  SETTINGS = 'SETTINGS'
}
