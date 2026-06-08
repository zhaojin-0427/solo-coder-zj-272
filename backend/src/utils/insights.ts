import {
  DiaryEntry,
  CycleInfo,
  InsightRuleConfig,
  InsightAlert,
  InsightSeverity,
  InsightRuleType,
  InsightSummary,
  NEGATIVE_KEYWORDS,
} from '../types';
import { calculateCyclePhase, parseDate, formatDate } from './cycle';
import * as store from '../store';

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function diffDays(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function isConsecutive(dates: string[]): boolean {
  if (dates.length < 2) return true;
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i - 1], sorted[i]) !== 1) return false;
  }
  return true;
}

function enrichEntriesWithPhase(entries: DiaryEntry[], cycleInfo: CycleInfo): DiaryEntry[] {
  return entries.map(e => {
    const { phase, cycleDay } = calculateCyclePhase(e.date, cycleInfo);
    return { ...e, cyclePhase: phase, cycleDay };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function detectConsecutiveLowMood(
  entries: DiaryEntry[],
  rule: InsightRuleConfig
): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const { lowMoodThreshold = 4, consecutiveDays = 3 } = rule.thresholds;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  let run: DiaryEntry[] = [];
  const runs: DiaryEntry[][] = [];

  for (const entry of sorted) {
    if (entry.moodScore <= lowMoodThreshold) {
      if (run.length === 0 || diffDays(run[run.length - 1].date, entry.date) === 1) {
        run.push(entry);
      } else {
        if (run.length >= consecutiveDays) runs.push(run);
        run = [entry];
      }
    } else {
      if (run.length >= consecutiveDays) runs.push(run);
      run = [];
    }
  }
  if (run.length >= consecutiveDays) runs.push(run);

  for (const currentRun of runs) {
    const avgScore = currentRun.reduce((s, e) => s + e.moodScore, 0) / currentRun.length;
    const severity: InsightSeverity =
      currentRun.length >= consecutiveDays + 2 || avgScore <= 2 ? 'alert'
      : currentRun.length >= consecutiveDays + 1 || avgScore <= 3 ? 'warning'
      : 'info';

    alerts.push({
      type: 'consecutive_low_mood',
      severity,
      title: `连续${currentRun.length}天情绪低落`,
      description: `从 ${currentRun[0].date} 到 ${currentRun[currentRun.length - 1].date}，心情评分持续低于${lowMoodThreshold}分，平均${avgScore.toFixed(1)}分。`,
      date: currentRun[currentRun.length - 1].date,
      startDate: currentRun[0].date,
      endDate: currentRun[currentRun.length - 1].date,
      affectedDates: currentRun.map(e => e.date),
      details: {
        averageScore: avgScore,
        minScore: Math.min(...currentRun.map(e => e.moodScore)),
        daysCount: currentRun.length,
        threshold: lowMoodThreshold,
      },
      ruleSnapshot: rule,
    } as Omit<InsightAlert, 'id' | 'createdAt'> as InsightAlert);
  }

  return alerts;
}

function detectLutealMoodDecline(
  entries: DiaryEntry[],
  cycleInfo: CycleInfo,
  rule: InsightRuleConfig
): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const enriched = enrichEntriesWithPhase(entries, cycleInfo);
  const { minDeclinePoints = 2, minComparisonDays = 3 } = rule.thresholds;

  const follicular = enriched.filter(e => e.cyclePhase === 'follicular' || e.cyclePhase === 'ovulation');
  const luteal = enriched.filter(e => e.cyclePhase === 'luteal');

  if (follicular.length < minComparisonDays || luteal.length < minComparisonDays) {
    return alerts;
  }

  const follicularAvg = follicular.reduce((s, e) => s + e.moodScore, 0) / follicular.length;
  const lutealAvg = luteal.reduce((s, e) => s + e.moodScore, 0) / luteal.length;
  const decline = follicularAvg - lutealAvg;

  if (decline >= minDeclinePoints) {
    const severity: InsightSeverity =
      decline >= minDeclinePoints + 2 ? 'alert'
      : decline >= minDeclinePoints + 1 ? 'warning'
      : 'info';

    const lowLuteal = luteal.filter(e => e.moodScore < lutealAvg).sort((a, b) => a.date.localeCompare(b.date));
    const affectedDates = lowLuteal.map(e => e.date);

    alerts.push({
      type: 'luteal_mood_decline',
      severity,
      title: '黄体期情绪显著下滑',
      description: `卵泡期/排卵期平均心情 ${follicularAvg.toFixed(1)} 分，黄体期平均 ${lutealAvg.toFixed(1)} 分，下降 ${decline.toFixed(1)} 分。`,
      date: affectedDates.length > 0 ? affectedDates[affectedDates.length - 1] : luteal[luteal.length - 1].date,
      startDate: affectedDates.length > 0 ? affectedDates[0] : luteal[0].date,
      endDate: affectedDates.length > 0 ? affectedDates[affectedDates.length - 1] : luteal[luteal.length - 1].date,
      affectedDates: affectedDates.length > 0 ? affectedDates : luteal.map(e => e.date),
      details: {
        follicularAvg,
        lutealAvg,
        decline,
        minDeclinePoints,
      },
      ruleSnapshot: rule,
    } as Omit<InsightAlert, 'id' | 'createdAt'> as InsightAlert);
  }

  return alerts;
}

function detectPremenstrualKeywordSpike(
  entries: DiaryEntry[],
  cycleInfo: CycleInfo,
  rule: InsightRuleConfig
): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const enriched = enrichEntriesWithPhase(entries, cycleInfo);
  const { spikeMultiplier = 2, minOccurrences = 2, windowDays = 5 } = rule.thresholds;

  const menstrualEntries = enriched.filter(e => e.cyclePhase === 'menstrual');
  if (menstrualEntries.length === 0) return alerts;

  const firstMenstrualDate = [...menstrualEntries].sort((a, b) => a.date.localeCompare(b.date))[0].date;
  const preWindowStart = addDays(firstMenstrualDate, -windowDays);
  const preWindowEnd = addDays(firstMenstrualDate, -1);

  const preEntries = enriched.filter(e => e.date >= preWindowStart && e.date <= preWindowEnd);
  const otherEntries = enriched.filter(e => !(e.date >= preWindowStart && e.date <= preWindowEnd) && e.cyclePhase !== 'menstrual');

  function countNegativeKeywords(ents: DiaryEntry[]): { total: number; byKeyword: Record<string, number> } {
    let total = 0;
    const byKeyword: Record<string, number> = {};
    ents.forEach(e => {
      e.keywords.forEach(k => {
        if (NEGATIVE_KEYWORDS.includes(k)) {
          total++;
          byKeyword[k] = (byKeyword[k] || 0) + 1;
        }
      });
    });
    return { total, byKeyword };
  }

  const preStats = countNegativeKeywords(preEntries);
  const otherStats = countNegativeKeywords(otherEntries);

  const preAvgPerDay = preEntries.length > 0 ? preStats.total / preEntries.length : 0;
  const otherAvgPerDay = otherEntries.length > 0 ? otherStats.total / otherEntries.length : 0;

  if (
    preStats.total >= minOccurrences &&
    otherAvgPerDay > 0 &&
    preAvgPerDay >= otherAvgPerDay * spikeMultiplier
  ) {
    const ratio = preAvgPerDay / (otherAvgPerDay || 1);
    const severity: InsightSeverity =
      ratio >= spikeMultiplier + 1 ? 'alert'
      : ratio >= spikeMultiplier + 0.5 ? 'warning'
      : 'info';

    const topKeywords = Object.entries(preStats.byKeyword)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, c]) => ({ keyword: k, count: c }));

    alerts.push({
      type: 'premenstrual_keyword_spike',
      severity,
      title: '经期前负面情绪关键词激增',
      description: `经期前${windowDays}天内负面关键词出现 ${preStats.total} 次（日均${preAvgPerDay.toFixed(2)}），是平常（日均${otherAvgPerDay.toFixed(2)}）的 ${ratio.toFixed(1)} 倍。`,
      date: preWindowEnd,
      startDate: preWindowStart,
      endDate: preWindowEnd,
      affectedDates: preEntries.map(e => e.date),
      details: {
        preCount: preStats.total,
        preAvgPerDay,
        otherAvgPerDay,
        ratio,
        topKeywords,
      },
      ruleSnapshot: rule,
    } as Omit<InsightAlert, 'id' | 'createdAt'> as InsightAlert);
  }

  return alerts;
}

