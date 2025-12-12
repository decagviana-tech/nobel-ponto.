
import React, { useState, useEffect } from 'react';
import { DailyRecord } from '../types';
import { getRecords, updateRecord } from '../services/storageService';
import { formatTime, normalizeDate } from '../utils';
import { Save, AlertCircle, Calculator, Printer, Filter } from 'lucide-react';

interface Props {
  onUpdate: (record?: DailyRecord) => void;
  employeeId: string;
}

export const SpreadsheetView: React.FC<Props> = ({ onUpdate, employeeId }) => {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DailyRecord | null>(null);
  
  // Filter State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    setRecords(getRecords(employeeId));
  }, [employeeId]);

  const handleEditClick = (record: DailyRecord) => {
    setEditingId(record.date);
    setEditForm({ ...record });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof DailyRecord) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: e.target.value });
  };

  const handleSave = () => {
    if (editForm) {
      const updatedList = updateRecord(editForm);
      setRecords(updatedList);
      
      const processedRecord = updatedList.find(r => r.date === editForm.date && r.employeeId === editForm.employeeId);
      setEditingId(null);
      if (processedRecord) {
          onUpdate(processedRecord);
      }
      setEditForm(null);
    }
  };

  const handlePrint = () => {
      setTimeout(() => {
          window.print();
      }, 100);
  };

  const fields: { key: keyof DailyRecord, label: string, width: string }[] = [
    { key: 'entry', label: 'Entrada', width: 'w-20' },
    { key: 'lunchStart', label: 'Início Almoço', width: 'w-20' },
    { key: 'lunchEnd', label: 'Fim Almoço', width: 'w-20' },
    { key: 'snackStart', label: 'Início Lanche', width: 'w-20' },
    { key: 'snackEnd', label: 'Fim Lanche', width: 'w-20' },
    { key: 'exit', label: 'Saída', width: 'w-20' },
  ];

  // FILTRAGEM ROBUSTA DE DATAS
  const filteredRecords = records.filter(r => {
      // 1. Normaliza a data para YYYY-MM-DD
      const isoDate = normalizeDate(r.date);
      // 2. Cria objeto Date seguro (adiciona T00:00:00 para evitar fuso horário -1 dia)
      const d = new Date(isoDate + 'T00:00:00');
      
      // Verifica se a data é válida antes de filtrar
      if (isNaN(d.getTime())) return false;

      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Ordena por data (decrescente ou crescente)
  filteredRecords.sort((a, b) => {
      return new Date(normalizeDate(a.date)).getTime() - new Date(normalizeDate(b.date)).getTime();
  });

  const totalWorkedAll = filteredRecords.reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
  const totalBalanceAll = filteredRecords.reduce((acc, r) => acc + (r.balanceMinutes || 0), 0);

  const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full print:shadow-none print:border-none print:h-auto print:overflow-visible print:block">
      
      {/* HEADER DE AÇÕES */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <Filter size={16} className="text-slate-400 ml-2" />
                <select 
                    className="bg-transparent text-sm font-medium text-slate-700 p-1 outline-none"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select 
                    className="bg-transparent text-sm font-medium text-slate-700 p-1 outline-none border-l border-slate-100 pl-2"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
        </div>

        <div className="flex items-center gap-3">
             <div className="text-xs text-slate-500 flex items-center gap-1 mr-4">
                <AlertCircle size={12} />
                Clique na linha para corrigir
            </div>
            <button 
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
            >
                <Printer size={16} />
                Imprimir Relatório
            </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div id="printable-content" className="flex flex-col h-full">
        <div className="hidden print:block p-6 border-b border-slate-200 mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Ponto - Nobel Petrópolis</h1>
            <p className="text-slate-600">Competência: <span className="font-bold uppercase">{months[selectedMonth]} / {selectedYear}</span></p>
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-600 print:text-xs">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 shadow-sm z-10 print:static print:shadow-none">
                <tr>
                <th className="px-4 py-3 bg-slate-100 print:bg-white print:border-b">Data</th>
                {fields.map(f => (
                    <th key={f.key} className="px-2 py-3 bg-slate-100 text-center print:bg-white print:border-b">{f.label}</th>
                ))}
                <th className="px-4 py-3 text-right bg-slate-100 print:bg-white print:border-b">Trabalhado</th>
                <th className="px-4 py-3 text-right bg-slate-100 print:bg-white print:border-b">Saldo</th>
                <th className="px-4 py-3 text-center bg-slate-100 print:hidden">Editar</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {filteredRecords.length === 0 && (
                    <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">Nenhum registro encontrado para {months[selectedMonth]}/{selectedYear}.</td>
                    </tr>
                )}
                {filteredRecords.map((record) => {
                const isEditing = editingId === record.date;
                const isoDate = normalizeDate(record.date);
                
                return (
                    <tr key={record.date} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-blue-50' : ''} print:hover:bg-white`}>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-slate-800">
                        {/* Exibe formatado em BR, mas usa o ISO para criar o objeto */}
                        {new Date(isoDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    
                    {fields.map(f => (
                        <td key={f.key} className="px-2 py-2 text-center">
                        {isEditing ? (
                            <input
                            type="time"
                            value={editForm ? String(editForm[f.key]) : ''}
                            onChange={(e) => handleInputChange(e, f.key)}
                            className={`bg-white border border-slate-300 text-slate-900 text-xs rounded focus:ring-blue-500 focus:border-blue-500 block p-1 w-full text-center`}
                            />
                        ) : (
                            <span className={`block ${!record[f.key] ? 'text-slate-300 font-light' : 'font-mono'}`}>
                                {record[f.key] || '--:--'}
                            </span>
                        )}
                        </td>
                    ))}

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                        {formatTime(isEditing && editForm ? editForm.totalMinutes : record.totalMinutes)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${(isEditing && editForm ? editForm.balanceMinutes : record.balanceMinutes) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatTime(isEditing && editForm ? editForm.balanceMinutes : record.balanceMinutes)}
                    </td>
                    
                    <td className="px-4 py-3 text-center print:hidden">
                        {isEditing ? (
                        <button 
                            onClick={handleSave}
                            className="text-white bg-blue-600 hover:bg-blue-700 rounded p-1.5 transition-colors shadow-sm"
                            title="Salvar Alterações"
                        >
                            <Save size={16} />
                        </button>
                        ) : (
                        <button 
                            onClick={() => handleEditClick(record)}
                            className="text-slate-400 hover:text-blue-600 p-1.5 transition-colors"
                            title="Editar Registro"
                        >
                            <div className="text-xs font-bold border border-slate-200 rounded px-2 py-1 hover:bg-white">Editar</div>
                        </button>
                        )}
                    </td>
                    </tr>
                );
                })}
            </tbody>
            
            {/* Footer with Totals */}
            {filteredRecords.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] print:static print:bg-white print:shadow-none print:border-slate-800">
                    <tr>
                        <td className="px-4 py-4 font-black text-slate-700 uppercase text-xs" colSpan={1 + fields.length}>
                            Totais de {months[selectedMonth]}
                        </td>
                        <td className="px-4 py-4 text-right font-black font-mono text-slate-800 text-sm">
                            {formatTime(totalWorkedAll)}
                        </td>
                        <td className={`px-4 py-4 text-right font-black font-mono text-sm ${totalBalanceAll >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {totalBalanceAll > 0 ? '+' : ''}{formatTime(totalBalanceAll)}
                        </td>
                        <td className="print:hidden"></td>
                    </tr>
                </tfoot>
            )}
            </table>
        </div>
      </div>
    </div>
  );
};
