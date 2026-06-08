import fs from 'fs';
import path from 'path';
import {
  DiaryEntry,
  CycleInfo,
  InsightRuleConfig,
  InsightAlert,
  DEFAULT_INSIGHT_RULES,
} from './types';
import { getDefaultCycleInfo } from './utils/cycle';

const DATA_DIR = path.join(process.cwd(), 'data');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
const CYCLE_FILE = path.join(DATA_DIR, 'cycle.json');
const INSIGHT_RULES_FILE = path.join(DATA_DIR, 'insight-rules.json');
const INSIGHT_ALERTS_FILE = path.join(DATA_DIR, 'insight-alerts.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSONFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return defaultValue;
}

function writeJSONFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateSampleData(): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  const today = new Date();
  const moods = [3, 4, 5, 6, 7, 8, 9];
  const keywordPool = [
    '开心', '平静', '焦虑', '疲惫', '充实', '失落',
    '兴奋', '感动', '烦躁', '放松', '孤独', '幸福',
    '压力', '自信', '迷茫', '温暖', '感恩', '期待'
  ];
  const stickerPool = ['heart', 'star', 'flower', 'sun', 'moon', 'sparkle', 'coffee', 'music'];

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatLocalDate(date);

    if (Math.random() < 0.75) {
      const moodScore = moods[Math.floor(Math.random() * moods.length)];
      const kwCount = Math.floor(Math.random() * 3) + 1;
      const keywords: string[] = [];
      for (let j = 0; j < kwCount; j++) {
        const kw = keywordPool[Math.floor(Math.random() * keywordPool.length)];
        if (!keywords.includes(kw)) keywords.push(kw);
      }
      const stickers: string[] = [];
      if (Math.random() < 0.5) {
        stickers.push(stickerPool[Math.floor(Math.random() * stickerPool.length)]);
      }
      const isSpecial = Math.random() < 0.08;

      entries.push({
        id: `entry_${dateStr}_${Math.random().toString(36).slice(2, 8)}`,
        date: dateStr,
        moodScore,
        keywords,
        notes: generateSampleNote(moodScore, keywords),
        photos: [],
        stickers: stickers as any,
        visibility: Math.random() < 0.7 ? 'private' : 'public',
        isSpecialEvent: isSpecial,
        specialEventTitle: isSpecial ? getRandomEventTitle() : undefined,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      });
    }
  }
  return entries;
}

