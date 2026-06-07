import { DiaryEntry, CycleInfo, PhaseMoodStats, YearlyReview, MoodTrendPoint } from '../types';
import { calculateCyclePhase, PHASE_NAMES } from './cycle';

export function attachCyclePhase(entry: DiaryEntry, cycleInfo: CycleInfo): DiaryEntry {
  const { phase, cycleDay } = calculateCyclePhase(entry.date, cycleInfo);
  return { ...entry, cyclePhase: phase, cycleDay };
}

export function attachCyclePhases(entries: DiaryEntry[], cycleInfo: CycleInfo): DiaryEntry[] {
  return entries.map(e => attachCyclePhase(e, cycleInfo));
}

export function calculatePhaseStats(
  entries: DiaryEntry[],
  cycleInfo: CycleInfo
): PhaseMoodStats[] {
  const enriched = attachCyclePhases(entries, cycleInfo);
  const phases: ('menstrual' | 'follicular' | 'ovulation' | 'luteal')[] = [
    'menstrual', 'follicular', 'ovulation', 'luteal'
  ];

  return phases.map(phase => {
    const phaseEntries = enriched.filter(e => e.cyclePhase === phase);
    const avgMood = phaseEntries.length > 0
      ? phaseEntries.reduce((sum, e) => sum + e.moodScore, 0) / phaseEntries.length
      : 0;

    const kwMap: Record<string, number> = {};
    phaseEntries.forEach(e => {
      e.keywords.forEach(k => {
        kwMap[k] = (kwMap[k] || 0) + 1;
      });
    });
    const keywordFrequency = Object.entries(kwMap)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      phase,
      phaseName: PHASE_NAMES[phase],
      avgMood: Math.round(avgMood * 10) / 10,
      count: phaseEntries.length,
      keywordFrequency,
    };
  });
}

export function calculateMoodTrend(
  entries: DiaryEntry[],
  cycleInfo: CycleInfo
): MoodTrendPoint[] {
  return entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const { phase } = calculateCyclePhase(e.date, cycleInfo);
      return {
        date: e.date,
        moodScore: e.moodScore,
        cyclePhase: phase,
      };
    });
}

export function calculateKeywordCloud(entries: DiaryEntry[]): { keyword: string; count: number }[] {
  const kwMap: Record<string, number> = {};
  entries.forEach(e => {
    e.keywords.forEach(k => {
      kwMap[k] = (kwMap[k] || 0) + 1;
    });
  });
  return Object.entries(kwMap)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);
}

export function calculateYearlyReview(
  allEntries: DiaryEntry[],
  year: number,
  cycleInfo: CycleInfo
): YearlyReview {
  const yearEntries = allEntries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year;
  });

  const enriched = attachCyclePhases(yearEntries, cycleInfo);

  const avgMood = yearEntries.length > 0
    ? yearEntries.reduce((sum, e) => sum + e.moodScore, 0) / yearEntries.length
    : 0;

  const monthlyTrend: { month: string; avgMood: number; count: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const monthEntries = enriched.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m;
    });
    const mAvg = monthEntries.length > 0
      ? monthEntries.reduce((sum, e) => sum + e.moodScore, 0) / monthEntries.length
      : 0;
    monthlyTrend.push({
      month: `${year}-${String(m + 1).padStart(2, '0')}`,
      avgMood: Math.round(mAvg * 10) / 10,
      count: monthEntries.length,
    });
  }

  const topKeywords = calculateKeywordCloud(yearEntries).slice(0, 20);

  const specialEvents = enriched
    .filter(e => e.isSpecialEvent)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      date: e.date,
      title: e.specialEventTitle || '特殊事件',
      moodScore: e.moodScore,
    }));

  const phaseBreakdown = calculatePhaseStats(yearEntries, cycleInfo);

  return {
    year,
    avgMood: Math.round(avgMood * 10) / 10,
    totalEntries: yearEntries.length,
    monthlyTrend,
    topKeywords,
    specialEvents,
    phaseBreakdown,
  };
}
