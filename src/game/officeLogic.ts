/**
 * 9-to-5 Office Minigame Logic
 * Simulates a workday from 9:00 AM to 5:00 PM with tasks, boss alerts, and hourly wage payouts.
 */

export interface ExpenseReceipt {
  id: string;
  vendor: string;
  item: string;
  amount: number;
  isCompliant: boolean;
  reason: string;
}

export interface EmailTask {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  actionRequired: 'reply' | 'forward_hr' | 'shred';
}

export const SAMPLE_EXPENSES: ExpenseReceipt[] = [
  {
    id: 'exp-1',
    vendor: 'OfficeDepot Direct',
    item: 'Ergonomic mousepads and green felt cleaning fluid',
    amount: 142.50,
    isCompliant: true,
    reason: 'Standard office maintenance supplies within $300 limit.',
  },
  {
    id: 'exp-2',
    vendor: 'Luxury VIP Air Charters',
    item: 'Helicopter transfer for High-Roller who lost $200k',
    amount: 8500.00,
    isCompliant: false,
    reason: 'Unapproved aviation expense without CFO counter-signature.',
  },
  {
    id: 'exp-3',
    vendor: 'Bayside Fish & Shellfish',
    item: 'Staff lunch cafeteria catering for 25 dealers',
    amount: 285.00,
    isCompliant: true,
    reason: 'Within $15/head daily dealer meal allowance.',
  },
  {
    id: 'exp-4',
    vendor: 'Anonymous Cayman Escrow',
    item: 'Offshore compliance consulting services',
    amount: 45000.00,
    isCompliant: false,
    reason: 'Flagged by Anti-Money Laundering protocol!',
  },
  {
    id: 'exp-5',
    vendor: 'Casino Deck Suppliers LLC',
    item: '200 decks of plastic-coated tournament playing cards',
    amount: 480.00,
    isCompliant: true,
    reason: 'Essential pit floor replenishment.',
  },
  {
    id: 'exp-6',
    vendor: 'Gold Bar Jewelers',
    item: '24k solid gold dice for the CEO executive suite',
    amount: 12400.00,
    isCompliant: false,
    reason: 'Personal luxury item billed as operational hardware.',
  },
  {
    id: 'exp-7',
    vendor: 'Industrial Shredder Pro',
    item: 'Heavy duty micro-cut blades for paper shredder',
    amount: 79.99,
    isCompliant: true,
    reason: 'Standard facility equipment maintenance.',
  },
  {
    id: 'exp-8',
    vendor: 'Monaco Riviera Yacht Rentals',
    item: 'Quarterly team-building regatta charter',
    amount: 18500.00,
    isCompliant: false,
    reason: 'Exceeds team-building budget by $18,000.',
  },
];

export const SAMPLE_EMAILS: EmailTask[] = [
  {
    id: 'em-1',
    sender: 'VP Operations <vp@velvetledger.casino>',
    subject: 'URGENT: Floor surveillance report on Table 4',
    snippet: 'Did anyone audit the card shoe count at midnight?',
    actionRequired: 'reply',
  },
  {
    id: 'em-2',
    sender: 'Angry High-Roller <whaleshark@richmail.net>',
    subject: 'MY LUCK WAS RIGGED I DEMAND COMPENSATORY STEAK',
    snippet: 'Your roulette wheel has an evil magnetic bias towards black!',
    actionRequired: 'shred',
  },
  {
    id: 'em-3',
    sender: 'Anonymous Whistleblower <tips@gamingcommission.gov>',
    subject: 'Report of suspicious shredded documents in Dumpster B',
    snippet: 'HR needs to conduct an internal compliance audit immediately.',
    actionRequired: 'forward_hr',
  },
  {
    id: 'em-4',
    sender: 'HR Director <hr@velvetledger.casino>',
    subject: 'Mandatory Seminar: Dealing with Bankrupt Patrons Kindly',
    snippet: 'Please remember to hand all bankrupt patrons a 9-to-5 timecard.',
    actionRequired: 'reply',
  },
];

export interface OfficeShiftState {
  currentHour: number; // 9 = 9 AM, 17 = 5 PM
  isClockedIn: boolean;
  isCamouflaged: boolean; // boss camouflage (fake spreadsheet open)
  bossApproaching: boolean;
  bossDistance: number; // 100 to 0 (at 0 boss is staring at cubicle)
  earnings: number;
  hourlyWage: number;
  tasksCompleted: number;
  accuracyStreak: number;
  bossEvasions: number;
  isShiftComplete: boolean;
}

export function createInitialShiftState(): OfficeShiftState {
  return {
    currentHour: 9,
    isClockedIn: false,
    isCamouflaged: false,
    bossApproaching: false,
    bossDistance: 100,
    earnings: 0,
    hourlyWage: 40, // $40/hour base
    tasksCompleted: 0,
    accuracyStreak: 0,
    bossEvasions: 0,
    isShiftComplete: false,
  };
}

export function formatHour(hour: number): string {
  if (hour === 12) return '12:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

export function advanceShiftHour(state: OfficeShiftState): OfficeShiftState {
  if (!state.isClockedIn || state.isShiftComplete) return state;

  const nextHour = state.currentHour + 1;
  const isComplete = nextHour >= 17;
  const wageEarned = state.hourlyWage + (state.accuracyStreak >= 3 ? 15 : 0);

  return {
    ...state,
    currentHour: nextHour,
    earnings: state.earnings + wageEarned,
    isShiftComplete: isComplete,
  };
}

export function processExpenseDecision(
  state: OfficeShiftState,
  receipt: ExpenseReceipt,
  userApproved: boolean
): { newState: OfficeShiftState; isCorrect: boolean; feedback: string } {
  const isCorrect = userApproved === receipt.isCompliant;
  const bonus = isCorrect ? 15 : 0;
  const penalty = isCorrect ? 0 : 10;
  const newStreak = isCorrect ? state.accuracyStreak + 1 : 0;

  const updatedTasks = state.tasksCompleted + 1;
  // Every 2 tasks completed advances the office clock by 1 hour
  let updatedHour = state.currentHour;
  let isComplete = state.isShiftComplete;
  let wageEarned = isCorrect ? bonus : -penalty;

  if (updatedTasks % 2 === 0 && updatedHour < 17) {
    updatedHour += 1;
    wageEarned += state.hourlyWage;
    if (updatedHour >= 17) {
      isComplete = true;
    }
  }

  const newState: OfficeShiftState = {
    ...state,
    currentHour: updatedHour,
    tasksCompleted: updatedTasks,
    accuracyStreak: newStreak,
    earnings: Math.max(0, state.earnings + wageEarned),
    isShiftComplete: isComplete,
  };

  const feedback = isCorrect
    ? `Correct! ${receipt.reason} (+$${bonus + (updatedTasks % 2 === 0 ? state.hourlyWage : 0)})`
    : `Compliance Violation! ${receipt.reason} (-$${penalty})`;

  return { newState, isCorrect, feedback };
}
