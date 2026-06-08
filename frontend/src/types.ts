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

export const INSIGHT_RULE_LABELS: Record<InsightRuleType, string> = {
  consecutive_low_mood: '连续情绪低落',
  luteal_mood_decline: '黄体期情绪下滑',
  premenstrual_keyword_spike: '经期前关键词激增',
  post_event_mood_drop: '事件后情绪回落',
};

export const INSIGHT_SEVERITY_LABELS: Record<InsightSeverity, string> = {
  info: '提示',
  warning: '注意',
  alert: '警告',
};

export const INSIGHT_SEVERITY_COLORS: Record<InsightSeverity, string> = {
  info: '#64B5F6',
  warning: '#FFB74D',
  alert: '#E57373',
};

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

export const STICKER_EMOJI: Record<StickerType, string> = {
  heart: '❤️',
  star: '⭐',
  flower: '🌸',
  sun: '☀️',
  moon: '🌙',
  cloud: '☁️',
  rainbow: '🌈',
  music: '🎵',
  coffee: '☕',
  book: '📖',
  sparkle: '✨',
  leaf: '🍃',
  gift: '🎁',
  cat: '🐱',
  ribbon: '🎀',
};

export const MOOD_EMOJI: Record<number, string> = {
  1: '😭', 2: '😢', 3: '😔', 4: '😕',
  5: '😐', 6: '🙂', 7: '😊', 8: '😄',
  9: '🥰', 10: '🤩',
};

export type ContactType = 'trusted' | 'doctor' | 'counselor';

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  trusted: '🤝 可信联系人',
  doctor: '🏥 医生',
  counselor: '💆 心理咨询师',
};

export const CONTACT_TYPE_EMOJI: Record<ContactType, string> = {
  trusted: '🤝',
  doctor: '🏥',
  counselor: '💆',
};

export interface TrustedContact {
  id: string;
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  note?: string;
  createdAt: string;
}

export interface FieldVisibility {
  moodScore: boolean;
  keywords: boolean;
  notes: boolean;
  photos: boolean;
  cyclePhase: boolean;
  specialEvent: boolean;
  insights: boolean;
}

export const FIELD_LABELS: Record<keyof FieldVisibility, string> = {
  moodScore: '心情评分',
  keywords: '关键词标签',
  notes: '文字日记',
  photos: '照片',
  cyclePhase: '周期阶段',
  specialEvent: '特殊事件',
  insights: '洞察预警',
};

export const FIELD_EMOJI: Record<keyof FieldVisibility, string> = {
  moodScore: '😊',
  keywords: '🏷️',
  notes: '📝',
  photos: '📷',
  cyclePhase: '🌙',
  specialEvent: '🎉',
  insights: '🔮',
};

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

export interface ShareSpaceWithStats extends ShareSpace {
  links: ShareLink[];
  feedbackCount: number;
  auditCount: number;
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

export interface ShareSpaceDetail {
  space: ShareSpace;
  contacts: TrustedContact[];
  links: ShareLink[];
  feedbacks: ShareFeedback[];
  audits: ShareAuditLog[];
  entries: Partial<DiaryEntry>[];
  alerts: InsightAlert[];
  privateNotes: Record<string, string>;
}

export interface PublicShareData {
  space: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  };
  entries: Partial<DiaryEntry>[];
  alerts: InsightAlert[];
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

export const SUGGESTION_SOURCE_LABELS: Record<string, string> = {
  phase: '周期阶段',
  mood: '心情状态',
  keyword: '关键词',
  alert: '洞察预警',
  event: '特殊事件',
  feedback: '共享反馈',
  routine: '日常建议',
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
