import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig, LocationConfig, getAllRecords, getEmployees, getBankBalance } from '../services/storageService';
import { readSheetData, readEmployeesFromSheet, syncRowToSheet } from '../services/googleSheetsService';
import { mergeExternalRecords, mergeExternalEmployees } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, CheckCircle, Link, Trash2, HelpCircle, Activity, Lock, MapPin, Building2, DownloadCloud, UploadCloud, Code, Copy, X, AlertTriangle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { ImportModal } from './ImportModal';

const CURRENT_SCRIPT_VERSION = '2.5';

const APPS_SCRIPT_CODE = `
// ==========================================
// CÓDIGO OFICIAL - NOBEL PONTO (VERSÃO ${CURRENT_SCRIPT_VERSION})
// ==========================================

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Conexão ativa!',
      version: '${CURRENT_SCRIPT_VERSION}'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getEmployees') {
    let empSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Funcionarios");
    if (!empSheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    const rows = empSheet.getDataRange().getDisplayValues();
    const employees = [];
    for (let i = 1; i < rows.length; i++) {
       if(rows[i][0]) {
         employees.push({
           id: String(rows[i][0]),
           name: rows[i][1],
           role: rows[i][2],
           pin: String(rows[i][3] || ''),
           active: rows[i][4] === "TRUE" || rows[i][4] === "true" || rows[i][4] === true
         });
       }
    }
    return ContentService.createTextOutput(JSON.stringify(employees)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getRecords') {
    const rows = sheet.getDataRange().getDisplayValues(); 
    const records = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        records.push({
          date: convertBrDateToIso(rows[i][0]),
          employeeId: String(rows[i][1]),
          entry: cleanTime(rows[i][3]),
          lunchStart: cleanTime(rows[i][4]),
          lunchEnd: cleanTime(rows[i][5]),
          snackStart: cleanTime(rows[i][6]),
          snackEnd: cleanTime(rows[i][7]),
          exit: cleanTime(rows[i][8]),
          totalMinutes: 0, 
          balanceMinutes: 0 
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(records)).setMimeType(ContentService.MimeType.JSON);
  }
}

function cleanTime(val) {
  if (!val) return "";
  return String(val).trim();
}

function convertBrDateToIso(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parts[0].length === 1 ? "0" + parts[0] : parts[0];
      const m = parts[1].length === 1 ? "0" + parts[1] : parts[1];
      const y = parts[2];
      if (y.length === 4) return y + '-' + m + '-' + d;
    }
  }
  return dateStr;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const data = json.data;
    
    if (action === 'syncRow') {
       saveOrUpdateRow(data);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'syncEmployee') {
       saveOrUpdateEmployee(data);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteRecords') {
       deleteEmployeeRecords(data.employeeId);
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function deleteEmployeeRecords(employeeId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const rows = sheet.getDataRange().getValues();
  const idToClean = String(employeeId);
  
  // Deletar de baixo para cima para não quebrar os índices
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === idToClean) {
      sheet.deleteRow(i + 1);
    }
  }
}

function saveOrUpdateRow(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const lastRow = sheet.getLastRow();
  const range = sheet.getDataRange();
  const values = range.getValues(); 
  
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const rawSheetDate = formatDate(values[i][0]);
    const isoSheetDate = convertBrDateToIso(rawSheetDate);
    const rowId = String(values[i][1]);
    
    if (isoSheetDate === data.date && rowId === String(data.employeeId)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) rowIndex = lastRow + 1;
  
  const textFormat = "@";
  sheet.getRange(rowIndex, 1).setNumberFormat(textFormat);
  sheet.getRange(rowIndex, 2).setNumberFormat(textFormat);
  sheet.getRange(rowIndex, 4, 1, 6).setNumberFormat(textFormat);

  const rowData = [
    data.date,
    String(data.employeeId),
    data.employeeName,
    "'" + data.entry,
    "'" + data.lunchStart,
    "'" + data.lunchEnd,
    "'" + data.snackStart,
    "'" + data.snackEnd,
    "'" + data.exit,
    data.totalFormatted,   
    data.balanceFormatted, 
    data.currentTotalBalance 
  ];
  
  const targetRange = sheet.getRange(rowIndex, 1, 1, rowData.length);
  targetRange.setValues([rowData]);
}

function saveOrUpdateEmployee(data) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Funcionarios");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Funcionarios");
    sheet.appendRow(["ID", "Nome", "Cargo", "PIN", "Ativo"]);
  }
  
  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
     if (String(values[i][0]) === String(data.id)) {
       rowIndex = i + 1;
       break;
     }
  }
  
  if (rowIndex === -1) rowIndex = sheet.getLastRow() + 1;
  
  sheet.getRange(rowIndex, 1).setNumberFormat("@"); 
  sheet.getRange(rowIndex, 4).setNumberFormat("@");

  sheet.getRange(rowIndex, 1, 1, 5).setValues([[
    String(data.id),
    data.name,
    data.role,
    String(data.pin),
    data.active
  ]]);
}

function formatDate(dateObj) {
  if (!dateObj) return "";
  if (typeof dateObj === 'string') return dateObj;
  try {
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
  } catch(e) {
    return "";
  }
}
`;

