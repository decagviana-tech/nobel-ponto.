
import { DailyRecord } from './types';
import { format, getDay, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';

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
  
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return dateStr.split('T')[0];
  }

  return String(dateStr);
};

export const normalizeTimeFromSheet = (val: any): string => {
  if (!val || val === "00:00:00" || val === "0:00:00") return '';
  let str = String(val).trim();
  
  if (str.includes('T')) {
      const timeMatch = str.match(/T(\d{2}:\d{2})/);
      if (timeMatch) return timeMatch[1];
  }
  
  const parts = str.split(':');
  if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  
  return "";
};

export const getTargetMinutesForDate = (dateIso: string, shortDayOfWeek: number = 6): number => {
    try {
        const normalized = normalizeDate(dateIso);
        const date = parseISO(normalized);
        if (!isValid(date)) return 480;
        const dayOfWeek = getDay(date);
        
        if (dayOfWeek === 0) return 0; // Domingo
        if (dayOfWeek === shortDayOfWeek) return 240; // Sábado (4h)
        return 480; // Dia padrão (8h)
    } catch {
        return 480;
    }
};

export const calculateDailyStats = (record: DailyRecord, shortDayOfWeek: number = 6): { total: number, balance: number, target: number } => {
  const t = {
    ent: timeStringToMinutes(record.entry),
    lI: timeStringToMinutes(record.lunchStart),
    lF: timeStringToMinutes(record.lunchEnd),
    sI: timeStringToMinutes(record.snackStart),
    sF: timeStringToMinutes(record.snackEnd),
    sai: timeStringToMinutes(record.exit)
  };

  let worked = 0;

  // Cálculo rigoroso de segmentos
  if (t.ent !== null) {
      if (t.lI !== null && t.lI > t.ent) {
          worked += (t.lI - t.ent);
      } else if (t.sai !== null && t.sai > t.ent && t.lI === null) {
          worked += (t.sai - t.ent);
      }
  }

  if (t.lF !== null) {
      if (t.sI !== null && t.sI > t.lF) {
          worked += (t.sI - t.lF);
      } else if (t.sai !== null && t.sai > t.lF && t.sI === null) {
          worked += (t.sai - t.lF);
      }
  }

  if (t.sF !== null && t.sai !== null && t.sai > t.sF) {
      worked += (t.sai - t.sF);
  }

  const target = getTargetMinutesForDate(record.date, shortDayOfWeek);
  
  // SEGURANÇA MÁXIMA: Se o dia não tem SAÍDA registrada, o saldo é ZERO ou negativo.
  // Nunca gera saldo POSITIVO (horas extras) sem o registro de saída.
  const isComplete = t.ent !== null && t.sai !== null;
  const balance = (worked > 0 && isComplete) ? (worked - target) : 0;
  
  // Se trabalhou mas não bateu saída, assume saldo 0 para não explodir o banco de horas
  return { 
      total: worked, 
      target: target,
      balance: isComplete ? balance : (worked > 0 ? 0 : -target)
  };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');

export const getDaysInMonth = (year: number, month: number): string[] => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
};
