
import { DailyRecord } from './types';
import { format, getDay, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, isValid, isToday } from 'date-fns';

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
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleanStr = normalizeTimeFromSheet(timeStr);
  if (!cleanStr || !cleanStr.includes(':')) return null;
  const parts = cleanStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return '';
  if (dateStr instanceof Date) return format(dateStr, 'yyyy-MM-dd');
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${y}-${m}-${d}`;
      }
  }
  if (typeof dateStr === 'string' && dateStr.includes('T')) return dateStr.split('T')[0];
  return String(dateStr);
};

export const normalizeTimeFromSheet = (val: any): string => {
  if (!val || val === "00:00:00" || val === "0:00:00" || val === "" || val === null) return '';
  let str = String(val).trim();
  if (str.includes('T')) {
      const timeMatch = str.match(/T(\d{2}:\d{2})/);
      if (timeMatch) return timeMatch[1];
  }
  const parts = str.split(':');
  if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  return "";
};

export const getTargetMinutesForDate = (dateIso: string, shortDayOfWeek: number = 6, standardMinutes: number = 480): number => {
    try {
        const normalized = normalizeDate(dateIso);
        const date = parseISO(normalized);
        if (!isValid(date)) return standardMinutes;
        const holidays = ['2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25', '2026-01-01'];
        if (holidays.includes(normalized)) return 0;
        const dayOfWeek = getDay(date);
        if (dayOfWeek === 0) return 0; // Domingo
        if (dayOfWeek === shortDayOfWeek) return 240; // Dia Curto (ex: Sábado = 4h)
        return standardMinutes;
    } catch { return standardMinutes; }
};

export const calculateDailyStats = (record: DailyRecord, shortDayOfWeek: number = 6, standardMinutes: number = 480): { total: number, balance: number, target: number } => {
  const t = {
    ent: timeStringToMinutes(record.entry),
    lI: timeStringToMinutes(record.lunchStart),
    lF: timeStringToMinutes(record.lunchEnd),
    sI: timeStringToMinutes(record.snackStart),
    sF: timeStringToMinutes(record.snackEnd),
    sai: timeStringToMinutes(record.exit)
  };

  let worked = 0;
  if (t.ent !== null) {
      let endPoint = t.sai ?? t.sF ?? t.sI ?? t.lF ?? t.lI ?? t.ent;
      
      // Se ainda não bateu a saída definitiva e é hoje, calcula em tempo real
      if (t.sai === null && isToday(parseISO(record.date))) {
          const now = new Date();
          endPoint = now.getHours() * 60 + now.getMinutes();
      }
      
      if (endPoint > t.ent) {
          worked = (endPoint - t.ent);
          
          // Desconto do Almoço (real ou projetado se ainda estiver no almoço)
          if (t.lI !== null) {
              const lEnd = t.lF ?? endPoint;
              if (lEnd > t.lI) worked -= (lEnd - t.lI);
          }

          // Desconto do Lanche (real ou os 15 min regulamentares se estiver no lanche)
          if (t.sI !== null) {
              const sEnd = t.sF ?? endPoint;
              if (sEnd > t.sI) worked -= (sEnd - t.sI);
          }
      }
  }

  const target = getTargetMinutesForDate(record.date, shortDayOfWeek, standardMinutes);
  return { 
    total: Math.max(0, worked), 
    target: target, 
    balance: Math.max(0, worked) - target 
  };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');

export const getDaysInMonth = (year: number, month: number): string[] => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
};
