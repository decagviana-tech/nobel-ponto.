
import { DailyRecord } from './types';
import { format, parse, differenceInMinutes, isValid } from 'date-fns';

export const formatTime = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

export const minutesToHHMM = (minutes: number): string => {
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const timeStringToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  // Limpeza de segurança caso venha data ISO
  const cleanStr = normalizeTimeFromSheet(timeStr);
  
  const [h, m] = cleanStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// NOVA FUNÇÃO: Limpa strings como "1899-12-30T12:19:28.000Z" para "12:19"
export const normalizeTimeFromSheet = (val: any): string => {
  if (!val) return '';
  const str = String(val).trim();
  
  // Se já for HH:mm (ex: 09:00 ou 9:00)
  if (/^\d{1,2}:\d{2}$/.test(str)) return str.padStart(5, '0');

  // Se for formato ISO do Google (contém T)
  if (str.includes('T')) {
      const parts = str.split('T');
      if (parts.length > 1) {
          // Pega a parte da hora "12:19:28.000Z" e corta os primeiros 5 chars
          return parts[1].substring(0, 5);
      }
  }
  
  // Fallback: se for muito longo, tenta cortar
  if (str.length > 5 && str.includes(':')) {
      return str.substring(0, 5);
  }

  return str;
};

export const calculateDailyStats = (record: DailyRecord, dailyTarget: number = 480): { total: number, balance: number } => {
  const entry = timeStringToMinutes(record.entry);
  const lunchStart = timeStringToMinutes(record.lunchStart);
  const lunchEnd = timeStringToMinutes(record.lunchEnd);
  const snackStart = timeStringToMinutes(record.snackStart);
  const snackEnd = timeStringToMinutes(record.snackEnd);
  const exit = timeStringToMinutes(record.exit);

  let worked = 0;

  // Period 1: Entry to Lunch Start
  if (entry !== null) {
    if (lunchStart !== null) {
      worked += Math.max(0, lunchStart - entry);
    } else if (exit !== null && lunchStart === null) {
        // Only Entry and Exit
        worked += Math.max(0, exit - entry);
    } else {
        // Still working first shift
        // We do not add to 'worked' display until segment is done to keep logic simple
    }
  }

  // Period 2: Lunch End to Snack Start (or Exit if no snack)
  if (lunchEnd !== null) {
    if (snackStart !== null) {
      worked += Math.max(0, snackStart - lunchEnd);
    } else if (exit !== null) {
      worked += Math.max(0, exit - lunchEnd);
    }
  }

  // Period 3: Snack End to Exit
  if (snackEnd !== null && exit !== null) {
    worked += Math.max(0, exit - snackEnd);
  }

  // BALANCE CALCULATION
  // We strictly return 0 balance if the employee hasn't clocked out (Exit is null).
  // This prevents showing "Debt: -8h" while the employee is just starting their day.
  let balance = 0;
  
  if (exit !== null) {
      balance = worked - dailyTarget;
  }

  return {
    total: worked,
    balance: balance
  };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');
