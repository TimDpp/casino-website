import React, { useState, useEffect } from 'react';
import { formatRemainingTime } from '../game/casinoLogic';
import { Briefcase, AlertOctagon, Clock, ShieldX, Undo2, Sparkles } from 'lucide-react';
import { playAlarmSound } from '../utils/audio';

interface BankruptcyModalProps {
  isOpen: boolean;
  bannedUntil: number | null;
  onWorkShift: () => void;
  onResetBankroll: () => void;
  onClose: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
  isOpen,
  bannedUntil,
  onWorkShift,
  onResetBankroll,
  onClose,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    playAlarmSound();
  }, [isOpen]);

  useEffect(() => {
    if (!bannedUntil) return;

    const tick = () => {
      const diff = Math.max(0, bannedUntil - Date.now());
      setRemainingMs(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [bannedUntil]);

  if (!isOpen) return null;

  const timeFormatted = formatRemainingTime(remainingMs);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-950 border-2 border-red-600 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl relative text-center my-8">
        {/* Top Warning Badge */}
        <div className="w-20 h-20 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-900/50">
          <AlertOctagon className="w-10 h-10 text-red-500" />
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-wider uppercase mb-2">
          BANKRUPTCY DECLARED
        </h2>
        <p className="font-mono text-sm text-red-400 uppercase tracking-widest font-semibold mb-6">
          BALANCE: $0.00 · SECURITY PROTOCOL ENGAGED
        </p>

        <p className="text-sm sm:text-base text-neutral-300 max-w-lg mx-auto leading-relaxed mb-8">
          You lost your entire bankroll! Under House By-Law #404, you are officially banned from the gaming floor for <span className="font-bold text-white">one week (7 days)</span>. To regain your license, choose your fate:
        </p>

        {/* Two Choices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
          {/* Option A: Work the 9-to-5 */}
          <div className="p-5 rounded-2xl bg-neutral-900 border-2 border-emerald-500/80 hover:border-emerald-400 transition-all flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase mb-2 font-mono">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Option 1: The 9-to-5 Grind (Recommended)</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                Clock in at the Casino Back Office as an Accounts Auditor. Audit receipts, shred memos, dodge the boss, and earn honest hourly wages!
              </p>
              <div className="bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-800/60 text-[11px] font-mono text-emerald-300 mb-4">
                ✓ Clears 7-day ban upon shift completion<br />
                ✓ Earn $300 - $600 fresh seed cash
              </div>
            </div>
            <button
              onClick={onWorkShift}
              className="w-full py-3 px-4 rounded-xl font-serif font-black text-xs uppercase bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Clock In for 9-to-5 Shift</span>
            </button>
          </div>

          {/* Option B: Serve 7-Day Ban */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-neutral-400 font-bold text-sm uppercase mb-2 font-mono">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Option 2: 7-Day Banishment</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Sit out your court-mandated penalty. The casino velvet ropes remain locked until the 7-day countdown expires.
              </p>
              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-[11px] font-mono text-amber-400 text-center mb-4">
                <span className="text-[10px] text-neutral-500 uppercase block">Remaining Exile</span>
                <span className="font-bold text-sm sm:text-base tabular-nums">
                  {timeFormatted.formatted}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700 active:scale-98 cursor-pointer text-center"
            >
              Wait Out Exile (Stay Banned)
            </button>
          </div>
        </div>

        {/* Evaluator / Testing Bypass */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <span className="font-mono">Testing & Evaluation Override:</span>
          <button
            onClick={onResetBankroll}
            className="py-1.5 px-3 rounded-lg border border-neutral-700 hover:border-amber-400/80 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Plead with Pit Boss (Reset $1,000 Bankroll)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
