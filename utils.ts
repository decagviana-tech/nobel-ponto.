
import { DailyRecord } from './types';
import { format, parse, differenceInMinutes, isValid } from 'date-fns';

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
  
  // Limpeza profunda para garantir formato HH:mm
  const cleanStr = normalizeTimeFromSheet(timeStr);
  
  if (!cleanStr) return null;

  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (isNaN(h) || isNaN(m)) return null;
  
  return h * 60 + m;
};

// FUNÇÃO DE LIMPEZA REFORÇADA (ANTI-1899 e ANTI-SEGUNDOS)
export const normalizeTimeFromSheet = (val: any): string => {
  if (!val) return '';
  let str = String(val).trim();
  
  // Caso 1: Data ISO completa (ex: "1899-12-30T14:19:28.000Z")
  if (str.includes('T')) {
      const timeMatch = str.match(/T(\d{2}:\d{2})/);
      if (timeMatch && timeMatch[1]) {
          return timeMatch[1];
      }
      // Tentativa secundária com Date object se regex falhar
      try {
        const dateObj = new Date(str);
        if (!isNaN(dateObj.getTime())) {
           const h = dateObj.getUTCHours().toString().padStart(2, '0');
           const m = dateObj.getUTCMinutes().toString().padStart(2, '0');
           return `${h}:${m}`;
        }
      } catch (e) {}
  }

  // Caso 2: Formato com segundos (ex: "13:06:00") -> Cortar para "13:06"
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
      str = str.substring(0, 5);
  }

  // Caso 3: Formato HH:mm simples (ex: "9:00" -> "09:00")
  if (/^\d{1,2}:\d{2}$/.test(str)) {
      return str.padStart(5, '0'); 
  }

  // Se chegou aqui e tem pelo menos "d:d", tenta salvar
  if (str.includes(':')) {
     const parts = str.split(':');
     if (parts.length >= 2) {
         const h = parts[0].padStart(2, '0');
         const m = parts[1].padStart(2, '0');
         // Verifica se são números válidos
         if (!isNaN(Number(h)) && !isNaN(Number(m))) {
             return `${h}:${m}`;
         }
     }
  }
  
  return '';
};

export const calculateDailyStats = (record: DailyRecord, dailyTarget: number = 480): { total: number, balance: number } => {
  const entry = timeStringToMinutes(record.entry);
  const lunchStart = timeStringToMinutes(record.lunchStart);
  const lunchEnd = timeStringToMinutes(record.lunchEnd);
  const snackStart = timeStringToMinutes(record.snackStart);
  const snackEnd = timeStringToMinutes(record.snackEnd);
  const exit = timeStringToMinutes(record.exit);

  let worked = 0;

  // Lógica de Cálculo Robusta

  // 1. Período da Manhã (Entrada -> Almoço OU Entrada -> Saída Direta)
  if (entry !== null) {
    if (lunchStart !== null) {
      // Trabalhou até o almoço
      if (lunchStart > entry) worked += (lunchStart - entry);
    } else if (exit !== null) {
      // Sem almoço registrado, trabalhou direto até a saída (ou turno único)
      // Só calcula se não tiver nenhum outro registro intermediário que possa confundir
      if (lunchEnd === null && snackStart === null && snackEnd === null) {
          if (exit > entry) worked += (exit - entry);
      }
    }
  }

  // 2. Período da Tarde (Volta Almoço -> Lanche OU Volta Almoço -> Saída)
  if (lunchEnd !== null) {
    if (snackStart !== null) {
       // Trabalhou até o lanche
       if (snackStart > lunchEnd) worked += (snackStart - lunchEnd);
    } else if (exit !== null) {
       // Sem lanche, foi até a saída
       if (exit > lunchEnd) worked += (exit - lunchEnd);
    }
  }

  // 3. Período Pós-Lanche (Volta Lanche -> Saída)
  if (snackEnd !== null && exit !== null) {
      if (exit > snackEnd) worked += (exit - snackEnd);
  }

  // Se o cálculo der negativo ou NaN por algum motivo bizarro, zera
  if (worked < 0 || isNaN(worked)) worked = 0;

  // Cálculo do Saldo
  let balance = 0;
  
  // Regra: Só calcula saldo se o dia parece "encerrado" ou se já trabalhou mais que a meta
  // Consideramos encerrado se tiver SAÍDA marcada.
  if (exit !== null || worked > dailyTarget) {
      balance = worked - dailyTarget;
  }

  return {
    total: worked,
    balance: balance
  };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');