function generateSampleNote(score: number, keywords: string[]): string {
  const templates = [
    `今天感觉${keywords.join('、')}，整体来说${score >= 7 ? '很不错' : score >= 5 ? '还可以' : '有点低落'}。`,
    `记录一下今天的心情：${keywords.join('，')}。希望明天会更好。`,
    `${keywords.join('、')}的一天。给自己打${score}分吧。`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function getRandomEventTitle(): string {
  const events = ['生日', '纪念日', '旅行出发', '升职加薪', '朋友聚会', '完成目标', '特别的一天', '度假'];
  return events[Math.floor(Math.random() * events.length)];
}

function readEntries(): DiaryEntry[] {
  const defaultValue = { entries: generateSampleData() };
  const data = readJSONFile<{ entries: DiaryEntry[] }>(ENTRIES_FILE, defaultValue);
  if (!fs.existsSync(ENTRIES_FILE)) {
    writeJSONFile(ENTRIES_FILE, data);
  }
  return data.entries;
}

function writeEntries(entries: DiaryEntry[]): void {
  writeJSONFile(ENTRIES_FILE, { entries });
}

export function getAllEntries(): DiaryEntry[] {
  return readEntries().sort((a, b) => b.date.localeCompare(a.date));
}

export function getEntryById(id: string): DiaryEntry | undefined {
  return readEntries().find(e => e.id === id);
}

export function getEntryByDate(date: string): DiaryEntry | undefined {
  return readEntries().find(e => e.date === date);
}

export function getEntriesByDateRange(start: string, end: string): DiaryEntry[] {
  return readEntries().filter(e => e.date >= start && e.date <= end);
}

export function createEntry(entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): DiaryEntry {
  const entries = readEntries();
  const now = new Date().toISOString();
  const existingIdx = entries.findIndex(e => e.date === entry.date);
  let newEntry: DiaryEntry;

  if (existingIdx >= 0) {
    newEntry = {
      ...entries[existingIdx],
      ...entry,
      updatedAt: now,
    };
    entries[existingIdx] = newEntry;
  } else {
    newEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    entries.push(newEntry);
  }
  writeEntries(entries);
  return newEntry;
}

export function updateEntry(id: string, updates: Partial<DiaryEntry>): DiaryEntry | undefined {
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    entries[idx] = {
      ...entries[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeEntries(entries);
    return entries[idx];
  }
  return undefined;
}

export function deleteEntry(id: string): boolean {
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    entries.splice(idx, 1);
    writeEntries(entries);
    return true;
  }
  return false;
}

export function getCycleInfo(): CycleInfo {
  const defaultValue = getDefaultCycleInfo();
  const data = readJSONFile<CycleInfo>(CYCLE_FILE, defaultValue);
  if (!fs.existsSync(CYCLE_FILE)) {
    writeJSONFile(CYCLE_FILE, data);
  }
  return data;
}

export function updateCycleInfo(info: Partial<CycleInfo>): CycleInfo {
  const current = getCycleInfo();
  const updated = { ...current, ...info };
  writeJSONFile(CYCLE_FILE, updated);
  return updated;
}

function readInsightRules(): InsightRuleConfig[] {
  const defaultValue = { rules: DEFAULT_INSIGHT_RULES };
  const data = readJSONFile<{ rules: InsightRuleConfig[] }>(INSIGHT_RULES_FILE, defaultValue);
  if (!fs.existsSync(INSIGHT_RULES_FILE)) {
    writeJSONFile(INSIGHT_RULES_FILE, data);
  }
  return data.rules;
}

function writeInsightRules(rules: InsightRuleConfig[]): void {
  writeJSONFile(INSIGHT_RULES_FILE, { rules });
}

export function getInsightRules(): InsightRuleConfig[] {
  return readInsightRules();
}

export function updateInsightRules(rules: InsightRuleConfig[]): InsightRuleConfig[] {
  const current = readInsightRules();
  const merged = current.map(rule => {
    const updated = rules.find(r => r.type === rule.type);
    return updated ? { ...rule, ...updated } : rule;
  });
  const newRules = rules.filter(r => !current.find(c => c.type === r.type));
  const final = [...merged, ...newRules];
  writeInsightRules(final);
  return final;
}

export function updateInsightRule(type: string, updates: Partial<InsightRuleConfig>): InsightRuleConfig | undefined {
  const rules = readInsightRules();
  const idx = rules.findIndex(r => r.type === type);
  if (idx >= 0) {
    rules[idx] = { ...rules[idx], ...updates };
    writeInsightRules(rules);
    return rules[idx];
  }
  return undefined;
}

function readInsightAlerts(): InsightAlert[] {
  const defaultValue = { alerts: [] as InsightAlert[] };
  const data = readJSONFile<{ alerts: InsightAlert[] }>(INSIGHT_ALERTS_FILE, defaultValue);
  if (!fs.existsSync(INSIGHT_ALERTS_FILE)) {
    writeJSONFile(INSIGHT_ALERTS_FILE, data);
  }
  return data.alerts;
}

function writeInsightAlerts(alerts: InsightAlert[]): void {
  writeJSONFile(INSIGHT_ALERTS_FILE, { alerts });
}

export function getInsightAlerts(params?: {
  start?: string;
  end?: string;
  type?: string;
  severity?: string;
  limit?: number;
}): InsightAlert[] {
  let alerts = readInsightAlerts();
  if (params?.start) {
    alerts = alerts.filter(a => a.date >= params.start!);
  }
  if (params?.end) {
    alerts = alerts.filter(a => a.date <= params.end!);
  }
  if (params?.type) {
    alerts = alerts.filter(a => a.type === params.type);
  }
  if (params?.severity) {
    alerts = alerts.filter(a => a.severity === params.severity);
  }
  alerts = alerts.sort((a, b) => b.date.localeCompare(a.date));
  if (params?.limit) {
    alerts = alerts.slice(0, params.limit);
  }
  return alerts;
}

export function getAlertDates(): string[] {
  const alerts = readInsightAlerts();
  const dates = new Set<string>();
  alerts.forEach(a => {
    a.affectedDates.forEach(d => dates.add(d));
  });
  return Array.from(dates).sort();
}

export function saveInsightAlerts(alerts: InsightAlert[]): void {
  writeInsightAlerts(alerts);
}

export function clearInsightAlerts(): void {
  writeInsightAlerts([]);
}

export function createInsightAlert(alert: Omit<InsightAlert, 'id' | 'createdAt'>): InsightAlert {
  const alerts = readInsightAlerts();
  const newAlert: InsightAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  alerts.push(newAlert);
  writeInsightAlerts(alerts);
  return newAlert;
}
