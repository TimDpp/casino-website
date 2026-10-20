import test from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from './casinoLogic.ts';
import {
  calculateRoulettePayout,
  calculateHandScore,
  evaluateBlackjackGame,
  evaluateSlotSpin,
  checkBankruptcy,
  getRemainingBanMs,
  formatRemainingTime,
  ROULETTE_NUMBERS,
  RED_NUMBERS,
} from './casinoLogic.ts';

test('Roulette wheel contains standard numbers and distinct colors', () => {
  assert.equal(ROULETTE_NUMBERS.length, 37);
  assert.equal(ROULETTE_NUMBERS.includes(0), true);
  assert.equal(RED_NUMBERS.size, 18);
});

test('Roulette straight bet pays 36x stake on exact match and 0 on miss', () => {
  const winPayout = calculateRoulettePayout({ type: 'straight', target: 17, amount: 10 }, 17);
  assert.equal(winPayout, 360);

  const lossPayout = calculateRoulettePayout({ type: 'straight', target: 17, amount: 10 }, 18);
  assert.equal(lossPayout, 0);
});

test('Roulette outside bets pay 2x on red/black/even/odd except on 0', () => {
  // Red bet on red number 7
  assert.equal(calculateRoulettePayout({ type: 'red', amount: 25 }, 7), 50);
  // Red bet on black number 8
  assert.equal(calculateRoulettePayout({ type: 'red', amount: 25 }, 8), 0);
  // Red bet on 0 (house wins)
  assert.equal(calculateRoulettePayout({ type: 'red', amount: 25 }, 0), 0);
  // Even bet on 8
  assert.equal(calculateRoulettePayout({ type: 'even', amount: 50 }, 8), 100);
  // Even bet on 0
  assert.equal(calculateRoulettePayout({ type: 'even', amount: 50 }, 0), 0);
});

test('Blackjack hand calculation handles hard, soft, and multiple aces', () => {
  const hand1 = calculateHandScore([
    { suit: '♠', value: '10', numValue: 10 },
    { suit: '♥', value: 'K', numValue: 10 },
  ]);
  assert.equal(hand1.score, 20);
  assert.equal(hand1.isBusted, false);

  // Soft 18
  const hand2 = calculateHandScore([
    { suit: '♠', value: 'A', numValue: 11 },
    { suit: '♥', value: '7', numValue: 7 },
  ]);
  assert.equal(hand2.score, 18);
  assert.equal(hand2.isSoft, true);

  // Double aces + 9 = 21 (11 + 1 + 9)
  const hand3 = calculateHandScore([
    { suit: '♠', value: 'A', numValue: 11 },
    { suit: '♥', value: 'A', numValue: 11 },
    { suit: '♦', value: '9', numValue: 9 },
  ]);
  assert.equal(hand3.score, 21);
  assert.equal(hand3.isBusted, false);

  // Bust
  const hand4 = calculateHandScore([
    { suit: '♠', value: '10', numValue: 10 },
    { suit: '♥', value: '8', numValue: 8 },
    { suit: '♦', value: '5', numValue: 5 },
  ]);
  assert.equal(hand4.score, 23);
  assert.equal(hand4.isBusted, true);
});

test('Blackjack game evaluation awards 3:2 on natural player blackjack', () => {
  const player: Card[] = [
    { suit: '♠', value: 'A', numValue: 11 },
    { suit: '♠', value: 'K', numValue: 10 },
  ];
  const dealer: Card[] = [
    { suit: '♥', value: '10', numValue: 10 },
    { suit: '♦', value: '9', numValue: 9 },
  ];
  const result = evaluateBlackjackGame(player, dealer, 100);
  assert.equal(result.outcome, 'player_blackjack');
  assert.equal(result.payout, 250); // 100 stake + 150 net
});

test('Slots evaluation awards jackpot on 3 crowns and cherries for 2 matches', () => {
  const tripleCrown = evaluateSlotSpin(['👑', '👑', '👑'], 10);
  assert.equal(tripleCrown.multiplier, 250);
  assert.equal(tripleCrown.payout, 2500);

  const doubleCherry = evaluateSlotSpin(['🍒', '🍒', '🍋'], 20);
  assert.equal(doubleCherry.multiplier, 2);
  assert.equal(doubleCherry.payout, 40);

  const noMatch = evaluateSlotSpin(['🍋', '🔔', '7️⃣'], 15);
  assert.equal(noMatch.payout, 0);
});

test('Bankruptcy and ban calculations trigger appropriately', () => {
  assert.equal(checkBankruptcy(0, 0), true);
  assert.equal(checkBankruptcy(-10, 0), true);
  assert.equal(checkBankruptcy(0, 50), false); // Still has active bet on table
  assert.equal(checkBankruptcy(100, 0), false);

  const now = 1000000;
  const bannedUntil = now + 7 * 86400000;
  assert.equal(getRemainingBanMs(bannedUntil, now), 7 * 86400000);

  const formatted = formatRemainingTime(7 * 86400000);
  assert.equal(formatted.days, 7);
  assert.equal(formatted.hours, 0);
  assert.equal(formatted.minutes, 0);
});
