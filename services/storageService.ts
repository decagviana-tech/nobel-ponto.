
import { DailyRecord, Employee, GoogleConfig, BankTransaction } from '../types';
import { calculateDailyStats, normalizeTimeFromSheet, normalizeDate, getTargetMinutesForDate } from '../utils';

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
  try {
    const data = localStorage.getItem(STORAGE_KEY_CONFIG);
    return data ? JSON.parse(data) : { scriptUrl: '', enabled: false };
  } catch {
    return { scriptUrl: '', enabled: false };
  }
};

export const saveGoogleConfig = (config: GoogleConfig) => localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));

export const getEmployees = (): Employee[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
    if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  
  const defaultEmployee: Employee = { id: '1', name: 'Gerente', role: 'Gerente', pin: '0000', active: true, shortDayOfWeek: 6 };
  saveEmployees([defaultEmployee]);
  return [defaultEmployee];
};

export const saveEmployees = (employees: Employee[]) => localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));

// Fix: Implement addEmployee to allow creating new employee records
export const addEmployee = (employee: Omit<Employee, 'id'>): Employee => {
  const employees = getEmployees();
  const newEmployee = { ...employee, id: Date.now().toString() };
  employees.push(newEmployee);
  saveEmployees(employees);
  return newEmployee;
};

// Fix: Implement updateEmployee to allow modification of existing employee data
export const updateEmployee = (employee: Employee) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => String(e.id) === String(employee.id));
  if (index !== -1) {
    employees[index] = employee;
    saveEmployees(employees);
  }
};

// Fix: Implement deleteEmployee to remove an employee and all their associated history
export const deleteEmployee = (id: string) => {
  const employees = getEmployees().filter(e => String(e.id) !== String(id));
  saveEmployees(employees);

  const allRecords = getAllRecords().filter(r => String(r.employeeId) !== String(id));
  saveAllRecords(allRecords);

  const allTxStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
  try {
    const allTx: BankTransaction[] = JSON.parse(allTxStr);
    const filteredTx = allTx.filter(t => String(t.employeeId) !== String(id));
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(filteredTx));
  } catch {}
};

export const getAllRecords = (): DailyRecord[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_RECORDS);
        if (!data) return [];
        return deduplicateRecords(JSON.parse(data));
    } catch {
        return [];
    }
};

const deduplicateRecords = (records: DailyRecord[]): DailyRecord[] => {
    if (!Array.isArray(records)) return [];
    const map = new Map<string, DailyRecord>();
    const employees = getEmployees();
    
    records.forEach(r => {
        const fixedDate = normalizeDate(r.date);
        if (!fixedDate) return;

        const key = `${fixedDate}_${r.employeeId}`;
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
        
        const stats = calculateDailyStats(cleanRecord, shortDay);
        map.set(key, { ...cleanRecord, totalMinutes: stats.total, balanceMinutes: stats.balance });
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
    if (!Array.isArray(externalRecords)) return;
    const local = getAllRecords();
    const map = new Map(local.map(r => [`${normalizeDate(r.date)}_${r.employeeId}`, r]));
    externalRecords.forEach(r => {
        const key = `${normalizeDate(r.date)}_${r.employeeId}`;
        map.set(key, r);
    });
    saveAllRecords(Array.from(map.values()));
};

export const mergeExternalEmployees = (external: Employee[]) => {
    if (!Array.isArray(external)) return;
    const local = getEmployees();
    const map = new Map(local.map(e => [String(e.id), e]));
    external.forEach(e => {
        const id = String(e.id);
        const existing = map.get(id);
        map.set(id, { ...existing, ...e, pin: e.pin || existing?.pin || '' });
    });
    saveEmployees(Array.from(map.values()));
};

export const mergeExternalTransactions = (external: BankTransaction[]) => {
    if (!Array.isArray(external)) return;
    const allStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    let local: BankTransaction[] = [];
    try { local = JSON.parse(allStr); } catch {}
    
    const map = new Map(local.map(t => [String(t.id), t]));
    external.forEach(t => map.set(String(t.id), t));
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(Array.from(map.values())));
};

export const updateRecord = (updatedRecord: DailyRecord): DailyRecord[] => {
  const allRecords = getAllRecords();
  const fixedDate = normalizeDate(updatedRecord.date);
  const emp = getEmployees().find(e => String(e.id) === String(updatedRecord.employeeId));
  const shortDay = emp?.shortDayOfWeek ?? 6;

  const existingIdx = allRecords.findIndex(r => r.date === fixedDate && String(r.employeeId) === String(updatedRecord.employeeId));
  const stats = calculateDailyStats(updatedRecord, shortDay);
  const finalRecord = { ...updatedRecord, date: fixedDate, totalMinutes: stats.total, balanceMinutes: stats.balance };

  if (existingIdx !== -1) allRecords[existingIdx] = finalRecord;
  else allRecords.push(finalRecord);

  saveAllRecords(allRecords);
  return allRecords.filter(r => String(r.employeeId) === String(updatedRecord.employeeId));
};

export const getBankBalance = (employeeId: string): number => {
  const records = getRecords(employeeId);
  const autoBalance = records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);
  const manualBalance = getTransactions(employeeId).reduce((acc, curr) => acc + curr.amountMinutes, 0);
  return autoBalance + manualBalance;
};

// Fix: Implement resetBankBalance to clear records and transactions for a specific employee
export const resetBankBalance = async (employeeId: string) => {
  const allRecords = getAllRecords().filter(r => String(r.employeeId) !== String(employeeId));
  saveAllRecords(allRecords);

  const allTxStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
  try {
    const allTx: BankTransaction[] = JSON.parse(allTxStr);
    const filteredTx = allTx.filter(t => String(t.employeeId) !== String(employeeId));
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(filteredTx));
  } catch {}
};

export const getTransactions = (employeeId: string): BankTransaction[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.filter((t: any) => String(t.employeeId) === String(employeeId)) : [];
    } catch {
        return [];
    }
};

export const addTransaction = (transaction: Omit<BankTransaction, 'id' | 'createdAt'>): BankTransaction => {
    const allStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    let all: BankTransaction[] = [];
    try { all = JSON.parse(allStr); } catch {}
    const newTx = { ...transaction, id: Date.now().toString(), createdAt: new Date().toISOString() };
    all.push(newTx);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
    return newTx;
};

export const deleteTransaction = (id: string) => {
    const allStr = localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]';
    let all: BankTransaction[] = [];
    try { all = JSON.parse(allStr); } catch {}
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all.filter(t => t.id !== id)));
};

export const getLocationConfig = (): LocationConfig => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_LOCATION);
        return data ? JSON.parse(data) : { useFixed: false, fixedName: '' };
    } catch {
        return { useFixed: false, fixedName: '' };
    }
};

export const saveLocationConfig = (config: LocationConfig) => localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(config));
