
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ViewMode, Employee, DailyRecord } from './types.ts';

// Componentes com extensões explícitas para resolver erro de build
import { TimeClock } from './components/TimeClock.tsx';
import { SpreadsheetView } from './components/SpreadsheetView.tsx';
import { BankDashboard } from './components/BankDashboard.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { EmployeeManager } from './components/EmployeeManager.tsx';
import { Settings } from './components/Settings.tsx';
import { PinModal } from './components/PinModal.tsx';

// Serviços com extensões explícitas
import { 
  getEmployees, 
  getGoogleConfig, 
  saveGoogleConfig, 
  mergeExternalRecords, 
  mergeExternalEmployees, 
  mergeExternalTransactions, 
  getBankBalance 
} from './services/storageService.ts';
import { 
  readSheetData, 
  readEmployeesFromSheet, 
  readTransactionsFromSheet,
  syncRowToSheet
} from './services/googleSheetsService.ts';

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
  UserPlus,
  CloudDownload,
  Lock,
  ShieldCheck,
  KeyRound,
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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const syncLockRef = useRef<number>(0); 
  const hasInitializedSelection = useRef(false);

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
      
      setLastSyncTime(new Date());
      refreshData();
    } catch (e) {
      if (!silent) console.warn("Sincronização pendente.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [refreshData]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const setupUrl = urlParams.get('setup');
        if (setupUrl) {
          const decodedUrl = decodeURIComponent(setupUrl);
          if (decodedUrl.includes('script.google.com')) {
            saveGoogleConfig({ scriptUrl: decodedUrl, enabled: true });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        const loaded = getEmployees();
        setEmployees(loaded);
        if (loaded && loaded.length > 0 && !hasInitializedSelection.current) {
          setCurrentEmployeeId(loaded[0].id);
          hasInitializedSelection.current = true;
        } else if (loaded.length === 0) {
          setCurrentView(ViewMode.EMPLOYEES);
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

  useEffect(() => {
    const interval = setInterval(() => performSync(true), 60000);
    return () => clearInterval(interval);
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
        setLastSyncTime(new Date());
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleEmployeeUpdateFromManager = async () => {
      syncLockRef.current = Date.now() + 60000; 
      refreshData();
  };

  const currentEmployee = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    return employees.find(e => String(e.id) === String(currentEmployeeId)) || employees[0];
  }, [employees, currentEmployeeId]);

  const handleNavClick = (mode: ViewMode) => {
    setIsMobileMenuOpen(false);
    const adminViews = [ViewMode.EMPLOYEES, ViewMode.SETTINGS];

    if (adminViews.includes(mode)) {
        setPendingView(mode);
        setPendingEmployeeId(null);
        setIsPinModalOpen(true);
    } else {
        setCurrentView(mode);
    }
  };

  const handleSelectEmployee = (id: string) => {
      const selectedEmp = employees.find(e => String(e.id) === String(id));
      const isManager = selectedEmp?.role.toLowerCase().includes('gerente') || selectedEmp?.pin === '9999';
      
      if (isManager) {
          setPendingEmployeeId(id);
          setPendingView(null);
          setIsPinModalOpen(true);
      } else {
          setCurrentEmployeeId(id);
          setIsUserMenuOpen(false);
          setCurrentView(ViewMode.CLOCK);
      }
  };

  const handlePinSuccess = () => {
      setIsPinModalOpen(false);
      if (pendingEmployeeId) {
          setCurrentEmployeeId(pendingEmployeeId);
          setIsUserMenuOpen(false);
          setCurrentView(ViewMode.CLOCK);
          setPendingEmployeeId(null);
      } else if (pendingView) {
          setCurrentView(pendingView);
          setPendingView(null);
      }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <Loader2 size={48} className="animate-spin text-brand-500 mb-4" />
        <h1 className="text-xl font-black uppercase tracking-tighter">Nobel Ponto Inteligente</h1>
        <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.3em] animate-pulse">Iniciando Build Seguro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white">
      <PinModal 
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        correctPin={pendingEmployeeId ? (employees.find(e => String(e.id) === String(pendingEmployeeId))?.pin || '9999') : '9999'}
        targetName={pendingEmployeeId ? (employees.find(e => String(e.id) === String(pendingEmployeeId))?.name || 'Gerente') : 'Acesso Administrativo'}
        isAdminOnly={pendingView === ViewMode.EMPLOYEES || pendingView === ViewMode.SETTINGS}
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
          <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-100"><Building2 className="text-white" size={24} /></div>
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
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-1">
                            {currentEmployee?.role || 'Aguardando'}
                            {currentEmployee?.role.toLowerCase().includes('gerente') && <ShieldCheck size={10} className="text-amber-500" />}
                        </p>
                    </div>
                    </div>
                    <ChevronDown size={16} className={`transition-transform shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUserMenuOpen && (
                    <div className="absolute left-2 right-2 top-full mt-2 bg-white rounded-xl shadow-2xl border z-50 p-2 max-h-60 overflow-auto">
                    {employees.map(emp => (
                        <button key={emp.id} onClick={() => handleSelectEmployee(emp.id)} className={`w-full text-left p-3 rounded-lg text-xs mb-1 transition-all flex items-center justify-between ${String(currentEmployeeId) === String(emp.id) ? 'bg-brand-50 text-brand-700 font-black' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}>
                            <span>{emp.name}</span>
                            {emp.role.toLowerCase().includes('gerente') && <Lock size={12} className="opacity-30" />}
                        </button>
                    ))}
                    </div>
                )}
            </div>
        )}

        <nav className="space-y-1 flex-1">
          <button onClick={() => handleNavClick(ViewMode.CLOCK)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.CLOCK ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Clock size={20} /> Registrar Ponto</button>
          <button onClick={() => handleNavClick(ViewMode.DASHBOARD)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.DASHBOARD ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => handleNavClick(ViewMode.SHEET)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SHEET ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><FileSpreadsheet size={20} /> Planilha</button>
          <button onClick={() => handleNavClick(ViewMode.AI_ASSISTANT)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.AI_ASSISTANT ? 'bg-brand-600 text-white font-black shadow-lg shadow-brand-100' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Bot size={20} /> Consultor IA</button>
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button onClick={() => handleNavClick(ViewMode.EMPLOYEES)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.EMPLOYEES ? 'bg-slate-900 text-white font-black shadow-lg' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><Users size={20} /> Funcionários</button>
            <button onClick={() => handleNavClick(ViewMode.SETTINGS)} className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${currentView === ViewMode.SETTINGS ? 'bg-slate-900 text-white font-black shadow-lg' : 'text-slate-500 font-bold hover:bg-slate-50'}`}><SettingsIcon size={20} /> Configurações</button>
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 px-2 space-y-2">
            <button 
                onClick={() => performSync(false, true)} 
                disabled={isSyncing} 
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 active:scale-95 shadow-xl ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-200'}`}
            >
                {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <CloudLightning size={14} />} 
                {isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIA TOTAL'}
            </button>
            {lastSyncTime && (
                <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Última: {lastSyncTime.toLocaleTimeString()}</p>
            )}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen print:h-auto">
        <div className="max-w-5xl mx-auto h-full">
          {employees.length === 0 && currentView !== ViewMode.SETTINGS && currentView !== ViewMode.EMPLOYEES ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                <div className="bg-slate-100 p-8 rounded-[3rem] mb-6"><Users size={80} className="text-slate-300 mx-auto" /></div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Sem Funcionários</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setCurrentView(ViewMode.EMPLOYEES)} className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
                    <UserPlus size={18} /> Cadastrar
                  </button>
                  <button onClick={() => performSync(false, true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
                    <CloudDownload size={18} /> Baixar Nuvem
                  </button>
                </div>
            </div>
          ) : (
            <>
                {currentView === ViewMode.CLOCK && currentEmployeeId && <TimeClock key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
                {currentView === ViewMode.DASHBOARD && currentEmployeeId && <BankDashboard key={`${refreshKey}-${currentEmployeeId}`} employeeId={currentEmployeeId} />}
                {currentView === ViewMode.SHEET && currentEmployeeId && <SpreadsheetView key={`${refreshKey}-${currentEmployeeId}`} onUpdate={handleRecordUpdate} employeeId={currentEmployeeId} />}
                {currentView === ViewMode.AI_ASSISTANT && currentEmployeeId && <AIAssistant employeeId={currentEmployeeId} />}
                {currentView === ViewMode.EMPLOYEES && <EmployeeManager key={refreshKey} onUpdate={handleEmployeeUpdateFromManager} currentEmployeeId={currentEmployeeId} onSelectEmployee={(id) => setCurrentEmployeeId(id)} />}
                {currentView === ViewMode.SETTINGS && <Settings onConfigSaved={refreshData} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
