
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
  
  // Se após limpar ainda não for HH:mm, retorna null para não quebrar conta
  if (!/^\d{1,2}:\d{2}$/.test(cleanStr)) return null;

  const [h, m] = cleanStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// FUNÇÃO DE LIMPEZA REFORÇADA (ANTI-1899)
export const normalizeTimeFromSheet = (val: any): string => {
  if (!val) return '';
  const str = String(val).trim();
  
  // 1. Se já for HH:mm simples (ex: "09:00" ou "9:00")
  if (/^\d{1,2}:\d{2}$/.test(str)) {
      return str.padStart(5, '0'); // Garante 09:00
  }

  // 2. Se for Data ISO maluca do Google (ex: "1899-12-30T14:19:28.000Z")
  // O Google Sheets as vezes manda com fuso horário zoado. 
  // O ideal é pegar a hora que está VISIVEL na string se possível.
  if (str.includes('T')) {
      // Tenta extrair o padrão HH:mm logo após o T
      const timeMatch = str.match(/T(\d{2}:\d{2})/);
      if (timeMatch && timeMatch[1]) {
          // Ajuste fino: Se a planilha está mandando UTC e o Brasil é -3, 
          // as vezes o Google manda a hora certa mas com o Z no final.
          // Vamos confiar cegamente nos numeros que vieram por enquanto.
          return timeMatch[1];
      }
  }

  // 3. Fallback: Tenta criar um objeto Date e extrair a hora local
  // CUIDADO: Isso pode dar problemas de fuso horário (3 horas de diferença)
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime()) && str.length > 8) {
     // Se for uma data válida, pegamos a hora UTC para evitar conversão de browser
     const h = dateObj.getUTCHours().toString().padStart(2, '0');
     const m = dateObj.getUTCMinutes().toString().padStart(2, '0');
     return `${h}:${m}`;
  }
  
  // 4. Se for lixo ou texto, retorna vazio
  return '';
};

export const calculateDailyStats = (record: DailyRecord, dailyTarget: number = 480): { total: number, balance: number } => {
  // Garante que estamos usando valores limpos
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
  let balance = 0;
  
  // Só calcula saldo se tiver saído OU se tiver trabalhado muito (esqueceram de bater saida)
  if (exit !== null || worked > 600) {
      balance = worked - dailyTarget;
  }

  return {
    total: worked,
    balance: balance
  };
};

export const getTodayString = () => format(new Date(), 'yyyy-MM-dd');
export const getCurrentTime = () => format(new Date(), 'HH:mm');
