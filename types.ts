
export type TimeRecordType = 'entry' | 'lunchStart' | 'lunchEnd' | 'snackStart' | 'snackEnd' | 'exit';

export interface Employee {
  id: string;
  name: string;
  role: string;
  pin: string;
  active: boolean;
  shortDayOfWeek?: number; // 0-6 (0=Dom, 1=Seg, ..., 6=Sáb). Padrão é 6 (Sábado).
  standardDailyMinutes?: number; // Minutos da jornada padrão (Ex: 480 para 8h, 360 para 6h)
  bankStartDate?: string; // Data YYYY-MM-DD para início do cálculo do banco
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
