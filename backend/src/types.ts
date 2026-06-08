export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type Visibility = 'private' | 'public';

export type StickerType =
  | 'heart' | 'star' | 'flower' | 'sun' | 'moon'
  | 'cloud' | 'rainbow' | 'music' | 'coffee' | 'book'
  | 'sparkle' | 'leaf' | 'gift' | 'cat' | 'ribbon';

export interface DiaryEntry {
  id: string;
  date: string;
  moodScore: number;
  keywords: string[];
  notes: string;
  photos: string[];
  stickers: StickerType[];
  visibility: Visibility;
  isSpecialEvent: boolean;
  specialEventTitle?: string;
  cyclePhase?: CyclePhase;
  cycleDay?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CycleInfo {
  lastPeriodDate: string;
  cycleLength: number;
  periodLength: number;
}

export interface PhaseMoodStats {
  phase: CyclePhase;
  phaseName: string;
  avgMood: number;
  count: number;
  keywordFrequency: { keyword: string; count: number }[];
}

export interface MonthlyStats {
  month: string;
  avgMood: number;
  entriesCount: number;
  phaseStats: PhaseMoodStats[];
}

export interface YearlyReview {
  year: number;
  avgMood: number;
  totalEntries: number;
  monthlyTrend: { month: string; avgMood: number; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  specialEvents: { date: string; title: string; moodScore: number }[];
  phaseBreakdown: PhaseMoodStats[];
}

export interface MoodTrendPoint {
  date: string;
  moodScore: number;
  cyclePhase?: CyclePhase;
}

export type InsightRuleType =
  | 'consecutive_low_mood'
  | 'luteal_mood_decline'
  | 'premenstrual_keyword_spike'
  | 'post_event_mood_drop';

export type InsightSeverity = 'info' | 'warning' | 'alert';

export interface InsightRuleConfig {
  type: InsightRuleType;
  enabled: boolean;
  name: string;
  description: string;
  thresholds: Record<string, number>;
}

export interface InsightAlert {
  id: string;
  type: InsightRuleType;
  severity: InsightSeverity;
  title: string;
  description: string;
  date: string;
  startDate?: string;
  endDate?: string;
  affectedDates: string[];
  details: Record<string, any>;
  ruleSnapshot: InsightRuleConfig;
  createdAt: string;
}

export interface InsightSummary {
  totalAlerts: number;
  alertsBySeverity: Record<InsightSeverity, number>;
  alertsByType: Record<InsightRuleType, number>;
  recentAlerts: InsightAlert[];
  periodOverview: {
    avgMood: number;
    moodTrend: 'rising' | 'falling' | 'stable';
    mostFrequentPhase: CyclePhase | null;
  };
}

export const DEFAULT_INSIGHT_RULES: InsightRuleConfig[] = [
  {
    type: 'consecutive_low_mood',
    enabled: true,
    name: '连续情绪低落',
    description: '当连续多天情绪评分低于阈值时发出预警',
    thresholds: {
      lowMoodThreshold: 4,
      consecutiveDays: 3,
    },
  },
  {
    type: 'luteal_mood_decline',
    enabled: true,
    name: '黄体期情绪下滑',
    description: '黄体期情绪评分相较于卵泡期/排卵期显著下降时发出预警',
    thresholds: {
      minDeclinePoints: 2,
      minComparisonDays: 3,
    },
  },
  {
    type: 'premenstrual_keyword_spike',
    enabled: true,
    name: '经期前关键词异常高频',
    description: '经期前负面关键词出现频率显著高于平常时发出预警',
    thresholds: {
      spikeMultiplier: 2,
      minOccurrences: 2,
      windowDays: 5,
    },
  },
  {
    type: 'post_event_mood_drop',
    enabled: true,
    name: '特殊事件后情绪回落',
    description: '特殊事件（高情绪）后情绪评分显著回落时发出预警',
    thresholds: {
      eventMoodThreshold: 7,
      dropPoints: 3,
      dropWindowDays: 3,
    },
  },
];

export const NEGATIVE_KEYWORDS = [
  '焦虑', '疲惫', '失落', '烦躁', '孤独', '压力',
  '迷茫', '生气', '难过', 'emo', '低落', '郁闷',
  '紧张', '不安', '伤心', '沮丧', '抑郁', '痛苦',
];

export type ContactType = 'trusted' | 'doctor' | 'counselor';

export interface TrustedContact {
  id: string;
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  note?: string;
  createdAt: string;
}

export type ShareFieldKey =
  | 'moodScore'
  | 'keywords'
  | 'notes'
  | 'photos'
  | 'cyclePhase'
  | 'specialEvent'
  | 'insights';

export interface FieldVisibility {
  moodScore: boolean;
  keywords: boolean;
  notes: boolean;
  photos: boolean;
  cyclePhase: boolean;
  specialEvent: boolean;
  insights: boolean;
}

export interface ShareSpace {
  id: string;
  name: string;
  description?: string;
  contactIds: string[];
  startDate: string;
  endDate: string;
  fieldVisibility: FieldVisibility;
  desensitizeNotes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  id: string;
  spaceId: string;
  token: string;
  expiresAt: string | null;
  maxVisits: number | null;
  visitCount: number;
  createdAt: string;
  revokedAt: string | null;
  isActive: boolean;
}

export interface ShareAuditLog {
  id: string;
  spaceId: string;
  linkId: string;
  visitorName?: string;
  action: 'view' | 'feedback';
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface ShareFeedback {
  id: string;
  spaceId: string;
  linkId: string;
  visitorName: string;
  message: string;
  createdAt: string;
}

export interface EntryPrivateNote {
  entryId: string;
  note: string;
  updatedAt: string;
}

export type HealingActionCategory =
  | 'breathing'
  | 'sleep'
  | 'exercise'
  | 'diet'
  | 'social'
  | 'medical'
  | 'mindfulness'
  | 'hobby'
  | 'other';

export type HealingActionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type HealingActionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';

export type HealingPlanStatus = 'active' | 'paused' | 'completed' | 'archived';

export const HEALING_CATEGORY_LABELS: Record<HealingActionCategory, string> = {
  breathing: '呼吸练习',
  sleep: '睡眠改善',
  exercise: '运动健身',
  diet: '饮食调理',
  social: '社交支持',
  medical: '就医提醒',
  mindfulness: '正念冥想',
  hobby: '兴趣爱好',
  other: '其他',
};

export const HEALING_CATEGORY_EMOJI: Record<HealingActionCategory, string> = {
  breathing: '🫁',
  sleep: '😴',
  exercise: '🏃',
  diet: '🥗',
  social: '💞',
  medical: '🏥',
  mindfulness: '🧘',
  hobby: '🎨',
  other: '✨',
};

export const HEALING_CATEGORY_COLORS: Record<HealingActionCategory, string> = {
  breathing: '#81C784',
  sleep: '#7986CB',
  exercise: '#FFB74D',
  diet: '#AED581',
  social: '#F06292',
  medical: '#E57373',
  mindfulness: '#9575CD',
  hobby: '#4FC3F7',
  other: '#A1887F',
};

export const PRIORITY_LABELS: Record<HealingActionPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export const PRIORITY_COLORS: Record<HealingActionPriority, string> = {
  low: '#A1887F',
  medium: '#FFB74D',
  high: '#FF8A65',
  urgent: '#E57373',
};

export const STATUS_LABELS: Record<HealingActionStatus, string> = {
  pending: '待执行',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
  cancelled: '已取消',
};

export const PLAN_STATUS_LABELS: Record<HealingPlanStatus, string> = {
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
  archived: '已归档',
};

export interface HealingActionTrigger {
  cyclePhases?: CyclePhase[];
  moodThreshold?: {
    min?: number;
    max?: number;
  };
  keywords?: string[];
  daysOfWeek?: number[];
}

export interface HealingAction {
  id: string;
  planId: string;
  title: string;
  description?: string;
  category: HealingActionCategory;
  priority: HealingActionPriority;
  status: HealingActionStatus;
  trigger?: HealingActionTrigger;
  reminderDate?: string;
  dueDate?: string;
  completedAt?: string;
  linkedEntryId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealingCompletionRecord {
  id: string;
  actionId: string;
  planId: string;
  date: string;
  completed: boolean;
  moodBefore?: number;
  moodAfter?: number;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
}

export interface HealingReviewNote {
  id: string;
  actionId?: string;
  planId: string;
  entryId?: string;
  date: string;
  content: string;
  moodScore?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealingPlan {
  id: string;
  title: string;
  description?: string;
  status: HealingPlanStatus;
  startDate: string;
  endDate: string;
  generatedAt?: string;
  generatedFrom?: 'manual' | 'auto_30d' | 'auto_90d';
  generationParams?: {
    windowDays: number;
    avgMood: number;
    topKeywords: string[];
    alertTypes: string[];
    dominantPhase?: CyclePhase;
    specialEventsCount: number;
    feedbackThemes: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface HealingPlanWithStats extends HealingPlan {
  totalActions: number;
  completedActions: number;
  completionRate: number;
  inProgressActions: number;
  pendingActions: number;
}

export interface HealingSuggestion {
  id: string;
  date: string;
  planId?: string;
  actionId?: string;
  title: string;
  description: string;
  category: HealingActionCategory;
  priority: HealingActionPriority;
  reason: string;
  source: 'phase' | 'mood' | 'keyword' | 'alert' | 'event' | 'feedback' | 'routine';
  createdAt: string;
}

export interface HealingProgressStats {
  planId: string;
  totalActions: number;
  completedActions: number;
  completionRate: number;
  byCategory: Record<HealingActionCategory, { total: number; completed: number }>;
  byPriority: Record<HealingActionPriority, { total: number; completed: number }>;
  weeklyTrend: { week: string; completed: number; total: number }[];
  moodCorrelation: { completionRate: number; avgMood: number }[];
}

export type ReminderRuleType =
  | 'daily_record'
  | 'period_start'
  | 'low_mood_review'
  | 'healing_action';

export type ReminderStatus = 'pending' | 'completed' | 'ignored';

export interface ReminderRule {
  id: string;
  type: ReminderRuleType;
  name: string;
  description: string;
  enabled: boolean;
  time: string;
  daysAhead?: number;
  moodThreshold?: number;
  consecutiveDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderInstance {
  id: string;
  ruleId: string;
  ruleType: ReminderRuleType;
  title: string;
  description: string;
  triggerDate: string;
  triggerTime: string;
  status: ReminderStatus;
  linkedEntryId?: string;
  linkedActionId?: string;
  handledAt?: string;
  createdAt: string;
}

export const DEFAULT_REMINDER_RULES: Omit<ReminderRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'daily_record',
    name: '每日记录提醒',
    description: '每天提醒记录当日心情与日记',
    enabled: true,
    time: '21:00',
  },
  {
    type: 'period_start',
    name: '经期开始前提醒',
    description: '预计经期开始前提醒做好准备',
    enabled: true,
    time: '09:00',
    daysAhead: 2,
  },
  {
    type: 'low_mood_review',
    name: '低分情绪复盘提醒',
    description: '连续情绪低落时提醒进行复盘',
    enabled: true,
    time: '20:00',
    moodThreshold: 4,
    consecutiveDays: 2,
  },
  {
    type: 'healing_action',
    name: '当天疗愈行动提醒',
    description: '提醒完成当日安排的疗愈行动',
    enabled: true,
    time: '10:00',
  },
];

export const REMINDER_TYPE_LABELS: Record<ReminderRuleType, string> = {
  daily_record: '📝 每日记录',
  period_start: '🩸 经期前提醒',
  low_mood_review: '💭 情绪复盘',
  healing_action: '💚 疗愈行动',
};

export const REMINDER_TYPE_COLORS: Record<ReminderRuleType, string> = {
  daily_record: '#FFB74D',
  period_start: '#F06292',
  low_mood_review: '#7986CB',
  healing_action: '#81C784',
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: '待处理',
  completed: '已完成',
  ignored: '已忽略',
};
