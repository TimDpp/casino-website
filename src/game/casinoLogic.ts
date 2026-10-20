/**
 * Pure casino game logic: Roulette, Blackjack, Slots, Coin Flip, Bankroll management.
 * Decoupled from UI for fast unit testing.
 */

export interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  value: string; // '2'-'10', 'J', 'Q', 'K', 'A'
  numValue: number;
}

export type RouletteBetType =
  | 'straight' // specific number 0-36
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low' // 1-18
  | 'high' // 19-36
  | 'dozen1' // 1-12
  | 'dozen2' // 13-24
  | 'dozen3' // 25-36
  | 'col1'
  | 'col2'
  | 'col3';

export interface RouletteBet {
  type: RouletteBetType;
  target?: number; // for straight bets
  amount: number;
}

export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getRouletteNumberColor(num: number): 'green' | 'red' | 'black' {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

/**
 * Evaluates a roulette bet against a rolled number.
 * Returns the net profit (e.g. 35 for a $1 straight win, 1 for red win, -1 for loss).
 * Or returns total return = amount + net profit.
 * Here we return total payout returned to player (0 if lost).
 */
export function calculateRoulettePayout(bet: RouletteBet, rolled: number): number {
  if (bet.amount <= 0) return 0;

  if (bet.type === 'straight') {
    if (bet.target === rolled) {
      return bet.amount * 36; // 35:1 payout + original stake
    }
    return 0;
  }

  // If zero rolled, all outside bets lose
  if (rolled === 0) return 0;

  const isRed = RED_NUMBERS.has(rolled);
  const isEven = rolled % 2 === 0;

  switch (bet.type) {
    case 'red':
      return isRed ? bet.amount * 2 : 0;
    case 'black':
      return !isRed ? bet.amount * 2 : 0;
    case 'even':
      return isEven ? bet.amount * 2 : 0;
    case 'odd':
      return !isEven ? bet.amount * 2 : 0;
    case 'low':
      return rolled >= 1 && rolled <= 18 ? bet.amount * 2 : 0;
    case 'high':
      return rolled >= 19 && rolled <= 36 ? bet.amount * 2 : 0;
    case 'dozen1':
      return rolled >= 1 && rolled <= 12 ? bet.amount * 3 : 0;
    case 'dozen2':
      return rolled >= 13 && rolled <= 24 ? bet.amount * 3 : 0;
    case 'dozen3':
      return rolled >= 25 && rolled <= 36 ? bet.amount * 3 : 0;
    case 'col1':
      return rolled % 3 === 1 ? bet.amount * 3 : 0;
    case 'col2':
      return rolled % 3 === 2 ? bet.amount * 3 : 0;
    case 'col3':
      return rolled % 3 === 0 ? bet.amount * 3 : 0;
    default:
      return 0;
  }
}

// ----------------- BLACKJACK LOGIC -----------------

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const val of values) {
      let numValue = 10;
      if (val === 'A') {
        numValue = 11;
      } else if (['J', 'Q', 'K'].includes(val)) {
        numValue = 10;
      } else {
        numValue = parseInt(val, 10);
      }
      deck.push({ suit, value: val, numValue });
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function calculateHandScore(cards: Card[]): { score: number; isSoft: boolean; isBusted: boolean } {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 'A') {
      aces += 1;
      score += 11;
    } else {
      score += card.numValue;
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return {
    score,
    isSoft: aces > 0,
    isBusted: score > 21,
  };
}

export type BlackjackOutcome =
  | 'player_blackjack'
  | 'player_win'
  | 'dealer_win'
  | 'push'
  | 'player_bust'
  | 'dealer_bust';

export function evaluateBlackjackGame(
  playerCards: Card[],
  dealerCards: Card[],
  bet: number
): { outcome: BlackjackOutcome; payout: number; netProfit: number } {
  const pScore = calculateHandScore(playerCards);
  const dScore = calculateHandScore(dealerCards);

  const isPlayerBJ = playerCards.length === 2 && pScore.score === 21;
  const isDealerBJ = dealerCards.length === 2 && dScore.score === 21;

  if (pScore.isBusted) {
    return { outcome: 'player_bust', payout: 0, netProfit: -bet };
  }

  if (isPlayerBJ && isDealerBJ) {
    return { outcome: 'push', payout: bet, netProfit: 0 };
  }

  if (isPlayerBJ) {
    // 3:2 payout (payout is 2.5x original bet)
    const payout = bet + bet * 1.5;
    return { outcome: 'player_blackjack', payout, netProfit: bet * 1.5 };
  }

  if (isDealerBJ) {
    return { outcome: 'dealer_win', payout: 0, netProfit: -bet };
  }

  if (dScore.isBusted) {
    return { outcome: 'dealer_bust', payout: bet * 2, netProfit: bet };
  }

  if (pScore.score > dScore.score) {
    return { outcome: 'player_win', payout: bet * 2, netProfit: bet };
  }

  if (pScore.score < dScore.score) {
    return { outcome: 'dealer_win', payout: 0, netProfit: -bet };
  }

  return { outcome: 'push', payout: bet, netProfit: 0 };
}

// ----------------- SLOTS LOGIC -----------------

export type SlotSymbol = '🍒' | '🍋' | '🔔' | '💎' | '7️⃣' | '👑';

export const SLOT_SYMBOLS: SlotSymbol[] = ['🍒', '🍋', '🔔', '💎', '7️⃣', '👑'];

// Symbol weights for standard reel spinning
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  '🍒': 35,
  '🍋': 25,
  '🔔': 18,
  '💎': 12,
  '7️⃣': 7,
  '👑': 3,
};

