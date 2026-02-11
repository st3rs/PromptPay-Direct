import React, { useState, useEffect } from 'react';
import { Transaction, LogEntry, TransactionStatus, Language, AppConfig } from '../types';
import { MockBackend } from '../services/mockBackend';
import { ConfigService } from '../services/configService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, Terminal, History, Settings, Save, Server, Wallet, Link as LinkIcon, ExternalLink, Check, Activity, DollarSign, Percent, Smartphone, Calculator, RotateCcw, Banknote } from 'lucide-react';
import { THEME, TRANSLATIONS } from '../constants';

const data = [
  { name: '08:00', thb: 400000, usdt: 12000 },
  { name: '10:00', thb: 600000, usdt: 10000 },
  { name: '12:00', thb: 300000, usdt: 18000 },
  { name: '14:00', thb: 800000, usdt: 8000 },
  { name: '16:00', thb: 950000, usdt: 5000 },
];

interface Props {
  lang: Language;
  theme: 'light' | 'dark';
  onSimulateDeepLink?: (amount: number, memo?: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ lang, theme, onSimulateDeepLink }) => {
  const t = TRANSLATIONS[lang];
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reserves, setReserves] = useState(MockBackend.getOrderBook());
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);

  // Simulation inputs
  const [simName, setSimName] = useState('John Doe');
  const [simAmount, setSimAmount] = useState(1000);
  const [simError, setSimError] = useState<string | null>(null);

  // Link Generator inputs
  const [linkAmount, setLinkAmount] = useState(5000);
  const [linkMemo, setLinkMemo] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Global Config inputs
  const [config, setConfig] = useState<AppConfig>(ConfigService.get());
  const [editConfig, setEditConfig] = useState<AppConfig>(ConfigService.get());
  const [isConfigChanged, setIsConfigChanged] = useState(false);

  useEffect(() => {
    // Sync with backend simulation
    const interval = setInterval(() => {
      setLogs([...MockBackend.getLogs()]);
      setReserves({...MockBackend.getOrderBook()});
      setActiveTx(MockBackend.getCurrentTransaction());
      setHistory([...MockBackend.getTransactionHistory()]);
      
      const current = MockBackend.getCurrentTransaction();
      if (current) {
         if (simName === 'John Doe' && simAmount === 1000) {
            setSimName(current.user.fullName || 'John Doe');
            setSimAmount(current.amountTHB || 1000);
         }
      }
    }, 1000);

    const unsubscribeConfig = ConfigService.subscribe((newConfig) => {
        setConfig(newConfig);
        // Only update editConfig if the user isn't actively editing
        if (!isConfigChanged) {
           setEditConfig(newConfig);
        }
    });

    return () => {
        clearInterval(interval);
        unsubscribeConfig();
    };
  }, [simName, simAmount, isConfigChanged]);

  useEffect(() => {
    // Robust link generation: Use current origin + pathname to ensure it works on any host/subpath
    // Avoid /pay sub-route to prevent 404s on static hosts without SPA routing config
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (linkAmount > 0) {
        params.set('amt', linkAmount.toString());
    }
    if (linkMemo && linkMemo.trim() !== '') {
        params.set('ref', linkMemo.trim());
    }
    // Ensure we don't have a trailing ? if no params (though we default amt)
    const queryString = params.toString();
    setGeneratedLink(queryString ? `${baseUrl}?${queryString}` : baseUrl);
  }, [linkAmount, linkMemo]);

  const triggerWebhook = () => {
    setSimError(null);
    if (!activeTx) { setSimError(t.errNoTx); return; }
    if (!simName || simName.trim().length === 0) { setSimError(t.errSenderName); return; }
    if (simAmount <= 0 || isNaN(simAmount)) { setSimError(t.errAmount); return; }
    MockBackend.triggerIncomingTransfer(simAmount, simName, activeTx.referenceId);
  };

  const toggleHedge = () => {
    MockBackend.toggleAutoHedge();
    setReserves({...MockBackend.getOrderBook()});
  };

  const handleConfigChange = (key: keyof AppConfig, value: string | number) => {
    setEditConfig(prev => {
        const next = { ...prev, [key]: value };
        // Check if actually changed from source of truth
        const hasChanges = Object.keys(next).some(k => next[k as keyof AppConfig] !== config[k as keyof AppConfig]);
        setIsConfigChanged(hasChanges);
        return next;
    });
  };

  const saveConfig = () => {
    ConfigService.update(editConfig);
    setConfig(editConfig); // Optimistic update
    setIsConfigChanged(false);
  };
  
  const resetConfig = () => {
     if (window.confirm("Reset configuration to default values?")) {
         ConfigService.reset();
         // Subscription will handle state update
         setIsConfigChanged(false);
     }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const completedHistory = history.filter(tx => 
    tx.status === TransactionStatus.COMPLETED || tx.status === TransactionStatus.FAILED
  );

  // Helper for conditional styling of modified inputs
  const getInputStyle = (key: keyof AppConfig) => {
      const isModified = editConfig[key] !== config[key];
      return `w-full h-7 text-[10px] px-2 border ${
          isModified 
          ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100' 
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
      } rounded-sm focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none transition-colors`;
  };

  // Calculate projected rate
  const projectedRate = editConfig.baseRate * (1 + editConfig.feePercent / 100);

  return (
    <div className={`mt-12 ${THEME.card} overflow-hidden`}>
      {/* Admin Header */}
      <div className="bg-slate-900 text-white p-3 border-b border-slate-800 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Server size={14} className="text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest">{t.adminConsole}</h3>
         </div>
         <span className="text-[9px] font-mono text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-900">{t.secAudit}</span>
      </div>

      <div className="p-4 bg-slate-100 dark:bg-slate-950 grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Metrics & Controls */}
        <div className="lg:col-span-2 space-y-4">
            
            {/* Metric Cards - Dense */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 rounded-sm shadow-sm">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t.thbReserves}</p>
                    <p className="text-sm font-mono text-slate-800 dark:text-slate-200 font-bold mt-1">฿{reserves.thbReserves.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 rounded-sm shadow-sm">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t.usdtFloat}</p>
                    <p className="text-sm font-mono text-blue-800 dark:text-blue-400 font-bold mt-1">
                        {reserves.usdtReserves.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">USDT</span>
                    </p>
                </div>
                 <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 rounded-sm shadow-sm flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                         <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t.autoHedge}</span>
                         <div className={`w-1.5 h-1.5 rounded-full ${reserves.autoHedge ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    </div>
                    <button 
                        onClick={toggleHedge} 
                        className="mt-2 text-[9px] bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-0.5 px-2 rounded-sm border border-slate-200 dark:border-slate-700 w-full transition-colors font-medium uppercase"
                    >
                        {reserves.autoHedge ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Configuration Panel */}
                <div className="border border-slate-300 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 shadow-sm flex flex-col">
                     <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 uppercase">
                           <Settings size={10} /> {t.globalSettings}
                        </span>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={resetConfig} 
                                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                                title="Reset to Defaults"
                             >
                                <RotateCcw size={10} />
                             </button>
                             {isConfigChanged && (
                                <button onClick={saveConfig} className="text-[9px] bg-blue-900 hover:bg-blue-800 text-white px-2 py-0.5 rounded-sm flex items-center gap-1 shadow-sm uppercase font-bold animate-pulse transition-colors">
                                    <Save size={8} /> {t.save}
                                </button>
                             )}
                        </div>
                     </div>
                     <div className="p-3 space-y-3">
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block mb-1 font-bold flex items-center gap-1">
                                    <DollarSign size={8} /> {t.lblBaseRate}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={editConfig.baseRate} 
                                    onChange={(e) => handleConfigChange('baseRate', parseFloat(e.target.value))} 
                                    className={getInputStyle('baseRate')}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block mb-1 font-bold flex items-center gap-1">
                                    <Percent size={8} /> {t.lblServiceFee}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={editConfig.feePercent} 
                                    onChange={(e) => handleConfigChange('feePercent', parseFloat(e.target.value))} 
                                    className={getInputStyle('feePercent')}
                                />
                            </div>
                         </div>

                         {/* Live Rate Preview */}
                         <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <Calculator size={10} className="text-slate-400" />
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">Effective Rate</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                1 USDT ≈ {projectedRate.toFixed(2)} THB
                            </span>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                             <div className="col-span-2">
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block mb-1 font-bold flex items-center gap-1">
                                    <Smartphone size={8} /> {t.lblMerchantId}
                                </label>
                                <input 
                                    type="text" 
                                    value={editConfig.promptPayId} 
                                    onChange={(e) => handleConfigChange('promptPayId', e.target.value)} 
                                    className={getInputStyle('promptPayId')}
                                />
                             </div>
                         </div>
                         
                         <div>
                            <label className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block mb-1 font-bold flex items-center gap-1">
                                <Banknote size={8} /> Default THB Amount
                            </label>
                            <input 
                                type="number" 
                                value={editConfig.defaultAmountTHB} 
                                onChange={(e) => handleConfigChange('defaultAmountTHB', parseFloat(e.target.value))} 
                                className={getInputStyle('defaultAmountTHB')}
                            />
                         </div>

                         <div>
                            <label className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block mb-1 font-bold flex items-center gap-1">
                                <Wallet size={8} /> {t.lblWallet}
                            </label>
                            <input 
                                type="text" 
                                value={editConfig.providerWallet} 
                                onChange={(e) => handleConfigChange('providerWallet', e.target.value)} 
                                className={`${getInputStyle('providerWallet')} font-mono`}
                            />
                         </div>
                     </div>
                </div>

                {/* Chart */}
                <div className="border border-slate-300 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 p-2 h-[180px] shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                            <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ 
                                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                                    fontSize: '10px', 
                                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                    borderRadius: '2px'
                                }} 
                            />
                            <Bar dataKey="thb" fill={theme === 'dark' ? '#10b981' : '#059669'} />
                            <Bar dataKey="usdt" fill={theme === 'dark' ? '#3b82f6' : '#1e40af'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Webhook Tool */}
                <div className="border border-slate-300 dark:border-slate-800 rounded-sm p-3 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                            <Activity size={10} /> {t.webhookSim}
                        </p>
                        <div className="space-y-2">
                            <input type="text" value={simName} onChange={(e) => setSimName(e.target.value)} className="w-full h-7 text-[10px] px-2 border border-slate-300 dark:border-slate-700 rounded-sm" placeholder={t.senderNamePlaceholder} />
                            <input type="number" value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} className="w-full h-7 text-[10px] px-2 border border-slate-300 dark:border-slate-700 rounded-sm" placeholder={t.amountPlaceholder} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <button onClick={triggerWebhook} className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3 py-1 rounded-sm text-[10px] h-7 whitespace-nowrap font-bold uppercase transition-colors">
                            {t.triggerWebhook}
                        </button>
                        {simError && <p className="text-[9px] text-red-600 dark:text-red-400 mt-1 font-medium">{simError}</p>}
                    </div>
                </div>

                {/* Payment Link Generator */}
                <div className="border border-slate-300 dark:border-slate-800 rounded-sm p-3 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                     <div>
                         <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                             <LinkIcon size={10} /> {t.paymentLink}
                         </p>
                         <div className="space-y-2">
                             <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={linkAmount} 
                                    onChange={(e) => setLinkAmount(Number(e.target.value))} 
                                    className="w-20 h-7 text-[10px] px-2 border border-slate-300 dark:border-slate-700 rounded-sm" 
                                    placeholder="Amt" 
                                />
                                <input 
                                    type="text" 
                                    value={linkMemo} 
                                    onChange={(e) => setLinkMemo(e.target.value)} 
                                    className="flex-1 h-7 text-[10px] px-2 border border-slate-300 dark:border-slate-700 rounded-sm" 
                                    placeholder={t.lblMemo} 
                                />
                             </div>
                             <div className="relative">
                                 <input readOnly value={generatedLink} className="w-full h-7 text-[9px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm px-2 text-slate-500 font-mono" />
                             </div>
                         </div>
                     </div>
                     <div className="mt-2 flex gap-2">
                         <button 
                            onClick={handleCopyLink}
                            className={`flex-1 border ${isCopied ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-300 text-slate-600'} dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 px-3 py-1 rounded-sm text-[10px] h-7 font-bold uppercase transition-colors flex items-center justify-center gap-1`}
                        >
                            {isCopied ? <Check size={10} /> : <LinkIcon size={10} />} {isCopied ? 'Copied' : t.genLink}
                         </button>
                         <button 
                            onClick={() => {
                                if (linkAmount > 0 && onSimulateDeepLink) {
                                    onSimulateDeepLink(linkAmount, linkMemo);
                                }
                            }}
                            disabled={linkAmount <= 0}
                            className={`flex-1 ${linkAmount > 0 ? 'bg-blue-900 hover:bg-blue-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} px-3 py-1 rounded-sm text-[10px] h-7 font-bold uppercase transition-colors flex items-center justify-center gap-1`}
                         >
                            <ExternalLink size={10} /> {t.testLink}
                         </button>
                     </div>
                </div>
            </div>
        </div>

        {/* Right Column: Logs */}
        <div className="border border-slate-300 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 flex flex-col h-[400px] lg:h-auto overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                    <Terminal size={10} /> {t.sysLogs}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[9px] bg-white dark:bg-slate-950 custom-scrollbar">
                {logs.length === 0 && <p className="text-slate-400 dark:text-slate-600 text-center mt-4 italic">No Activity</p>}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-1 mb-1 last:border-0">
                        <span className="text-slate-400 dark:text-slate-600 shrink-0">{log.timestamp.split('T')[1].split('.')[0]}</span>
                        <span className={
                            log.level === 'CRITICAL' ? 'text-red-700 dark:text-red-400 font-bold' :
                            log.level === 'WARN' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                        }>
                            <span className="font-bold opacity-70">[{log.module}]</span> {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* History Table */}
      <div className="border-t border-slate-300 dark:border-slate-800 mt-4 pt-0">
         <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
             <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 uppercase">
                <History size={10} /> {t.txHistory}
             </h4>
         </div>
         <div className="overflow-x-auto bg-white dark:bg-slate-950">
             <table className="w-full text-xs text-left">
                <thead className="text-[9px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                   <tr>
                      <th className="px-4 py-2 font-bold">{t.colRef}</th>
                      <th className="px-4 py-2 font-bold">{t.colAmtThb}</th>
                      <th className="px-4 py-2 font-bold">{t.colAmtUsdt}</th>
                      <th className="px-4 py-2 font-bold">{t.colStatus}</th>
                      <th className="px-4 py-2 font-bold">{t.colTime}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                   {completedHistory.length === 0 ? (
                       <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-400 dark:text-slate-600 font-mono italic">{t.noRecords}</td></tr>
                   ) : (
                       completedHistory.map(tx => (
                         <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                                {tx.referenceId}
                                {tx.memo && <span className="block text-[8px] text-slate-400 italic">Ref: {tx.memo}</span>}
                            </td>
                            <td className="px-4 py-2 font-mono text-emerald-700 dark:text-emerald-400 font-bold">฿{tx.amountTHB.toLocaleString()}</td>
                            <td className="px-4 py-2 font-mono text-blue-800 dark:text-blue-400 font-bold">
                                {tx.amountUSDT.toLocaleString()} <span className="text-[9px] text-slate-400 font-normal">USDT</span>
                            </td>
                            <td className="px-4 py-2">
                               <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold border uppercase ${
                                   tx.status === TransactionStatus.COMPLETED 
                                   ? 'text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' 
                                   : 'text-red-800 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                               }`}>
                                  {tx.status}
                               </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleString()}</td>
                         </tr>
                       ))
                   )}
                </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};