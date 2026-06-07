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

export const CYCLE_MIN = 21;
export const CYCLE_MAX = 40;
export const PERIOD_MIN = 2;
export const PERIOD_MAX = 10;

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function calculateCyclePhase(
  targetDate: string,
  cycleInfo: CycleInfo
): { phase: CyclePhase; cycleDay: number } {
  const target = parseDateStr(targetDate);
  const lastPeriod = parseDateStr(cycleInfo.lastPeriodDate);

  const diffTime = target.getTime() - lastPeriod.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const cycleLength = Math.max(CYCLE_MIN, Math.min(CYCLE_MAX, cycleInfo.cycleLength));
  const periodLength = Math.max(PERIOD_MIN, Math.min(PERIOD_MAX, cycleInfo.periodLength));

  const cycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;

  let phase: CyclePhase;

  if (cycleDay <= periodLength) {
    phase = 'menstrual';
  } else if (cycleDay <= Math.floor(cycleLength * 0.45)) {
    phase = 'follicular';
  } else if (cycleDay <= Math.floor(cycleLength * 0.6)) {
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
    lastPeriodDate: formatLocalDate(twoWeeksAgo),
    cycleLength: 28,
    periodLength: 5,
  };
}

export function validateCycleParams(cycleLength?: number, periodLength?: number): { valid: boolean; error?: string } {
  if (cycleLength !== undefined) {
    if (!Number.isInteger(cycleLength) || cycleLength < CYCLE_MIN || cycleLength > CYCLE_MAX) {
      return { valid: false, error: `周期长度必须在 ${CYCLE_MIN}-${CYCLE_MAX} 天之间` };
    }
  }
  if (periodLength !== undefined) {
    if (!Number.isInteger(periodLength) || periodLength < PERIOD_MIN || periodLength > PERIOD_MAX) {
      return { valid: false, error: `经期长度必须在 ${PERIOD_MIN}-${PERIOD_MAX} 天之间` };
    }
  }
  if (cycleLength !== undefined && periodLength !== undefined && periodLength >= cycleLength) {
    return { valid: false, error: '经期长度必须小于周期长度' };
  }
  return { valid: true };
}

export function formatDate(date: Date): string {
  return formatLocalDate(date);
}

export function parseDate(dateStr: string): Date {
  return parseDateStr(dateStr);
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1, 12, 0, 0);
  const end = new Date(year, month + 1, 0, 12, 0, 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
