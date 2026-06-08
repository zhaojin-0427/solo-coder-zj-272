import * as store from '../store';
import type { ReminderRule, ReminderInstance, DiaryEntry, CycleInfo } from '../types';
import { REMINDER_TYPE_LABELS } from '../types';
import { parseDate, formatDate } from './cycle';

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function getNextPeriodDate(cycleInfo: CycleInfo): string {
  const last = parseDate(cycleInfo.lastPeriodDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const cyclesPassed = Math.floor(diffDays / cycleInfo.cycleLength);
  const next = new Date(last);
  next.setDate(last.getDate() + (cyclesPassed + 1) * cycleInfo.cycleLength);
  return formatDate(next);
}

export function generateDailyRecordReminder(rule: ReminderRule, date: string): Omit<ReminderInstance, 'id' | 'createdAt'> | null {
  if (!rule.enabled) return null;
  const entry = store.getEntryByDate(date);
  if (entry) return null;
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    title: '记录今日心情',
    description: '今天还没有记录心情哦，花几分钟记录一下吧~',
    triggerDate: date,
    triggerTime: rule.time,
    status: 'pending',
  };
}

export function generatePeriodStartReminder(rule: ReminderRule, date: string, cycleInfo: CycleInfo): Omit<ReminderInstance, 'id' | 'createdAt'> | null {
  if (!rule.enabled) return null;
  const daysAhead = rule.daysAhead ?? 2;
  const nextPeriod = getNextPeriodDate(cycleInfo);
  const reminderDate = addDays(nextPeriod, -daysAhead);
  if (date !== reminderDate) return null;
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    title: '经期即将开始',
    description: `预计 ${nextPeriod} 是下次经期开始日，提前 ${daysAhead} 天提醒你做好准备~`,
    triggerDate: date,
    triggerTime: rule.time,
    status: 'pending',
  };
}

export function generateLowMoodReviewReminder(
  rule: ReminderRule,
  date: string,
  entries: DiaryEntry[]
): Omit<ReminderInstance, 'id' | 'createdAt'> | null {
  if (!rule.enabled) return null;
  const threshold = rule.moodThreshold ?? 4;
  const consecutiveDays = rule.consecutiveDays ?? 2;
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let lowCount = 0;
  const checkDate = parseDate(date);
  for (let i = 0; i < consecutiveDays; i++) {
    const d = new Date(checkDate);
    d.setDate(d.getDate() - i);
    const dStr = formatDate(d);
    const entry = sortedEntries.find(e => e.date === dStr);
    if (!entry || entry.moodScore > threshold) {
      lowCount = 0;
      break;
    }
    lowCount++;
  }
  if (lowCount < consecutiveDays) return null;
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    title: '情绪复盘提醒',
    description: `最近连续 ${consecutiveDays} 天情绪评分较低（≤${threshold}分），可以花点时间复盘一下，照顾好自己哦~`,
    triggerDate: date,
    triggerTime: rule.time,
    status: 'pending',
  };
}

export function generateHealingActionReminder(
  rule: ReminderRule,
  date: string
): Omit<ReminderInstance, 'id' | 'createdAt'> | null {
  if (!rule.enabled) return null;
  const actions = store.getAllHealingActions({ date, status: 'pending' });
  if (actions.length === 0) {
    const activePlans = store.getActiveHealingPlans();
    const cycleInfo = store.getCycleInfo();
    const entry = store.getEntryByDate(date);
    let hasTriggered = false;
    for (const plan of activePlans) {
      const planActions = store.getActionsByPlanId(plan.id);
      for (const action of planActions) {
        if (action.status === 'completed' || action.status === 'cancelled') continue;
        if (action.reminderDate && action.reminderDate !== date) continue;
        const { shouldTriggerAction } = require('./healing');
        if (shouldTriggerAction(action, date, entry || undefined, cycleInfo)) {
          hasTriggered = true;
          break;
        }
      }
      if (hasTriggered) break;
    }
    if (!hasTriggered) return null;
  }
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    title: '今日疗愈行动',
    description: actions.length > 0
      ? `今天有 ${actions.length} 项疗愈行动待完成，去看看吧~`
      : '今天有适合你的疗愈行动，记得去完成哦~',
    triggerDate: date,
    triggerTime: rule.time,
    status: 'pending',
  };
}

export function generateRemindersForDate(date: string): ReminderInstance[] {
  const rules = store.getReminderRules();
  const cycleInfo = store.getCycleInfo();
  const entries = store.getAllEntries();
  const results: Omit<ReminderInstance, 'id' | 'createdAt'>[] = [];
  for (const rule of rules) {
    let reminder: Omit<ReminderInstance, 'id' | 'createdAt'> | null = null;
    switch (rule.type) {
      case 'daily_record':
        reminder = generateDailyRecordReminder(rule, date);
        break;
      case 'period_start':
        reminder = generatePeriodStartReminder(rule, date, cycleInfo);
        break;
      case 'low_mood_review':
        reminder = generateLowMoodReviewReminder(rule, date, entries);
        break;
      case 'healing_action':
        reminder = generateHealingActionReminder(rule, date);
        break;
    }
    if (reminder) results.push(reminder);
  }
  if (results.length === 0) return [];
  return store.createReminderInstancesBatch(results);
}

export function generateRemindersForDateRange(start: string, end: string): ReminderInstance[] {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const allCreated: ReminderInstance[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const created = generateRemindersForDate(dateStr);
    allCreated.push(...created);
  }
  return allCreated;
}

export function getReminderSummary(): {
  today: ReminderInstance[];
  next7Days: ReminderInstance[];
  history: ReminderInstance[];
  pendingCount: number;
} {
  const today = formatDate(new Date());
  const in7Days = addDays(today, 7);
  const yesterday = addDays(today, -1);
  const historyStart = addDays(today, -30);

  const todayList = store.getReminderInstances({ date: today });
  const next7Days = store.getReminderInstances({ start: today, end: in7Days, status: 'pending' })
    .filter(r => r.triggerDate !== today);
  const history = store.getReminderInstances({ start: historyStart, end: yesterday })
    .sort((a, b) => b.triggerDate.localeCompare(a.triggerDate))
    .slice(0, 50);

  const pendingCount = store.getReminderInstances({ status: 'pending' }).length;

  return { today: todayList, next7Days, history, pendingCount };
}
