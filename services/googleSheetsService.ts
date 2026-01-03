
import { DailyRecord, Employee } from '../types';
import { minutesToHHMM, normalizeTimeFromSheet } from '../utils';

export const readEmployeesFromSheet = async (scriptUrl: string): Promise<Employee[] | null> => {
    if (!scriptUrl) return null;
    try {
        const response = await fetch(`${scriptUrl}?action=getEmployees`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (!Array.isArray(data)) return null;
        return data.map((emp: any) => ({
            ...emp,
            id: String(emp.id),
            pin: String(emp.pin || '')
        }));
    } catch (error) {
        console.error("Error fetching employees from script", error);
        return null;
    }
};

export const readSheetData = async (scriptUrl: string): Promise<DailyRecord[] | null> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(`${scriptUrl}?action=getRecords`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
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
  } catch (error) {
    console.error("Error fetching records from script", error);
    return null;
  }
};

export const clearCloudRecords = async (scriptUrl: string, employeeId: string) => {
    if (!scriptUrl) return;
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'deleteRecords',
                data: { employeeId: String(employeeId) }
            })
        });
        return true;
    } catch (e) {
        console.error("Erro ao limpar nuvem:", e);
        return false;
    }
};

export const syncRowToSheet = async (scriptUrl: string, record: DailyRecord, employeeName: string, currentTotalBalance: number) => {
  if (!scriptUrl) return;
  try {
    const totalFormatted = minutesToHHMM(record.totalMinutes);
    const balanceFormatted = minutesToHHMM(record.balanceMinutes);

    await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true, 
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'syncRow',
            data: { 
                ...record, 
                employeeId: String(record.employeeId), 
                employeeName,
                currentTotalBalance,
                totalFormatted,
                balanceFormatted
            }
        })
    });
  } catch (error) {
    console.error("Error pushing row to script", error);
  }
};

export const syncEmployeeToSheet = async (scriptUrl: string, employee: Employee) => {
    if (!scriptUrl) return;
    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            keepalive: true,
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'syncEmployee',
                data: { ...employee, id: String(employee.id), pin: String(employee.pin || '') }
            })
        });
    } catch (error) {
        console.error("Error pushing employee to script", error);
    }
}
