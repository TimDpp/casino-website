import React from 'react';
import { BankrollState } from '../game/casinoLogic';
import { Sparkles, DollarSign, Briefcase, TrendingUp, ShieldAlert, History } from 'lucide-react';

export interface TransactionRecord {
  id: string;
  timestamp: string;
  description: string;
  amount: number; // positive for win/wage, negative for loss
  resultingBalance: number;
}

interface LedgerModalProps {
  stats: BankrollState;
  transactions: TransactionRecord[];
  onClose: () => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  stats,
  transactions,
  onClose,
}) => {
  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-6 border-b border-neutral-800 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-400 tracking-wide flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Financial Audit Ledger & Player Statistics
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time accounting of all wagers, slot jackpots, and 9-to-5 cubicle earnings.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-1">Current Bankroll</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
            ${stats.balance.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-1">Total Wagered</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-neutral-200 tabular-nums">
            ${stats.totalGambled.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-1">Biggest Single Win</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">
            ${stats.biggestWin.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <span className="text-[10px] uppercase font-mono text-neutral-500 block mb-1">9-to-5 Shifts Completed</span>
          <span className="font-mono text-xl sm:text-2xl font-bold text-blue-400 tabular-nums">
            {stats.shiftCompletedCount} Shift{stats.shiftCompletedCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Transaction History
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            {transactions.length} entries recorded
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              No transactions yet. Place a bet on the floor or clock in for a shift!
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-neutral-200">{tx.description}</span>
                  <span className="text-[10px] text-neutral-500">{tx.timestamp}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span
                    className={`font-bold tabular-nums ${
                      tx.amount > 0
                        ? 'text-emerald-400'
                        : tx.amount < 0
                        ? 'text-red-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : '$0.00'}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Bal: ${tx.resultingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
