
import React, { useState, useEffect } from 'react';
import { BankTransaction, TransactionType } from '../types';
import { addTransaction, getTransactions, deleteTransaction } from '../services/storageService';
import { formatTime } from '../utils';
import { PlusCircle, Trash2, Calendar, FileText, DollarSign, Clock, AlertTriangle, X } from 'lucide-react';

interface Props {
    employeeId: string;
    onUpdate: () => void;
    onClose: () => void;
}

export const BankManagement: React.FC<Props> = ({ employeeId, onUpdate, onClose }) => {
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    
    // Form
    const [type, setType] = useState<TransactionType>('ADJUSTMENT');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [operation, setOperation] = useState<'CREDIT' | 'DEBIT'>('CREDIT'); // Credit adds to bank, Debit removes
    const [description, setDescription] = useState('');

    useEffect(() => {
        loadData();
    }, [employeeId]);

    const loadData = () => {
        setTransactions(getTransactions(employeeId));
    };

    const handleSave = () => {
        if (!hours && !minutes) return;
        if (!description) {
            alert("Por favor, adicione uma descrição.");
            return;
        }

        const h = parseInt(hours || '0');
        const m = parseInt(minutes || '0');
        const totalMinutes = (h * 60) + m;

        if (totalMinutes === 0) return;

        const finalAmount = operation === 'CREDIT' ? totalMinutes : -totalMinutes;

        addTransaction({
            employeeId,
            date,
            type,
            amountMinutes: finalAmount,
            description
        });

        // Reset form
        setHours('');
        setMinutes('');
        setDescription('');
        loadData();
        onUpdate();
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este lançamento?')) {
            deleteTransaction(id);
            loadData();
            onUpdate();
        }
    };

    // Auto-configure operation based on type
    useEffect(() => {
        if (type === 'PAYMENT') setOperation('DEBIT');
        if (type === 'CERTIFICATE') setOperation('CREDIT');
        if (type === 'BONUS') setOperation('CREDIT');
    }, [type]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-brand-600" />
                        Gerenciar Banco de Horas
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    
                    {/* Form Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Novo Lançamento</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Lançamento</label>
                                <select 
                                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as TransactionType)}
                                >
                                    <option value="ADJUSTMENT">Ajuste Manual / Erro</option>
                                    <option value="CERTIFICATE">Atestado Médico (Abono)</option>
                                    <option value="PAYMENT">Pagamento de Horas Extras</option>
                                    <option value="BONUS">Bônus / Prêmio</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Data de Referência</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Operação</label>
                                <div className="flex gap-1 p-1 bg-white border border-slate-300 rounded-lg">
                                    <button 
                                        onClick={() => setOperation('CREDIT')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors
                                            ${operation === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}
                                        `}
                                    >
                                        <PlusCircle size={12} /> Crédito
                                    </button>
                                    <button 
                                        onClick={() => setOperation('DEBIT')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors
                                            ${operation === 'DEBIT' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}
                                        `}
                                    >
                                        <DollarSign size={12} /> Débito
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Quantidade de Horas</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        placeholder="00"
                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-center text-slate-900 font-bold"
                                        value={hours}
                                        onChange={(e) => setHours(e.target.value)}
                                    />
                                    <span className="font-bold text-slate-400">:</span>
                                    <input 
                                        type="number" 
                                        placeholder="00"
                                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-center text-slate-900 font-bold"
                                        value={minutes}
                                        onChange={(e) => setMinutes(e.target.value)}
                                    />
                                    <span className="text-xs text-slate-400 ml-1">horas</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Motivo / Descrição</label>
                            <input 
                                type="text" 
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-bold"
                                placeholder="Ex: Pagamento referente a Março; Atestado dia 12..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleSave}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-sm transition-transform active:scale-95
                                ${operation === 'CREDIT' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}
                            `}
                        >
                            Confirmar Lançamento
                        </button>
                    </div>

                    {/* History List */}
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Clock size={16} /> Histórico de Lançamentos
                    </h4>
                    
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Nenhum ajuste manual registrado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-full mt-1 ${t.amountMinutes >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {t.type === 'PAYMENT' ? <DollarSign size={16} /> : 
                                             t.type === 'CERTIFICATE' ? <FileText size={16} /> : <AlertTriangle size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{t.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <Calendar size={10} />
                                                <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono uppercase text-[10px]">
                                                    {t.type === 'PAYMENT' ? 'PAGAMENTO' : 
                                                     t.type === 'CERTIFICATE' ? 'ATESTADO' : 'AJUSTE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-mono font-bold ${t.amountMinutes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.amountMinutes > 0 ? '+' : ''}{formatTime(t.amountMinutes)}
                                        </span>
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                            title="Excluir Lançamento"
                                        >
                                            <Trash2 size={16} />
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
