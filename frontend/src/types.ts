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
