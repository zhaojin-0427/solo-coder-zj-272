import { CyclePhase, CycleInfo } from './types';

export const PHASE_NAMES: Record<CyclePhase, string> = {
  menstrual: '月经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
};

export const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual: '#E57373',
  follicular: '#81C784',
  ovulation: '#FFB74D',
  luteal: '#64B5F6',
};

export function calculateCyclePhase(
  targetDate: string,
  cycleInfo: CycleInfo
): { phase: CyclePhase; cycleDay: number } {
  const target = new Date(targetDate);
  const lastPeriod = new Date(cycleInfo.lastPeriodDate);

  const diffTime = target.getTime() - lastPeriod.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const cycleDay = ((diffDays % cycleInfo.cycleLength) + cycleInfo.cycleLength) % cycleInfo.cycleLength + 1;

  let phase: CyclePhase;

  if (cycleDay <= cycleInfo.periodLength) {
    phase = 'menstrual';
  } else if (cycleDay <= Math.floor(cycleInfo.cycleLength * 0.45)) {
    phase = 'follicular';
  } else if (cycleDay <= Math.floor(cycleInfo.cycleLength * 0.6)) {
    phase = 'ovulation';
  } else {
    phase = 'luteal';
  }

  return { phase, cycleDay };
}

export function getDefaultCycleInfo(): CycleInfo {
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  return {
    lastPeriodDate: twoWeeksAgo.toISOString().split('T')[0],
    cycleLength: 28,
    periodLength: 5,
  };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
