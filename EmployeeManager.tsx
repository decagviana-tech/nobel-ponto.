
import React, { useState, useEffect } from 'react';
import { Employee } from './types.ts';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getBankBalance, getGoogleConfig } from './storageService.ts';
import { syncEmployeeToSheet } from './googleSheetsService.ts';
import { formatTime } from './utils.ts';
import { UserPlus, Trash2, Edit, Save, X, RefreshCw, ShieldCheck, Calendar } from 'lucide-react';

interface Props { onUpdate: (emp?: Employee) => void | Promise<void>; currentEmployeeId: string; onSelectEmployee: (id: string) => void; }

export const EmployeeManager: React.FC<Props> = ({ onUpdate }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', role: '', pin: '', shortDayOfWeek: 6, standardDailyMinutes: 480, bankStartDate: new Date().toISOString().split('T')[0] });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Employee | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setEmployees(getEmployees()); }, []);

    const handleAdd = async () => {
        if (!newEmployee.name) return;
        setIsSaving(true);
        const created = addEmployee({ ...newEmployee, active: true });
        const config = getGoogleConfig();
        if (config.enabled && config.scriptUrl) { await syncEmployeeToSheet(config.scriptUrl, created); }
        await onUpdate(created);
        setIsAdding(false);
        setIsSaving(false);
        setEmployees(getEmployees());
    };

    return (
        <div className="w-full space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3"><div className="bg-slate-900 text-white p-2 rounded-xl"><ShieldCheck size={24} /></div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Equipe Nobel</h2></div>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs">{isAdding ? <X size={16} /> : <UserPlus size={16} />} NOVO</button>
            </div>
            {isAdding && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border mb-6">
                    <input type="text" className="w-full border p-3 rounded-xl mb-4" placeholder="Nome" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                    <button onClick={handleAdd} className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase">Salvar</button>
                </div>
            )}
            <div className="bg-white rounded-[2.5rem] shadow-xl border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black"><tr><th className="px-8 py-5">Nome</th><th className="px-6 py-5">Contrato</th><th className="px-6 py-5">Banco</th><th className="px-8 py-5 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5"><p className="font-black text-slate-900">{emp.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{emp.role}</p></td>
                                <td className="px-6 py-5 text-[10px] font-black uppercase text-slate-500">Meta: {Math.floor((emp.standardDailyMinutes ?? 480) / 60)}h</td>
                                <td className="px-6 py-5 font-black text-slate-700">{formatTime(getBankBalance(emp.id))}</td>
                                <td className="px-8 py-5 text-right flex justify-end gap-3">
                                    <button onClick={() => { if(confirm('Remover?')) { deleteEmployee(emp.id); setEmployees(getEmployees()); onUpdate(); } }} className="text-slate-300 hover:text-rose-600"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
