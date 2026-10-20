import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { RouletteTable } from './components/RouletteTable';
import { BlackjackTable } from './components/BlackjackTable';
import { SlotsMachine } from './components/SlotsMachine';
import { DesperationFlip } from './components/DesperationFlip';
import { OfficeMinigame } from './components/OfficeMinigame';
import { BankruptcyModal } from './components/BankruptcyModal';
import { LedgerModal, TransactionRecord } from './components/LedgerModal';
import { HouseRules } from './components/HouseRules';
import {
  BankrollState,
  STARTER_BALANCE,
  BAN_DURATION_MS,
  formatRemainingTime,
  getRemainingBanMs,
} from './game/casinoLogic';
import { toggleMute, playWinSound, playBustSound, playAlarmSound } from './utils/audio';
import {
  Disc,
  Layers,
  Sparkles,
  Coins,
  Briefcase,
  AlertOctagon,
  Clock,
  ShieldAlert,
} from 'lucide-react';

type CasinoGameId = 'roulette' | 'blackjack' | 'slots' | 'flip';
type MainTab = 'floor' | 'office' | 'ledger' | 'rules';

export default function App() {
  // Persistent bankroll state
  const [bankroll, setBankroll] = useState<number>(() => {
    const saved = localStorage.getItem('velvet_balance');
    return saved !== null ? parseFloat(saved) : STARTER_BALANCE;
  });

  const [bannedUntil, setBannedUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('velvet_banned_until');
    if (!saved) return null;
    const time = parseInt(saved, 10);
    return time > Date.now() ? time : null;
  });

  const [stats, setStats] = useState<BankrollState>(() => {
    const saved = localStorage.getItem('velvet_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      balance: STARTER_BALANCE,
      isBankrupt: false,
      bannedUntil: null,
      shiftCompletedCount: 0,
      totalGambled: 0,
      biggestWin: 0,
    };
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = localStorage.getItem('velvet_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'tx-init',
        timestamp: new Date().toLocaleTimeString(),
        description: 'Starter Bankroll Credited',
        amount: STARTER_BALANCE,
        resultingBalance: STARTER_BALANCE,
      },
    ];
  });

  const [currentTab, setCurrentTab] = useState<MainTab>('floor');
  const [activeGame, setActiveGame] = useState<CasinoGameId>('roulette');
  const [showBankruptcyModal, setShowBankruptcyModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isBanned = bannedUntil !== null && bannedUntil > Date.now();
  const isBankrupt = bankroll <= 0;

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('velvet_balance', String(bankroll));
    if (bannedUntil) {
      localStorage.setItem('velvet_banned_until', String(bannedUntil));
    } else {
      localStorage.removeItem('velvet_banned_until');
    }
    localStorage.setItem(
      'velvet_stats',
      JSON.stringify({ ...stats, balance: bankroll, isBankrupt, bannedUntil })
    );
    localStorage.setItem('velvet_transactions', JSON.stringify(transactions.slice(0, 50)));
  }, [bankroll, bannedUntil, stats, isBankrupt, transactions]);

  // Sync state machine to document.body for Ultra Mode
  useEffect(() => {
    if (isBankrupt || isBanned) {
      document.body.dataset.state = 'bankrupt';
    } else if (currentTab === 'office') {
      document.body.dataset.state = 'office';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [isBankrupt, isBanned, currentTab]);

  // Keyboard shortcut M for mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check query params for autostart
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setCurrentTab('floor');
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Called when player places bet on any game
  const handleBetPlaced = (amount: number): boolean => {
    if (isBanned || bankroll <= 0) {
      setShowBankruptcyModal(true);
      return false;
    }

    if (bankroll < amount) {
      showToast('Insufficient bankroll for this wager!');
      return false;
    }

    setBankroll((prev) => Math.max(0, prev - amount));

    setStats((prev) => ({
      ...prev,
      totalGambled: prev.totalGambled + amount,
    }));

    return true;
  };

  // Called when a game concludes
  const handlePayout = (payout: number, netWin: number, description: string) => {
    setBankroll((prev) => {
      const newBal = prev + payout;

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        description,
        amount: netWin,
        resultingBalance: newBal,
      };
      setTransactions((t) => [newTx, ...t]);

      setStats((s) => ({
        ...s,
        balance: newBal,
        biggestWin: Math.max(s.biggestWin, netWin),
      }));

      // Check if player reached $0.00 and has no chips left
      if (newBal <= 0) {
        const banTime = Date.now() + BAN_DURATION_MS;
        setBannedUntil(banTime);
        setShowBankruptcyModal(true);
        playAlarmSound();
        showToast('BANKRUPTCY! Escorted from floor. 7-Day Ban or 9-to-5 Shift required!');
      }

      return newBal;
    });
  };

  // 9-to-5 Shift completed
  const handleShiftCompleted = (earnedWages: number) => {
    setBankroll((prev) => {
      const newBal = prev + earnedWages;
      setBannedUntil(null); // Clear banishment

      const newTx: TransactionRecord = {
        id: `tx-${Date.now()}-wage`,
        timestamp: new Date().toLocaleTimeString(),
        description: '9-to-5 Shift Wages & Bonuses Paid',
        amount: earnedWages,
        resultingBalance: newBal,
      };
      setTransactions((t) => [newTx, ...t]);

      setStats((s) => ({
        ...s,
        balance: newBal,
        isBankrupt: false,
        bannedUntil: null,
        shiftCompletedCount: s.shiftCompletedCount + 1,
      }));

      return newBal;
    });

    setShowBankruptcyModal(false);
    playWinSound();
    showToast(`Shift Complete! Deposited $${earnedWages.toFixed(2)} and cleared casino exile!`);
  };

  // Testing reset override
  const handleResetBankroll = () => {
    setBankroll(STARTER_BALANCE);
    setBannedUntil(null);
    setShowBankruptcyModal(false);

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}-reset`,
      timestamp: new Date().toLocaleTimeString(),
      description: 'Pit Boss Grace (Reset to $1,000)',
      amount: STARTER_BALANCE,
      resultingBalance: STARTER_BALANCE,
    };
    setTransactions((prev) => [newTx, ...prev]);

    setStats((prev) => ({
      ...prev,
      balance: STARTER_BALANCE,
      isBankrupt: false,
      bannedUntil: null,
    }));

    showToast('Bankroll restored to $1,000.00. Good luck!');
  };

  const remainingBanMs = getRemainingBanMs(bannedUntil);
  const banTimeFormatted = formatRemainingTime(remainingBanMs);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Universal Top Bar */}
      <TopBar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        balance={bankroll}
        isBankrupt={isBankrupt}
        isBanned={isBanned}
        onOpenCashierOrBail={() => {
          if (isBankrupt || isBanned) {
            setShowBankruptcyModal(true);
          } else {
            setCurrentTab('ledger');
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Bankruptcy Warning Strip if user is currently banned/bankrupt */}
        {(isBanned || isBankrupt) && (
          <div className="p-4 rounded-2xl bg-red-950/80 border-2 border-red-600 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <h3 className="font-serif font-bold text-white text-base">
                  CASINO ACCESS SUSPENDED · 7-DAY EXILE ACTIVE
                </h3>
                <p className="text-xs text-red-200 mt-0.5">
                  Remaining Exile: <span className="font-mono font-bold">{banTimeFormatted.formatted}</span>. Complete a 9-to-5 shift to lift suspension immediately!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setCurrentTab('office')}
                className="py-2 px-4 rounded-xl font-serif font-bold text-xs uppercase bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Work 9-to-5 Now</span>
              </button>
              <button
                onClick={() => setShowBankruptcyModal(true)}
                className="py-2 px-3 rounded-xl border border-red-500/70 hover:bg-red-900/50 text-red-200 font-mono text-xs cursor-pointer"
              >
                View Penalty
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Casino Floor */}
        {currentTab === 'floor' && (
          <div className="space-y-6">
            {/* Game Selector Sub-Nav */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800">
              <button
                onClick={() => setActiveGame('roulette')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  activeGame === 'roulette'
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <Disc className="w-4 h-4" />
                <span>European Roulette</span>
              </button>

              <button
                onClick={() => setActiveGame('blackjack')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  activeGame === 'blackjack'
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Blackjack 21</span>
              </button>

              <button
                onClick={() => setActiveGame('slots')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  activeGame === 'slots'
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>The Midnight Vault (Slots)</span>
              </button>

              <button
                onClick={() => setActiveGame('flip')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                  activeGame === 'flip'
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Desperation Corner (Coin Flip)</span>
              </button>
            </div>

            {/* Game Canvas / Table Container */}
            <div className="relative">
              {/* Velvet Rope Lock Overlay if Banned */}
              {isBanned && (
                <div className="absolute inset-0 z-30 bg-neutral-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-red-800/80">
                  <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center mb-4">
                    <AlertOctagon className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-white mb-2">
                    TABLES LOCKED BY CASINO SECURITY
                  </h3>
                  <p className="text-sm text-neutral-300 max-w-md mb-6 leading-relaxed">
                    You went bankrupt! The 7-day exclusion policy is active. You cannot place bets until exile expires or you clock in for a 9-to-5 shift.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      onClick={() => setCurrentTab('office')}
                      className="py-3 px-8 rounded-xl font-serif font-black text-xs uppercase bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Clock In for 9-to-5 Shift (Expedite Bail)</span>
                    </button>
                    <button
                      onClick={handleResetBankroll}
                      className="py-3 px-4 rounded-xl border border-neutral-700 hover:border-amber-400 bg-neutral-900 text-neutral-300 font-mono text-xs transition-colors cursor-pointer"
                    >
                      Testing: Reset $1,000
                    </button>
                  </div>
                </div>
              )}

              {/* Render Active Selected Game */}
              {activeGame === 'roulette' && (
                <RouletteTable
                  balance={bankroll}
                  onBetPlaced={handleBetPlaced}
                  onPayout={handlePayout}
                  disabled={isBanned}
                />
              )}

              {activeGame === 'blackjack' && (
                <BlackjackTable
                  balance={bankroll}
                  onBetPlaced={handleBetPlaced}
                  onPayout={handlePayout}
                  disabled={isBanned}
                />
              )}

              {activeGame === 'slots' && (
                <SlotsMachine
                  balance={bankroll}
                  onBetPlaced={handleBetPlaced}
                  onPayout={handlePayout}
                  disabled={isBanned}
                />
              )}

              {activeGame === 'flip' && (
                <DesperationFlip
                  balance={bankroll}
                  onBetPlaced={handleBetPlaced}
                  onPayout={handlePayout}
                  disabled={isBanned}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: The 9-to-5 Back-Office Cubicle */}
        {currentTab === 'office' && (
          <OfficeMinigame
            isBankrupt={isBankrupt || isBanned}
            onShiftCompleted={handleShiftCompleted}
            onReturnToFloor={() => setCurrentTab('floor')}
          />
        )}

        {/* Tab 3: Ledger & Stats */}
        {currentTab === 'ledger' && (
          <LedgerModal
            stats={stats}
            transactions={transactions}
            onClose={() => setCurrentTab('floor')}
          />
        )}

        {/* Tab 4: Rules & FAQ */}
        {currentTab === 'rules' && <HouseRules />}
      </main>

      {/* Bankruptcy Modal */}
      <BankruptcyModal
        isOpen={showBankruptcyModal}
        bannedUntil={bannedUntil}
        onWorkShift={() => {
          setShowBankruptcyModal(false);
          setCurrentTab('office');
        }}
        onResetBankroll={handleResetBankroll}
        onClose={() => setShowBankruptcyModal(false)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-amber-500/80 text-amber-200 px-5 py-3 rounded-xl shadow-2xl font-mono text-xs max-w-sm flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer conforming to design constitution: quiet copyright and real actions */}
      <footer className="w-full border-t border-neutral-900 bg-neutral-950 py-6 px-4 sm:px-8 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>The Velvet Ledger · Free-to-Play No-Deposit Simulation · 100% Virtual Currency</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab('rules')}
              className="hover:text-neutral-300 transition-colors cursor-pointer"
            >
              House By-Laws
            </button>
            <span>·</span>
            <button
              onClick={handleResetBankroll}
              className="hover:text-amber-400 transition-colors cursor-pointer"
              title="Reset starter bankroll for testing"
            >
              Reset $1,000 Bankroll
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
