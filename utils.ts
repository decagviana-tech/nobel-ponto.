
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
  if (!val || val === "00:00:00" || val === "0:00:00" || val === "" || val === null) return '';
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
        
        // CORREÇÃO: Início oficial do banco de horas em 2026.
        if (normalized < '2026-01-01') return 0;

        // Feriado de Ano Novo (01 de Janeiro de 2026) - Meta Zero
        if (normalized === '2026-01-01') return 0;

        const date = parseISO(normalized);
        if (!isValid(date)) return 480;
        const dayOfWeek = getDay(date);
        
        if (dayOfWeek === 0) return 0; // Domingo
        if (dayOfWeek === shortDayOfWeek) return 240; // Sábado (ou dia curto escolhido)
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

  if (t.ent !== null) {
      const endPoint = t.sai ?? t.sF ?? t.sI ?? t.lF ?? t.lI;
      
      if (endPoint !== null && endPoint > t.ent) {
          worked = (endPoint - t.ent);
          if (t.lI !== null && t.lF !== null && t.lF > t.lI) worked -= (t.lF - t.lI);
          if (t.sI !== null && t.sF !== null && t.sF > t.sI) worked -= (t.sF - t.sI);
      }
  }

  const target = getTargetMinutesForDate(record.date, shortDayOfWeek);
  
  // Se o funcionário bateu entrada e saída, o saldo é o que ele trabalhou menos a meta.
  // Se não bateu nada, o saldo é a meta negativa.
  const isComplete = t.ent !== null && t.sai !== null;
  const balance = isComplete ? (worked - target) : (worked > 0 ? (worked - target) : -target);
  
  return { total: worked, target: target, balance: balance };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');

export const getDaysInMonth = (year: number, month: number): string[] => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
};
