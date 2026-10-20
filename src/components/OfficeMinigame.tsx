import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  OfficeShiftState,
  createInitialShiftState,
  formatHour,
  processExpenseDecision,
  SAMPLE_EXPENSES,
  ExpenseReceipt,
} from '../game/officeLogic';
import {
  playPunchClock,
  playStampSound,
  playShredSound,
  playWinSound,
  playBigWinSound,
  playBustSound,
  playAlarmSound,
} from '../utils/audio';
import {
  Briefcase,
  CheckCircle,
  XCircle,
  FileText,
  Coffee,
  AlertTriangle,
  Award,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface OfficeMinigameProps {
  isBankrupt: boolean;
  onShiftCompleted: (earnedWages: number) => void;
  onReturnToFloor: () => void;
}

export const OfficeMinigame: React.FC<OfficeMinigameProps> = ({
  isBankrupt,
  onShiftCompleted,
  onReturnToFloor,
}) => {
  const [shiftState, setShiftState] = useState<OfficeShiftState>(createInitialShiftState);
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('Review the audit receipt and click Approve or Reject.');
  const [shreddedCount, setShreddedCount] = useState<number>(0);
  const [isShredding, setIsShredding] = useState<boolean>(false);
  const [bossMessage, setBossMessage] = useState<string | null>(null);
  const [showPaycheckModal, setShowPaycheckModal] = useState<boolean>(false);
  const [finalEarnings, setFinalEarnings] = useState<number>(0);

  const receipt: ExpenseReceipt = SAMPLE_EXPENSES[currentReceiptIndex % SAMPLE_EXPENSES.length];

  // Boss patrolling random timer
  const bossPatrolTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcuts (A for Approve, R for Reject, Space for Camouflage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shiftState.isClockedIn || shiftState.isShiftComplete) return;

      if (e.key === 'a' || e.key === 'A') {
        handleExpenseDecision(true);
      } else if (e.key === 'r' || e.key === 'R') {
        handleExpenseDecision(false);
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleCamouflage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Boss random patrol loop
  useEffect(() => {
    if (!shiftState.isClockedIn || shiftState.isShiftComplete) return;

    const scheduleBossPatrol = () => {
      const delay = Math.floor(Math.random() * 8000) + 7000; // 7 to 15 seconds
      bossPatrolTimerRef.current = setTimeout(() => {
        triggerBossPatrol();
      }, delay);
    };

    scheduleBossPatrol();

    return () => {
      if (bossPatrolTimerRef.current) clearTimeout(bossPatrolTimerRef.current);
    };
  }, [shiftState.isClockedIn, shiftState.isShiftComplete]);

  const triggerBossPatrol = () => {
    setShiftState((prev) => ({ ...prev, bossApproaching: true }));
    playAlarmSound();
    setBossMessage('⚠️ PIT DIRECTOR APPROACHING CUBICLE! LOOK BUSY!');

    // Boss inspects in 3 seconds
    setTimeout(() => {
      setShiftState((cur) => {
        if (!cur.isClockedIn || cur.isShiftComplete) return cur;

        if (cur.isCamouflaged) {
          playWinSound();
          setBossMessage('Boss: "Impeccable spreadsheet diligence, Jenkins! Have a $25 bonus."');
          return {
            ...cur,
            bossApproaching: false,
            earnings: cur.earnings + 25,
            bossEvasions: cur.bossEvasions + 1,
          };
        } else {
          playBustSound();
          setBossMessage('Boss: "WHAT IS THIS?! YOU ARE DOCKED $20 FOR DAYDREAMING!"');
          return {
            ...cur,
            bossApproaching: false,
            earnings: Math.max(0, cur.earnings - 20),
          };
        }
      });

      // Clear boss message after 3.5s
      setTimeout(() => {
        setBossMessage(null);
      }, 3500);
    }, 2800);
  };

  const handleClockIn = () => {
    playPunchClock();
    setShiftState((prev) => ({
      ...createInitialShiftState(),
      isClockedIn: true,
      currentHour: 9,
    }));
    setShowPaycheckModal(false);
    setFeedbackText('Clocked in at 9:00 AM! Review audit receipts or shred memos to advance your shift.');
  };

  const toggleCamouflage = () => {
    setShiftState((prev) => ({ ...prev, isCamouflaged: !prev.isCamouflaged }));
  };

  const handleExpenseDecision = (approved: boolean) => {
    if (!shiftState.isClockedIn || shiftState.isShiftComplete) return;
    playStampSound();

    const { newState, isCorrect, feedback } = processExpenseDecision(shiftState, receipt, approved);

    setShiftState(newState);
    setFeedbackText(feedback);
    setCurrentReceiptIndex((prev) => prev + 1);

    if (isCorrect) {
      playWinSound();
    } else {
      playBustSound();
    }

    if (newState.isShiftComplete) {
      handleShiftFinished(newState.earnings);
    }
  };

  const handleShredDocument = () => {
    if (!shiftState.isClockedIn || shiftState.isShiftComplete || isShredding) return;
    setIsShredding(true);
    playShredSound();

    setTimeout(() => {
      setIsShredding(false);
      setShreddedCount((prev) => prev + 1);
      playWinSound();

      setShiftState((prev) => {
        const newTasks = prev.tasksCompleted + 1;
        let newHour = prev.currentHour;
        let complete = prev.isShiftComplete;
        let wage = 20;

        if (newTasks % 2 === 0 && newHour < 17) {
          newHour += 1;
          wage += prev.hourlyWage;
          if (newHour >= 17) complete = true;
        }

        const updated: OfficeShiftState = {
          ...prev,
          tasksCompleted: newTasks,
          currentHour: newHour,
          earnings: prev.earnings + wage,
          isShiftComplete: complete,
        };

        if (complete) {
          handleShiftFinished(updated.earnings);
        }
        return updated;
      });

      setFeedbackText('Confidential document micro-shredded! +$20 Discretion Bonus.');
    }, 450);
  };

  const handleBrewCoffee = () => {
    if (!shiftState.isClockedIn || shiftState.isShiftComplete) return;
    playPunchClock();

    setShiftState((prev) => {
      const nextHour = Math.min(17, prev.currentHour + 1);
      const complete = nextHour >= 17;
      const updated: OfficeShiftState = {
        ...prev,
        currentHour: nextHour,
        earnings: prev.earnings + prev.hourlyWage,
        isShiftComplete: complete,
      };

      if (complete) {
        handleShiftFinished(updated.earnings);
      }
      return updated;
    });

    setFeedbackText('Caffeine spike! Power-worked 1 full hour (+1 Hour Shift Jump, +$40).');
  };

  const handleShiftFinished = (totalPay: number) => {
    playPunchClock();
    playBigWinSound();
    setFinalEarnings(totalPay);
    setShowPaycheckModal(true);
  };

  const handleCollectPaycheckAndExit = () => {
    onShiftCompleted(finalEarnings);
    setShowPaycheckModal(false);
    onReturnToFloor();
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, ((shiftState.currentHour - 9) / (17 - 9)) * 100)
  );

  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b border-neutral-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-emerald-400 tracking-wide flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-emerald-400" />
              The Back-Office 9-to-5 Cubicle
            </h2>
            {isBankrupt && (
              <span className="text-xs bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                COURT-ORDERED DEBT RELIEF
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Work an honest 9:00 AM – 5:00 PM shift to erase bankruptcy, earn real cash, or fund your next run!
          </p>
        </div>

        {/* Live Shift Readout */}
        <div className="flex items-center gap-4 bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800">
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 block">Shift Clock</span>
            <span className="font-mono text-base font-bold text-amber-300">
              {shiftState.isClockedIn ? formatHour(shiftState.currentHour) : 'NOT CLOCKED IN'}
            </span>
          </div>
          <div className="h-8 w-px bg-neutral-800" />
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 block">Accrued Wage</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              ${shiftState.earnings.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Clock In Hero Banner if not clocked in */}
      {!shiftState.isClockedIn && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center text-center my-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500/60 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">
            Timecard Punch Station (Cubicle 4B)
          </h3>
          <p className="text-sm text-neutral-400 max-w-lg mb-6 leading-relaxed">
            {isBankrupt
              ? 'You are currently bankrupt and banned from the casino floor for 7 days. Clock in for your 9-to-5 work shift now to pay off your penalty and earn back a fresh bankroll!'
              : 'Want to build your bankroll without risking chips? Work a shift as a Casino Vault Auditor to earn honest hourly pay!'}
          </p>
          <button
            onClick={handleClockIn}
            className="py-4 px-10 rounded-xl font-serif font-black text-base uppercase bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer flex items-center gap-3"
          >
            <span>Punch Clock & Begin 9-to-5</span>
            <span className="text-xs font-mono bg-emerald-950/60 px-2 py-0.5 rounded text-emerald-200">
              $40/hr Base
            </span>
          </button>
        </div>
      )}

      {/* Active Work Shift Interface */}
      {shiftState.isClockedIn && (
        <div className="space-y-6">
          {/* Workday Progress Bar */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Workday Timeline: 9:00 AM to 5:00 PM
              </span>
              <span className="text-amber-400 font-bold">{Math.round(progressPercent)}% Shift Completed</span>
            </div>
            <div className="w-full bg-neutral-800 h-3.5 rounded-full overflow-hidden border border-neutral-700/60">
              <div
                className="bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-1">
              <span>9 AM (Clock In)</span>
              <span>12 PM (Lunch)</span>
              <span>3 PM (Audit Review)</span>
              <span>5 PM (Shift End)</span>
            </div>
          </div>

          {/* Boss Patrol Warning Alert */}
          {shiftState.bossApproaching && (
            <div className="p-4 rounded-xl bg-red-950/90 border-2 border-red-500 flex items-center justify-between gap-4 animate-bounce">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-200 block">
                    🚨 SURVEILLANCE WARNING: PIT DIRECTOR APPROACHING!
                  </span>
                  <span className="text-xs text-red-300">
                    Press <span className="font-bold underline">Spacebar</span> or tap the button to toggle Camouflage Spreadsheet mode!
                  </span>
                </div>
              </div>
              <button
                onClick={toggleCamouflage}
                className="py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase shrink-0 cursor-pointer shadow-lg"
              >
                {shiftState.isCamouflaged ? 'Spreadsheet Active!' : 'LOOK BUSY NOW! (Space)'}
              </button>
            </div>
          )}

          {bossMessage && !shiftState.bossApproaching && (
            <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-600 text-amber-200 text-xs font-mono">
              {bossMessage}
            </div>
          )}

          {/* If Camouflage Mode is on: Fake Excel Spreadsheet! */}
          {shiftState.isCamouflaged ? (
            <div className="p-6 rounded-2xl bg-[#107c41] text-white border-4 border-[#0b5c30] shadow-2xl font-mono">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Microsoft Excel - [Q3_EBITDA_Casino_Audit_Model.xlsx]</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Protected Sheet</span>
                </div>
                <button
                  onClick={toggleCamouflage}
                  className="py-1 px-3 bg-white text-[#107c41] rounded font-bold text-xs hover:bg-neutral-100 cursor-pointer"
                >
                  Exit Camouflage (Back to Desk)
                </button>
              </div>

              <div className="bg-white text-neutral-900 rounded-lg p-3 text-xs overflow-x-auto shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-200 text-neutral-700">
                      <th className="p-1 border border-neutral-300">Cell</th>
                      <th className="p-1 border border-neutral-300">Metric Description</th>
                      <th className="p-1 border border-neutral-300">Q1 Actual</th>
                      <th className="p-1 border border-neutral-300">Q2 Target</th>
                      <th className="p-1 border border-neutral-300">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 border border-neutral-200 font-bold">A1:E1</td>
                      <td className="p-1 border border-neutral-200">Gross Gaming Revenue (GGR)</td>
                      <td className="p-1 border border-neutral-200">$4,820,119.00</td>
                      <td className="p-1 border border-neutral-200">$5,200,000.00</td>
                      <td className="p-1 border border-neutral-200 text-emerald-700">+7.8%</td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-neutral-200 font-bold">A2:E2</td>
                      <td className="p-1 border border-neutral-200">Dealer Gratuity Pool Overhead</td>
                      <td className="p-1 border border-neutral-200">$184,330.00</td>
                      <td className="p-1 border border-neutral-200">$190,000.00</td>
                      <td className="p-1 border border-neutral-200 text-neutral-600">-3.0%</td>
                    </tr>
                    <tr>
                      <td className="p-1 border border-neutral-200 font-bold">A3:E3</td>
                      <td className="p-1 border border-neutral-200">Bankrupt Patron Debt Recovery</td>
                      <td className="p-1 border border-neutral-200">$64,120.00</td>
                      <td className="p-1 border border-neutral-200">$80,000.00</td>
                      <td className="p-1 border border-neutral-200 text-emerald-700">+19.8% (9-to-5 Active)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-white/80 mt-3 text-center">
                Boss will pass by believing you are doing deep mathematical analysis!
              </p>
            </div>
          ) : (
            /* Standard Cubicle Desk Interface */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Task 1: Audit Receipt Station */}
              <div className="lg:col-span-8 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Task 1: Anti-Fraud Expense Audit
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      Streak: <span className="text-amber-400 font-bold">{shiftState.accuracyStreak}</span>
                    </span>
                  </div>

                  {/* Receipt Paper Card */}
                  <div className="p-5 rounded-xl bg-amber-50 text-neutral-900 border border-amber-200 shadow-lg font-mono relative">
                    <div className="text-center pb-2 mb-3 border-b border-dashed border-neutral-400">
                      <span className="text-xs uppercase tracking-widest font-bold block text-neutral-600">
                        THE VELVET LEDGER CASINO
                      </span>
                      <span className="text-[10px] text-neutral-500">Internal Accounts Payable Voucher #{receipt.id}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Payee / Vendor:</span>
                        <span className="font-bold text-neutral-900">{receipt.vendor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Description:</span>
                        <span className="font-semibold text-neutral-800 text-right max-w-xs">{receipt.item}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-neutral-300 font-bold text-sm">
                        <span>Total Claimed:</span>
                        <span className="text-neutral-950">${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-dashed border-neutral-400 text-[10px] text-neutral-500 text-center">
                      Compliance Policy: Reject private luxuries, bribes, and unapproved charters over $500.
                    </div>
                  </div>

                  {/* Feedback line */}
                  <p className="font-mono text-xs text-neutral-300 mt-3 italic">{feedbackText}</p>
                </div>

                {/* Stamping Buttons */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={() => handleExpenseDecision(true)}
                    className="py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer border border-emerald-500"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve (A)</span>
                  </button>
                  <button
                    onClick={() => handleExpenseDecision(false)}
                    className="py-3.5 px-4 rounded-xl bg-red-700 hover:bg-red-600 text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer border border-red-500"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject / Flag (R)</span>
                  </button>
                </div>
              </div>

              {/* Task 2 & Office Utilities */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Shredder Station */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold mb-2">
                      Task 2: Confidential Paper Shredder
                    </h4>
                    <p className="text-xs text-neutral-400 mb-3">
                      Shred sensitive audit notices before gaming regulators show up. (Shredded: {shreddedCount})
                    </p>
                  </div>
                  <button
                    onClick={handleShredDocument}
                    disabled={isShredding}
                    className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-mono text-xs font-bold uppercase transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isShredding ? 'Shredding Crunch...' : 'Feed Shredder (+$20)'}</span>
                  </button>
                </div>

                {/* Espresso Machine */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-yellow-400" />
                      Espresso Fuel Station
                    </h4>
                    <p className="text-xs text-neutral-400 mb-3">
                      Drink an espresso shot to fast-forward 1 hour of the work shift with guaranteed wage!
                    </p>
                  </div>
                  <button
                    onClick={handleBrewCoffee}
                    className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 font-mono text-xs font-bold uppercase transition-all active:scale-98 cursor-pointer"
                  >
                    Brew & Fast-Forward (+1 Hr)
                  </button>
                </div>

                {/* Camouflage Mode Trigger */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold mb-1">
                    Emergency Camouflage
                  </h4>
                  <p className="text-xs text-neutral-400 mb-3">
                    Toggle fake spreadsheet to fool the pit director during inspections.
                  </p>
                  <button
                    onClick={toggleCamouflage}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#107c41] hover:bg-[#0b5c30] text-white font-mono text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Look Busy (Alt-Tab)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paycheck / Shift Completion Modal */}
      {showPaycheckModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-white mb-1">
              5:00 PM PUNCH-OUT!
            </h3>
            <p className="font-mono text-xs uppercase text-emerald-400 tracking-wider mb-6 font-semibold">
              SHIFT COMPLETED · PAYCHECK ISSUED
            </p>

            <div className="bg-neutral-950 rounded-2xl p-5 border border-neutral-800 text-left space-y-2 mb-6 font-mono text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Base Wage (8 Hours @ $40/hr):</span>
                <span className="font-bold text-white">$320.00</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Task & Audit Performance Bonuses:</span>
                <span className="font-bold text-emerald-400">+${Math.max(0, finalEarnings - 320).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-neutral-800 text-sm font-bold text-white">
                <span>Total Net Paycheck:</span>
                <span className="text-amber-400 text-base">${finalEarnings.toFixed(2)}</span>
              </div>
            </div>

            {isBankrupt && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 mb-6 text-left">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>CASINO EXILE REVOKED!</span>
                </div>
                <p className="text-xs text-neutral-300">
                  By completing your 9-to-5 shift, your 7-day bankruptcy ban has been wiped clean! Security has re-opened the velvet ropes.
                </p>
              </div>
            )}

            <button
              onClick={handleCollectPaycheckAndExit}
              className="w-full py-4 px-6 rounded-xl font-serif font-black text-sm uppercase bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 shadow-xl shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
            >
              Collect Paycheck (${finalEarnings.toFixed(2)}) & Return to Casino Floor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
