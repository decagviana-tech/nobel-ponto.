
import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getBankBalance, getGoogleConfig } from '../services/storageService';
import { formatTime } from '../utils';
import { UserPlus, Trash2, Edit, Save, X, User, Wallet, CheckCircle2, AlertCircle, DownloadCloud, RefreshCw, Fingerprint, Power, UserX, Lock, CalendarDays } from 'lucide-react';

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

export const EmployeeManager: React.FC<Props> = ({ onUpdate, currentEmployeeId, onSelectEmployee }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', role: '', pin: '', shortDayOfWeek: 6 });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Employee | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSavingNew, setIsSavingNew] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, [currentEmployeeId]);

    const loadEmployees = () => {
        setEmployees(getEmployees());
    };

    const handleAdd = async () => {
        if (!newEmployee.name) return;
        setIsSavingNew(true);
        
        const created = addEmployee({ ...newEmployee, active: true });
        await onUpdate(created);
        
        setNewEmployee({ name: '', role: '', pin: '', shortDayOfWeek: 6 });
        setIsAdding(false);
        setIsSavingNew(false);
        loadEmployees();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja remover este funcionário?')) {
            deleteEmployee(id);
            loadEmployees();
            onUpdate(); 
        }
    };

    const startEdit = (emp: Employee) => {
        setEditingId(emp.id);
        setEditForm({ ...emp, shortDayOfWeek: emp.shortDayOfWeek ?? 6 });
    };

    const saveEdit = async () => {
        if (editForm) {
            const updated = { ...editForm, active: true };
            updateEmployee(updated); 
            setEditingId(null);
            setEditForm(null);
            loadEmployees();
            await onUpdate(updated); 
        }
    };

    const toggleActive = async (emp: Employee) => {
        const updated = { ...emp, active: !emp.active };
        updateEmployee(updated);
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
                <h2 className="text-2xl font-bold text-slate-800">Gestão de Funcionários</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleForceImport}
                        disabled={isSyncing}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? 'Baixando da Nuvem...' : 'Baixar da Planilha'}</span>
                    </button>

                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                    >
                        {isAdding ? <X size={20} /> : <UserPlus size={20} />}
                        <span>{isAdding ? 'Cancelar' : 'Novo Funcionário'}</span>
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-brand-100 mb-6 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Cadastrar Novo Colaborador</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Completo</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newEmployee.name}
                                onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Cargo / Função</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newEmployee.role}
                                onChange={e => setNewEmployee({...newEmployee, role: e.target.value})}
                                placeholder="Ex: Vendedor"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Dia Curto (Semana Inglesa)</label>
                            <select 
                                className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newEmployee.shortDayOfWeek}
                                onChange={e => setNewEmployee({...newEmployee, shortDayOfWeek: Number(e.target.value)})}
                            >
                                {WEEK_DAYS.map(day => (
                                    <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">PIN (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newEmployee.pin}
                                onChange={e => setNewEmployee({...newEmployee, pin: e.target.value})}
                                placeholder="Ex: 1234"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleAdd} 
                        disabled={isSavingNew}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                    >
                        {isSavingNew ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        {isSavingNew ? 'Salvando...' : 'Salvar Registro'}
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Nome / ID</th>
                            <th className="px-6 py-4">Cargo / Dia Curto</th>
                            <th className="px-6 py-4">Banco de Horas</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {employees.map(emp => {
                            const isEditing = editingId === emp.id;
                            const isCurrent = currentEmployeeId === emp.id;
                            const bankBalance = getBankBalance(emp.id);
                            const isPositive = bankBalance >= 0;

                            return (
                                <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-brand-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => toggleActive(emp)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                                                ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                                            `}
                                        >
                                            {emp.active ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {isEditing && editForm ? (
                                            <input 
                                                className="border p-1.5 rounded w-full bg-white"
                                                value={editForm.name}
                                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                            />
                                        ) : (
                                            <div>
                                                <p className="font-semibold">{emp.name}</p>
                                                <p className="text-[10px] text-slate-400">ID: {emp.id}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isEditing && editForm ? (
                                            <div className="space-y-2">
                                                <input 
                                                    className="border p-1.5 rounded w-full bg-white text-xs"
                                                    value={editForm.role}
                                                    placeholder="Cargo"
                                                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                                                />
                                                <select 
                                                    className="border p-1.5 rounded w-full bg-white text-xs"
                                                    value={editForm.shortDayOfWeek}
                                                    onChange={e => setEditForm({...editForm, shortDayOfWeek: Number(e.target.value)})}
                                                >
                                                    {WEEK_DAYS.map(day => (
                                                        <option key={day.value} value={day.value}>{day.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <p>{emp.role}</p>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase flex items-center gap-1">
                                                    <CalendarDays size={10} />
                                                    Dia Curto: {WEEK_DAYS.find(d => d.value === (emp.shortDayOfWeek ?? 6))?.label}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border
                                            ${isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                                        `}>
                                            <span className="font-mono text-sm">{formatTime(bankBalance)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                        {!isEditing ? (
                                            <>
                                                <button onClick={() => onSelectEmployee(emp.id)} className="px-3 py-1.5 rounded text-xs font-bold border bg-white text-brand-600 border-brand-200 hover:bg-brand-50" disabled={isCurrent}>
                                                    {isCurrent ? 'Selecionado' : 'Alternar'}
                                                </button>
                                                <button onClick={() => startEdit(emp)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                            </>
                                        ) : (
                                            <button onClick={saveEdit} className="text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 flex items-center gap-1 text-xs font-bold">
                                                <Save size={14} /> Salvar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
