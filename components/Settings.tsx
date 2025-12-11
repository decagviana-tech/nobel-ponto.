
import React, { useState, useEffect } from 'react';
import { getGoogleConfig, saveGoogleConfig, getLocationConfig, saveLocationConfig, LocationConfig, getAllRecords, getEmployees, getBankBalance } from '../services/storageService';
import { readSheetData, readEmployeesFromSheet, syncRowToSheet } from '../services/googleSheetsService';
import { mergeExternalRecords, mergeExternalEmployees } from '../services/storageService';
import { GoogleConfig } from '../types';
import { Save, Database, CheckCircle, Link, Trash2, HelpCircle, Activity, Lock, MapPin, Building2, DownloadCloud, UploadCloud, Code, Copy, X, AlertTriangle } from 'lucide-react';

interface Props {
  onConfigSaved: () => void;
}

const APPS_SCRIPT_CODE = `
// ==========================================
// CÓDIGO OFICIAL - NOBEL PONTO (VERSÃO 2.0)
// ==========================================

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Conexão ativa!' })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getEmployees') {
    let empSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Funcionarios");
    if (!empSheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    // getDisplayValues garante que venha como TEXTO e não objeto de data
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
    // getDisplayValues é o SEGREDO para não vir datas 1899-12-30
    const rows = sheet.getDataRange().getDisplayValues(); 
    const records = [];
    // Pula cabeçalho
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        records.push({
          date: convertBrDateToIso(rows[i][0]), // Converte DD/MM/YYYY para YYYY-MM-DD se necessário
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
  // Se vier 25/11/2025 transforma em 2025-11-25
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return parts[2] + '-' + parts[1] + '-' + parts[0];
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
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function saveOrUpdateRow(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const lastRow = sheet.getLastRow();
  const range = sheet.getDataRange();
  // Usamos getValues aqui para comparar datas corretamente
  const values = range.getValues(); 
  
  let rowIndex = -1;
  
  // Procura linha existente pela Data + ID
  for (let i = 1; i < values.length; i++) {
    const rowDate = formatDate(values[i][0]);
    const rowId = String(values[i][1]);
    
    if (rowDate === data.date && rowId === String(data.employeeId)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    rowIndex = lastRow + 1;
  }
  
  // Garante que a coluna Data (1) e as colunas de Hora (4 a 9) sejam Texto Simples
  // Isso impede o Google de tentar ser esperto e converter para datas malucas
  sheet.getRange(rowIndex, 1).setNumberFormat("@");
  sheet.getRange(rowIndex, 4, 1, 9).setNumberFormat("@");

  const rowData = [
    data.date,
    String(data.employeeId),
    data.employeeName,
    "'" + data.entry,       // O apóstrofo força formato texto no Excel/Google
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
  
  // Força formato texto para ID e PIN
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
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
  } catch(e) {
    return "";
  }
}
`;

