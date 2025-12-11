
import { DailyRecord, Employee, GoogleConfig, BankTransaction } from '../types';
import { calculateDailyStats } from '../utils';

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
    return data ? JSON.parse(data) : [];
};

export const getRecords = (employeeId: string): DailyRecord[] => {
  const allRecords = getAllRecords();
  return allRecords.filter(r => r.employeeId === employeeId);
};

export const saveAllRecords = (records: DailyRecord[]) => {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
};

export const replaceAllRecords = (newRecords: DailyRecord[]) => {
  const processed = newRecords.map(r => {
     const stats = calculateDailyStats(r);
     return { ...r, totalMinutes: stats.total, balanceMinutes: stats.balance };
  });
  processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveAllRecords(processed);
};

export const mergeExternalRecords = (externalRecords: DailyRecord[]) => {
  const localRecords = getAllRecords();
  const mergedMap = new Map<string, DailyRecord>();

  // 1. Load local records into map
  localRecords.forEach(r => mergedMap.set(`${r.date}_${r.employeeId}`, r));
  
  // 2. Merge external records
  externalRecords.forEach(ext => {
    const key = `${ext.date}_${ext.employeeId}`;
    const local = mergedMap.get(key);

    if (local) {
      // Logic: If external has data and local is empty, take external.
      // If both have data, prefer local (assuming it's the latest punch), OR prefer external if acting as a sync down.
      // For safety, we merge non-empty fields.
      const mergedRecord: DailyRecord = {
        ...local, // Base on local to keep un-synced punches
        entry: ext.entry || local.entry,
        lunchStart: ext.lunchStart || local.lunchStart,
        lunchEnd: ext.lunchEnd || local.lunchEnd,
        snackStart: ext.snackStart || local.snackStart,
        snackEnd: ext.snackEnd || local.snackEnd,
        exit: ext.exit || local.exit,
        // Prefer external location if local is generic
        location: (local.location && local.location.includes('Obtendo')) ? ext.location : (local.location || ext.location),
      };

      const stats = calculateDailyStats(mergedRecord);
      mergedRecord.totalMinutes = stats.total;
      mergedRecord.balanceMinutes = stats.balance;

      mergedMap.set(key, mergedRecord);
    } else {
      // New record from cloud
      const stats = calculateDailyStats(ext);
      mergedMap.set(key, { ...ext, totalMinutes: stats.total, balanceMinutes: stats.balance });
    }
  });

  const mergedList = Array.from(mergedMap.values());
  mergedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveAllRecords(mergedList);
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
  allRecords = allRecords.filter(r => !(r.date === updatedRecord.date && r.employeeId === updatedRecord.employeeId));

  const stats = calculateDailyStats(updatedRecord);
  const finalRecord = { ...updatedRecord, totalMinutes: stats.total, balanceMinutes: stats.balance };

  allRecords.push(finalRecord);
  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveAllRecords(allRecords);
  return allRecords.filter(r => r.employeeId === updatedRecord.employeeId);
};

// --- Transaction Management (New) ---

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

// Updated Calculation
export const getBankBalance = (employeeId: string): number => {
  // 1. Automatic Balance from Daily Punches
  const records = getRecords(employeeId);
  const autoBalance = records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);

  // 2. Manual Adjustments from Transactions
  const transactions = getTransactions(employeeId);
  const manualBalance = transactions.reduce((acc, curr) => acc + curr.amountMinutes, 0);

  return autoBalance + manualBalance;
};
