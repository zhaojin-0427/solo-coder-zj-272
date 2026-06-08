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
