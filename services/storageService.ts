
import { DailyRecord, Employee, GoogleConfig, BankTransaction } from '../types';
import { calculateDailyStats, normalizeTimeFromSheet } from '../utils';

const STORAGE_KEY_RECORDS = 'smartpoint_records_v2';
const STORAGE_KEY_EMPLOYEES = 'smartpoint_employees_v1';
const STORAGE_KEY_CONFIG = 'smartpoint_script_config_v1';
const STORAGE_KEY_TRANSACTIONS = 'smartpoint_transactions_v1';
const STORAGE_KEY_LOCATION = 'smartpoint_location_config_v1';

// Declare process.env for TypeScript visibility in this file
declare const process: {
  env: {
    GOOGLE_SCRIPT_URL?: string;
  };
};

// --- Configuration ---

export const getGoogleConfig = (): GoogleConfig => {
  const data = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (data) return JSON.parse(data);

  // Fallback: Check Environment Variable (Netlify)
  const envUrl = process.env.GOOGLE_SCRIPT_URL;
  if (envUrl) {
      const autoConfig = { scriptUrl: envUrl, enabled: true };
      saveGoogleConfig(autoConfig); 
      return autoConfig;
  }

  return { scriptUrl: '', enabled: false };
};

export const saveGoogleConfig = (config: GoogleConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

// --- Location Configuration (NEW) ---

export interface LocationConfig {
    useFixed: boolean;
    fixedName: string;
}

export const getLocationConfig = (): LocationConfig => {
    const data = localStorage.getItem(STORAGE_KEY_LOCATION);
    if (data) return JSON.parse(data);
    return { useFixed: false, fixedName: 'Loja Principal' };
};

export const saveLocationConfig = (config: LocationConfig) => {
    localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(config));
};

// --- Employee Management ---

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (data) return JSON.parse(data);

  const defaultEmployee: Employee = {
    id: '1',
    name: 'Funcionário Padrão',
    role: 'Colaborador',
    pin: '', 
    active: true
  };
  saveEmployees([defaultEmployee]);
  return [defaultEmployee];
};

export const saveEmployees = (employees: Employee[]) => {
  localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
};

export const addEmployee = (employee: Omit<Employee, 'id'>): Employee => {
  const employees = getEmployees();
  const newEmployee = { ...employee, id: Date.now().toString() };
  employees.push(newEmployee);
  saveEmployees(employees);
  return newEmployee;
};

export const updateEmployee = (employee: Employee) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => e.id === employee.id);
  if (index !== -1) {
    employees[index] = employee;
    saveEmployees(employees);
  }
};

export const deleteEmployee = (id: string) => {
    const employees = getEmployees();
    const filtered = employees.filter(e => e.id !== id);
    saveEmployees(filtered);
};

export const mergeExternalEmployees = (externalEmployees: Employee[]) => {
    if (!externalEmployees || externalEmployees.length === 0) return;

    const localEmployees = getEmployees();
    const mergedMap = new Map<string, Employee>();

    localEmployees.forEach(e => mergedMap.set(e.id, e));
    externalEmployees.forEach(e => mergedMap.set(e.id, e));

    const mergedList = Array.from(mergedMap.values());
    saveEmployees(mergedList);
};

// --- Record Management ---

export const getAllRecords = (): DailyRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY_RECORDS);
    let records: DailyRecord[] = data ? JSON.parse(data) : [];
    
    // IMPORTANTE: Isso força o recálculo toda vez que os dados são lidos
    // Corrige automaticamente erros de soma antigos
    return deduplicateRecords(records);
};

// Helper to remove duplicates aggressively AND RECALCULATE STATS
const deduplicateRecords = (records: DailyRecord[]): DailyRecord[] => {
    const map = new Map<string, DailyRecord>();

    records.forEach(r => {
        if (!r.date || !r.employeeId) return;
        
        // CHAVE ÚNICA: DATA + ID
        const key = `${r.date}_${r.employeeId}`;
        const existing = map.get(key);

        // 1. LIMPEZA DOS HORÁRIOS (Remove segundos e datas malucas)
        const cleanRecord = {
            ...r,
            entry: normalizeTimeFromSheet(r.entry),
            lunchStart: normalizeTimeFromSheet(r.lunchStart),
            lunchEnd: normalizeTimeFromSheet(r.lunchEnd),
            snackStart: normalizeTimeFromSheet(r.snackStart),
            snackEnd: normalizeTimeFromSheet(r.snackEnd),
            exit: normalizeTimeFromSheet(r.exit),
        };

        // 2. LÓGICA DE MESCLAGEM INTELIGENTE
        let finalRecord = cleanRecord;

        if (existing) {
            // Se já existe registro para este dia, vamos combinar o melhor dos dois mundos
            // Priorizamos o registro que tem mais campos preenchidos
            const existingFields = countFields(existing);
            const newFields = countFields(cleanRecord);
            
            if (newFields > existingFields) {
                 finalRecord = cleanRecord;
            } else {
                 // Fusão campo a campo para não perder nada
                 const merged = { ...existing };
                 if (!merged.entry && cleanRecord.entry) merged.entry = cleanRecord.entry;
                 if (!merged.exit && cleanRecord.exit) merged.exit = cleanRecord.exit;
                 if (!merged.lunchStart && cleanRecord.lunchStart) merged.lunchStart = cleanRecord.lunchStart;
                 if (!merged.lunchEnd && cleanRecord.lunchEnd) merged.lunchEnd = cleanRecord.lunchEnd;
                 if (!merged.snackStart && cleanRecord.snackStart) merged.snackStart = cleanRecord.snackStart;
                 if (!merged.snackEnd && cleanRecord.snackEnd) merged.snackEnd = cleanRecord.snackEnd;
                 
                 finalRecord = merged;
            }
        }

        // 3. RECÁLCULO MATEMÁTICO OBRIGATÓRIO
        // Isso conserta o problema de "0h trabalhadas" retroativamente
        const stats = calculateDailyStats(finalRecord);
        finalRecord.totalMinutes = stats.total;
        finalRecord.balanceMinutes = stats.balance;

        map.set(key, finalRecord);
    });

    return Array.from(map.values());
};