function detectPostEventMoodDrop(
  entries: DiaryEntry[],
  rule: InsightRuleConfig
): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const { eventMoodThreshold = 7, dropPoints = 3, dropWindowDays = 3 } = rule.thresholds;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  const specialEvents = sorted.filter(e => e.isSpecialEvent && e.moodScore >= eventMoodThreshold);

  for (const event of specialEvents) {
    const windowStart = addDays(event.date, 1);
    const windowEnd = addDays(event.date, dropWindowDays);
    const following = sorted.filter(e => e.date >= windowStart && e.date <= windowEnd);

    if (following.length === 0) continue;

    const avgFollowing = following.reduce((s, e) => s + e.moodScore, 0) / following.length;
    const drop = event.moodScore - avgFollowing;

    if (drop >= dropPoints) {
      const severity: InsightSeverity =
        drop >= dropPoints + 2 ? 'alert'
        : drop >= dropPoints + 1 ? 'warning'
        : 'info';

      alerts.push({
        type: 'post_event_mood_drop',
        severity,
        title: `特殊事件「${event.specialEventTitle || '特殊事件'}」后情绪回落`,
        description: `事件日（${event.date}）心情 ${event.moodScore} 分，之后${dropWindowDays}天平均 ${avgFollowing.toFixed(1)} 分，回落 ${drop.toFixed(1)} 分。`,
        date: following[following.length - 1].date,
        startDate: event.date,
        endDate: following[following.length - 1].date,
        affectedDates: [event.date, ...following.map(e => e.date)],
        details: {
          eventTitle: event.specialEventTitle || '特殊事件',
          eventDate: event.date,
          eventMood: event.moodScore,
          avgFollowing,
          drop,
        },
        ruleSnapshot: rule,
      } as Omit<InsightAlert, 'id' | 'createdAt'> as InsightAlert);
    }
  }

  return alerts;
}

