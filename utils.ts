
import { DailyRecord } from './types';
import { format, getDay, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export const formatTime = (minutes: number): string => {
  if (isNaN(minutes)) return '0h 00m';
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

export const minutesToHHMM = (minutes: number): string => {
  if (isNaN(minutes)) return '00:00';
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const timeStringToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  const cleanStr = normalizeTimeFromSheet(timeStr);
  if (!cleanStr) return null;
  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
      }
  }
  return dateStr;
};

export const normalizeTimeFromSheet = (val: any): string => {
  if (!val) return '';
  let str = String(val).trim();
  if (str.includes('T')) {
      const timeMatch = str.match(/T(\d{2}:\d{2})/);
      if (timeMatch && timeMatch[1]) return timeMatch[1];
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
      const parts = str.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(str)) return str.padStart(5, '0'); 
  return str.includes(':') ? str : '';
};

export const getTargetMinutesForDate = (dateIso: string, shortDayOfWeek: number = 6): number => {
    const dayOfWeek = getDay(new Date(dateIso + 'T00:00:00'));
    if (dayOfWeek === 0) return 0; // Domingo Folga
    if (dayOfWeek === shortDayOfWeek) return 240; // Dia Curto 4h
    return 480; // Dia Normal 8h
};

export const calculateDailyStats = (record: DailyRecord, shortDayOfWeek: number = 6): { total: number, balance: number } => {
  const entry = timeStringToMinutes(record.entry);
  const lunchStart = timeStringToMinutes(record.lunchStart);
  const lunchEnd = timeStringToMinutes(record.lunchEnd);
  const snackStart = timeStringToMinutes(record.snackStart);
  const snackEnd = timeStringToMinutes(record.snackEnd);
  const exit = timeStringToMinutes(record.exit);

  let worked = 0;
  if (entry !== null) {
    if (lunchStart !== null && lunchStart > entry) worked += (lunchStart - entry);
    else if (exit !== null && exit > entry && !lunchStart && !lunchEnd) worked += (exit - entry);
  }
  if (lunchEnd !== null) {
    if (snackStart !== null && snackStart > lunchEnd) worked += (snackStart - lunchEnd);
    else if (exit !== null && exit > lunchEnd) worked += (exit - lunchEnd);
  }
  if (snackEnd !== null && exit !== null && exit > snackEnd) {
      worked += (exit - snackEnd);
  }

  const target = getTargetMinutesForDate(record.date, shortDayOfWeek);
  return { total: worked, balance: worked - target };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');

export const getDaysInMonth = (year: number, month: number): string[] => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
};
