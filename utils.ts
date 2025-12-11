
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
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
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
