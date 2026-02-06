
import { DailyRecord, Employee, GoogleConfig, BankTransaction, LocationConfig } from './types.ts';
import { calculateDailyStats, normalizeDate, getTargetMinutesForDate } from './utils.ts';
import { parseISO, eachDayOfInterval, isBefore, startOfDay, format, isValid, isToday, startOfMonth } from 'date-fns';

const STORAGE_KEY_RECORDS = 'smartpoint_records_v2';
const STORAGE_KEY_EMPLOYEES = 'smartpoint_employees_v1';
const STORAGE_KEY_CONFIG = 'smartpoint_script_config_v1';
const STORAGE_KEY_TRANSACTIONS = 'smartpoint_transactions_v1';
const STORAGE_KEY_LOCATION = 'smartpoint_location_config_v1';

export const getEmployees = (): Employee[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
    if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
};

export const saveEmployees = (employees: Employee[]) => localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));

export const getGoogleConfig = (): GoogleConfig => {
  // Fallback: allow a default Script URL via env var (Netlify/Vite), so new devices work
  const envUrl =
    (import.meta as any)?.env?.VITE_GOOGLE_SCRIPT_URL ||
    (import.meta as any)?.env?.GOOGLE_SCRIPT_URL ||
    '';
  const fallback: GoogleConfig = { scriptUrl: envUrl || '', enabled: !!envUrl };

  try {
    const data = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!data) return fallback;

    const parsed = JSON.parse(data);
    const scriptUrl = String(parsed?.scriptUrl || fallback.scriptUrl || '');
    // If we have a URL, default to enabled=true even if older cache stored enabled=false
    const enabled = parsed?.enabled === false ? !!scriptUrl : true;
    return { scriptUrl, enabled };
  } catch {
    return fallback;
  }
};


export const saveGoogleConfig = (config: GoogleConfig) => {
  const scriptUrl = String(config?.scriptUrl || '');
  const enabled = config?.enabled === false ? false : !!scriptUrl;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ scriptUrl, enabled }));
};


export const getAllRecords = (): DailyRecord[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_RECORDS);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const saveAllRecords = (records: DailyRecord[]) => localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));

export const getRecords = (employeeId: string): DailyRecord[] => {
    return getAllRecords().filter(r => String(r.employeeId) === String(employeeId));
};

export const getBankBalance = (employeeId: string): number => {
  const records = getRecords(employeeId);
  const transactions = getTransactions(employeeId);
  const employee = getEmployees().find(e => String(e.id) === String(employeeId));
  
  if (!employee) return 0;
  const shortDay = employee.shortDayOfWeek ?? 6;
  const standardMinutes = employee.standardDailyMinutes ?? 480;

  let startDate = startOfMonth(new Date());
  if (employee.bankStartDate) {
      const customStart = parseISO(employee.bankStartDate);
      if (isValid(customStart)) startDate = startOfDay(customStart);
  }

  const today = startOfDay(new Date());
  if (isBefore(today, startDate) && !isToday(startDate)) return 0;

  const days = eachDayOfInterval({ start: startDate, end: today });
  let totalBalance = 0;
  days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records.find(r => r.date === dateStr);
      const target = getTargetMinutesForDate(dateStr, shortDay, standardMinutes);
      if (record) {
          const stats = calculateDailyStats(record, shortDay, standardMinutes);
          totalBalance += stats.balance;
      } else if (!isToday(day)) {
          totalBalance -= target;
      }
  });

  return totalBalance + transactions.reduce((acc, curr) => acc + curr.amountMinutes, 0);
};

export const updateRecord = (updatedRecord: DailyRecord): DailyRecord[] => {
  const allRecords = getAllRecords();
  const emp = getEmployees().find(e => String(e.id) === String(updatedRecord.employeeId));
  const stats = calculateDailyStats(updatedRecord, emp?.shortDayOfWeek ?? 6, emp?.standardDailyMinutes ?? 480);
  const finalRecord = { ...updatedRecord, totalMinutes: stats.total, balanceMinutes: stats.balance };
  const idx = allRecords.findIndex(r => r.date === updatedRecord.date && String(r.employeeId) === String(updatedRecord.employeeId));
  if (idx !== -1) allRecords[idx] = finalRecord; else allRecords.push(finalRecord);
  saveAllRecords(allRecords);
  return allRecords.filter(r => String(r.employeeId) === String(updatedRecord.employeeId));
};

