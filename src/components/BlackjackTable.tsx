import React, { useState } from 'react';
import {
  Card,
  createDeck,
  calculateHandScore,
  evaluateBlackjackGame,
} from '../game/casinoLogic';
import {
  playCardSound,
  playChipSound,
  playWinSound,
  playBigWinSound,
  playBustSound,
} from '../utils/audio';

interface BlackjackTableProps {
  balance: number;
  onBetPlaced: (amount: number) => boolean;
  onPayout: (payout: number, netWin: number, description: string) => void;
  disabled: boolean;
}

export const BlackjackTable: React.FC<BlackjackTableProps> = ({
  balance,
  onBetPlaced,
  onPayout,
  disabled,
}) => {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [betAmount, setBetAmount] = useState<number>(50);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [gameStage, setGameStage] = useState<'betting' | 'playing' | 'dealer_turn' | 'resolved'>('betting');
  const [gameMessage, setGameMessage] = useState<string>('Place your wager and deal.');

  // Deal starting hands
  const handleDeal = () => {
    if (disabled || gameStage === 'playing') return;
    if (betAmount <= 0) return;

    if (!onBetPlaced(betAmount)) {
      return;
    }

    playChipSound();

    let curDeck = [...deck];
    if (curDeck.length < 15) {
      curDeck = createDeck();
    }

    const p1 = curDeck.pop()!;
    const d1 = curDeck.pop()!;
    const p2 = curDeck.pop()!;
    const d2 = curDeck.pop()!;

    playCardSound();

    const pHand = [p1, p2];
    const dHand = [d1, d2];

    setPlayerCards(pHand);
    setDealerCards(dHand);
    setDeck(curDeck);

    const pScore = calculateHandScore(pHand);
    const dScore = calculateHandScore(dHand);

    // Natural 21 check
    if (pScore.score === 21 || dScore.score === 21) {
      setGameStage('resolved');
      const evalRes = evaluateBlackjackGame(pHand, dHand, betAmount);
      if (evalRes.outcome === 'player_blackjack') {
        playBigWinSound();
        setGameMessage('BLACKJACK! Natural 21 pays 3:2!');
        onPayout(evalRes.payout, evalRes.netProfit, 'Blackjack: Natural 21 (3:2 Payout)');
      } else if (evalRes.outcome === 'push') {
        setGameMessage('Push! Both hold Blackjack.');
        onPayout(evalRes.payout, 0, 'Blackjack: Push');
      } else {
        playBustSound();
        setGameMessage('Dealer holds Blackjack. House wins.');
        onPayout(0, -betAmount, 'Blackjack: Dealer 21');
      }
    } else {
      setGameStage('playing');
      setGameMessage('Your move: Hit, Stand, or Double Down.');
    }
  };

  const handleHit = () => {
    if (gameStage !== 'playing' || disabled) return;
    playCardSound();

    let curDeck = [...deck];
    if (curDeck.length === 0) curDeck = createDeck();
    const nextCard = curDeck.pop()!;
    const newHand = [...playerCards, nextCard];
    setPlayerCards(newHand);
    setDeck(curDeck);

    const scoreObj = calculateHandScore(newHand);
    if (scoreObj.isBusted) {
      playBustSound();
      setGameStage('resolved');
      setGameMessage(`Bust with ${scoreObj.score}! House wins.`);
      onPayout(0, -betAmount, `Blackjack: Player bust at ${scoreObj.score}`);
    } else if (scoreObj.score === 21) {
      // Auto stand on 21
      handleStandWithHands(newHand, dealerCards, curDeck, betAmount);
    }
  };

  const handleDoubleDown = () => {
    if (gameStage !== 'playing' || playerCards.length !== 2 || disabled) return;
    if (balance < betAmount) {
      alert('Insufficient bankroll to double down!');
      return;
    }

    if (!onBetPlaced(betAmount)) return;
    playChipSound();
    playCardSound();

    const doubledBet = betAmount * 2;

    let curDeck = [...deck];
    if (curDeck.length === 0) curDeck = createDeck();
    const nextCard = curDeck.pop()!;
    const newHand = [...playerCards, nextCard];
    setPlayerCards(newHand);
    setDeck(curDeck);

    const scoreObj = calculateHandScore(newHand);
    if (scoreObj.isBusted) {
      playBustSound();
      setGameStage('resolved');
      setGameMessage(`Busted on Double Down with ${scoreObj.score}!`);
      onPayout(0, -doubledBet, `Blackjack: Double Down bust at ${scoreObj.score}`);
    } else {
      handleStandWithHands(newHand, dealerCards, curDeck, doubledBet);
    }
  };

  const handleStandWithHands = (
    pHand: Card[],
    dHand: Card[],
    currentDeck: Card[],
    activeWager: number
  ) => {
    setGameStage('dealer_turn');

    let curDHand = [...dHand];
    let curDeck = [...currentDeck];

    // Dealer hits until 17 or higher
    let dScore = calculateHandScore(curDHand);
    while (dScore.score < 17) {
      if (curDeck.length === 0) curDeck = createDeck();
      curDHand.push(curDeck.pop()!);
      dScore = calculateHandScore(curDHand);
    }

    setDealerCards(curDHand);
    setDeck(curDeck);
    setGameStage('resolved');

    const evalRes = evaluateBlackjackGame(pHand, curDHand, activeWager);

    if (evalRes.outcome === 'player_win') {
      playWinSound();
      setGameMessage(`You win! ${calculateHandScore(pHand).score} beats Dealer ${dScore.score}.`);
      onPayout(evalRes.payout, evalRes.netProfit, `Blackjack: Win $${evalRes.netProfit}`);
    } else if (evalRes.outcome === 'dealer_bust') {
      playWinSound();
      setGameMessage(`Dealer busts with ${dScore.score}! You win!`);
      onPayout(evalRes.payout, evalRes.netProfit, `Blackjack: Dealer bust at ${dScore.score}`);
    } else if (evalRes.outcome === 'push') {
      setGameMessage(`Push! Tied at ${dScore.score}.`);
      onPayout(evalRes.payout, 0, 'Blackjack: Push');
    } else {
      playBustSound();
      setGameMessage(`Dealer wins with ${dScore.score} vs your ${calculateHandScore(pHand).score}.`);
      onPayout(0, -activeWager, 'Blackjack: Dealer win');
    }
  };

  const handleStand = () => {
    if (gameStage !== 'playing') return;
    handleStandWithHands(playerCards, dealerCards, deck, betAmount);
  };

  const resetForNextHand = () => {
    setPlayerCards([]);
    setDealerCards([]);
    setGameStage('betting');
    setGameMessage('Place your wager and deal.');
  };

  const playerScore = calculateHandScore(playerCards);
  const dealerScore = calculateHandScore(dealerCards);

  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b border-neutral-800 gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-400 tracking-wide">
            The Pit Boss 21 (Blackjack)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Dealer stands on all 17s. Natural Blackjack pays 3 to 2.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-neutral-500 font-mono">Status:</span>
          <p className="font-mono text-sm font-semibold text-amber-300">{gameMessage}</p>
        </div>
      </div>

      {/* The Felt Table Arena */}
      <div className="relative bg-[#092e1d] rounded-2xl border-4 border-[#124b30] p-6 sm:p-8 min-h-[360px] flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Table Felt Arch Watermark */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-10">
          <span className="font-serif text-5xl sm:text-7xl font-bold text-amber-200 tracking-widest uppercase">
            BLACKJACK 21
          </span>
        </div>

        {/* Dealer Zone */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 mb-2 flex items-center gap-2">
            <span>Dealer Hand</span>
            {dealerCards.length > 0 && gameStage === 'resolved' && (
              <span className="px-2 py-0.5 rounded bg-neutral-900 text-amber-400 font-bold border border-emerald-500/40">
                Score: {dealerScore.score}
              </span>
            )}
            {dealerCards.length > 0 && gameStage === 'playing' && (
              <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 text-[11px] border border-neutral-700">
                Showing: {dealerCards[0].numValue}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {dealerCards.map((card, i) => {
              // Hide 2nd dealer card during player turn
              const isHoleCard = i === 1 && gameStage === 'playing';
              if (isHoleCard) {
                return (
                  <div
                    key={i}
                    className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-red-950 border-2 border-red-700 shadow-xl flex items-center justify-center transform hover:-translate-y-1 transition-transform"
                  >
                    <div className="w-12 h-20 sm:w-16 sm:h-24 rounded border border-red-800/80 bg-red-900/60 flex items-center justify-center">
                      <span className="font-serif text-amber-400/80 text-xl font-bold">♠</span>
                    </div>
                  </div>
                );
              }

              const isRed = card.suit === '♥' || card.suit === '♦';
              return (
                <div
                  key={i}
                  className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white border border-neutral-300 shadow-xl flex flex-col justify-between p-2 transform hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.value}</span>
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.suit}</span>
                  </div>
                  <div className={`text-center text-xl sm:text-2xl font-bold ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
                    {card.suit}
                  </div>
                  <div className="text-right text-xs font-bold">
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table Center / Deck & Chips */}
        <div className="relative z-10 flex items-center justify-center my-6">
          <div className="px-4 py-1.5 rounded-full bg-neutral-950/80 border border-amber-500/40 text-amber-300 font-mono text-xs tracking-wider shadow-lg">
            ACTIVE WAGER: <span className="font-bold text-sm text-white">${betAmount}</span>
          </div>
        </div>

        {/* Player Zone */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            {playerCards.map((card, i) => {
              const isRed = card.suit === '♥' || card.suit === '♦';
              return (
                <div
                  key={i}
                  className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white border border-neutral-300 shadow-2xl flex flex-col justify-between p-2 transform hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.value}</span>
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.suit}</span>
                  </div>
                  <div className={`text-center text-xl sm:text-2xl font-bold ${isRed ? 'text-red-600' : 'text-neutral-900'}`}>
                    {card.suit}
                  </div>
                  <div className="text-right text-xs font-bold">
                    <span className={isRed ? 'text-red-600' : 'text-neutral-900'}>{card.value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-2">
            <span>Your Hand</span>
            {playerCards.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded font-bold border ${
                  playerScore.isBusted
                    ? 'bg-red-950 text-red-300 border-red-700'
                    : playerScore.score === 21
                    ? 'bg-amber-500 text-neutral-950 border-amber-300'
                    : 'bg-neutral-900 text-amber-400 border-emerald-500/40'
                }`}
              >
                Score: {playerScore.score} {playerScore.isSoft && !playerScore.isBusted && '(Soft)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
        {/* Chip Wager Selector (During Betting Phase) */}
        {gameStage === 'betting' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-400 font-mono uppercase">Wager:</span>
            {[10, 25, 50, 100, 250, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                  betAmount === amt
                    ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-md'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => setBetAmount(balance > 0 ? balance : 50)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold border border-red-800 bg-red-950 text-red-300 hover:bg-red-900 cursor-pointer"
            >
              All-In (${balance})
            </button>
          </div>
        ) : (
          <div className="text-xs text-neutral-400 font-mono">
            Hand in session. Choose Hit, Stand, or Double.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {gameStage === 'betting' && (
            <button
              onClick={handleDeal}
              disabled={disabled || betAmount <= 0}
              className="py-3 px-8 rounded-xl font-serif font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              Deal Hand (${betAmount})
            </button>
          )}

          {gameStage === 'playing' && (
            <>
              <button
                onClick={handleHit}
                className="py-3 px-6 rounded-xl font-mono font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                Hit (+)
              </button>
              <button
                onClick={handleStand}
                className="py-3 px-6 rounded-xl font-mono font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 active:scale-98 transition-all cursor-pointer"
              >
                Stand (—)
              </button>
              {playerCards.length === 2 && balance >= betAmount && (
                <button
                  onClick={handleDoubleDown}
                  className="py-3 px-6 rounded-xl font-mono font-bold text-sm bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  Double Down (2x)
                </button>
              )}
            </>
          )}

          {gameStage === 'resolved' && (
            <button
              onClick={resetForNextHand}
              className="py-3 px-8 rounded-xl font-serif font-bold text-sm uppercase bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              Next Hand
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