export function getRandomSlotSymbol(): SlotSymbol {
  const total = Object.values(SLOT_WEIGHTS).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [sym, weight] of Object.entries(SLOT_WEIGHTS)) {
    if (rand < weight) return sym as SlotSymbol;
    rand -= weight;
  }
  return '🍒';
}

export function evaluateSlotSpin(reels: [SlotSymbol, SlotSymbol, SlotSymbol], bet: number): {
  payout: number;
  multiplier: number;
  description: string;
} {
  const [s1, s2, s3] = reels;

  // 3 of a kind
  if (s1 === s2 && s2 === s3) {
    let multiplier = 5;
    let name = 'Triple Cherries';

    switch (s1) {
      case '👑':
        multiplier = 250;
        name = 'ROYAL JACKPOT';
        break;
      case '7️⃣':
        multiplier = 100;
        name = 'LUCKY SEVENS';
        break;
      case '💎':
        multiplier = 40;
        name = 'DIAMOND HEIST';
        break;
      case '🔔':
        multiplier = 20;
        name = 'GOLDEN BELLS';
        break;
      case '🍋':
        multiplier = 10;
        name = 'CITRUS RUSH';
        break;
      case '🍒':
        multiplier = 5;
        name = 'CHERRY TRIO';
        break;
    }

    return {
      payout: bet * multiplier,
      multiplier,
      description: name,
    };
  }

  // 2 of a kind cherries
  const cherryCount = reels.filter((r) => r === '🍒').length;
  if (cherryCount === 2) {
    return {
      payout: bet * 2,
      multiplier: 2,
      description: 'Double Cherries',
    };
  }

  // Any single crown or single diamond pays back half or stake
  if (reels.includes('👑')) {
    return {
      payout: bet * 1.5,
      multiplier: 1.5,
      description: 'Crown Glimmer',
    };
  }

  return {
    payout: 0,
    multiplier: 0,
    description: 'No Match',
  };
}

// ----------------- BANKROLL & BANISHMENT LOGIC -----------------

export const STARTER_BALANCE = 1000;
export const BAN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface BankrollState {
  balance: number;
  isBankrupt: boolean;
  bannedUntil: number | null; // timestamp ms
  shiftCompletedCount: number;
  totalGambled: number;
  biggestWin: number;
}

export function checkBankruptcy(balance: number, activeBetsTotal = 0): boolean {
  return balance <= 0 && activeBetsTotal <= 0;
}

export function getRemainingBanMs(bannedUntil: number | null, now = Date.now()): number {
  if (!bannedUntil) return 0;
  return Math.max(0, bannedUntil - now);
}

export function formatRemainingTime(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return { days, hours, minutes, seconds, formatted };
}
