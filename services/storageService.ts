
import { DailyRecord, Employee, GoogleConfig, BankTransaction } from '../types';
import { calculateDailyStats, normalizeTimeFromSheet, normalizeDate, getTargetMinutesForDate } from '../utils';
import { clearCloudRecords } from './googleSheetsService';

const STORAGE_KEY_RECORDS = 'smartpoint_records_v2';
const STORAGE_KEY_EMPLOYEES = 'smartpoint_employees_v1';
const STORAGE_KEY_CONFIG = 'smartpoint_script_config_v1';
const STORAGE_KEY_TRANSACTIONS = 'smartpoint_transactions_v1';
const STORAGE_KEY_LOCATION = 'smartpoint_location_config_v1';

export interface LocationConfig {
    useFixed: boolean;
    fixedName: string;
}

export const getGoogleConfig = (): GoogleConfig => {
  const data = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (data) return JSON.parse(data);
  return { scriptUrl: '', enabled: false };
};

export const saveGoogleConfig = (config: GoogleConfig) => localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (data) return JSON.parse(data);
  const defaultEmployee: Employee = { id: '1', name: 'Gerente', role: 'Gerente', pin: '0000', active: true, shortDayOfWeek: 6 };
  saveEmployees([defaultEmployee]);
  return [defaultEmployee];
};

export const saveEmployees = (employees: Employee[]) => localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));

export const addEmployee = (employee: Omit<Employee, 'id'>): Employee => {
    const employees = getEmployees();
    const newEmployee: Employee = { ...employee, id: Date.now().toString() };
    employees.push(newEmployee);
    saveEmployees(employees);
    return newEmployee;
};

export const updateEmployee = (employee: Employee) => {
    const employees = getEmployees();
    const index = employees.findIndex(e => String(e.id) === String(employee.id));
    if (index !== -1) { employees[index] = employee; saveEmployees(employees); }
};

export const deleteEmployee = (id: string) => {
    saveEmployees(getEmployees().filter(e => String(e.id) !== String(id)));
};

export const getAllRecords = (): DailyRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!data) return [];
    try {
        return deduplicateRecords(JSON.parse(data));
    } catch {
        return [];
    }
};

const deduplicateRecords = (records: DailyRecord[]): DailyRecord[] => {
    const map = new Map<string, DailyRecord>();
    const employees = getEmployees();
    
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach(r => {
        const fixedDate = normalizeDate(r.date);
        if (!fixedDate) return;

        const key = `${fixedDate}_${r.employeeId}`;
        const existing = map.get(key);
        const emp = employees.find(e => String(e.id) === String(r.employeeId));
        const shortDay = emp?.shortDayOfWeek ?? 6;

        const cleanRecord: DailyRecord = {
            ...r,
            date: fixedDate,
            entry: normalizeTimeFromSheet(r.entry),
            lunchStart: normalizeTimeFromSheet(r.lunchStart),
            lunchEnd: normalizeTimeFromSheet(r.lunchEnd),
            snackStart: normalizeTimeFromSheet(r.snackStart),
            snackEnd: normalizeTimeFromSheet(r.snackEnd),
            exit: normalizeTimeFromSheet(r.exit),
        };
        
        const current = existing ? { ...existing, ...cleanRecord } : cleanRecord;
        const stats = calculateDailyStats(current, shortDay);
        map.set(key, { ...current, totalMinutes: stats.total, balanceMinutes: stats.balance });
    });
    return Array.from(map.values());
};

export const getRecords = (employeeId: string): DailyRecord[] => getAllRecords().filter(r => String(r.employeeId) === String(employeeId));

export const getTodayRecord = (employeeId: string, date: string): DailyRecord => {
    const record = getAllRecords().find(r => String(r.employeeId) === String(employeeId) && r.date === date);
    if (record) return record;
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

export const saveAllRecords = (records: DailyRecord[]) => localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(deduplicateRecords(records)));

export const mergeExternalRecords = (externalRecords: DailyRecord[]) => {
    const local = getAllRecords();
    const combined = [...local, ...externalRecords];
    saveAllRecords(combined);
};

export const mergeExternalEmployees = (external: Employee[]) => {
    const local = getEmployees();
    const map = new Map(local.map(e => [String(e.id), e]));
    external.forEach(e => {
        const id = String(e.id);
        const existing = map.get(id);
        map.set(id, { ...existing, ...e });
    });
    saveEmployees(Array.from(map.values()));
};

export const updateRecord = (updatedRecord: DailyRecord): DailyRecord[] => {
  const allRecords = getAllRecords();
  const fixedDate = normalizeDate(updatedRecord.date);
  const emp = getEmployees().find(e => String(e.id) === String(updatedRecord.employeeId));
  const shortDay = emp?.shortDayOfWeek ?? 6;

  const existingIdx = allRecords.findIndex(r => r.date === fixedDate && String(r.employeeId) === String(updatedRecord.employeeId));
  
  const stats = calculateDailyStats(updatedRecord, shortDay);
  const finalRecord = { ...updatedRecord, date: fixedDate, totalMinutes: stats.total, balanceMinutes: stats.balance };

  if (existingIdx !== -1) {
      allRecords[existingIdx] = finalRecord;
  } else {
      allRecords.push(finalRecord);
  }

  saveAllRecords(allRecords);
  return allRecords.filter(r => String(r.employeeId) === String(updatedRecord.employeeId));
};

export const getBankBalance = (employeeId: string): number => {
  const records = getRecords(employeeId);
  const autoBalance = records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);
  const manualBalance = getTransactions(employeeId).reduce((acc, curr) => acc + curr.amountMinutes, 0);
  return autoBalance + manualBalance;
};

export const resetBankBalance = async (employeeId: string) => {
    // 1. Limpeza LOCAL ABSOLUTA
    const allRecords = getAllRecords();
    const cleanRecords = allRecords.filter(r => String(r.employeeId) !== String(employeeId));
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(cleanRecords));

    const allTxsStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    const allTxs: BankTransaction[] = JSON.parse(allTxsStr);
    const cleanTxs = allTxs.filter(t => String(t.employeeId) !== String(employeeId));
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(cleanTxs));

    // 2. Tentar deletar na nuvem se possível
    const config = getGoogleConfig();
    if (config.enabled && config.scriptUrl) {
        try {
            await clearCloudRecords(config.scriptUrl, employeeId);
        } catch (e) {
            console.error("Erro ao limpar nuvem no reset:", e);
        }
    }
    
    return true;
};

export const getTransactions = (employeeId: string): BankTransaction[] => {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!data) return [];
    return JSON.parse(data).filter((t: any) => String(t.employeeId) === String(employeeId));
};

export const addTransaction = (transaction: Omit<BankTransaction, 'id' | 'createdAt'>): BankTransaction => {
    const allStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    const all: BankTransaction[] = JSON.parse(allStr);
    const newTx = { ...transaction, id: Date.now().toString(), createdAt: new Date().toISOString() };
    all.push(newTx);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
    return newTx;
};

export const deleteTransaction = (id: string) => {
    const allStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    const all: BankTransaction[] = JSON.parse(allStr);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all.filter(t => t.id !== id)));
};

export const getLocationConfig = (): LocationConfig => {
    const data = localStorage.getItem(STORAGE_KEY_LOCATION);
    return data ? JSON.parse(data) : { useFixed: false, fixedName: '' };
};

export const saveLocationConfig = (config: LocationConfig) => localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(config));