const countFields = (r: DailyRecord) => {
    let count = 0;
    if (r.entry) count++;
    if (r.lunchStart) count++;
    if (r.lunchEnd) count++;
    if (r.snackStart) count++;
    if (r.snackEnd) count++;
    if (r.exit) count++;
    return count;
};

export const getRecords = (employeeId: string): DailyRecord[] => {
  const allRecords = getAllRecords();
  return allRecords.filter(r => r.employeeId === employeeId);
};

export const saveAllRecords = (records: DailyRecord[]) => {
  // Always Deduplicate and Recalculate before saving to disk
  const clean = deduplicateRecords(records);
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(clean));
};

export const replaceAllRecords = (newRecords: DailyRecord[]) => {
  // Chamado quando baixamos tudo da Planilha ("Hard Sync")
  // Precisamos processar tudo para garantir que o formato local esteja perfeito
  const processed = newRecords.map(r => {
     const cleanR = {
        ...r,
        entry: normalizeTimeFromSheet(r.entry),
        lunchStart: normalizeTimeFromSheet(r.lunchStart),
        lunchEnd: normalizeTimeFromSheet(r.lunchEnd),
        snackStart: normalizeTimeFromSheet(r.snackStart),
        snackEnd: normalizeTimeFromSheet(r.snackEnd),
        exit: normalizeTimeFromSheet(r.exit),
     };
     const stats = calculateDailyStats(cleanR);
     return { ...cleanR, totalMinutes: stats.total, balanceMinutes: stats.balance };
  });
  
  processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveAllRecords(processed);
};

export const mergeExternalRecords = (externalRecords: DailyRecord[]) => {
  const localRecords = getAllRecords(); 
  const combined = [...localRecords, ...externalRecords];
  
  // A mágica acontece aqui: deduplicateRecords limpa, corrige formatos e recalcula
  const uniqueRecords = deduplicateRecords(combined);
  uniqueRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(uniqueRecords));
};

export const getTodayRecord = (employeeId: string, date: string): DailyRecord => {
  const records = getRecords(employeeId);
  const existing = records.find(r => r.date === date);
  if (existing) return existing;
  
  return {
    date,
    employeeId,
    entry: '',
    lunchStart: '',
    lunchEnd: '',
    snackStart: '',
    snackEnd: '',
    exit: '',
    totalMinutes: 0,
    balanceMinutes: 0
  };
};

export const updateRecord = (updatedRecord: DailyRecord): DailyRecord[] => {
  let allRecords = getAllRecords();
  
  // Remove versão antiga deste dia para sobrescrever
  allRecords = allRecords.filter(r => !(r.date === updatedRecord.date && r.employeeId === updatedRecord.employeeId));

  const cleanRecord = {
        ...updatedRecord,
        entry: normalizeTimeFromSheet(updatedRecord.entry),
        lunchStart: normalizeTimeFromSheet(updatedRecord.lunchStart),
        lunchEnd: normalizeTimeFromSheet(updatedRecord.lunchEnd),
        snackStart: normalizeTimeFromSheet(updatedRecord.snackStart),
        snackEnd: normalizeTimeFromSheet(updatedRecord.snackEnd),
        exit: normalizeTimeFromSheet(updatedRecord.exit),
  };

  const stats = calculateDailyStats(cleanRecord);
  const finalRecord = { ...cleanRecord, totalMinutes: stats.total, balanceMinutes: stats.balance };

  allRecords.push(finalRecord);
  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveAllRecords(allRecords);
  return allRecords.filter(r => r.employeeId === updatedRecord.employeeId);
};

// --- Transaction Management ---

export const getTransactions = (employeeId: string): BankTransaction[] => {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const all: BankTransaction[] = data ? JSON.parse(data) : [];
    return all.filter(t => t.employeeId === employeeId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addTransaction = (transaction: Omit<BankTransaction, 'id' | 'createdAt'>): BankTransaction => {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const all: BankTransaction[] = data ? JSON.parse(data) : [];
    
    const newTx: BankTransaction = {
        ...transaction,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
    };
    
    all.push(newTx);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
    return newTx;
};

export const deleteTransaction = (id: string) => {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!data) return;
    let all: BankTransaction[] = JSON.parse(data);
    all = all.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
};

export const getBankBalance = (employeeId: string): number => {
  // 1. Automatic Balance from Daily Punches
  const records = getRecords(employeeId);
  const autoBalance = records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);

  // 2. Manual Adjustments from Transactions
  const transactions = getTransactions(employeeId);
  const manualBalance = transactions.reduce((acc, curr) => acc + curr.amountMinutes, 0);

  return autoBalance + manualBalance;
};