// Define Props interface for the Settings component
interface Props {
  onConfigSaved: () => void;
}

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [locConfig, setLocConfig] = useState<LocationConfig>({ useFixed: false, fixedName: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    setConfig(getGoogleConfig());
    setLocConfig(getLocationConfig());
  }, []);

  const handleSave = () => {
    const cleanUrl = config.scriptUrl.trim();
    if (config.scriptUrl && !cleanUrl.includes('script.google.com')) {
        alert('A URL parece inválida. Ela deve começar com https://script.google.com...');
        return;
    }
    
    saveLocationConfig(locConfig);
    const newConfig = { scriptUrl: cleanUrl, enabled: !!cleanUrl };
    saveGoogleConfig(newConfig);
    setConfig(newConfig);
    setStatus('saved');
    onConfigSaved();
    setTimeout(() => setStatus('idle'), 2000);
  };

  const handleDisconnect = () => {
      if (confirm("Deseja desconectar a planilha?")) {
          const empty = { scriptUrl: '', enabled: false };
          saveGoogleConfig(empty);
          setConfig(empty);
          onConfigSaved();
      }
  }

  const handleForcePull = async () => {
      if (!config.scriptUrl) return;
      setIsPulling(true);
      try {
          const sheetEmployees = await readEmployeesFromSheet(config.scriptUrl);
          if (sheetEmployees) mergeExternalEmployees(sheetEmployees);
          const sheetRecords = await readSheetData(config.scriptUrl);
          if (sheetRecords) mergeExternalRecords(sheetRecords);
          alert("Sincronização Completa!\n\nOs dados da planilha foram baixados e mesclados.");
          onConfigSaved();
      } catch (error) {
          alert("Erro ao baixar dados. Verifique sua conexão.");
          console.error(error);
      } finally {
          setIsPulling(false);
      }
  };

  const handleForcePush = async () => {
      if (!config.scriptUrl) return;
      const allRecords = getAllRecords();
      const total = allRecords.length;
      if (total === 0) { alert("Não há registros locais para enviar."); return; }
      if (!confirm(`Você está prestes a enviar ${total} registros para a Planilha Google. Continuar?`)) return;
      setIsPushing(true);
      setPushProgress(0);
      try {
          const employees = getEmployees();
          for (let i = 0; i < total; i++) {
              const record = allRecords[i];
              const emp = employees.find(e => e.id === record.employeeId);
              const empName = emp ? emp.name : 'Desconhecido';
              const balance = getBankBalance(record.employeeId);
              await syncRowToSheet(config.scriptUrl, record, empName, balance);
              setPushProgress(Math.round(((i + 1) / total) * 100));
              await new Promise(r => setTimeout(r, 400));
          }
          alert("✅ Enviado com Sucesso!");
      } catch (error) {
          console.error(error);
          alert("Erro durante o envio.");
      } finally { setIsPushing(false); setPushProgress(0); }
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl) return;
    setIsTesting(true);
    try {
        const response = await fetch(`${config.scriptUrl}?action=test`);
        const data = await response.json();
        if (data.status === 'success') {
            if (data.version !== CURRENT_SCRIPT_VERSION) {
                alert(`⚠️ SCRIPT DESATUALIZADO (v${data.version})\n\nO App requer v${CURRENT_SCRIPT_VERSION}. Por favor, copie o novo código.`);
                setShowScriptCode(true);
            } else {
                alert('✅ Conexão Ativa! Versão ' + data.version);
            }
        }
    } catch (error) {
        alert('❌ Falha na Conexão.');
    } finally { setIsTesting(false); }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      alert("Código v2.5 copiado!");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onSuccess={() => onConfigSaved()} />}

      {showScriptCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Code size={20} className="text-indigo-600" />
                          Código do Servidor v{CURRENT_SCRIPT_VERSION}
                      </h3>
                      <button onClick={() => setShowScriptCode(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="flex-1 p-0 overflow-hidden relative bg-slate-900">
                      <textarea className="w-full h-full bg-slate-900 text-slate-300 font-mono text-xs p-4 resize-none outline-none" readOnly value={APPS_SCRIPT_CODE} />
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="text-xs text-slate-500">
                          <p className="font-bold text-rose-600 flex items-center gap-1"><AlertTriangle size={12}/> IMPORTANTE:</p>
                          Atualize o código para habilitar o comando de LIMPEZA REMOTA.
                      </div>
                      <button onClick={copyToClipboard} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-sm whitespace-nowrap">
                          <Copy size={16} /> Copiar Versão {CURRENT_SCRIPT_VERSION}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-700"><Database size={24} /></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Conexão com Nuvem</h2>
                        <p className="text-slate-500 text-sm">Versão atual: {CURRENT_SCRIPT_VERSION}</p>
                    </div>
                </div>
                {config.enabled && <button onClick={handleDisconnect} className="text-rose-500 p-2 hover:bg-rose-50 rounded"><Trash2 size={20} /></button>}
            </div>

            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <p className="text-xs text-amber-800 font-bold mb-2 flex items-center gap-1"><AlertTriangle size={14}/> Sincronização e Erros:</p>
                    <p className="text-[11px] text-amber-700">Se o saldo do Douglas ou qualquer outro colaborador estiver errado, clique em <b>"Ver Código"</b>, atualize sua planilha e depois use o botão de reset no dashboard.</p>
                </div>
                
                <button onClick={() => setShowScriptCode(true)} className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl border border-indigo-100 font-bold flex items-center justify-center gap-2">
                    <Code size={18} /> Ver Código do Script (v{CURRENT_SCRIPT_VERSION})
                </button>

                <input type="text" className="w-full border border-slate-300 rounded-lg p-3 font-mono text-sm" value={config.scriptUrl} onChange={e => setConfig({...config, scriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." />
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleTestConnection} className="bg-slate-100 text-slate-700 py-2 rounded-lg font-bold text-sm border">Testar Conexão</button>
                    <button onClick={handleForcePull} className="bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm">Baixar Agora</button>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t">
            <button onClick={handleSave} className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-700">
                {status === 'saved' ? 'Configurações Salvas!' : 'Salvar Configurações'}
            </button>
        </div>
      </div>
    </div>
  );
};