export const mergeExternalEmployees = (external: Employee[]) => {
    if (!Array.isArray(external)) return;
    const local = getEmployees();
    const map = new Map<string, Employee>();
    local.forEach(e => map.set(String(e.id), e));
    
    external.forEach(e => {
        const id = String(e.id);
        const existing = map.get(id);
        if (existing) {
            map.set(id, {
                ...existing,
                ...e,
                id,
                bankStartDate: (e.bankStartDate && e.bankStartDate !== "" && e.bankStartDate !== "null") ? e.bankStartDate : existing.bankStartDate,
                shortDayOfWeek: (e.shortDayOfWeek !== undefined && e.shortDayOfWeek !== null) ? Number(e.shortDayOfWeek) : existing.shortDayOfWeek,
                standardDailyMinutes: (e.standardDailyMinutes !== undefined && e.standardDailyMinutes !== null) ? Number(e.standardDailyMinutes) : existing.standardDailyMinutes,
            });
        } else { map.set(id, { ...e, id }); }
    });
    saveEmployees(Array.from(map.values()));
};

export const updateEmployee = (employee: Employee) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => String(e.id) === String(employee.id));
  if (index !== -1) { 
      employees[index] = { ...employees[index], ...employee }; 
      saveEmployees(employees); 
  }
};

export const deleteEmployee = (id: string) => {
  saveEmployees(getEmployees().filter(e => String(e.id) !== String(id)));
  saveAllRecords(getAllRecords().filter(r => String(r.employeeId) !== String(id)));
};

export const addEmployee = (employee: Omit<Employee, 'id'>): Employee => {
  const employees = getEmployees();
  const newEmployee = { ...employee, id: Date.now().toString() };
  employees.push(newEmployee);
  saveEmployees(employees);
  return newEmployee;
};

export const getTodayRecord = (employeeId: string, date: string): DailyRecord => {
  const found = getRecords(employeeId).find(r => r.date === date);
  return found || { 
      date, employeeId, entry: '', lunchStart: '', lunchEnd: '', snackStart: '', snackEnd: '', exit: '', 
      totalMinutes: 0, balanceMinutes: 0 
  };
};

export const getTransactions = (employeeId: string): BankTransaction[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (!data) return [];
        return JSON.parse(data).filter((t: any) => String(t.employeeId) === String(employeeId));
    } catch { return []; }
};

export const mergeExternalRecords = (external: DailyRecord[]) => {
    if (!Array.isArray(external)) return;
    const local = getAllRecords();
    const map = new Map<string, DailyRecord>();
    local.forEach(r => map.set(`${r.date}_${r.employeeId}`, r));
    external.forEach(r => {
        if (r.date && r.employeeId) {
            map.set(`${r.date}_${r.employeeId}`, {
                ...r,
                entry: r.entry || '',
                lunchStart: r.lunchStart || '',
                lunchEnd: r.lunchEnd || '',
                snackStart: r.snackStart || '',
                snackEnd: r.snackEnd || '',
                exit: r.exit || ''
            });
        }
    });
    saveAllRecords(Array.from(map.values()));
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
    } catch { return { useFixed: false, fixedName: '' }; }
};
export const saveLocationConfig = (config: LocationConfig) => localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(config));

export const resetBankBalance = async (employeeId: string) => {
  saveAllRecords(getAllRecords().filter(r => String(r.employeeId) !== String(employeeId)));
  const employees = getEmployees();
  const empIdx = employees.findIndex(e => String(e.id) === String(employeeId));
  if (empIdx !== -1) { 
      employees[empIdx].bankStartDate = format(new Date(), 'yyyy-MM-dd'); 
      saveEmployees(employees); 
  }
};
