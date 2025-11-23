

import { DailyRecord, Employee } from '../types';

export const readEmployeesFromSheet = async (scriptUrl: string): Promise<Employee[] | null> => {
    if (!scriptUrl) return null; // Prevent fetch errors
    try {
        const response = await fetch(`${scriptUrl}?action=getEmployees`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (!Array.isArray(data)) return null;
        return data.map((emp: any) => ({
            ...emp,
            id: String(emp.id),
            pin: String(emp.pin || '') // FORCE STRING CONVERSION FOR PIN
        }));
    } catch (error) {
        console.error("Error fetching employees from script", error);
        return null;
    }
};

export const readSheetData = async (scriptUrl: string): Promise<DailyRecord[] | null> => {
  if (!scriptUrl) return null; // Prevent fetch errors
  try {
    const response = await fetch(`${scriptUrl}?action=getRecords`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (!Array.isArray(data)) return null;
    return data.map((rec: any) => ({
        ...rec,
        employeeId: String(rec.employeeId)
    }));
  } catch (error) {
    console.error("Error fetching records from script", error);
    return null;
  }
};

export const syncRowToSheet = async (scriptUrl: string, record: DailyRecord, employeeName: string, currentTotalBalance: number) => {
  if (!scriptUrl) return;
  try {
    await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
            action: 'syncRow',
            data: { 
                ...record, 
                employeeId: String(record.employeeId), 
                employeeName,
                currentTotalBalance 
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
