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
