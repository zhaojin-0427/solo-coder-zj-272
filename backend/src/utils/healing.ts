import {
  DiaryEntry,
  CycleInfo,
  InsightAlert,
  CyclePhase,
  HealingPlan,
  HealingAction,
  HealingActionCategory,
  HealingActionPriority,
  HealingSuggestion,
  HealingActionTrigger,
  HealingProgressStats,
  NEGATIVE_KEYWORDS,
  ShareFeedback,
} from '../types';
import { calculateCyclePhase } from './cycle';
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

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

interface AnalysisContext {
  windowDays: number;
  entries: DiaryEntry[];
  cycleInfo: CycleInfo;
  alerts: InsightAlert[];
  feedbacks: ShareFeedback[];
  avgMood: number;
  topKeywords: { keyword: string; count: number }[];
  phaseDistribution: Record<CyclePhase, { count: number; avgMood: number }>;
  dominantPhase?: CyclePhase;
  specialEvents: DiaryEntry[];
  negativeKeywordFreq: Record<string, number>;
  alertTypes: string[];
  feedbackThemes: string[];
}

function analyzeContext(windowDays: number): AnalysisContext {
  const { start, end } = getDateRange(windowDays);
  const allEntries = store.getEntriesByDateRange(start, end);
  const cycleInfo = store.getCycleInfo();
  const alerts = store.getInsightAlerts({ start, end });
  const feedbacks: ShareFeedback[] = [];

  const entries = allEntries.map(e => {
    const { phase, cycleDay } = calculateCyclePhase(e.date, cycleInfo);
    return { ...e, cyclePhase: phase, cycleDay };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const avgMood = entries.length > 0
    ? entries.reduce((s, e) => s + e.moodScore, 0) / entries.length
    : 6;

  const keywordCount: Record<string, number> = {};
  const negativeKeywordFreq: Record<string, number> = {};
  entries.forEach(e => {
    e.keywords.forEach(kw => {
      keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      if (NEGATIVE_KEYWORDS.includes(kw)) {
        negativeKeywordFreq[kw] = (negativeKeywordFreq[kw] || 0) + 1;
      }
    });
  });

  const topKeywords = Object.entries(keywordCount)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const phaseDistribution: Record<CyclePhase, { count: number; avgMood: number; total: number }> = {
    menstrual: { count: 0, avgMood: 0, total: 0 },
    follicular: { count: 0, avgMood: 0, total: 0 },
    ovulation: { count: 0, avgMood: 0, total: 0 },
    luteal: { count: 0, avgMood: 0, total: 0 },
  };
  entries.forEach(e => {
    if (e.cyclePhase) {
      phaseDistribution[e.cyclePhase].count++;
      phaseDistribution[e.cyclePhase].total += e.moodScore;
    }
  });
  (Object.keys(phaseDistribution) as CyclePhase[]).forEach(p => {
    if (phaseDistribution[p].count > 0) {
      phaseDistribution[p].avgMood = phaseDistribution[p].total / phaseDistribution[p].count;
    }
  });

  let dominantPhase: CyclePhase | undefined;
  let maxCount = 0;
  (Object.keys(phaseDistribution) as CyclePhase[]).forEach(p => {
    if (phaseDistribution[p].count > maxCount) {
      maxCount = phaseDistribution[p].count;
      dominantPhase = p;
    }
  });

  const specialEvents = entries.filter(e => e.isSpecialEvent);
  const alertTypes = [...new Set(alerts.map(a => a.type))];

  const feedbackThemeCount: Record<string, number> = {};
  feedbacks.forEach(f => {
    const words = f.message.split(/[，。！？、\s]+/).filter((w: string) => w.length >= 2);
    words.forEach((w: string) => {
      feedbackThemeCount[w] = (feedbackThemeCount[w] || 0) + 1;
    });
  });
  const feedbackThemes = Object.entries(feedbackThemeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);

  return {
    windowDays,
    entries,
    cycleInfo,
    alerts,
    feedbacks,
    avgMood,
    topKeywords,
    phaseDistribution: phaseDistribution as any,
    dominantPhase,
    specialEvents,
    negativeKeywordFreq,
    alertTypes,
    feedbackThemes,
  };
}

const ACTION_TEMPLATES: Record<HealingActionCategory, { title: string; description: string; category: HealingActionCategory }[]> = {
  breathing: [
    { title: '4-7-8 呼吸练习', description: '用鼻子吸气4秒，屏息7秒，用嘴呼气8秒，重复5次', category: 'breathing' },
    { title: '腹式呼吸放松', description: '平躺，手放在腹部，深吸气让腹部鼓起，缓慢呼气，持续5分钟', category: 'breathing' },
    { title: '晨间深呼吸', description: '起床后做10次深呼吸，每次吸气充满胸腔，呼气完全放松', category: 'breathing' },
  ],
  sleep: [
    { title: '规律睡眠时间', description: '每天固定在22:30前上床，保证7-8小时睡眠', category: 'sleep' },
    { title: '睡前放松仪式', description: '睡前30分钟放下手机，读纸质书或听轻音乐', category: 'sleep' },
    { title: '避免咖啡因', description: '下午14:00后不喝咖啡、浓茶等含咖啡因饮品', category: 'sleep' },
  ],
  exercise: [
    { title: '每日30分钟散步', description: '晚餐后户外散步30分钟，感受自然和新鲜空气', category: 'exercise' },
    { title: '轻度瑜伽拉伸', description: '做15分钟温和的瑜伽动作，放松肩颈和腰部', category: 'exercise' },
    { title: '有氧舞蹈', description: '跟随喜欢的音乐跳舞20分钟，释放压力', category: 'exercise' },
  ],
  diet: [
    { title: '多喝水', description: '每天喝够8杯水，分多次小口饮用', category: 'diet' },
    { title: '补充深色蔬菜', description: '午餐或晚餐增加一份深色绿叶蔬菜', category: 'diet' },
    { title: '减少精制糖', description: '用水果代替甜点，减少奶茶、碳酸饮料摄入', category: 'diet' },
  ],
  social: [
    { title: '联系一位好友', description: '给许久未见的朋友发条消息或打个电话', category: 'social' },
    { title: '与家人共进晚餐', description: '放下手机，专心和家人一起吃顿饭聊聊天', category: 'social' },
    { title: '参加社交活动', description: '主动报名参加一次感兴趣的线下或线上活动', category: 'social' },
  ],
  medical: [
    { title: '预约妇科检查', description: '如经期异常持续，建议尽快预约妇科门诊检查', category: 'medical' },
    { title: '心理咨询', description: '情绪持续低落超过两周，建议寻求专业心理咨询帮助', category: 'medical' },
    { title: '记录身体信号', description: '记录身体不适的时间、症状，方便就医时向医生描述', category: 'medical' },
  ],
  mindfulness: [
    { title: '5分钟正念冥想', description: '找一个安静的地方，专注于呼吸，观察当下的感受', category: 'mindfulness' },
    { title: '身体扫描', description: '从头顶到脚趾，逐一体察身体每个部位的感觉', category: 'mindfulness' },
    { title: '感恩日记', description: '写下今天让你感恩的3件小事', category: 'mindfulness' },
  ],
  hobby: [
    { title: '做喜欢的事情', description: '留出30分钟做一件纯粹让自己开心的事', category: 'hobby' },
    { title: '听治愈音乐', description: '创建一个治愈歌单，心情低落时播放', category: 'hobby' },
    { title: '涂鸦日记', description: '不用管画得好不好，用画笔表达今天的心情', category: 'hobby' },
  ],
  other: [
    { title: '整理房间', description: '整理桌面或一个抽屉，整洁的环境带来好心情', category: 'other' },
    { title: '晒太阳', description: '每天晒15分钟太阳，补充维生素D，改善情绪', category: 'other' },
    { title: '给自己写一封信', description: '写一封温柔的信给未来的自己', category: 'other' },
  ],
};

function determinePriority(context: AnalysisContext, category: HealingActionCategory): HealingActionPriority {
  const negKw = context.negativeKeywordFreq;

  if (category === 'medical' && (context.alerts.length > 0 || context.avgMood < 4)) return 'urgent';
  if (category === 'breathing' && (negKw['焦虑'] || negKw['紧张'] || negKw['不安'])) return 'high';
  if (category === 'sleep' && (negKw['疲惫'] || context.avgMood < 5)) return 'high';
  if (category === 'exercise' && (negKw['压力'] || negKw['烦躁'])) return 'high';
  if (category === 'social' && (negKw['孤独'] || negKw['失落'])) return 'high';
  if (category === 'mindfulness' && context.avgMood < 6) return 'high';
  if (category === 'diet' && context.avgMood < 5) return 'medium';
  if (category === 'hobby' && context.specialEvents.length === 0) return 'medium';
  return 'medium';
}

function determineTrigger(context: AnalysisContext, category: HealingActionCategory): HealingActionTrigger | undefined {
  const triggers: HealingActionTrigger = {};

  if (category === 'breathing' && context.phaseDistribution.luteal.avgMood < 5) {
    triggers.cyclePhases = ['luteal', 'menstrual'];
  }
  if (category === 'sleep') {
    triggers.moodThreshold = { max: 5 };
  }
  if (category === 'medical' && context.alertTypes.includes('consecutive_low_mood')) {
    triggers.moodThreshold = { max: 4 };
  }
  if (category === 'social' && context.negativeKeywordFreq['孤独']) {
    triggers.keywords = ['孤独', '失落'];
  }
  if (category === 'mindfulness') {
    triggers.daysOfWeek = [0, 2, 4, 6];
  }

  if (Object.keys(triggers).length === 0) return undefined;
  return triggers;
}

function generatePlanActions(context: AnalysisContext, planId: string, startDate: string, endDate: string): Omit<HealingAction, 'id' | 'createdAt' | 'updatedAt'>[] {
  const actions: Omit<HealingAction, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const selectedCategories = new Set<HealingActionCategory>();

  if (context.avgMood < 5) {
    selectedCategories.add('breathing');
    selectedCategories.add('mindfulness');
    selectedCategories.add('sleep');
  }
  if (context.negativeKeywordFreq['焦虑'] || context.negativeKeywordFreq['紧张'] || context.negativeKeywordFreq['压力']) {
    selectedCategories.add('breathing');
    selectedCategories.add('exercise');
    selectedCategories.add('mindfulness');
  }
  if (context.negativeKeywordFreq['疲惫']) {
    selectedCategories.add('sleep');
    selectedCategories.add('diet');
  }
  if (context.negativeKeywordFreq['孤独'] || context.negativeKeywordFreq['失落']) {
    selectedCategories.add('social');
  }
  if (context.alertTypes.includes('consecutive_low_mood') || context.alertTypes.includes('luteal_mood_decline')) {
    selectedCategories.add('medical');
    selectedCategories.add('mindfulness');
  }
  if (context.phaseDistribution.menstrual.avgMood < 5 || context.phaseDistribution.luteal.avgMood < 5) {
    selectedCategories.add('breathing');
    selectedCategories.add('diet');
  }
  if (context.specialEvents.length > 0 && context.avgMood < 6) {
    selectedCategories.add('hobby');
    selectedCategories.add('social');
  }

  if (selectedCategories.size === 0) {
    selectedCategories.add('mindfulness');
    selectedCategories.add('exercise');
    selectedCategories.add('sleep');
  }

  let order = 0;
  const categories = Array.from(selectedCategories);
  categories.forEach((cat, catIdx) => {
    const templates = ACTION_TEMPLATES[cat];
    const count = catIdx < 2 ? 2 : 1;
    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const template = templates[i];
      const priority = determinePriority(context, cat);
      const trigger = determineTrigger(context, cat);
      const reminderOffset = Math.floor(order * 2);
      const reminderDate = reminderOffset <= context.windowDays ? addDays(startDate, reminderOffset) : undefined;

      actions.push({
        planId,
        title: template.title,
        description: template.description,
        category: cat,
        priority,
        status: 'pending',
        trigger,
        reminderDate,
        dueDate: endDate,
        sortOrder: order++,
      });
    }
  });

  return actions;
}

export function generateHealingPlan(windowDays: 30 | 90): { plan: HealingPlan; actions: HealingAction[] } {
  const context = analyzeContext(windowDays);
  const today = formatLocalDate(new Date());
  const planEnd = addDays(today, windowDays);

  const generatedFrom: 'auto_30d' | 'auto_90d' = windowDays === 30 ? 'auto_30d' : 'auto_90d';

  const planData = {
    title: `${windowDays}天个性化疗愈计划`,
    description: `基于过去${windowDays}天的心情记录、周期阶段、洞察预警等数据自动生成的个性化疗愈计划。平均心情：${context.avgMood.toFixed(1)}分。`,
    status: 'active' as const,
    startDate: today,
    endDate: planEnd,
    generatedAt: new Date().toISOString(),
    generatedFrom,
    generationParams: {
      windowDays,
      avgMood: Math.round(context.avgMood * 10) / 10,
      topKeywords: context.topKeywords.slice(0, 5).map(k => k.keyword),
      alertTypes: context.alertTypes,
      dominantPhase: context.dominantPhase,
      specialEventsCount: context.specialEvents.length,
      feedbackThemes: context.feedbackThemes,
    },
  };

  const plan = store.createHealingPlan(planData);
  const actionsData = generatePlanActions(context, plan.id, today, planEnd);
  const actions = store.createHealingActionsBatch(actionsData);

  return { plan, actions };
}

export function generateDailySuggestions(date: string): HealingSuggestion[] {
  const context = analyzeContext(30);
  const suggestions: Omit<HealingSuggestion, 'id' | 'createdAt'>[] = [];
  const today = parseLocalDate(date);
  const { phase } = calculateCyclePhase(date, context.cycleInfo);

  const dayMoodEntry = context.entries.find(e => e.date === date);
  const todayMood = dayMoodEntry?.moodScore;

  if (phase === 'menstrual' || phase === 'luteal') {
    suggestions.push({
      date,
      title: '温和呼吸练习',
      description: phase === 'menstrual' ? '经期身体敏感，建议做5分钟温和的腹式呼吸' : '黄体期情绪易波动，试试4-7-8呼吸法平复心情',
      category: 'breathing',
      priority: 'high',
      reason: `当前处于${phase === 'menstrual' ? '月经期' : '黄体期'}，身体和情绪需要额外关爱`,
      source: 'phase',
    });
  }

  if (todayMood !== undefined && todayMood <= 4) {
    suggestions.push({
      date,
      title: '正念情绪安抚',
      description: '情绪低落时，尝试5分钟正念冥想：观察呼吸，不评判地接纳当下的感受',
      category: 'mindfulness',
      priority: 'urgent',
      reason: `今日心情评分${todayMood}分，低于阈值，建议优先进行情绪调节`,
      source: 'mood',
    });
    suggestions.push({
      date,
      title: '联系信任的人',
      description: '给自己信赖的朋友或家人打个电话，聊聊你现在的感受',
      category: 'social',
      priority: 'high',
      reason: '社会支持是情绪调节的重要资源',
      source: 'mood',
    });
  }

  if (dayMoodEntry?.keywords.some(kw => ['焦虑', '紧张', '压力', '烦躁'].includes(kw))) {
    suggestions.push({
      date,
      title: '身体运动释放',
      description: '去户外散步20分钟或做一组拉伸运动，帮助身体释放紧张情绪',
      category: 'exercise',
      priority: 'high',
      reason: `今日记录包含情绪关键词，运动可有效缓解`,
      source: 'keyword',
    });
  }

  const todayAlerts = context.alerts.filter(a => a.affectedDates.includes(date));
  if (todayAlerts.length > 0) {
    const alert = todayAlerts[0];
    suggestions.push({
      date,
      title: '关注预警信号',
      description: `收到洞察预警"${alert.title}"，建议多加关注自己的情绪变化，必要时寻求支持`,
      category: 'mindfulness',
      priority: alert.severity === 'alert' ? 'urgent' : 'high',
      reason: `洞察预警：${alert.title}`,
      source: 'alert',
    });
    if (alert.severity === 'alert') {
      suggestions.push({
        date,
        title: '专业支持建议',
        description: '情绪预警级别较高，如持续不适建议预约心理咨询或妇科检查',
        category: 'medical',
        priority: 'urgent',
        reason: '连续严重情绪预警，建议考虑专业支持',
        source: 'alert',
      });
    }
  }

  const nearbyEvent = context.specialEvents.find(e => {
    const diff = Math.abs(today.getTime() - parseLocalDate(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  });
  if (nearbyEvent) {
    suggestions.push({
      date,
      title: '特殊事件关怀',
      description: `近期有特殊事件"${nearbyEvent.specialEventTitle}"，记得给自己多一些温柔和照顾`,
      category: 'hobby',
      priority: 'medium',
      reason: `临近特殊事件：${nearbyEvent.specialEventTitle}`,
      source: 'event',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      date,
      title: '日常自我关爱',
      description: '今天留15分钟做一件让自己开心的小事：泡杯茶、听首歌、晒晒太阳',
      category: 'mindfulness',
      priority: 'low',
      reason: '每日日常关爱建议',
      source: 'routine',
    });
    suggestions.push({
      date,
      title: '保持规律作息',
      description: '尽量在固定时间入睡和起床，良好的睡眠是情绪稳定的基础',
      category: 'sleep',
      priority: 'medium',
      reason: '常规健康建议',
      source: 'routine',
    });
  }

  store.clearSuggestionsByDate(date);
  return store.saveHealingSuggestions(suggestions);
}

export function calculateProgressStats(planId: string): HealingProgressStats {
  const actions = store.getActionsByPlanId(planId);
  const completions = store.getCompletionsByPlanId(planId);
  const plan = store.getHealingPlanById(planId);

  const totalActions = actions.length;
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const inProgressActions = actions.filter(a => a.status === 'in_progress').length;
  const pendingActions = actions.filter(a => a.status === 'pending').length;
  const completionRate = totalActions > 0 ? completedActions / totalActions : 0;

  const categories: HealingActionCategory[] = ['breathing', 'sleep', 'exercise', 'diet', 'social', 'medical', 'mindfulness', 'hobby', 'other'];
  const byCategory: HealingProgressStats['byCategory'] = {} as any;
  categories.forEach(cat => {
    const catActions = actions.filter(a => a.category === cat);
    byCategory[cat] = {
      total: catActions.length,
      completed: catActions.filter(a => a.status === 'completed').length,
    };
  });

  const priorities: HealingActionPriority[] = ['low', 'medium', 'high', 'urgent'];
  const byPriority: HealingProgressStats['byPriority'] = {} as any;
  priorities.forEach(p => {
    const pActions = actions.filter(a => a.priority === p);
    byPriority[p] = {
      total: pActions.length,
      completed: pActions.filter(a => a.status === 'completed').length,
    };
  });

  const weeklyTrend: HealingProgressStats['weeklyTrend'] = [];
  if (plan) {
    let cursor = parseLocalDate(plan.startDate);
    const end = parseLocalDate(plan.endDate);
    while (cursor <= end) {
      const weekStart = formatLocalDate(cursor);
      cursor.setDate(cursor.getDate() + 6);
      const weekEnd = formatLocalDate(cursor);
      cursor.setDate(cursor.getDate() + 1);

      const weekCompletions = completions.filter(c => c.date >= weekStart && c.date <= weekEnd && c.completed);
      const weekExpected = actions.filter(a => {
        if (!a.reminderDate) return true;
        return a.reminderDate >= weekStart && a.reminderDate <= weekEnd;
      }).length;
      weeklyTrend.push({
        week: weekStart,
        completed: weekCompletions.length,
        total: Math.max(weekExpected, weekCompletions.length),
      });
    }
  }

  const moodCorrelation: HealingProgressStats['moodCorrelation'] = [];
  const { start, end } = plan
    ? { start: plan.startDate, end: plan.endDate }
    : getDateRange(30);
  const entries = store.getEntriesByDateRange(start, end);
  const byDayCompletions: Record<string, number> = {};
  completions.forEach(c => {
    if (c.completed) byDayCompletions[c.date] = (byDayCompletions[c.date] || 0) + 1;
  });

  const entriesWithPhase = entries.map(e => {
    const { phase } = calculateCyclePhase(e.date, context_cycleInfo());
    return { ...e, cyclePhase: phase };
  });

  for (let i = 0; i < entriesWithPhase.length; i += 3) {
    const chunk = entriesWithPhase.slice(i, i + 3);
    const compCount = chunk.reduce((s, e) => s + (byDayCompletions[e.date] || 0), 0);
    const avgMood = chunk.reduce((s, e) => s + e.moodScore, 0) / chunk.length;
    moodCorrelation.push({
      completionRate: Math.min(1, compCount / Math.max(chunk.length, 1)),
      avgMood,
    });
  }

  return {
    planId,
    totalActions,
    completedActions,
    completionRate,
    byCategory,
    byPriority,
    weeklyTrend,
    moodCorrelation,
  };
}

function context_cycleInfo(): CycleInfo {
  return store.getCycleInfo();
}

export function shouldTriggerAction(action: HealingAction, date: string, entry?: DiaryEntry, cycleInfo?: CycleInfo): boolean {
  if (!action.trigger) return true;
  const trigger = action.trigger;
  const info = cycleInfo || store.getCycleInfo();

  if (trigger.cyclePhases && trigger.cyclePhases.length > 0) {
    const { phase } = calculateCyclePhase(date, info);
    if (!trigger.cyclePhases.includes(phase)) return false;
  }

  if (trigger.moodThreshold && entry) {
    if (trigger.moodThreshold.min !== undefined && entry.moodScore < trigger.moodThreshold.min) return false;
    if (trigger.moodThreshold.max !== undefined && entry.moodScore > trigger.moodThreshold.max) return false;
  }

  if (trigger.keywords && trigger.keywords.length > 0 && entry) {
    const hasMatch = entry.keywords.some(kw => trigger.keywords!.includes(kw));
    if (!hasMatch && entry.keywords.length > 0) return false;
  }

  if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0) {
    const d = parseLocalDate(date).getDay();
    if (!trigger.daysOfWeek.includes(d)) return false;
  }

  return true;
}
