
import { DailyRecord, Employee, BankTransaction } from '../types';
import { minutesToHHMM, normalizeTimeFromSheet } from '../utils';

/**
 * Helper para chamadas GET com tratamento de erro silencioso
 */
const fetchWithRetry = async (url: string) => {
    if (!window.navigator.onLine) return null;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
};

export const readEmployeesFromSheet = async (scriptUrl: string): Promise<Employee[] | null> => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return null;
    const data = await fetchWithRetry(`${scriptUrl}?action=getEmployees`);
    if (!Array.isArray(data)) return null;
    
    return data.map((emp: any) => ({
        ...emp,
        id: String(emp.id),
        pin: String(emp.pin || ''),
        shortDayOfWeek: emp.shortDayOfWeek !== undefined && emp.shortDayOfWeek !== null ? Number(emp.shortDayOfWeek) : undefined,
        standardDailyMinutes: emp.standardDailyMinutes !== undefined && emp.standardDailyMinutes !== null ? Number(emp.standardDailyMinutes) : undefined,
        bankStartDate: emp.bankStartDate || undefined // Lê a data de início da coluna O (ou campo correspondente no JSON)
    }));
};

export const readSheetData = async (scriptUrl: string): Promise<DailyRecord[] | null> => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return null;
    const data = await fetchWithRetry(`${scriptUrl}?action=getRecords`);
    if (!Array.isArray(data)) return null;
    
    return data.map((rec: any) => ({
        ...rec,
        employeeId: String(rec.employeeId),
        entry: normalizeTimeFromSheet(rec.entry),
        lunchStart: normalizeTimeFromSheet(rec.lunchStart),
        lunchEnd: normalizeTimeFromSheet(rec.lunchEnd),
        snackStart: normalizeTimeFromSheet(rec.snackStart),
        snackEnd: normalizeTimeFromSheet(rec.snackEnd),
        exit: normalizeTimeFromSheet(rec.exit),
    }));
};

export const readTransactionsFromSheet = async (scriptUrl: string): Promise<BankTransaction[] | null> => {
    if (!scriptUrl || !scriptUrl.startsWith('http')) return null;
    const data = await fetchWithRetry(`${scriptUrl}?action=getTransactions`);
    if (!Array.isArray(data)) return null;
    
    return data.map((t: any) => ({
        ...t,
        id: String(t.id),
        employeeId: String(t.employeeId)
    }));
};

export const syncRowToSheet = async (scriptUrl: string, record: DailyRecord, employeeName: string, currentTotalBalance: number, empConfig?: { shortDay?: number, dailyMinutes?: number }) => {
  if (!scriptUrl || !window.navigator.onLine) return;
  try {
    const totalFormatted = minutesToHHMM(record.totalMinutes);
    const balanceFormatted = minutesToHHMM(record.balanceMinutes);

    await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        keepalive: true, 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
            action: 'syncRow',
            data: { 
                ...record, 
                employeeId: String(record.employeeId), 
                employeeName,
                currentTotalBalance: minutesToHHMM(currentTotalBalance),
                totalFormatted,
                balanceFormatted,
                standardDailyMinutes: empConfig?.dailyMinutes ?? 480,
                shortDayOfWeek: empConfig?.shortDay ?? 6
            }
        })
    });
  } catch (error) {
  }
};

export const syncEmployeeToSheet = async (scriptUrl: string, employee: Employee) => {
    if (!scriptUrl || !window.navigator.onLine) return;
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'syncEmployee',
                data: { 
                    ...employee, 
                    id: String(employee.id), 
                    pin: String(employee.pin || ''),
                    shortDayOfWeek: employee.shortDayOfWeek,
                    standardDailyMinutes: employee.standardDailyMinutes,
                    bankStartDate: employee.bankStartDate // Envia para a Coluna O
                }
            })
        });
    } catch (error) {}
}

export const syncTransactionToSheet = async (scriptUrl: string, transaction: BankTransaction) => {
    if (!scriptUrl || !window.navigator.onLine) return;
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            body: JSON.stringify({
                action: 'syncTransaction',
                data: { ...transaction, id: String(transaction.id), employeeId: String(transaction.employeeId) }
            })
        });
    } catch (e) {}
};

export const deleteTransactionFromSheet = async (scriptUrl: string, id: string) => {
    if (!scriptUrl || !window.navigator.onLine) return;
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            body: JSON.stringify({
                action: 'deleteTransaction',
                data: { id: String(id) }
            })
        });
    } catch (e) {}
};
