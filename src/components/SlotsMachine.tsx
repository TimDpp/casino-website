import React, { useState } from 'react';
import {
  SlotSymbol,
  SLOT_SYMBOLS,
  getRandomSlotSymbol,
  evaluateSlotSpin,
} from '../game/casinoLogic';
import {
  playChipSound,
  playWheelTick,
  playWinSound,
  playBigWinSound,
  playBustSound,
} from '../utils/audio';

interface SlotsMachineProps {
  balance: number;
  onBetPlaced: (amount: number) => boolean;
  onPayout: (payout: number, netWin: number, description: string) => void;
  disabled: boolean;
}

export const SlotsMachine: React.FC<SlotsMachineProps> = ({
  balance,
  onBetPlaced,
  onPayout,
  disabled,
}) => {
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol]>(['7️⃣', '💎', '7️⃣']);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinBet, setSpinBet] = useState<number>(25);
  const [lastWinText, setLastWinText] = useState<string>('Pull lever or tap Spin');

  const handleSpin = () => {
    if (isSpinning || disabled) return;
    if (spinBet <= 0) return;

    if (!onBetPlaced(spinBet)) return;

    setIsSpinning(true);
    playChipSound();
    setLastWinText('Reels rolling...');

    // Final symbols
    const target1 = getRandomSlotSymbol();
    const target2 = getRandomSlotSymbol();
    const target3 = getRandomSlotSymbol();

    const intervalId = setInterval(() => {
      setReels([getRandomSlotSymbol(), getRandomSlotSymbol(), getRandomSlotSymbol()]);
      playWheelTick();
    }, 90);

    // Stop reel 1 at 1.0s, reel 2 at 1.5s, reel 3 at 2.0s
    setTimeout(() => {
      setReels((prev) => [target1, prev[1], prev[2]]);
      playWheelTick();
    }, 1000);

    setTimeout(() => {
      setReels((prev) => [target1, target2, prev[2]]);
      playWheelTick();
    }, 1500);

    setTimeout(() => {
      clearInterval(intervalId);
      const finalReels: [SlotSymbol, SlotSymbol, SlotSymbol] = [target1, target2, target3];
      setReels(finalReels);
      setIsSpinning(false);

      const evalRes = evaluateSlotSpin(finalReels, spinBet);
      if (evalRes.payout > 0) {
        if (evalRes.multiplier >= 40) {
          playBigWinSound();
        } else {
          playWinSound();
        }
        setLastWinText(`${evalRes.description}! Won $${evalRes.payout.toFixed(2)} (${evalRes.multiplier}x)`);
        onPayout(evalRes.payout, evalRes.payout - spinBet, `Slots: ${evalRes.description}`);
      } else {
        playBustSound();
        setLastWinText('No match. Spin again!');
        onPayout(0, -spinBet, 'Slots: Miss');
      }
    }, 2000);
  };

  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b border-neutral-800 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-400 tracking-wide">
            The Midnight Vault 3-Reel Slots
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Triple Crown pays 250x! Lucky 7s pays 100x!
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-neutral-500 font-mono">Last Outcome:</span>
          <p className="font-mono text-sm font-semibold text-amber-300">{lastWinText}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Slot Cabinet Visual */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 border-4 border-amber-500/60 shadow-2xl w-full max-w-md">
            {/* Top Crown Emblem */}
            <div className="text-center pb-4 mb-4 border-b border-neutral-800">
              <span className="font-serif text-amber-400 font-bold tracking-widest text-sm uppercase">
                ✦ VAULT JACKPOT 250X ✦
              </span>
            </div>

            {/* Reels Display Frame */}
            <div className="grid grid-cols-3 gap-3 bg-neutral-950 p-4 rounded-2xl border-2 border-neutral-800 shadow-inner">
              {reels.map((sym, idx) => (
                <div
                  key={idx}
                  className="h-28 sm:h-36 rounded-xl bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl relative overflow-hidden"
                >
                  <span className={`transform transition-transform ${isSpinning ? 'animate-bounce' : ''}`}>
                    {sym}
                  </span>
                  {/* Subtle reel glass reflection */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Cabinet Spin Button & Controls */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                onClick={handleSpin}
                disabled={isSpinning || disabled}
                className={`flex-1 py-4 px-6 rounded-2xl font-serif font-black text-base tracking-wider uppercase transition-all shadow-xl cursor-pointer ${
                  isSpinning || disabled
                    ? 'bg-neutral-800 text-neutral-600 border border-neutral-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-neutral-950 shadow-amber-500/30 active:scale-98'
                }`}
              >
                {isSpinning ? 'Rolling...' : `Spin Reels ($${spinBet})`}
              </button>
            </div>
          </div>
        </div>

        {/* Payout Schedule & Bet Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <h3 className="font-mono text-xs uppercase tracking-wider text-amber-400 mb-3 font-bold">
              Paytable Multipliers
            </h3>
            <div className="space-y-1.5 font-mono text-xs text-neutral-300">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>👑 👑 👑 Crown Jackpot</span>
                <span className="font-bold text-amber-400">250x ($ {(spinBet * 250).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>7️⃣ 7️⃣ 7️⃣ Lucky Sevens</span>
                <span className="font-bold text-amber-300">100x ($ {(spinBet * 100).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>💎 💎 💎 Diamond Heist</span>
                <span className="font-bold text-cyan-400">40x ($ {(spinBet * 40).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>🔔 🔔 🔔 Golden Bells</span>
                <span className="font-bold text-yellow-300">20x ($ {(spinBet * 20).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>🍋 🍋 🍋 Citrus Rush</span>
                <span className="font-bold text-lime-400">10x ($ {(spinBet * 10).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-neutral-800/60">
                <span>🍒 🍒 🍒 Cherry Trio</span>
                <span className="font-bold text-red-400">5x ($ {(spinBet * 5).toLocaleString()})</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🍒 🍒 Any 2 Cherries</span>
                <span className="font-bold text-neutral-200">2x ($ {(spinBet * 2).toLocaleString()})</span>
              </div>
            </div>
          </div>

          {/* Wager Selection */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs uppercase text-neutral-400 font-mono block mb-2 font-semibold">
              Select Bet Per Spin:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {[5, 10, 25, 50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSpinBet(amt)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                    spinBet === amt
                      ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() => setSpinBet(balance > 0 ? balance : 25)}
                className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold border border-red-800 bg-red-950 text-red-300 hover:bg-red-900 cursor-pointer"
              >
                All-In (${balance})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
