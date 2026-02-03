
import React, { useState } from 'react';
import { X, Upload, AlertTriangle, FileSpreadsheet, CheckCircle2, HelpCircle } from 'lucide-react';
import { DailyRecord, Employee } from '../types';
import { getEmployees, mergeExternalRecords } from '../services/storageService';
import { normalizeDate, normalizeTimeFromSheet } from '../utils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [inputText, setInputText] = useState('');
  const [previewData, setPreviewData] = useState<DailyRecord[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const employees = getEmployees();

  const parseData = () => {
    const lines = inputText.split(/\r?\n/).filter(line => line.trim() !== '');
    const parsedRecords: DailyRecord[] = [];

    lines.forEach(line => {
        let parts = line.includes('\t') ? line.split('\t') : line.split(';');
        parts = parts.map(p => p.trim());

        if (parts.length < 4) return; // Precisa de pelo menos Data, ID e Nome para ser válida

        const rawDate = parts[0];
        const fixedDate = normalizeDate(rawDate);
        if (!fixedDate || fixedDate.length !== 10) return;

        // Formato específico detectado: 
        // 0:Data | 1:ID | 2:Nome | 3:Entrada | 4:AlmIni | 5:AlmFim | 6:LanIni | 7:LanFim | 8:Saída
        const employeeId = String(parts[1]);
        
        // Verifica se o funcionário existe localmente, se não, ignora ou cria (aqui vamos só processar se o ID bater com algum existente)
        const empExists = employees.find(e => String(e.id) === employeeId);
        if (!empExists) return;

        const entry = normalizeTimeFromSheet(parts[3]);
        const lunchStart = normalizeTimeFromSheet(parts[4]);
        const lunchEnd = normalizeTimeFromSheet(parts[5]);
        const snackStart = normalizeTimeFromSheet(parts[6]);
        const snackEnd = normalizeTimeFromSheet(parts[7]);
        const exit = normalizeTimeFromSheet(parts[8]);

        if (entry || exit || lunchStart) {
            parsedRecords.push({
                date: fixedDate,
                employeeId,
                entry,
                lunchStart,
                lunchEnd,
                snackStart,
                snackEnd,
                exit,
                totalMinutes: 0,
                balanceMinutes: 0
            });
        }
    });

    if (parsedRecords.length === 0) {
        alert("Não conseguimos identificar dados válidos para os funcionários cadastrados.");
        return;
    }

    setPreviewData(parsedRecords);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    if (previewData.length > 0) {
        mergeExternalRecords(previewData);
        onSuccess();
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                    <FileSpreadsheet size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Importar Dados de Janeiro</h3>
                    <p className="text-xs text-slate-500">Cole a lista de batidas para processar</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                <X size={20} className="text-slate-500" />
             </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            {step === 'input' ? (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 flex gap-3">
                        <HelpCircle size={24} className="shrink-0" />
                        <div>
                            <p className="font-bold mb-1">Dica de Importação:</p>
                            <p>Copie a tabela do Excel ou Google Sheets incluindo as colunas de <b>Data, ID e Nome</b> antes dos horários.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Cole os dados aqui</label>
                        <textarea 
                            className="w-full h-80 p-4 border border-slate-300 rounded-xl font-mono text-[10px] focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Data	ID	Funcionário	Entrada	Almoço..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                         <h4 className="font-bold text-slate-700">Registros Identificados ({previewData.length})</h4>
                         <button onClick={() => setStep('input')} className="text-sm text-blue-600 hover:underline">Voltar e Ajustar</button>
                    </div>
                    
                    <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto text-[10px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-2">Data</th>
                                    <th className="p-2">ID</th>
                                    <th className="p-2">Entrada</th>
                                    <th className="p-2">Almoço</th>
                                    <th className="p-2">Saída</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-2 font-bold">{row.date}</td>
                                        <td className="p-2">{row.employeeId}</td>
                                        <td className="p-2">{row.entry || '-'}</td>
                                        <td className="p-2">{row.lunchStart || '-'} a {row.lunchEnd || '-'}</td>
                                        <td className="p-2 font-bold">{row.exit || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
             {step === 'input' ? (
                 <button onClick={parseData} disabled={!inputText} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors">
                    Analisar Lista
                 </button>
             ) : (
                 <button onClick={handleConfirmImport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors">
                    <CheckCircle2 size={18} /> Confirmar Carga de Dados
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};
