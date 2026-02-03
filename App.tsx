
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ViewMode, Employee, DailyRecord } from './types.ts';

// Componentes na raiz (estrutura plana)
import { TimeClock } from './TimeClock.tsx';
import { SpreadsheetView } from './SpreadsheetView.tsx';
import { BankDashboard } from './BankDashboard.tsx';
import { AIAssistant } from './AIAssistant.tsx';
import { EmployeeManager } from './EmployeeManager.tsx';
import { Settings } from './Settings.tsx';
import { PinModal } from './PinModal.tsx';

// Serviços na raiz
import { 
  getEmployees, 
  getGoogleConfig, 
  saveGoogleConfig, 
  mergeExternalRecords, 
  mergeExternalEmployees, 
  mergeExternalTransactions, 
  getBankBalance 
} from './storageService.ts';
import { 
  readSheetData, 
  readEmployeesFromSheet, 
  readTransactionsFromSheet,
  syncRowToSheet
} from './googleSheetsService.ts';

import { 
  Clock, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Bot, 
  Menu, 
  ChevronDown, 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Loader2,
  Lock,
  CloudLightning,
  RefreshCcw
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.CLOCK);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const syncLockRef = useRef<number>(0); 

  const refreshData = useCallback(() => {
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);
    setCurrentEmployeeId(prev => (!prev && loadedEmployees.length > 0) ? loadedEmployees[0].id : prev);
    setRefreshKey(prev => prev + 1);
  }, []);

  const performSync = useCallback(async (silent: boolean = false, force: boolean = false) => {
    if (Date.now() < syncLockRef.current && !force) return;
    const config = getGoogleConfig();
    if (!config.enabled || !config.scriptUrl || !window.navigator.onLine) return;
    if (!silent) setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        readEmployeesFromSheet(config.scriptUrl),
        readSheetData(config.scriptUrl),
        readTransactionsFromSheet(config.scriptUrl)
      ]);
      const sheetEmployees = results[0].status === 'fulfilled' ? (results[0] as any).value : null;
      const sheetData = results[1].status === 'fulfilled' ? (results[1] as any).value : null;
      const sheetTransactions = results[2].status === 'fulfilled' ? (results[2] as any).value : null;
      
      if (sheetEmployees) mergeExternalEmployees(sheetEmployees);
      if (sheetData) mergeExternalRecords(sheetData);
      if (sheetTransactions) mergeExternalTransactions(sheetTransactions);
      
      refreshData();
    } catch (e) {
      console.warn("Sincronização pendente.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const loaded = getEmployees();
        setEmployees(loaded);
        if (loaded && loaded.length > 0) {
          setCurrentEmployeeId(loaded[0].id);
        } else {
          setCurrentView(ViewMode.SETTINGS);
        }
        await performSync(true);
      } catch (err) {
        console.error("Erro na inicialização:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, [performSync]);

  const handleRecordUpdate = async (record: DailyRecord) => {
    refreshData(); 
    const config = getGoogleConfig();
    if (config.enabled && config.scriptUrl) {
      try {
        setIsSyncing(true);
        const emp = employees.find(e => String(e.id) === String(record.employeeId));
        const balance = getBankBalance(record.employeeId);
        await syncRowToSheet(config.scriptUrl, record, emp?.name || 'Desconhecido', balance, { shortDay: emp?.shortDayOfWeek, dailyMinutes: emp?.standardDailyMinutes });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const currentEmployee = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    return employees.find(e => String(e.id) === String(currentEmployeeId)) || employees[0];
  }, [employees, currentEmployeeId]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <Loader2 size={48} className="animate-spin text-brand-500 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tighter">Nobel Ponto Inteligente</h1>
        <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.3em] animate-pulse">Iniciando Nobel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white">
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
            setIsPinModalOpen(false);
            if (pendingEmployeeId) setCurrentEmployeeId(pendingEmployeeId);
            if (pendingView) setCurrentView(pendingView);
            setPendingEmployeeId(null);
            setPendingView(null);
        }}
        correctPin="9999"
        targetName="Acesso Gerente"
      />

      <div className="md:hidden bg-white p-3 border-b flex justify-between items-center sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex items-center gap-2 font-bold text-brand-600">
          <Building2 size={18} />
          <span className="tracking-tighter uppercase font-black text-sm">Nobel Petrópolis</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600"><Menu size={24} /></button>
      </div>

      <div className={`fixed inset-0 z-30 bg-white md:relative md:flex flex-col w-full md:w-64 border-r p-4 h-screen transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
        <div className="hidden md:flex items-center gap-3 px-4 mb-6">
          <div className="bg-brand-600 p-2 rounded-lg shadow-lg"><Building2 className="text-white" size={24} /></div>
          <h1 className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tighter">Nobel Ponto</h1>
        </div>

        {employees.length > 0 && (
            <div className="mb-6 px-2 relative">
                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full rounded-xl p-3 flex items-center justify-between border bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden text-left">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold uppercase shrink-0 ${currentEmployee?.role.toLowerCase().includes('gerente') ? 'bg-slate-900' : 'bg-brand-500'}`}>
                            {currentEmployee?.name?.charAt(0) || '?'}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-black truncate text-slate-900 leading-none mb-1">{currentEmployee?.name || 'Selecione'}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                {currentEmployee?.role || 'Aguardando'}
                            </p>
                        </div>
                    </div>
                    <ChevronDown size={16} className={`transition-transform shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUserMenuOpen && (
                    <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-xl shadow-2xl border z-50 p-2 max-h-60 overflow-auto">
                    {employees.map(emp => (
                        <button key={emp.id} onClick={() => { setCurrentEmployeeId(emp.id); setIsUserMenuOpen(false); setCurrentView(ViewMode.CLOCK); }} className={`w-full text-left p-3 rounded-lg text-xs mb-1 transition-all flex items-center justify-between ${String(currentEmployeeId) === String(emp.id) ? 'bg-brand-5 text-brand-700 font-black' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}>
                            <span>{emp.name}</span>
                        </button>
                    ))}
                    </div>
                )}
            </div>
        )}

        <nav className="space-y-1 flex-1">
          <button onClick={() => setCurrentView(ViewMode.CLOCK)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.CLOCK ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Clock size={20} /> Registrar Ponto</button>
          <button onClick={() => setCurrentView(ViewMode.DASHBOARD)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.DASHBOARD ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => setCurrentView(ViewMode.SHEET)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SHEET ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><FileSpreadsheet size={20} /> Planilha</button>
          <button onClick={() => setCurrentView(ViewMode.AI_ASSISTANT)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.AI_ASSISTANT ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Bot size={20} /> Consultor IA</button>
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button onClick={() => { setPendingView(ViewMode.EMPLOYEES); setIsPinModalOpen(true); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.EMPLOYEES ? 'bg-slate-900 text-white font-black shadow-lg' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Users size={20} /> Equipe</button>
            <button onClick={() => { setPendingView(ViewMode.SETTINGS); setIsPinModalOpen(true); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SETTINGS ? 'bg-slate-900 text-white font-black shadow-lg' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><SettingsIcon size={20} /> Configurações</button>
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 px-2">
            <button onClick={() => performSync(false, true)} disabled={isSyncing} className={`w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <CloudLightning size={14} />} 
                SINCRONIZAR
            </button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen print:h-auto">
        <div className="max-w-5xl mx-auto h-full">
            {currentView === ViewMode.CLOCK && currentEmployeeId && <TimeClock key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
            {currentView === ViewMode.DASHBOARD && currentEmployeeId && <BankDashboard key={`${refreshKey}-${currentEmployeeId}`} employeeId={currentEmployeeId} />}
            {currentView === ViewMode.SHEET && currentEmployeeId && <SpreadsheetView key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
            {currentView === ViewMode.AI_ASSISTANT && currentEmployeeId && <AIAssistant employeeId={currentEmployeeId} />}
            {currentView === ViewMode.EMPLOYEES && <EmployeeManager key={refreshKey} onUpdate={refreshData} currentEmployeeId={currentEmployeeId} onSelectEmployee={(id) => setCurrentEmployeeId(id)} />}
            {currentView === ViewMode.SETTINGS && <Settings onConfigSaved={refreshData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
