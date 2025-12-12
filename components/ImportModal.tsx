
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const parseData = () => {
    if (!selectedEmployeeId) {
        alert("Por favor, selecione para qual funcionário esses dados pertencem.");
        return;
    }

    const lines = inputText.split(/\r?\n/).filter(line => line.trim() !== '');
    const parsedRecords: DailyRecord[] = [];

    lines.forEach(line => {
        // Tenta separar por Tabulação (Excel padrão) ou Ponto e Vírgula
        let parts = line.includes('\t') ? line.split('\t') : line.split(';');
        
        // Remove espaços extras
        parts = parts.map(p => p.trim());

        // Se a linha for muito curta, ignora (provavelmente lixo)
        if (parts.length < 2) return;

        // Pega a data (assume que é a primeira coluna)
        const rawDate = parts[0];
        const fixedDate = normalizeDate(rawDate);

        // Se não conseguiu identificar uma data válida (YYYY-MM-DD), ignora
        if (!fixedDate || fixedDate.length !== 10) return;

        // Mapeamento Flexível:
        // Coluna 0: Data
        // Coluna 1: Entrada
        // Coluna 2: Início Almoço
        // Coluna 3: Fim Almoço
        // Coluna 4: Início Lanche (Opcional)
        // Coluna 5: Fim Lanche (Opcional)
        // Coluna 6: Saída

        // Lógica para lidar com colunas vazias no meio
        const entry = normalizeTimeFromSheet(parts[1]);
        const lunchStart = normalizeTimeFromSheet(parts[2]);
        const lunchEnd = normalizeTimeFromSheet(parts[3]);
        
        // Detecção inteligente para Lanche vs Saída
        // Se tivermos 5 colunas de horário preenchidas (Entrada, AlmoçoIda, AlmoçoVolta, LancheIda, LancheVolta, Saida)
        
        let snackStart = '';
        let snackEnd = '';
        let exit = '';

        if (parts.length >= 7) {
            // Formato Completo
            snackStart = normalizeTimeFromSheet(parts[4]);
            snackEnd = normalizeTimeFromSheet(parts[5]);
            exit = normalizeTimeFromSheet(parts[6]);
        } else if (parts.length >= 5) {
            // Formato Sem Lanche (Data, Ent, AlmI, AlmV, Sai)
            // Se as colunas 4 e 5 estiverem vazias ou não existirem, assume que a 4ª hora válida é a saída
            const p4 = normalizeTimeFromSheet(parts[4]);
            const p5 = normalizeTimeFromSheet(parts[5]);
            
            if (p4 && !p5) {
                 // Tem algo na coluna 4 mas nada na 5 -> Provavelmente é a SAÍDA deslocada
                 exit = p4;
            } else {
                 snackStart = p4;
                 snackEnd = p5;
                 if (parts[6]) exit = normalizeTimeFromSheet(parts[6]);
            }
        }

        // Se a saída ainda estiver vazia, tenta pegar a última coluna válida que seja hora
        if (!exit) {
            for (let i = parts.length - 1; i > 3; i--) {
                const val = normalizeTimeFromSheet(parts[i]);
                if (val) {
                    exit = val;
                    break;
                }
            }
            // Garante que não sobrescreveu o lanche se ele foi definido explicitamente
            if (exit === snackEnd) snackEnd = '';
            if (exit === snackStart) snackStart = '';
        }

        parsedRecords.push({
            date: fixedDate,
            employeeId: selectedEmployeeId,
            entry,
            lunchStart,
            lunchEnd,
            snackStart,
            snackEnd,
            exit,
            totalMinutes: 0, // Será recalculado ao salvar
            balanceMinutes: 0
        });
    });

    if (parsedRecords.length === 0) {
        alert("Não conseguimos identificar nenhuma data válida. Verifique se copiou a coluna de Datas corretamente.");
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
                    <h3 className="text-lg font-bold text-slate-800">Importar Backup Externo</h3>
                    <p className="text-xs text-slate-500">Recupere dados de outras planilhas</p>
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
                            <p className="font-bold mb-1">Como usar:</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Abra sua planilha antiga (Excel, Google Sheets).</li>
                                <li>Selecione as colunas na ordem: <b>Data, Entrada, Início Almoço, Fim Almoço, Início Lanche, Fim Lanche, Saída</b>.</li>
                                <li>Copie (Ctrl+C) as linhas desejadas.</li>
                                <li>Cole (Ctrl+V) na caixa abaixo.</li>
                            </ol>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">1. Selecione o Funcionário</label>
                        <select 
                            className="w-full p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">2. Cole os dados aqui</label>
                        <textarea 
                            className="w-full h-64 p-4 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder={`Exemplo:\n09/12/2025\t08:00\t12:00\t13:00\t\t\t18:00\n10/12/2025\t08:05\t12:10\t13:10\t\t\t18:05`}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                         <h4 className="font-bold text-slate-700">Pré-visualização ({previewData.length} registros encontrados)</h4>
                         <button 
                            onClick={() => setStep('input')}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Voltar e Editar
                        </button>
                    </div>
                    
                    <div className="border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 font-bold text-slate-600 uppercase sticky top-0">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Entrada</th>
                                    <th className="p-3">Almoço (Início)</th>
                                    <th className="p-3">Almoço (Fim)</th>
                                    <th className="p-3">Lanche (Início)</th>
                                    <th className="p-3">Lanche (Fim)</th>
                                    <th className="p-3">Saída</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-800">
                                            {row.date.split('-').reverse().join('/')}
                                        </td>
                                        <td className="p-3">{row.entry || '-'}</td>
                                        <td className="p-3">{row.lunchStart || '-'}</td>
                                        <td className="p-3">{row.lunchEnd || '-'}</td>
                                        <td className="p-3">{row.snackStart || '-'}</td>
                                        <td className="p-3">{row.snackEnd || '-'}</td>
                                        <td className="p-3 font-bold">{row.exit || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Isso irá mesclar esses dados com o que já existe no app. Datas iguais serão atualizadas.
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
             {step === 'input' ? (
                 <button 
                    onClick={parseData}
                    disabled={!inputText || !selectedEmployeeId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                    Processar Dados
                 </button>
             ) : (
                 <button 
                    onClick={handleConfirmImport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors"
                 >
                    <CheckCircle2 size={18} />
                    Confirmar Importação
                 </button>
             )}
        </div>

      </div>
    </div>
  );
};
