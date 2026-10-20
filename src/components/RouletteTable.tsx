import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ROULETTE_NUMBERS,
  RED_NUMBERS,
  RouletteBet,
  RouletteBetType,
  calculateRoulettePayout,
  getRouletteNumberColor,
} from '../game/casinoLogic';
import { playChipSound, playWheelTick, playWinSound, playBustSound } from '../utils/audio';

interface RouletteTableProps {
  balance: number;
  onBetPlaced: (amount: number) => boolean; // returns true if balance sufficient
  onPayout: (payout: number, netWin: number, description: string) => void;
  disabled: boolean;
}

const CHIP_DENOMINATIONS = [5, 25, 50, 100, 250, 500];

export const RouletteTable: React.FC<RouletteTableProps> = ({
  balance,
  onBetPlaced,
  onPayout,
  disabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(25);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [lastRolled, setLastRolled] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([17, 4, 32, 0, 26]);

  const wheelAngleRef = useRef<number>(0);
  const ballAngleRef = useRef<number>(0);
  const ballRadiusRef = useRef<number>(100);
  const animFrameRef = useRef<number | null>(null);

  const totalBetAmount = bets.reduce((acc, b) => acc + b.amount, 0);

  // Render Roulette Wheel Canvas
  const drawWheel = useCallback((wheelAngle: number, ballAngle: number, ballR: number, ballVisible = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.45;

    ctx.clearRect(0, 0, size, size);

    // Outer mahogany rim
    const outerGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius);
    outerGrad.addColorStop(0, '#3e2723');
    outerGrad.addColorStop(0.7, '#241411');
    outerGrad.addColorStop(1, '#110a08');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Gold track border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Number pockets
    const totalPockets = ROULETTE_NUMBERS.length;
    const pocketArc = (Math.PI * 2) / totalPockets;

    for (let i = 0; i < totalPockets; i++) {
      const num = ROULETTE_NUMBERS[i];
      const startA = wheelAngle + i * pocketArc;
      const endA = startA + pocketArc;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius * 0.85, startA, endA);
      ctx.closePath();

      if (num === 0) {
        ctx.fillStyle = '#059669'; // Green
      } else if (RED_NUMBERS.has(num)) {
        ctx.fillStyle = '#dc2626'; // Red
      } else {
        ctx.fillStyle = '#18181b'; // Black
      }
      ctx.fill();

      // Divider lines
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Number text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + pocketArc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(String(num), radius * 0.8, 4);
      ctx.restore();
    }

    // Inner bronze turret
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.45);
    innerGrad.addColorStop(0, '#fef08a');
    innerGrad.addColorStop(0.3, '#d4af37');
    innerGrad.addColorStop(0.8, '#854d0e');
    innerGrad.addColorStop(1, '#422006');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 4 Turret handles
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      const hAngle = wheelAngle + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hAngle) * radius * 0.38, cy + Math.sin(hAngle) * radius * 0.38);
      ctx.stroke();
    }

    // Draw Ivory Ball
    if (ballVisible) {
      const bx = cx + Math.cos(ballAngle) * ballR;
      const by = cy + Math.sin(ballAngle) * ballR;

      ctx.beginPath();
      ctx.arc(bx, by, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball highlight
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    drawWheel(wheelAngleRef.current, ballAngleRef.current, ballRadiusRef.current, true);
  }, [drawWheel]);

  const addBet = (type: RouletteBetType, target?: number) => {
    if (disabled || isSpinning) return;
    if (balance < selectedChip) {
      alert('Insufficient bankroll for this chip denomination!');
      return;
    }

    playChipSound();
    setBets((prev) => {
      const existing = prev.find((b) => b.type === type && b.target === target);
      if (existing) {
        return prev.map((b) =>
          b === existing ? { ...b, amount: b.amount + selectedChip } : b
        );
      }
      return [...prev, { type, target, amount: selectedChip }];
    });
  };

  const clearBets = () => {
    if (isSpinning) return;
    setBets([]);
  };

  const handleSpin = () => {
    if (isSpinning || bets.length === 0 || disabled) return;

    if (!onBetPlaced(totalBetAmount)) {
      return;
    }

    setIsSpinning(true);
    playChipSound();

    // Pick winning number
    const winningIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const winningNumber = ROULETTE_NUMBERS[winningIndex];

    const pocketArc = (Math.PI * 2) / ROULETTE_NUMBERS.length;
    // Calculate final target wheel and ball angle
    const targetPocketAngle = -(winningIndex * pocketArc + pocketArc / 2);

    const spinDuration = 3800; // ms
    const startTime = performance.now();
    const initialWheelSpeed = 0.08;
    const initialBallSpeed = -0.16;

    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      wheelAngleRef.current += initialWheelSpeed * (1 - easeOut * 0.7);
      ballAngleRef.current += initialBallSpeed * (1 - easeOut * 0.85);

      // Ball spiral inward
      const startR = 120;
      const endR = 92;
      ballRadiusRef.current = startR - (startR - endR) * easeOut;

      // Audio tick every pocket transition
      if (currentTime - lastTickTime > 70 + progress * 200) {
        playWheelTick();
        lastTickTime = currentTime;
      }

      drawWheel(wheelAngleRef.current, ballAngleRef.current, ballRadiusRef.current, true);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        setIsSpinning(false);
        setLastRolled(winningNumber);
        setHistory((prev) => [winningNumber, ...prev.slice(0, 7)]);

        // Calculate total winnings
        let totalReturn = 0;
        bets.forEach((bet) => {
          totalReturn += calculateRoulettePayout(bet, winningNumber);
        });

        const net = totalReturn - totalBetAmount;
        const color = getRouletteNumberColor(winningNumber);
        const desc = `Roulette: ${winningNumber} (${color.toUpperCase()})`;

        if (totalReturn > 0) {
          playWinSound();
          onPayout(totalReturn, net, `${desc} - Won $${net.toFixed(2)}!`);
        } else {
          playBustSound();
          onPayout(0, -totalBetAmount, `${desc} - House takes bet.`);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const getBetOnItem = (type: RouletteBetType, target?: number) => {
    const found = bets.find((b) => b.type === type && b.target === target);
    return found ? found.amount : 0;
  };

  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col lg:flex-row items-center gap-6 justify-between mb-6 pb-6 border-b border-neutral-800">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-400 tracking-wide">
            Grand European Roulette
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Standard 37-pocket single zero wheel. 35:1 Straight up, 1:1 Outside.
          </p>
        </div>

        {/* Recent Rolled Numbers Strip */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono">History:</span>
          <div className="flex items-center gap-1.5">
            {history.map((num, i) => {
              const col = getRouletteNumberColor(num);
              return (
                <span
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-md ${
                    col === 'green'
                      ? 'bg-emerald-600 text-white'
                      : col === 'red'
                      ? 'bg-red-600 text-white'
                      : 'bg-neutral-800 text-white border border-neutral-700'
                  }`}
                >
                  {num}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Wheel Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative p-2 rounded-full bg-gradient-to-b from-amber-700/30 to-neutral-950 border-2 border-amber-600/40 shadow-inner">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="rounded-full shadow-2xl cursor-default"
            />
            {lastRolled !== null && !isSpinning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`px-3 py-1.5 rounded-lg border text-lg font-bold font-mono tracking-wider shadow-2xl ${
                    getRouletteNumberColor(lastRolled) === 'green'
                      ? 'bg-emerald-900/90 border-emerald-500 text-emerald-200'
                      : getRouletteNumberColor(lastRolled) === 'red'
                      ? 'bg-red-900/90 border-red-500 text-red-200'
                      : 'bg-neutral-900/90 border-neutral-600 text-white'
                  }`}
                >
                  RESULT: {lastRolled}
                </div>
              </div>
            )}
          </div>

          {/* Action Spin & Clear Buttons */}
          <div className="mt-6 flex items-center gap-3 w-full max-w-xs">
            <button
              onClick={handleSpin}
              disabled={isSpinning || bets.length === 0 || disabled}
              className={`flex-1 py-3 px-6 rounded-xl font-serif font-bold text-sm tracking-wider uppercase transition-all shadow-lg cursor-pointer ${
                isSpinning || bets.length === 0 || disabled
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-amber-500/20 active:scale-98'
              }`}
            >
              {isSpinning ? 'Wheel Spinning...' : `Spin Wheel ($${totalBetAmount})`}
            </button>
            <button
              onClick={clearBets}
              disabled={isSpinning || bets.length === 0}
              className="py-3 px-4 rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-800/80 text-neutral-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Felt Betting Board */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Chip Denomination Picker */}
          <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-neutral-800">
            <span className="text-xs text-neutral-400 font-mono uppercase mr-1">Chip:</span>
            {CHIP_DENOMINATIONS.map((chip) => (
              <button
                key={chip}
                onClick={() => setSelectedChip(chip)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-all border cursor-pointer ${
                  selectedChip === chip
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 scale-105 shadow-md shadow-amber-500/30'
                    : 'bg-neutral-800/90 text-neutral-300 border-neutral-700 hover:border-amber-400/60'
                }`}
              >
                ${chip}
              </button>
            ))}
            <button
              onClick={() => setSelectedChip(balance > 0 ? balance : 25)}
              className="px-3 py-1.5 rounded-full font-mono text-xs font-bold border border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900/60 cursor-pointer"
            >
              All-In (${balance})
            </button>
          </div>

          {/* Numbers Grid (Green Felt style) */}
          <div className="bg-[#0b3823] p-3 sm:p-4 rounded-xl border-2 border-[#166534] shadow-inner">
            {/* Zero slot */}
            <div className="grid grid-cols-12 gap-1 mb-1">
              <button
                onClick={() => addBet('straight', 0)}
                className="col-span-12 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500 transition-colors relative"
              >
                <span>0 (Green)</span>
                {getBetOnItem('straight', 0) > 0 && (
                  <span className="absolute right-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-bold">
                    ${getBetOnItem('straight', 0)}
                  </span>
                )}
              </button>
            </div>

            {/* 1-36 Numbers in 3 columns of 12 */}
            <div className="grid grid-cols-12 gap-1 text-center font-mono font-bold text-xs">
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
                const isRed = RED_NUMBERS.has(num);
                const betOnNum = getBetOnItem('straight', num);
                return (
                  <button
                    key={num}
                    onClick={() => addBet('straight', num)}
                    className={`h-9 rounded flex flex-col items-center justify-center relative transition-all border cursor-pointer ${
                      isRed
                        ? 'bg-red-700 hover:bg-red-600 text-white border-red-500/70'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700'
                    }`}
                  >
                    <span>{num}</span>
                    {betOnNum > 0 && (
                      <span className="absolute -top-1 -right-1 px-1 rounded-full bg-amber-400 text-neutral-950 text-[9px] font-extrabold shadow">
                        ${betOnNum}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Columns (2:1) */}
            <div className="grid grid-cols-3 gap-1 mt-2 text-center font-mono text-xs">
              <button
                onClick={() => addBet('col1')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 relative cursor-pointer"
              >
                1st Column (2:1)
                {getBetOnItem('col1') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('col1')})</span>
                )}
              </button>
              <button
                onClick={() => addBet('col2')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 relative cursor-pointer"
              >
                2nd Column (2:1)
                {getBetOnItem('col2') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('col2')})</span>
                )}
              </button>
              <button
                onClick={() => addBet('col3')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 relative cursor-pointer"
              >
                3rd Column (2:1)
                {getBetOnItem('col3') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('col3')})</span>
                )}
              </button>
            </div>

            {/* Dozens (2:1) */}
            <div className="grid grid-cols-3 gap-1 mt-1 text-center font-mono text-xs">
              <button
                onClick={() => addBet('dozen1')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 cursor-pointer"
              >
                1st 12 (1-12)
                {getBetOnItem('dozen1') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('dozen1')})</span>
                )}
              </button>
              <button
                onClick={() => addBet('dozen2')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 cursor-pointer"
              >
                2nd 12 (13-24)
                {getBetOnItem('dozen2') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('dozen2')})</span>
                )}
              </button>
              <button
                onClick={() => addBet('dozen3')}
                className="py-1.5 bg-[#072416] hover:bg-[#0a3520] text-emerald-300 rounded border border-emerald-700/60 cursor-pointer"
              >
                3rd 12 (25-36)
                {getBetOnItem('dozen3') > 0 && (
                  <span className="ml-1 text-amber-300 font-bold">(${getBetOnItem('dozen3')})</span>
                )}
              </button>
            </div>

            {/* Outside 1:1 Bets (Low, Even, Red, Black, Odd, High) */}
            <div className="grid grid-cols-6 gap-1 mt-1 text-center font-mono text-xs font-semibold">
              <button
                onClick={() => addBet('low')}
                className="py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded border border-neutral-700 cursor-pointer"
              >
                1-18 {getBetOnItem('low') > 0 && <span className="text-amber-400">(${getBetOnItem('low')})</span>}
              </button>
              <button
                onClick={() => addBet('even')}
                className="py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded border border-neutral-700 cursor-pointer"
              >
                EVEN {getBetOnItem('even') > 0 && <span className="text-amber-400">(${getBetOnItem('even')})</span>}
              </button>
              <button
                onClick={() => addBet('red')}
                className="py-2 bg-red-700 hover:bg-red-600 text-white rounded border border-red-500 cursor-pointer"
              >
                RED {getBetOnItem('red') > 0 && <span className="text-amber-300">(${getBetOnItem('red')})</span>}
              </button>
              <button
                onClick={() => addBet('black')}
                className="py-2 bg-neutral-950 hover:bg-neutral-900 text-white rounded border border-neutral-800 cursor-pointer"
              >
                BLACK {getBetOnItem('black') > 0 && <span className="text-amber-300">(${getBetOnItem('black')})</span>}
              </button>
              <button
                onClick={() => addBet('odd')}
                className="py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded border border-neutral-700 cursor-pointer"
              >
                ODD {getBetOnItem('odd') > 0 && <span className="text-amber-400">(${getBetOnItem('odd')})</span>}
              </button>
              <button
                onClick={() => addBet('high')}
                className="py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 rounded border border-neutral-700 cursor-pointer"
              >
                19-36 {getBetOnItem('high') > 0 && <span className="text-amber-400">(${getBetOnItem('high')})</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
