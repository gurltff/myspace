import { addDays } from './dates';

export const BOX_INTERVALS = [1, 2, 4, 7, 14];

export interface CardState {
  box: number; // 1..5
  nextDue: string; // YYYY-MM-DD
}

export function review(card: CardState, correct: boolean, today: string): CardState {
  const box = correct ? Math.min(5, card.box + 1) : 1;
  return { box, nextDue: addDays(today, BOX_INTERVALS[box - 1]) };
}

export function isDue(card: CardState, today: string): boolean {
  return card.nextDue <= today;
}

/** 0..1 performance from box levels */
export function boxPerformance(boxes: number[]): number | undefined {
  if (!boxes.length) return undefined;
  return boxes.reduce((a, b) => a + (b - 1) / 4, 0) / boxes.length;
}
