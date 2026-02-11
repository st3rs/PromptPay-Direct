
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionStatus, UserKYC, Language, AppConfig } from './types';
import { THEME, TRANSLATIONS, RATE_REFRESH_MS, RATE_FLUCTUATION_RANGE } from './constants';
import { generatePromptPayPayload } from './utils/promptpay';
import { generateReferenceId, maskPII } from './utils/security';
import { MockBackend } from './services/mockBackend';
import { ConfigService } from './services/configService';
import { TransactionPulse } from './components/TransactionPulse';
import { AdminDashboard } from './components/AdminDashboard';
import QRCode from 'react-qr-code';
import { ArrowRight, Lock, User, Wallet, RefreshCw, Globe, TrendingUp, TrendingDown, ShieldCheck, Building2, ChevronRight, HelpCircle, Sun, Moon, ChevronLeft, StickyNote, X, Info } from 'lucide-react';

function App() {
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];
  const [screen, setScreen] = useState<'SWAP' | 'KYC' | 'PULSE'>('SWAP');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Configuration State
  const [config, setConfig] = useState<AppConfig>(ConfigService.get());

  // Rate Engine States
  const [isRateLoading, setIsRateLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [displayRate, setDisplayRate] = useState<number>(config.baseRate * (1 + config.feePercent / 100));
  const [rateTrend, setRateTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const prevRateRef = useRef(displayRate);

  // Swap State
  const [amountTHB, setAmountTHB] = useState<number>(ConfigService.get().defaultAmountTHB);
  const [memo, setMemo] = useState<string>(''); // Transaction Reference/Memo
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // KYC State
  const initialKyc = {
    fullName: 'John Doe',
    nationalId: '1100012345678',
    walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unc5xh87f', // Sample TRC20
    isVerified: false
  };
  const [kycData, setKycData] = useState<UserKYC>({ ...initialKyc });
  const kycRef = useRef<UserKYC>({ ...initialKyc });

  // Transaction State
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);

  // Initialize Theme and Loading State
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    // Simulate initial market connection delay
    const initialLoadTimer = setTimeout(() => setIsRateLoading(false), 1200);
    return () => clearTimeout(initialLoadTimer);
  }, []);

  // Update Theme in DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [theme]);

  // Subscribe to Global Config Changes
  useEffect(() => {
    const unsubscribe = ConfigService.subscribe((newConfig) => {
      setConfig(newConfig);
      const newRate = newConfig.baseRate * (1 + newConfig.feePercent / 100);
      setDisplayRate(Number(newRate.toFixed(2)));
    });
    return unsubscribe;
  }, []);

  // Poll for backend updates if in PULSE mode
  useEffect(() => {
    if (screen === 'PULSE') {
      const unsubscribe = MockBackend.subscribe((updatedTx) => {
        setActiveTx(updatedTx);
      });
      return unsubscribe;
    }
  }, [screen]);

  // Simulate Rate Fluctuation with update signal
  useEffect(() => {
    if (screen !== 'SWAP' || isRateLoading) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const updateRate = () => {
      // Signal fluctuation start
      setIsUpdating(true);
      
      // Simulate network latency for rate update
      setTimeout(() => {
        setDisplayRate(prevRate => {
          const targetRate = config.baseRate * (1 + config.feePercent / 100);
          const noise = (Math.random() - 0.5) * (RATE_FLUCTUATION_RANGE * 1.2);
          const drift = (targetRate - prevRate) * 0.15; 
          
          let nextRate = prevRate + noise + drift;
          const max = targetRate + RATE_FLUCTUATION_RANGE;
          const min = targetRate - RATE_FLUCTUATION_RANGE;
          
          if (nextRate > max) nextRate = max;
          if (nextRate < min) nextRate = min;

          return Number(nextRate.toFixed(2));
        });
        setIsUpdating(false);
      }, 400);

      const nextDelay = Math.floor(Math.random() * 3000) + 1500;
      timeoutId = setTimeout(updateRate, nextDelay);
    };

    timeoutId = setTimeout(updateRate, RATE_REFRESH_MS);
    return () => clearTimeout(timeoutId);
  }, [screen, config.baseRate, config.feePercent, isRateLoading]);

  // Track Rate Trend
  useEffect(() => {
    if (displayRate > prevRateRef.current) {
        setRateTrend('up');
    } else if (displayRate < prevRateRef.current) {
        setRateTrend('down');
    } else {
        setRateTrend('stable');
    }
    prevRateRef.current = displayRate;
  }, [displayRate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amt = params.get('amt');
    const ref = params.get('ref'); 

    if (amt && !isNaN(Number(amt))) {
      setAmountTHB(Number(amt));
      if (ref) setMemo(ref);
      setScreen('SWAP');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSwapInit = () => {
    setIsConfirmModalOpen(true);
  };

  const confirmSwap = () => {
    setIsConfirmModalOpen(false);
    setScreen('KYC');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKYCSubmit = () => {
    try {
      const amountUSDT = amountTHB / displayRate;
      const refId = generateReferenceId();
      const qrPayload = generatePromptPayPayload(config.promptPayId, amountTHB);
  
      const newTx: Transaction = {
        id: Math.random().toString(36),
        referenceId: refId,
        user: { ...kycData, isVerified: true },
        amountTHB,
        amountUSDT: parseFloat(amountUSDT.toFixed(2)),
        rate: displayRate,
        status: TransactionStatus.AWAITING_PAYMENT,
        timestamp: Date.now(),
        qrPayload,
        logs: [],
        memo: memo 
      };
  
      MockBackend.createTransaction(newTx);
      setActiveTx(newTx);
      setScreen('PULSE');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Failed to generate transaction:", error);
      alert(t.errorGen);
    }
  };

  const handlePaymentLink = (amount: number, linkMemo?: string) => {
    setAmountTHB(amount);
    setMemo(linkMemo || '');
    setScreen('SWAP');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLang = () => setLang(current => current === 'en' ? 'th' : 'en');
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const getKycInputStyle = (key: keyof typeof initialKyc) => {
    const isDirty = kycData[key] !== kycRef.current[key];
    return `${THEME.input} ${isDirty ? 'border-l-2 border-l-blue-600 pl-4' : ''} transition-all duration-200`;
  };

  return (
    <div className={`min-h-screen ${THEME.bg} text-slate-800 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 flex flex-col transition-colors duration-300`}>
      
      {/* Formal Header with Top Bar */}
      <header className="sticky top-0 z-50 shadow-sm">
        <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 text-[10px] py-1.5 px-6 hidden md:block border-b border-slate-800 dark:border-slate-900">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
             <div className="flex gap-4 tracking-wide font-medium">
               <span className="hover:text-white cursor-pointer">Personal Banking</span>
               <span className="text-slate-600">|</span>
               <span className="hover:text-white cursor-pointer">Business</span>
               <span className="text-slate-600">|</span>
               <span className="text-white font-bold">Crypto Gateway</span>
             </div>
             <div className="flex gap-4 items-center">
               <span className="flex items-center gap-1.5 text-emerald-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {t.systemOp}</span>
               <span>{t.securityCenter}</span>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setScreen('SWAP')}>
              <div className="w-10 h-10 bg-blue-900 dark:bg-blue-800 rounded-sm flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-blue-800 dark:group-hover:bg-blue-700 transition-colors">
                 <Building2 size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight uppercase">PromptPay<span className="text-blue-800 dark:text-blue-400">Direct</span></span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide">DIGITAL ASSET REMITTANCE</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                  onClick={toggleTheme}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-sm transition-colors"
               >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
               </button>
               <button 
                  onClick={toggleLang}
                  className="text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-blue-400 transition-colors bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 uppercase"
              >
                  <Globe size={12} />
                  {lang === 'en' ? 'EN' : 'TH'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:py-12 space-y-10">
        
        {screen === 'SWAP' && (
          <div className="max-w-2xl mx-auto">
             <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <TrendingUp size={20} className="text-blue-800 dark:text-blue-400" />
                   {t.buyTitle}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-lg">
                   Securely transfer funds from your Thai bank account to digital assets. Real-time rates provided by authorized liquidity providers.
                </p>
             </div>

            <div className={`${THEME.card} overflow-hidden shadow-formal border border-slate-300 dark:border-slate-700`}>
               <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                   <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">1. Transfer Details</h2>
                   <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                   </div>
               </div>
               
               <div className="p-6 md:p-8 space-y-8 bg-white dark:bg-slate-950">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative">
                     {/* FROM Section */}
                     <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.youPay}</label>
                        <div className={`border rounded-sm p-3 hover:border-blue-600 transition-colors bg-white dark:bg-slate-900 ${amountTHB !== config.defaultAmountTHB ? 'border-blue-400 shadow-inner' : 'border-slate-300 dark:border-slate-700'}`}>
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-serif font-bold text-slate-600 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700">฿</div>
                                   <span className="text-sm font-bold text-slate-700 dark:text-slate-200">THB</span>
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">THAI BAHT</span>
                            </div>
                            <input 
                                type="number" 
                                value={amountTHB}
                                onChange={(e) => setAmountTHB(Number(e.target.value))}
                                className="w-full text-2xl font-mono text-slate-900 dark:text-slate-100 outline-none bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold border-b border-slate-100 dark:border-slate-800 pb-1 focus:border-blue-600 transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 flex items-center gap-1.5 pl-1">
                           <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-500" /> Bank Transfer (PromptPay)
                        </p>
                     </div>

                     <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-6 w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-600 items-center justify-center text-slate-400 dark:text-slate-500 z-10 shadow-sm">
                        <ArrowRight size={14} />
                     </div>

                     {/* TO Section */}
                     <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.youReceive}</label>
                        <div className="border border-blue-200 dark:border-blue-800 rounded-sm p-3 bg-blue-50/30 dark:bg-blue-900/10">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-[10px] text-white font-bold border border-green-700">T</div>
                                   <span className="text-sm font-bold text-blue-900 dark:text-blue-300">USDT</span>
                                </div>
                                <span className="text-[10px] text-blue-800/60 dark:text-blue-300/60 font-mono">TRC-20</span>
                            </div>
                             {isRateLoading ? (
                               <div className="w-full h-8 bg-blue-100/50 dark:bg-blue-800/20 animate-pulse rounded-sm mt-1"></div>
                             ) : (
                               <input 
                                  type="text" 
                                  readOnly
                                  value={(amountTHB / displayRate).toFixed(2)}
                                  className="w-full text-2xl font-mono text-blue-800 dark:text-blue-300 outline-none bg-transparent font-bold border-b border-blue-100 dark:border-blue-800 pb-1 cursor-not-allowed"
                              />
                             )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 flex items-center gap-1.5 pl-1">
                           <Wallet size={12} className="text-blue-600 dark:text-blue-500" /> Direct to Cold/Hot Wallet
                        </p>
                     </div>
                 </div>

                 {memo && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-sm p-3 flex gap-2 items-start">
                        <StickyNote size={14} className="text-amber-600 dark:text-amber-500 mt-0.5" />
                        <div>
                             <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Payment Reference</p>
                             <p className="text-xs text-amber-900 dark:text-amber-200 font-mono">{memo}</p>
                        </div>
                    </div>
                 )}

                 {/* Rate Summary Table with Skeleton States */}
                 <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm">
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            <tr>
                                <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{t.rate}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                   {isRateLoading ? (
                                     <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded ml-auto"></div>
                                   ) : (
                                     <div className={`flex items-center justify-end gap-2 transition-opacity duration-300 ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
                                       {isUpdating ? (
                                         <span className="text-[9px] text-slate-400 dark:text-slate-500 italic font-normal">Refreshing...</span>
                                       ) : (
                                         <>
                                           {rateTrend !== 'stable' && (
                                             <span className={`${rateTrend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {rateTrend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                             </span>
                                           )}
                                         </>
                                       )}
                                       <span>1 USDT = {displayRate.toFixed(2)} THB</span>
                                     </div>
                                   )}
                                </td>
                            </tr>
                            <tr>
                                <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{t.fees}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{config.feePercent.toFixed(2)}%</td>
                            </tr>
                            <tr className="bg-slate-100 dark:bg-slate-800">
                                <td className="p-3 text-slate-800 dark:text-slate-200 font-bold uppercase">{t.exactAmount}</td>
                                <td className="p-3 text-right font-mono font-bold text-lg text-blue-800 dark:text-blue-400">
                                  {isRateLoading ? (
                                    <div className="h-6 w-24 bg-blue-200 dark:bg-blue-800/40 animate-pulse rounded ml-auto"></div>
                                  ) : (
                                    <span className={isUpdating ? 'opacity-70' : ''}>฿ {amountTHB.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                  )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                 </div>

                 <button 
                   onClick={handleSwapInit}
                   disabled={isRateLoading}
                   className={`w-full ${THEME.buttonPrimary} flex justify-center items-center gap-2 ${isRateLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                   {isRateLoading ? 'Connecting to Market...' : <>{t.proceed} <ChevronRight size={14} /></>}
                 </button>
               </div>
            </div>
          </div>
        )}

        {screen === 'KYC' && (
           <div className="max-w-2xl mx-auto">
             <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t.kycTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{t.kycDesc}</p>
                </div>
                <button onClick={() => setScreen('SWAP')} className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 font-bold flex items-center gap-1">
                    <ChevronLeft size={14} /> {t.back}
                </button>
             </div>

             <div className={`${THEME.card} shadow-formal border border-slate-300 dark:border-slate-700`}>
                 <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
                   <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">2. Beneficiary Information</h2>
                   <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                   </div>
               </div>

                <div className="p-6 md:p-8 bg-white dark:bg-slate-950">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-sm p-3 mb-6 flex gap-3">
                        <ShieldCheck className="text-amber-700 dark:text-amber-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                          <span className="font-bold">Compliance Notice:</span> Ensure the beneficiary name matches the bank account owner. Third-party transfers may be flagged for manual review.
                        </p>
                    </div>

                    <div className="space-y-5 mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase block">{t.fullName}</label>
                            <input 
                              type="text" 
                              value={kycData.fullName}
                              onChange={(e) => setKycData({...kycData, fullName: e.target.value})}
                              className={getKycInputStyle('fullName')}
                              placeholder="e.g. SOMCHAI JAIDEE"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase block">{t.nationalId}</label>
                            <input 
                              type="text" 
                              value={kycData.nationalId}
                              onChange={(e) => setKycData({...kycData, nationalId: e.target.value})}
                              className={getKycInputStyle('nationalId')}
                              placeholder="13-digit ID Number"
                            />
                          </div>
                      </div>
                       <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase block">{t.wallet}</label>
                        <div className="relative">
                            <input 
                              type="text" 
                              value={kycData.walletAddress}
                              onChange={(e) => setKycData({...kycData, walletAddress: e.target.value})}
                              className={`${getKycInputStyle('walletAddress')} font-mono text-xs pl-9`}
                            />
                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Network: Tron (TRC20)</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button 
                         onClick={handleKYCSubmit}
                         className={`${THEME.buttonPrimary}`}
                       >
                         {t.confirm}
                       </button>
                    </div>
                </div>
             </div>
           </div>
        )}

        {screen === 'PULSE' && activeTx && (
          <div className="space-y-8 animate-fade-in">
             <TransactionPulse transaction={activeTx} lang={lang} />

             {activeTx.status === TransactionStatus.AWAITING_PAYMENT && (
               <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-formal flex flex-col items-center justify-center text-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase mb-4 w-full border-b border-slate-100 dark:border-slate-800 pb-2">{t.scan}</h3>
                      <div className="bg-white p-3 rounded-sm mb-4 border border-slate-200 dark:border-slate-700 shadow-inner">
                         <QRCode value={activeTx.qrPayload || ''} size={150} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-3 max-w-[200px]">{t.scanDesc}</p>
                      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-sm border border-slate-200 dark:border-slate-700 w-full text-center">
                         <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold mb-0.5">Merchant ID</p>
                         <p className="text-slate-700 dark:text-slate-300 text-xs font-mono">{config.promptPayId}</p>
                      </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-sm border border-blue-100 dark:border-blue-900/50 flex flex-col justify-center h-full relative overflow-hidden">
                          <div className="absolute right-0 top-0 p-4 text-blue-200 dark:text-blue-800 opacity-20">
                             <RefreshCw size={80} />
                          </div>
                          <div className="relative z-10">
                              <h4 className="text-blue-900 dark:text-blue-300 text-sm font-bold mb-2 uppercase tracking-wide">{t.dontClose}</h4>
                              <p className="text-blue-700 dark:text-blue-400 text-xs leading-relaxed max-w-[240px]">{t.listening}</p>
                          </div>
                      </div>
                       <div className="bg-slate-800 dark:bg-slate-950 p-5 rounded-sm border border-slate-700 dark:border-slate-800 flex flex-col justify-center h-full text-white">
                          <h4 className="text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-1">{t.exactAmount}</h4>
                          <span className="text-3xl font-mono font-bold text-white tracking-tight">฿{activeTx.amountTHB.toFixed(2)}</span>
                          <p className="text-slate-400 text-xs mt-2 border-t border-slate-700 pt-2">{t.transferExactly}</p>
                      </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsConfirmModalOpen(false)}
             ></div>
             
             <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Info size={16} className="text-blue-800 dark:text-blue-400" />
                        Confirm Transfer Details
                    </h3>
                    <button 
                        onClick={() => setIsConfirmModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Please verify your transfer summary. Rates are locked for 60 seconds upon confirmation.
                    </p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Send Amount</span>
                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">฿ {amountTHB.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Receive Amount</span>
                            <span className="text-sm font-mono font-bold text-blue-800 dark:text-blue-400">{(amountTHB / displayRate).toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Exchange Rate</span>
                            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">1 USDT = {displayRate.toFixed(2)} THB</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Service Fee</span>
                            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">{config.feePercent.toFixed(2)}%</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-sm p-3 border border-blue-100 dark:border-blue-800/50 flex gap-3">
                        <ShieldCheck className="text-blue-700 dark:text-blue-400 shrink-0" size={16} />
                        <p className="text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed">
                            Proceeding will generate a unique reference ID. You must verify your beneficiary details in the next step.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setIsConfirmModalOpen(false)}
                        className={`${THEME.buttonSecondary} w-full text-[10px] uppercase tracking-widest`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmSwap}
                        className={`${THEME.buttonPrimary} w-full text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5`}
                    >
                        Confirm <ArrowRight size={12} />
                    </button>
                </div>
             </div>
          </div>
        )}

        <AdminDashboard lang={lang} theme={theme} onSimulateDeepLink={handlePaymentLink} />

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-center mt-12 transition-colors duration-300">
         <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-left">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">PromptPay<span className="text-blue-800 dark:text-blue-400">Direct</span></span>
                <p className="text-slate-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mt-1">© 2024 Regulated Sandbox Environment. All Rights Reserved.</p>
            </div>
            <div className="flex gap-6 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <a href="#" className="hover:text-blue-800 dark:hover:text-blue-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-blue-800 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-blue-800 dark:hover:text-blue-400 transition-colors">Regulatory Compliance</a>
            </div>
         </div>
      </footer>
    </div>
  );
}

export default App;
