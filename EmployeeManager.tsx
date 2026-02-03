
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getBankBalance } from '../services/storageService';
import { syncEmployeeToSheet } from '../services/googleSheetsService';
import { getGoogleConfig } from '../services/storageService';
import { formatTime } from '../utils';
import { UserPlus, Trash2, Edit, Save, X, RefreshCw, CalendarDays, Clock8, ShieldCheck, Calendar, Target, Info } from 'lucide-react';

interface Props {
    onUpdate: (emp?: Employee) => Promise<void>;
    currentEmployeeId: string;
    onSelectEmployee: (id: string) => void;
}

const WEEK_DAYS = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
];

const JORNADA_OPTIONS = [
    { value: 480, label: '8 Horas (Padrão)' },
    { value: 360, label: '6 Horas (Estagiário)' },
    { value: 240, label: '4 Horas' },
];

const MASTER_PIN = '9999';

export const EmployeeManager: React.FC<Props> = ({ onUpdate, currentEmployeeId, onSelectEmployee }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', role: '', pin: '', shortDayOfWeek: 6, standardDailyMinutes: 480, bankStartDate: new Date().toISOString().split('T')[0] });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Employee | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, [currentEmployeeId]);

    const loadEmployees = () => {
        setEmployees(getEmployees());
    };

    const handleAdd = async () => {
        if (!newEmployee.name) return;
        if (newEmployee.pin === MASTER_PIN) {
            alert("O PIN 9999 é exclusivo da gerência.");
            return;
        }
        setIsSaving(true);
        const created = addEmployee({ ...newEmployee, active: true });
        
        const config = getGoogleConfig();
        if (config.enabled && config.scriptUrl) {
            await syncEmployeeToSheet(config.scriptUrl, created);
        }
        
        await onUpdate(created);
        setNewEmployee({ name: '', role: '', pin: '', shortDayOfWeek: 6, standardDailyMinutes: 480, bankStartDate: new Date().toISOString().split('T')[0] });
        setIsAdding(false);
        setIsSaving(false);
        loadEmployees();
    };

    const handleDelete = (id: string, emp: Employee) => {
        if (emp.pin === MASTER_PIN || emp.role.toLowerCase().includes('gerente')) {
            alert("Contas de gerência não podem ser excluídas por segurança.");
            return;
        }
        if (window.confirm('Tem certeza que deseja remover este funcionário?')) {
            deleteEmployee(id);
            loadEmployees();
            onUpdate(); 
        }
    };

    const startEdit = (emp: Employee) => {
        setEditingId(emp.id);
        setEditForm({ 
            ...emp, 
            shortDayOfWeek: emp.shortDayOfWeek ?? 6, 
            standardDailyMinutes: emp.standardDailyMinutes ?? 480,
            bankStartDate: emp.bankStartDate || new Date().toISOString().split('T')[0]
        });
    };

    const saveEdit = async () => {
        if (editForm) {
            setIsSaving(true);
            const updated = { ...editForm, active: true };
            
            updateEmployee(updated); 
            setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));

            const config = getGoogleConfig();
            if (config.enabled && config.scriptUrl) {
                try {
                    await syncEmployeeToSheet(config.scriptUrl, updated);
                } catch (e) {
                    console.error("Erro ao sincronizar com planilha:", e);
                }
            }

            setEditingId(null);
            setEditForm(null);
            setIsSaving(false);
            
            onUpdate(updated);
        }
    };

    const toggleActive = async (emp: Employee) => {
        if (emp.pin === MASTER_PIN) return;
        const updated = { ...emp, active: !emp.active };
        updateEmployee(updated);
        
        const config = getGoogleConfig();
        if (config.enabled && config.scriptUrl) {
            await syncEmployeeToSheet(config.scriptUrl, updated);
        }

        loadEmployees();
        await onUpdate(updated); 
    };

    const handleForceImport = async () => {
        setIsSyncing(true);
        try {
            await onUpdate(); 
            setTimeout(() => {
                loadEmployees();
                setIsSyncing(false);
            }, 1000);
        } catch (error) {
            console.error("Erro ao importar", error);
            setIsSyncing(false);
        }
    };

    return (
        <div className="w-full space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white p-2 rounded-xl"><ShieldCheck size={24} /></div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Equipe</h2>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleForceImport}
                        disabled={isSyncing}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-bold text-xs"
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        <span>SINCRONIZAR NUVEM</span>
                    </button>

                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-bold text-xs"
                    >
                        {isAdding ? <X size={16} /> : <UserPlus size={16} />}
                        <span>{isAdding ? 'CANCELAR' : 'NOVO COLABORADOR'}</span>
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-100 mb-6 animate-fade-in">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Cadastrar Novo Registro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Nome Completo</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-bold" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="João Silva" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Cargo / Função</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-bold" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} placeholder="Vendedor" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Início da Contagem (Banco)</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-bold" value={newEmployee.bankStartDate} onChange={e => setNewEmployee({...newEmployee, bankStartDate: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Meta Diária (Normal)</label>
                            <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-bold" value={newEmployee.standardDailyMinutes} onChange={e => setNewEmployee({...newEmployee, standardDailyMinutes: Number(e.target.value)})}>
                                {JORNADA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Dia Curto (Semana Inglesa)</label>
                            <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-bold" value={newEmployee.shortDayOfWeek} onChange={e => setNewEmployee({...newEmployee, shortDayOfWeek: Number(e.target.value)})}>
                                {WEEK_DAYS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">PIN de Acesso</label>
                            <input type="text" maxLength={4} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-black tracking-widest text-center" value={newEmployee.pin} onChange={e => setNewEmployee({...newEmployee, pin: e.target.value})} placeholder="0000" />
                        </div>
                    </div>
                    <button onClick={handleAdd} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        {isSaving ? 'PROCESSANDO...' : 'SALVAR NOVO COLABORADOR'}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-6 py-5">Nome / Cargo</th>
                                <th className="px-6 py-5">Contrato</th>
                                <th className="px-6 py-5">Banco</th>
                                <th className="px-8 py-5 text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(emp => {
                                const isEditing = editingId === emp.id;
                                const isCurrent = currentEmployeeId === emp.id;
                                const bankBalance = getBankBalance(emp.id);
                                const isPositive = bankBalance >= 0;
                                const isAndrea = emp.pin === MASTER_PIN || emp.role.toLowerCase().includes('gerente');

                                return (
                                    <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors ${isCurrent ? 'bg-brand-50/20' : ''}`}>
                                        <td className="px-8 py-5">
                                            <button onClick={() => toggleActive(emp)} disabled={isAndrea} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${emp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} ${isAndrea ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                {emp.active ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5">
                                            {isEditing && editForm ? (
                                                <div className="space-y-2">
                                                    <input className="border-2 border-brand-200 p-2 rounded-xl w-full bg-white text-slate-900 font-bold text-xs outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                                    <input className="border border-slate-200 p-2 rounded-xl w-full bg-slate-50 text-slate-600 font-bold text-[10px] outline-none" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} />
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm flex items-center gap-2">
                                                        {emp.name}
                                                        {isAndrea && <ShieldCheck size={14} className="text-brand-500" />}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.role}</p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            {isEditing && editForm ? (
                                                <div className="flex flex-col gap-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                    <div>
                                                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Início Vigência</label>
                                                        <input type="date" className="w-full border p-2 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-brand-500" value={editForm.bankStartDate} onChange={e => setEditForm({...editForm, bankStartDate: e.target.value})} />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Meta</label>
                                                            <select className="w-full border p-2 rounded-xl text-[10px] font-bold outline-none" value={editForm.standardDailyMinutes} onChange={e => setEditForm({...editForm, standardDailyMinutes: Number(e.target.value)})}>
                                                                {JORNADA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label.split(' ')[0]}h</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Curto</label>
                                                            <select className="w-full border p-2 rounded-xl text-[10px] font-bold outline-none" value={editForm.shortDayOfWeek} onChange={e => setEditForm({...editForm, shortDayOfWeek: Number(e.target.value)})}>
                                                                {WEEK_DAYS.map(day => <option key={day.value} value={day.value}>{day.label.substring(0, 3)}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            Meta: {Math.floor((emp.standardDailyMinutes ?? 480) / 60)}H
                                                        </span>
                                                        <span className="text-[10px] font-black text-brand-600 uppercase bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                                                            Curto: {WEEK_DAYS.find(d => d.value === (emp.shortDayOfWeek ?? 6))?.label.split('-')[0]}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter flex items-center gap-1">
                                                        <Calendar size={10} /> Desde: {emp.bankStartDate ? new Date(emp.bankStartDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Criação'}
                                                    </p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border shadow-sm ${isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                <span className="font-mono">{formatTime(bankBalance)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right flex justify-end gap-3 items-center">
                                            {!isEditing ? (
                                                <>
                                                    <button onClick={() => onSelectEmployee(emp.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isCurrent ? 'bg-slate-100 text-slate-400 border-slate-100' : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-md active:scale-95'}`} disabled={isCurrent}>
                                                        {isCurrent ? 'Logado' : 'Acessar'}
                                                    </button>
                                                    <button onClick={() => startEdit(emp)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors"><Edit size={18} /></button>
                                                    <button onClick={() => handleDelete(emp.id, emp)} disabled={isAndrea} className={`p-2 transition-colors ${isAndrea ? 'text-slate-100' : 'text-slate-300 hover:text-rose-600'}`}><Trash2 size={18} /></button>
                                                </>
                                            ) : (
                                                <div className="flex gap-2">
                                                     <button onClick={() => { setEditingId(null); setEditForm(null); }} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
                                                     <button onClick={saveEdit} disabled={isSaving} className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2 flex items-center gap-1 text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
                                                        {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                                                        SALVAR
                                                     </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <Info size={14} className="text-slate-400" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        Dica: Defina a data de vigência para o dia que deseja começar a contar o banco de horas (ex: 01/02/2026).
                    </p>
                </div>
            </div>
        </div>
    );
};
