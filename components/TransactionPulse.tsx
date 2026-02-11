import React, { useState } from 'react';
import { Transaction, TransactionStatus, Language } from '../types';
import { Check, Loader2, Wallet, ArrowLeftRight, Server, AlertTriangle, FileText, Clock, ChevronDown, ChevronUp, XCircle, LifeBuoy } from 'lucide-react';
import { THEME, TRANSLATIONS } from '../constants';

interface Props {
  transaction: Transaction;
  lang: Language;
}

export const TransactionPulse: React.FC<Props> = ({ transaction, lang }) => {
  const t = TRANSLATIONS[lang];
  const [showLogs, setShowLogs] = useState(false);
  const isFailed = transaction.status === TransactionStatus.FAILED;

  const steps = [
    { id: TransactionStatus.AWAITING_PAYMENT, label: t.stepPayment },
    { id: TransactionStatus.VERIFYING_BANK, label: t.stepBank },
    { id: TransactionStatus.DISBURSING, label: t.stepDisburse },
    { id: TransactionStatus.COMPLETED, label: t.stepComplete },
  ];

  const getCurrentStepIndex = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.AWAITING_PAYMENT: return 0;
      case TransactionStatus.VERIFYING_BANK: return 1;
      case TransactionStatus.DISBURSING: return 2;
      case TransactionStatus.COMPLETED: return 3;
      case TransactionStatus.FAILED: return 1; 
      default: return 0;
    }
  };

  const currentStep = getCurrentStepIndex(transaction.status);
  
  const failureReason = isFailed 
    ? (transaction.logs.find(l => l.level === 'CRITICAL')?.message || 'Compliance checks failed.') 
    : null;

  const formatLogTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
    } catch (e) {
      return isoString.split('T')[1]?.split('.')[0] || isoString;
    }
  };

  const getLogLevelStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800';
      case 'WARN':
        return 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800';
      case 'INFO':
      default:
        return 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto ${THEME.card} overflow-hidden shadow-formal transition-all duration-300 ${isFailed ? 'border-red-200 dark:border-red-900/50 border-l-4 border-l-red-600 shadow-red-100 dark:shadow-none' : ''}`}>
      {/* Formal Header with Receipt styling */}
      <div className={`px-6 py-4 border-b flex justify-between items-center ${isFailed ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
         <div className="flex items-center gap-3">
            <div className={`p-1.5 border rounded-sm shadow-sm ${isFailed ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
               {isFailed ? <AlertTriangle size={16} /> : <FileText size={16} />}
            </div>
            <div>
               <h2 className={`text-xs font-bold uppercase tracking-widest ${isFailed ? 'text-red-800 dark:text-red-200' : 'text-slate-800 dark:text-slate-200'}`}>
                 {isFailed ? t.txFailed : t.txPulse}
               </h2>
               <p className={`text-[10px] font-mono mt-0.5 tracking-wide ${isFailed ? 'text-red-600/70 dark:text-red-400/70' : 'text-slate-500 dark:text-slate-400'}`}>REF: {transaction.referenceId}</p>
            </div>
         </div>
         <div className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${isFailed ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
             {isFailed ? t.rejected : t.secure}
         </div>
      </div>

      <div className="p-6 md:p-8 bg-white dark:bg-slate-950">
        {/* Horizontal Stepper */}
        <div className="mb-10 px-4">
            <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>
                <div 
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 transition-all duration-700 -z-10 ${isFailed ? 'bg-red-200 dark:bg-red-900/30' : 'bg-blue-900 dark:bg-blue-600'}`}
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    
                    let dotClass = "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700";
                    let textClass = "text-slate-400 dark:text-slate-600";
                    
                    if (isActive) {
                        dotClass = isFailed 
                            ? "bg-white dark:bg-slate-900" // Placeholder, we use Icon
                            : "bg-blue-900 dark:bg-blue-600 border-blue-900 dark:border-blue-600 shadow-sm";
                        textClass = "text-blue-900 dark:text-white font-bold";
                        if (isFailed) textClass = "text-red-700 dark:text-red-400 font-bold";
                    } else if (isCompleted) {
                        dotClass = "bg-blue-900 dark:bg-blue-600 border-blue-900 dark:border-blue-600";
                        textClass = "text-slate-600 dark:text-slate-400 font-medium";
                    }

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-white dark:bg-slate-950 px-2 relative z-10">
                             {isActive && isFailed ? (
                                <XCircle size={14} className="text-red-600 dark:text-red-500 bg-white dark:bg-slate-950 rounded-full" />
                             ) : (
                                <div className={`w-3 h-3 rounded-full ${dotClass} transition-colors duration-300`}></div>
                             )}
                             <span className={`text-[10px] uppercase tracking-wider ${textClass}`}>{step.label}</span>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Failed Status Message Block - Prominent */}
        {isFailed && (
            <div className="mb-8 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 shadow-sm overflow-hidden animate-pulse">
                <div className="p-4 flex items-start gap-4">
                    <div className="bg-red-100 dark:bg-red-800/30 p-2.5 rounded-full shrink-0 border border-red-200 dark:border-red-700/50">
                        <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wide mb-1 flex items-center gap-2">
                           {t.alert}
                       </h3>
                       <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed break-words">
                           {failureReason}
                       </p>
                    </div>
                </div>
                <div className="bg-red-100/50 dark:bg-red-900/40 px-4 py-2 flex justify-between items-center border-t border-red-200 dark:border-red-800/30">
                     <span className="text-[10px] font-mono text-red-700 dark:text-red-400">
                         ERR_CODE: 0x{transaction.referenceId.slice(-4)}
                      </span>
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide cursor-pointer hover:underline">
                         <LifeBuoy size={12} /> {t.contactSupport}
                     </div>
                </div>
            </div>
        )}

        {/* Transaction Details - Statement Style */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden mb-6">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
               <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Transaction Details</span>
               <span className="text-[10px] font-mono text-slate-400">{new Date(transaction.timestamp).toLocaleString()}</span>
            </div>
            <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                         <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium w-1/3">{t.status}</td>
                         <td className="px-4 py-3 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${isFailed ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-800'}`}>
                                {transaction.status.replace(/_/g, ' ')}
                            </span>
                         </td>
                    </tr>
                    {transaction.memo && (
                        <tr>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">Ref / Memo</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300 italic">{transaction.memo}</td>
                        </tr>
                    )}
                    <tr>
                         <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{t.incoming}</td>
                         <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">฿ {transaction.amountTHB.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                         <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{t.rate}</td>
                         <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">1 USDT = {transaction.rate.toFixed(2)} THB</td>
                    </tr>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                         <td className="px-4 py-3 text-slate-800 dark:text-slate-300 font-bold">{t.outgoing}</td>
                         <td className="px-4 py-3 text-right font-mono font-bold text-blue-900 dark:text-blue-400">{transaction.amountUSDT.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Live Status Message (Only if active) */}
        {transaction.status === TransactionStatus.VERIFYING_BANK && !isFailed && (
            <div className="flex items-center gap-3 text-xs bg-blue-50 dark:bg-blue-900/10 p-3 rounded-sm border-l-2 border-blue-600 dark:border-blue-500">
                <Loader2 size={14} className="animate-spin text-blue-700 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-300 font-medium">{t.verifying}</span>
            </div>
        )}
         {transaction.status === TransactionStatus.DISBURSING && !isFailed && (
            <div className="flex items-center gap-3 text-xs bg-blue-50 dark:bg-blue-900/10 p-3 rounded-sm border-l-2 border-blue-600 dark:border-blue-500">
                <Wallet size={14} className="text-blue-700 dark:text-blue-400" />
                <span className="text-blue-800 dark:text-blue-300 font-medium">{t.initiating}</span>
            </div>
        )}

        {/* Collapsible Logs Section */}
        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button 
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
            >
                {showLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Audit Logs ({transaction.logs.length})
            </button>
            
            {showLogs && (
                <div className="mt-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden">
                     {/* Log Header */}
                     <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">System Event Log</span>
                        <div className="flex items-center gap-1.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${isFailed ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
                             <span className="text-[9px] font-mono text-slate-400">{isFailed ? 'HALTED' : 'LIVE'}</span>
                        </div>
                     </div>
                     
                     {/* Scrollable Container */}
                     <div className="max-h-60 overflow-y-auto custom-scrollbar">
                         <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 shadow-sm z-10">
                                <tr className="text-[9px] text-slate-400 dark:text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                                    <th className="py-2 pl-3 font-semibold w-20">Time</th>
                                    <th className="py-2 font-semibold w-20">Level</th>
                                    <th className="py-2 font-semibold w-24">Module</th>
                                    <th className="py-2 pr-3 font-semibold">Message</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono text-[9px] divide-y divide-slate-100 dark:divide-slate-800/50">
                                {transaction.logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="py-2 pl-3 text-slate-400 dark:text-slate-500 whitespace-nowrap group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                            {formatLogTime(log.timestamp)}
                                        </td>
                                        <td className="py-2">
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold tracking-wide ${getLogLevelStyles(log.level)}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="py-2 text-slate-600 dark:text-slate-400 font-semibold">{log.module}</td>
                                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-300 break-words">{log.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                         {transaction.logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <p className="text-[10px] italic">No logs generated yet.</p>
                            </div>
                         )}
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};