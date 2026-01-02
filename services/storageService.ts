
import { DailyRecord, Employee, GoogleConfig, BankTransaction } from '../types';
import { calculateDailyStats, normalizeTimeFromSheet, normalizeDate, getTargetMinutesForDate } from '../utils';

const STORAGE_KEY_RECORDS = 'smartpoint_records_v2';
const STORAGE_KEY_EMPLOYEES = 'smartpoint_employees_v1';
const STORAGE_KEY_CONFIG = 'smartpoint_script_config_v1';
const STORAGE_KEY_TRANSACTIONS = 'smartpoint_transactions_v1';
const STORAGE_KEY_LOCATION = 'smartpoint_location_config_v1';

export const getGoogleConfig = (): GoogleConfig => {
  const data = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (data) return JSON.parse(data);
  return { scriptUrl: '', enabled: false };
};

export const saveGoogleConfig = (config: GoogleConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

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
    const index = employees.findIndex(e => e.id === employee.id);
    if (index !== -1) { employees[index] = employee; saveEmployees(employees); }
};

export const deleteEmployee = (id: string) => {
    saveEmployees(getEmployees().filter(e => e.id !== id));
};

export const getAllRecords = (): DailyRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY_RECORDS);
    return data ? deduplicateRecords(JSON.parse(data)) : [];
};

const deduplicateRecords = (records: DailyRecord[]): DailyRecord[] => {
    const map = new Map<string, DailyRecord>();
    const employees = getEmployees();
    
    records.sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
        const fixedDate = normalizeDate(r.date);
        const key = `${fixedDate}_${r.employeeId}`;
        const existing = map.get(key);
        const emp = employees.find(e => e.id === r.employeeId);
        const shortDay = emp?.shortDayOfWeek ?? 6;

        const cleanRecord = {
            ...r,
            date: fixedDate,
            entry: normalizeTimeFromSheet(r.entry),
            lunchStart: normalizeTimeFromSheet(r.lunchStart),
            lunchEnd: normalizeTimeFromSheet(r.lunchEnd),
            snackStart: normalizeTimeFromSheet(r.snackStart),
            snackEnd: normalizeTimeFromSheet(r.snackEnd),
            exit: normalizeTimeFromSheet(r.exit),
        };
        
        if (existing) {
             const merged = {
                 ...existing,
                 entry: cleanRecord.entry || existing.entry,
                 lunchStart: cleanRecord.lunchStart || existing.lunchStart,
                 lunchEnd: cleanRecord.lunchEnd || existing.lunchEnd,
                 snackStart: cleanRecord.snackStart || existing.snackStart,
                 snackEnd: cleanRecord.snackEnd || existing.snackEnd,
                 exit: cleanRecord.exit || existing.exit,
                 location: cleanRecord.location || existing.location,
             };
             const stats = calculateDailyStats(merged, shortDay);
             map.set(key, { ...merged, totalMinutes: stats.total, balanceMinutes: stats.balance });
        } else {
             const stats = calculateDailyStats(cleanRecord, shortDay);
             map.set(key, { ...cleanRecord, totalMinutes: stats.total, balanceMinutes: stats.balance });
        }
    });
    return Array.from(map.values());
};

export const getRecords = (employeeId: string): DailyRecord[] => getAllRecords().filter(r => r.employeeId === employeeId);
export const saveAllRecords = (records: DailyRecord[]) => localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(deduplicateRecords(records)));

export const mergeExternalRecords = (externalRecords: DailyRecord[]) => {
    const local = getAllRecords();
    saveAllRecords([...local, ...externalRecords]);
};

export const mergeExternalEmployees = (externalEmployees: Employee[]) => {
    const local = getEmployees();
    const map = new Map<string, Employee>();
    local.forEach(e => map.set(e.id, e));
    externalEmployees.forEach(e => {
        const existing = map.get(e.id);
        map.set(e.id, { ...existing, ...e, pin: e.pin || existing?.pin || '' });
    });
    saveEmployees(Array.from(map.values()));
};

export const updateRecord = (updatedRecord: DailyRecord): DailyRecord[] => {
  const allRecords = getAllRecords();
  const fixedDate = normalizeDate(updatedRecord.date);
  const emp = getEmployees().find(e => e.id === updatedRecord.employeeId);
  const shortDay = emp?.shortDayOfWeek ?? 6;

  const existingIdx = allRecords.findIndex(r => r.date === fixedDate && r.employeeId === updatedRecord.employeeId);
  
  if (existingIdx !== -1) {
      const existing = allRecords[existingIdx];
      const merged = {
          ...existing, ...updatedRecord,
          entry: updatedRecord.entry || existing.entry,
          lunchStart: updatedRecord.lunchStart || existing.lunchStart,
          lunchEnd: updatedRecord.lunchEnd || existing.lunchEnd,
          exit: updatedRecord.exit || existing.exit,
      };
      const stats = calculateDailyStats(merged, shortDay);
      allRecords[existingIdx] = { ...merged, totalMinutes: stats.total, balanceMinutes: stats.balance };
  } else {
      const stats = calculateDailyStats(updatedRecord, shortDay);
      allRecords.push({ ...updatedRecord, totalMinutes: stats.total, balanceMinutes: stats.balance });
  }

  saveAllRecords(allRecords);
  return allRecords.filter(r => r.employeeId === updatedRecord.employeeId);
};

export const getTodayRecord = (employeeId: string, date: string): DailyRecord => {
  const records = getRecords(employeeId);
  const existing = records.find(r => r.date === date);
  if (existing) return existing;
  const emp = getEmployees().find(e => e.id === employeeId);
  const target = getTargetMinutesForDate(date, emp?.shortDayOfWeek ?? 6);
  return { date, employeeId, entry: '', lunchStart: '', lunchEnd: '', snackStart: '', snackEnd: '', exit: '', totalMinutes: 0, balanceMinutes: -target };
};

export const getBankBalance = (employeeId: string): number => {
  const records = getRecords(employeeId);
  const autoBalance = records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);
  const manualBalance = getTransactions(employeeId).reduce((acc, curr) => acc + curr.amountMinutes, 0);
  return autoBalance + manualBalance;
};

export const getTransactions = (employeeId: string): BankTransaction[] => {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return data ? JSON.parse(data).filter((t: any) => t.employeeId === employeeId) : [];
};

export const addTransaction = (transaction: Omit<BankTransaction, 'id' | 'createdAt'>): BankTransaction => {
    const all: BankTransaction[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]');
    const newTx = { ...transaction, id: Date.now().toString(), createdAt: new Date().toISOString() };
    all.push(newTx);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all));
    return newTx;
};

export const deleteTransaction = (id: string) => {
    const all: BankTransaction[] = JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]');
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(all.filter(t => t.id !== id)));
};

export interface LocationConfig { useFixed: boolean; fixedName: string; }
export const getLocationConfig = (): LocationConfig => {
    const data = localStorage.getItem(STORAGE_KEY_LOCATION);
    return data ? JSON.parse(data) : { useFixed: false, fixedName: '' };
};
export const saveLocationConfig = (config: LocationConfig) => localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(config));
