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
