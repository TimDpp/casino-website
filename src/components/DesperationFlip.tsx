import React, { useState } from 'react';
import { playChipSound, playWinSound, playBigWinSound, playBustSound } from '../utils/audio';

interface DesperationFlipProps {
  balance: number;
  onBetPlaced: (amount: number) => boolean;
  onPayout: (payout: number, netWin: number, description: string) => void;
  disabled: boolean;
}

export const DesperationFlip: React.FC<DesperationFlipProps> = ({
  balance,
  onBetPlaced,
  onPayout,
  disabled,
}) => {
  const [wager, setWager] = useState<number>(50);
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [message, setMessage] = useState<string>('Pick Heads or Tails and flip!');

  const handleFlip = () => {
    if (isFlipping || disabled) return;
    if (wager <= 0) return;

    if (!onBetPlaced(wager)) return;

    setIsFlipping(true);
    playChipSound();
    setMessage('Coin in the air...');

    setTimeout(() => {
      const outcome: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(outcome);
      setIsFlipping(false);

      if (outcome === choice) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        const payout = wager * 2;
        const net = wager;

        if (newStreak >= 3) {
          playBigWinSound();
        } else {
          playWinSound();
        }

        setMessage(`WINNER! Landed on ${outcome.toUpperCase()}! Streak: ${newStreak}x`);
        onPayout(payout, net, `Coin Flip: ${outcome.toUpperCase()} Win (Streak: ${newStreak})`);
      } else {
        setStreak(0);
        playBustSound();
        setMessage(`Bust! Landed on ${outcome.toUpperCase()}. House took the toss.`);
        onPayout(0, -wager, `Coin Flip: Loss on ${choice.toUpperCase()}`);
      }
    }, 1200);
  };

  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b border-neutral-800 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-400 tracking-wide">
            Desperation Corner: Double or Nothing
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            50/50 pure odds. 2x payout. Build high-stakes streaks!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase text-neutral-400">Streak:</span>
          <span className="font-mono text-base font-bold text-amber-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
            {streak} Win{streak !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        {/* Animated 3D Coin */}
        <div
          className={`w-32 h-32 rounded-full border-4 border-amber-300 flex items-center justify-center shadow-2xl transition-all duration-700 ${
            isFlipping
              ? 'animate-spin scale-110 bg-amber-400 text-neutral-950'
              : result === 'heads'
              ? 'bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-neutral-950'
              : result === 'tails'
              ? 'bg-gradient-to-tr from-yellow-600 via-amber-500 to-yellow-200 text-neutral-950'
              : 'bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 text-neutral-950'
          }`}
        >
          <div className="w-26 h-26 rounded-full border-2 border-dashed border-neutral-950/40 flex flex-col items-center justify-center font-serif font-black">
            <span className="text-3xl">
              {isFlipping ? '🪙' : result ? (result === 'heads' ? '🦅' : '🏛️') : '🪙'}
            </span>
            <span className="text-xs tracking-widest uppercase mt-0.5">
              {isFlipping ? 'FLIPPING' : result ? result.toUpperCase() : 'FLIP ME'}
            </span>
          </div>
        </div>

        <p className="font-mono text-sm font-semibold text-amber-300 mt-6">{message}</p>

        {/* Choice selector (Heads or Tails) */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => setChoice('heads')}
            disabled={isFlipping || disabled}
            className={`py-3 px-8 rounded-xl font-serif font-bold text-sm uppercase transition-all cursor-pointer border ${
              choice === 'heads'
                ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            🦅 Heads
          </button>
          <button
            onClick={() => setChoice('tails')}
            disabled={isFlipping || disabled}
            className={`py-3 px-8 rounded-xl font-serif font-bold text-sm uppercase transition-all cursor-pointer border ${
              choice === 'tails'
                ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-lg shadow-amber-500/20'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
            }`}
          >
            🏛️ Tails
          </button>
        </div>

        {/* Wager amounts */}
        <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
          <span className="text-xs uppercase text-neutral-400 font-mono">Toss Stake:</span>
          {[10, 25, 50, 100, 250, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => setWager(amt)}
              disabled={isFlipping || disabled}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                wager === amt
                  ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
              }`}
            >
              ${amt}
            </button>
          ))}
          <button
            onClick={() => setWager(balance > 0 ? balance : 50)}
            disabled={isFlipping || disabled}
            className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold border border-red-800 bg-red-950 text-red-300 hover:bg-red-900 cursor-pointer"
          >
            All-In (${balance})
          </button>
        </div>

        {/* Action Flip Button */}
        <div className="mt-6 w-full max-w-xs">
          <button
            onClick={handleFlip}
            disabled={isFlipping || disabled || wager <= 0}
            className={`w-full py-3.5 px-6 rounded-xl font-serif font-bold text-sm tracking-wider uppercase transition-all shadow-xl cursor-pointer ${
              isFlipping || disabled || wager <= 0
                ? 'bg-neutral-800 text-neutral-600 border border-neutral-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-amber-500/30 active:scale-98'
            }`}
          >
            {isFlipping ? 'Tossing in Air...' : `Flip For $${wager * 2}`}
          </button>
        </div>
      </div>
    </div>
  );
};
