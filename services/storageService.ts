import { DailyRecord, Employee, GoogleConfig } from '../types';
import { calculateDailyStats } from '../utils';

const STORAGE_KEY_RECORDS = 'smartpoint_records_v2';
const STORAGE_KEY_EMPLOYEES = 'smartpoint_employees_v1';
const STORAGE_KEY_CONFIG = 'smartpoint_script_config_v1';

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
  // This prevents the app from disconnecting if the browser wipes local storage
  const envUrl = process.env.GOOGLE_SCRIPT_URL;
  if (envUrl) {
      const autoConfig = { scriptUrl: envUrl, enabled: true };
      saveGoogleConfig(autoConfig); // Save to local storage for next time
      return autoConfig;
  }

  return { scriptUrl: '', enabled: false };
};

export const saveGoogleConfig = (config: GoogleConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

// --- Employee Management ---

export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
  if (data) return JSON.parse(data);

  // Default Initial Employee
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
    externalEmployees.forEach(e => mergedMap.set(e.id, e)); // External overwrites local for consistency

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
  // Filter by employee
  return allRecords.filter(r => r.employeeId === employeeId);
};

export const saveAllRecords = (records: DailyRecord[]) => {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
};

// NEW: Hard Sync (Overwrites everything)
export const replaceAllRecords = (newRecords: DailyRecord[]) => {
  // We recalculate stats for incoming records just in case
  const processed = newRecords.map(r => {
     const stats = calculateDailyStats(r);
     return { ...r, totalMinutes: stats.total, balanceMinutes: stats.balance };
  });
  // Sort by date descending
  processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveAllRecords(processed);
};

// Called when we fetch fresh data from Google Sheets
export const mergeExternalRecords = (externalRecords: DailyRecord[]) => {
  const localRecords = getAllRecords();
  const mergedMap = new Map<string, DailyRecord>();

  // 1. Map all local records first
  localRecords.forEach(r => mergedMap.set(`${r.date}_${r.employeeId}`, r));
  
  // 2. Merge external records
  externalRecords.forEach(ext => {
    const key = `${ext.date}_${ext.employeeId}`;
    const local = mergedMap.get(key);

    if (local) {
      // Merge logic: Prefer External value, unless External is empty and Local has value
      const mergedRecord: DailyRecord = {
        ...ext, // Start with external as base
        entry: ext.entry || local.entry,
        lunchStart: ext.lunchStart || local.lunchStart,
        lunchEnd: ext.lunchEnd || local.lunchEnd,
        snackStart: ext.snackStart || local.snackStart,
        snackEnd: ext.snackEnd || local.snackEnd,
        exit: ext.exit || local.exit,
        location: ext.location || local.location,
      };

      // Recalculate stats based on the merged time fields
      const stats = calculateDailyStats(mergedRecord);
      mergedRecord.totalMinutes = stats.total;
      mergedRecord.balanceMinutes = stats.balance;

      mergedMap.set(key, mergedRecord);
    } else {
      // New record from sheet that doesn't exist locally
      const stats = calculateDailyStats(ext);
      mergedMap.set(key, { ...ext, totalMinutes: stats.total, balanceMinutes: stats.balance });
    }
  });

  const mergedList = Array.from(mergedMap.values());
  // Sort by date descending
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
  
  // Remove existing version of this specific record
  allRecords = allRecords.filter(r => !(r.date === updatedRecord.date && r.employeeId === updatedRecord.employeeId));

  // Recalculate stats before saving
  const stats = calculateDailyStats(updatedRecord);
  const finalRecord = { ...updatedRecord, totalMinutes: stats.total, balanceMinutes: stats.balance };

  // Add updated record
  allRecords.push(finalRecord);
  
  // Sort by date descending
  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  saveAllRecords(allRecords);
  
  return allRecords.filter(r => r.employeeId === updatedRecord.employeeId);
};

export const getBankBalance = (employeeId: string): number => {
  const records = getRecords(employeeId);
  return records.reduce((acc, curr) => acc + (curr.balanceMinutes || 0), 0);
};