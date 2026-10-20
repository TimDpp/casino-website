import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialShiftState,
  formatHour,
  advanceShiftHour,
  processExpenseDecision,
  SAMPLE_EXPENSES,
} from './officeLogic.ts';

test('Initial shift state starts at 9 AM not clocked in', () => {
  const state = createInitialShiftState();
  assert.equal(state.currentHour, 9);
  assert.equal(state.isClockedIn, false);
  assert.equal(state.earnings, 0);
  assert.equal(formatHour(9), '9:00 AM');
  assert.equal(formatHour(12), '12:00 PM');
  assert.equal(formatHour(17), '5:00 PM');
});

test('Advance shift hour awards wage and marks completion at 5 PM', () => {
  let state = createInitialShiftState();
  state.isClockedIn = true;

  state = advanceShiftHour(state);
  assert.equal(state.currentHour, 10);
  assert.equal(state.earnings, 40);

  // Advance to 5 PM (17)
  for (let i = 10; i < 17; i++) {
    state = advanceShiftHour(state);
  }
  assert.equal(state.currentHour, 17);
  assert.equal(state.isShiftComplete, true);
  assert.equal(state.earnings >= 320, true);
});

test('Processing expense decisions evaluates compliance accurately', () => {
  let state = createInitialShiftState();
  state.isClockedIn = true;

  const supplyExpense = SAMPLE_EXPENSES[0]; // OfficeDepot (compliant = true)
  const result1 = processExpenseDecision(state, supplyExpense, true);
  assert.equal(result1.isCorrect, true);
  assert.equal(result1.newState.accuracyStreak, 1);

  const fraudExpense = SAMPLE_EXPENSES[1]; // Helicopter (compliant = false)
  // Player erroneously approves it
  const result2 = processExpenseDecision(result1.newState, fraudExpense, true);
  assert.equal(result2.isCorrect, false);
  assert.equal(result2.newState.accuracyStreak, 0);
});
