import { DiaryEntry, CycleInfo } from './types';
import { getDefaultCycleInfo } from './utils/cycle';

const STORAGE_KEY = 'mood_journal_data';
const CYCLE_KEY = 'mood_journal_cycle';

interface StorageData {
  entries: DiaryEntry[];
}

function readStorage(): StorageData {
  try {
    const data = process.env[STORAGE_KEY];
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {}
  return { entries: generateSampleData() };
}

function writeStorage(data: StorageData): void {
  process.env[STORAGE_KEY] = JSON.stringify(data);
}

function readCycleInfo(): CycleInfo {
  try {
    const data = process.env[CYCLE_KEY];
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {}
  return getDefaultCycleInfo();
}

function writeCycleInfo(info: CycleInfo): void {
  process.env[CYCLE_KEY] = JSON.stringify(info);
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
    const dateStr = date.toISOString().split('T')[0];

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

export function getAllEntries(): DiaryEntry[] {
  const data = readStorage();
  return data.entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function getEntryById(id: string): DiaryEntry | undefined {
  return readStorage().entries.find(e => e.id === id);
}

export function getEntryByDate(date: string): DiaryEntry | undefined {
  return readStorage().entries.find(e => e.date === date);
}

export function getEntriesByDateRange(start: string, end: string): DiaryEntry[] {
  return readStorage().entries.filter(e => e.date >= start && e.date <= end);
}

export function createEntry(entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): DiaryEntry {
  const data = readStorage();
  const now = new Date().toISOString();
  const newEntry: DiaryEntry = {
    ...entry,
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  const existingIdx = data.entries.findIndex(e => e.date === entry.date);
  if (existingIdx >= 0) {
    newEntry.id = data.entries[existingIdx].id;
    newEntry.createdAt = data.entries[existingIdx].createdAt;
    data.entries[existingIdx] = newEntry;
  } else {
    data.entries.push(newEntry);
  }
  writeStorage(data);
  return newEntry;
}

export function updateEntry(id: string, updates: Partial<DiaryEntry>): DiaryEntry | undefined {
  const data = readStorage();
  const idx = data.entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    data.entries[idx] = {
      ...data.entries[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeStorage(data);
    return data.entries[idx];
  }
  return undefined;
}

export function deleteEntry(id: string): boolean {
  const data = readStorage();
  const idx = data.entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    data.entries.splice(idx, 1);
    writeStorage(data);
    return true;
  }
  return false;
}

export function getCycleInfo(): CycleInfo {
  return readCycleInfo();
}

export function updateCycleInfo(info: Partial<CycleInfo>): CycleInfo {
  const current = readCycleInfo();
  const updated = { ...current, ...info };
  writeCycleInfo(updated);
  return updated;
}
