
import React, { useState, useEffect } from 'react';
import { BankTransaction, TransactionType, Employee } from '../types';
import { addTransaction, getTransactions, deleteTransaction, getGoogleConfig, getEmployees } from '../services/storageService';
import { syncTransactionToSheet, deleteTransactionFromSheet } from '../services/googleSheetsService';
import { formatTime, getTargetMinutesForDate } from '../utils';
import { PlusCircle, Trash2, Calendar, FileText, DollarSign, Clock, AlertTriangle, X, RefreshCw, Wand2 } from 'lucide-react';

interface Props {
    employeeId: string;
    onUpdate: () => void;
    onClose: () => void;
}

export const BankManagement: React.FC<Props> = ({ employeeId, onUpdate, onClose }) => {
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [employee, setEmployee] = useState<Employee | null>(null);
    
    // Form
    const [type, setType] = useState<TransactionType>('ADJUSTMENT');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [operation, setOperation] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadData();
        const emps = getEmployees();
        setEmployee(emps.find(e => String(e.id) === String(employeeId)) || null);
    }, [employeeId]);

    const loadData = () => {
        setTransactions(getTransactions(employeeId));
    };

    // Função para puxar automaticamente a carga horária do dia selecionado
    const handleAutoFillDay = () => {
        if (!date) return;
        const targetMinutes = getTargetMinutesForDate(date, employee?.shortDayOfWeek ?? 6);
        const h = Math.floor(targetMinutes / 60);
        const m = targetMinutes % 60;
        
        setHours(h.toString());
        setMinutes(m.toString().padStart(2, '0'));
        setOperation('CREDIT');
        
        if (type === 'ADJUSTMENT') setDescription(`Justificativa de Ausência (Folga)`);
        else if (type === 'CERTIFICATE') setDescription(`Abono por Atestado Médico`);
    };

    const handleSave = async () => {
        if (!hours && !minutes) return;
        if (!description) {
            alert("Por favor, adicione uma descrição para este ajuste.");
            return;
        }

        setIsSyncing(true);
        const h = parseInt(hours || '0');
        const m = parseInt(minutes || '0');
        const totalMinutes = (h * 60) + m;

        if (totalMinutes === 0) {
            setIsSyncing(false);
            return;
        }

        const finalAmount = operation === 'CREDIT' ? totalMinutes : -totalMinutes;

        const newTx = addTransaction({
            employeeId,
            date,
            type,
            amountMinutes: finalAmount,
            description
        });

        const config = getGoogleConfig();
        if (config.enabled && config.scriptUrl) {
            await syncTransactionToSheet(config.scriptUrl, newTx);
        }

        setHours('');
        setMinutes('');
        setDescription('');
        setIsSyncing(false);
        loadData();
        onUpdate();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este lançamento?')) {
            setIsSyncing(true);
            deleteTransaction(id);
            const config = getGoogleConfig();
            if (config.enabled && config.scriptUrl) {
                await deleteTransactionFromSheet(config.scriptUrl, id);
            }
            setIsSyncing(false);
            loadData();
            onUpdate();
        }
    };

    useEffect(() => {
        if (type === 'PAYMENT') setOperation('DEBIT');
        if (type === 'CERTIFICATE' || type === 'BONUS') setOperation('CREDIT');
    }, [type]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-brand-600" />
                        Ajustes de Banco de Horas
                    </h3>
                    <div className="flex items-center gap-4">
                        {isSyncing && <RefreshCw size={16} className="animate-spin text-brand-500" />}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={24} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 shadow-inner">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Novo Lançamento / Justificativa</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Motivo do Ajuste</label>
                                <select 
                                    className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold text-sm"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as TransactionType)}
                                >
                                    <option value="ADJUSTMENT">Folga / Ajuste Manual</option>
                                    <option value="CERTIFICATE">Atestado Médico (Abono)</option>
                                    <option value="PAYMENT">Pagamento de Horas Extras</option>
                                    <option value="BONUS">Bônus de Horas</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Data da Ausência/Ajuste</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="date" 
                                        className="flex-1 p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold text-sm"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAutoFillDay}
                                        title="Puxar horas deste dia automaticamente"
                                        className="bg-brand-50 text-brand-600 p-3 rounded-xl border border-brand-100 hover:bg-brand-100 transition-colors"
                                    >
                                        <Wand2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Operação</label>
                                <div className="flex gap-1 p-1 bg-white border border-slate-300 rounded-xl">
                                    <button onClick={() => setOperation('CREDIT')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-colors ${operation === 'CREDIT' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Crédito (+)</button>
                                    <button onClick={() => setOperation('DEBIT')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded transition-colors ${operation === 'DEBIT' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>Débito (-)</button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tempo a Lançar (Horas : Minutos)</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" placeholder="00" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-center text-slate-900 font-black" value={hours} onChange={(e) => setHours(e.target.value)} />
                                    <span className="font-black text-slate-300">:</span>
                                    <input type="number" placeholder="00" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-center text-slate-900 font-black" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Descrição Detalhada</label>
                            <input 
                                type="text" 
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold text-sm"
                                placeholder="Ex: Folga compensatória referente ao feriado..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={isSyncing}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50
                                ${operation === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                            `}
                        >
                            {isSyncing ? 'GRAVANDO NA NUVEM...' : 'CONFIRMAR AJUSTE AGORA'}
                        </button>
                    </div>

                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={14} /> Histórico de Ajustes
                    </h4>
                    
                    {transactions.length === 0 ? (
                        <div className="text-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
                            <FileText size={40} className="mx-auto mb-2 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Nenhuma justificativa lançada.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[...transactions].reverse().map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-xl ${t.amountMinutes >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {t.amountMinutes >= 0 ? <PlusCircle size={18} /> : <DollarSign size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-tight mb-1">{t.description}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase">
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                <span className={`px-1.5 py-0.5 rounded ${t.type === 'CERTIFICATE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {t.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-mono font-black text-lg tracking-tighter ${t.amountMinutes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.amountMinutes > 0 ? '+' : ''}{formatTime(t.amountMinutes)}
                                        </span>
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            disabled={isSyncing}
                                            className="text-slate-200 hover:text-rose-500 transition-colors p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