export function runInsightAnalysis(
  entries: DiaryEntry[],
  cycleInfo: CycleInfo,
  rules: InsightRuleConfig[]
): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const enabledRules = rules.filter(r => r.enabled);

  for (const rule of enabledRules) {
    switch (rule.type) {
      case 'consecutive_low_mood':
        alerts.push(...detectConsecutiveLowMood(entries, rule));
        break;
      case 'luteal_mood_decline':
        alerts.push(...detectLutealMoodDecline(entries, cycleInfo, rule));
        break;
      case 'premenstrual_keyword_spike':
        alerts.push(...detectPremenstrualKeywordSpike(entries, cycleInfo, rule));
        break;
      case 'post_event_mood_drop':
        alerts.push(...detectPostEventMoodDrop(entries, rule));
        break;
    }
  }

  return alerts;
}

export function buildInsightSummary(
  alerts: InsightAlert[],
  entries: DiaryEntry[],
  cycleInfo: CycleInfo
): InsightSummary {
  const alertsBySeverity = { info: 0, warning: 0, alert: 0 };
  const alertsByType = {
    consecutive_low_mood: 0,
    luteal_mood_decline: 0,
    premenstrual_keyword_spike: 0,
    post_event_mood_drop: 0,
  };

  alerts.forEach(a => {
    alertsBySeverity[a.severity]++;
    alertsByType[a.type]++;
  });

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const avgMood = sorted.length > 0
    ? sorted.reduce((s, e) => s + e.moodScore, 0) / sorted.length
    : 0;

  let moodTrend: 'rising' | 'falling' | 'stable' = 'stable';
  if (sorted.length >= 4) {
    const half = Math.floor(sorted.length / 2);
    const firstHalfAvg = sorted.slice(0, half).reduce((s, e) => s + e.moodScore, 0) / half;
    const secondHalfAvg = sorted.slice(half).reduce((s, e) => s + e.moodScore, 0) / (sorted.length - half);
    const diff = secondHalfAvg - firstHalfAvg;
    if (diff >= 0.5) moodTrend = 'rising';
    else if (diff <= -0.5) moodTrend = 'falling';
  }

  const enriched = enrichEntriesWithPhase(sorted, cycleInfo);
  const phaseCounts: Record<string, number> = {};
  enriched.forEach(e => {
    if (e.cyclePhase) phaseCounts[e.cyclePhase] = (phaseCounts[e.cyclePhase] || 0) + 1;
  });
  let mostFrequentPhase: any = null;
  let maxCount = 0;
  Object.entries(phaseCounts).forEach(([phase, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentPhase = phase;
    }
  });

  const recentAlerts = [...alerts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return {
    totalAlerts: alerts.length,
    alertsBySeverity,
    alertsByType,
    recentAlerts,
    periodOverview: {
      avgMood: Math.round(avgMood * 10) / 10,
      moodTrend,
      mostFrequentPhase,
    },
  };
}

export function generateAndSaveAlerts(): InsightAlert[] {
  const entries = store.getAllEntries();
  const cycleInfo = store.getCycleInfo();
  const rules = store.getInsightRules();
  const alerts = runInsightAnalysis(entries, cycleInfo, rules);
  store.clearInsightAlerts();
  alerts.forEach(a => store.createInsightAlert(a as Omit<InsightAlert, 'id' | 'createdAt'>));
  return store.getInsightAlerts();
}