export const Settings: React.FC<Props> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<GoogleConfig>({ scriptUrl: '', enabled: false });
  const [locConfig, setLocConfig] = useState<LocationConfig>({ useFixed: false, fixedName: '' });
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const [showScriptCode, setShowScriptCode] = useState(false);

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

          alert("Sincronização Completa!\n\nOs dados da planilha foram baixados e mesclados com os dados locais.");
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

      if (total === 0) {
          alert("Não há registros locais para enviar.");
          return;
      }

      if (!confirm(`Você tem ${total} registros salvos neste aplicativo (Computador).\n\nAtenção: Esta ação enviará todos eles para a planilha, corrigindo datas e cálculos errados lá.\n\nDeseja iniciar o reparo?`)) return;

      setIsPushing(true);
      setPushProgress(0);
      
      try {
          const employees = getEmployees();
          
          // Process one by one to avoid rate limiting and ensure accuracy
          for (let i = 0; i < total; i++) {
              const record = allRecords[i];
              const emp = employees.find(e => e.id === record.employeeId);
              const empName = emp ? emp.name : 'Desconhecido';
              const balance = getBankBalance(record.employeeId);
              
              await syncRowToSheet(config.scriptUrl, record, empName, balance);
              
              // Update progress bar
              setPushProgress(Math.round(((i + 1) / total) * 100));
              
              // Small delay to be gentle on Google API
              await new Promise(r => setTimeout(r, 600));
          }

          alert("✅ Reparo concluído com sucesso!\n\nVerifique sua planilha. As datas devem estar corretas agora.");
      } catch (error) {
          console.error(error);
          alert("Ocorreu um erro durante o envio. Verifique sua conexão e tente novamente.");
      } finally {
          setIsPushing(false);
          setPushProgress(0);
      }
  };

  const handleTestConnection = async () => {
    if (!config.scriptUrl) return;
    setIsTesting(true);
    try {
        const response = await fetch(`${config.scriptUrl}?action=test`);
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('✅ Conexão Bem Sucedida!\n\nO servidor respondeu: ' + data.message);
        } else {
            alert('⚠️ O servidor respondeu, mas com um erro: ' + (data.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error(error);
        alert('❌ Falha na Conexão.\n\nVerifique se:\n1. A URL termina com /exec\n2. Você publicou como "App da Web"\n3. O acesso está definido para "Qualquer pessoa"');
    } finally {
        setIsTesting(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      alert("Código copiado! Cole no Editor de Script do Google.");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-10">
      
      {/* Script Code Modal */}
      {showScriptCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Code size={20} className="text-indigo-600" />
                          Código do Servidor (Apps Script) v2.0
                      </h3>
                      <button onClick={() => setShowScriptCode(false)} className="p-2 hover:bg-slate-200 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 p-0 overflow-hidden relative bg-slate-900">
                      <textarea 
                          className="w-full h-full bg-slate-900 text-slate-300 font-mono text-xs p-4 resize-none outline-none"
                          readOnly
                          value={APPS_SCRIPT_CODE}
                      />
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="text-xs text-slate-500">
                          <p className="font-bold text-rose-600 flex items-center gap-1"><AlertTriangle size={12}/> IMPORTANTE:</p>
                          1. Cole este código em <b>Extensões &gt; Apps Script</b>.<br/>
                          2. Clique em <b>Implantar &gt; Nova Implantação</b>.
                      </div>
                      <button 
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-sm whitespace-nowrap"
                      >
                          <Copy size={16} />
                          Copiar Código
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-end mb-4">
         <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-bold px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
         >
            <Lock size={16} />
            Bloquear Acesso
         </button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        
        {/* SECTION 1: CLOUD CONNECTION */}
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-700">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Conexão com Nuvem</h2>
                        <p className="text-slate-500 text-sm">Integração Google Planilhas</p>
                    </div>
                </div>
                {config.enabled && (
                    <button onClick={handleDisconnect} className="text-rose-500 hover:bg-rose-50 p-2 rounded">
                        <Trash2 size={20} />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
                    <div className="flex gap-3">
                        <Code className="text-indigo-600 shrink-0" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900 mb-1">Passo 1: Código do Servidor</h4>
                            <p className="text-xs text-indigo-700 mb-3">
                                Este código corrige o erro das datas (1899) e formatação.
                            </p>
                            <button 
                                onClick={() => setShowScriptCode(true)}
                                className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                            >
                                Ver Código do Script (Copiar)
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Passo 2: URL do App da Web</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Link className="absolute left-3 top-3.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg pl-10 p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm disabled:opacity-50 disabled:bg-slate-100"
                                value={config.scriptUrl}
                                onChange={e => setConfig({...config, scriptUrl: e.target.value})}
                                placeholder="https://script.google.com/macros/s/..."
                                disabled={isPushing || isPulling}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleTestConnection}
                        disabled={!config.scriptUrl || isTesting || isPushing || isPulling}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-50 text-sm"
                    >
                        <Activity size={16} className={isTesting ? 'animate-spin' : ''} />
                        {isTesting ? 'Testando...' : 'Testar Conexão'}
                    </button>
                </div>

                {config.enabled && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase">Sincronização Manual</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={handleForcePull}
                                disabled={isPulling || isPushing}
                                className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50 border border-slate-200 text-sm"
                            >
                                <DownloadCloud size={18} className={isPulling ? 'animate-bounce' : ''} />
                                {isPulling ? 'Baixando...' : 'Baixar'}
                            </button>

                            <button 
                                onClick={handleForcePush}
                                disabled={isPulling || isPushing}
                                className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm relative overflow-hidden text-sm"
                            >
                                <div className={`absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300`} style={{ width: `${pushProgress}%` }}></div>
                                <div className="relative flex items-center gap-2">
                                    <UploadCloud size={18} className={isPushing ? 'animate-bounce' : ''} />
                                    {isPushing ? `${pushProgress}%` : 'Reparar Planilha'}
                                </div>
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400">
                            Use "Reparar Planilha" para enviar seus dados locais e corrigir as datas na planilha.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* SECTION 2: LOCATION SETTINGS */}
        <div className="pt-6 border-t border-slate-200">
             <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-3 rounded-full text-amber-700">
                    <MapPin size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Localização</h2>
                    <p className="text-slate-500 text-sm">Configuração do ponto físico</p>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <input 
                        type="checkbox"
                        id="useFixed"
                        checked={locConfig.useFixed}
                        onChange={(e) => setLocConfig({...locConfig, useFixed: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="useFixed" className="font-bold text-slate-700 cursor-pointer select-none">
                        Usar Localização Fixa (Recomendado para PC)
                    </label>
                </div>

                {locConfig.useFixed && (
                    <div className="animate-fade-in ml-8">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome da Loja / Local</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                type="text"
                                value={locConfig.fixedName}
                                onChange={(e) => setLocConfig({...locConfig, fixedName: e.target.value})}
                                placeholder="Ex: Nobel Petrópolis - Loja Principal"
                                className="w-full border border-slate-300 rounded-lg pl-10 p-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Isso substitui o GPS impreciso do computador. Todos os pontos registrados neste PC terão este local.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="pt-4">
            <button 
                onClick={handleSave}
                className={`
                    w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg
                    ${status === 'saved' ? 'bg-emerald-500 scale-95' : 'bg-brand-600 hover:bg-brand-700 hover:scale-[1.01]'}
                `}
            >
                {status === 'saved' ? <><CheckCircle size={24} /> Configurações Salvas!</> : <><Save size={24} /> Salvar Tudo</>}
            </button>
        </div>

      </div>
    </div>
  );
};
