import fs from 'fs';
import path from 'path';
import {
  DiaryEntry,
  CycleInfo,
  InsightRuleConfig,
  InsightAlert,
  DEFAULT_INSIGHT_RULES,
  TrustedContact,
  ShareSpace,
  ShareLink,
  ShareAuditLog,
  ShareFeedback,
  EntryPrivateNote,
  HealingPlan,
  HealingAction,
  HealingCompletionRecord,
  HealingReviewNote,
  HealingSuggestion,
} from './types';
import { getDefaultCycleInfo } from './utils/cycle';

const DATA_DIR = path.join(process.cwd(), 'data');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
const CYCLE_FILE = path.join(DATA_DIR, 'cycle.json');
const INSIGHT_RULES_FILE = path.join(DATA_DIR, 'insight-rules.json');
const INSIGHT_ALERTS_FILE = path.join(DATA_DIR, 'insight-alerts.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SHARE_SPACES_FILE = path.join(DATA_DIR, 'share-spaces.json');
const SHARE_LINKS_FILE = path.join(DATA_DIR, 'share-links.json');
const SHARE_AUDIT_FILE = path.join(DATA_DIR, 'share-audit.json');
const SHARE_FEEDBACK_FILE = path.join(DATA_DIR, 'share-feedback.json');
const PRIVATE_NOTES_FILE = path.join(DATA_DIR, 'private-notes.json');
const HEALING_PLANS_FILE = path.join(DATA_DIR, 'healing-plans.json');
const HEALING_ACTIONS_FILE = path.join(DATA_DIR, 'healing-actions.json');
const HEALING_COMPLETIONS_FILE = path.join(DATA_DIR, 'healing-completions.json');
const HEALING_REVIEWS_FILE = path.join(DATA_DIR, 'healing-reviews.json');
const HEALING_SUGGESTIONS_FILE = path.join(DATA_DIR, 'healing-suggestions.json');

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

function readContacts(): TrustedContact[] {
  const defaultValue = { contacts: [] as TrustedContact[] };
  const data = readJSONFile<{ contacts: TrustedContact[] }>(CONTACTS_FILE, defaultValue);
  if (!fs.existsSync(CONTACTS_FILE)) {
    writeJSONFile(CONTACTS_FILE, data);
  }
  return data.contacts;
}

function writeContacts(contacts: TrustedContact[]): void {
  writeJSONFile(CONTACTS_FILE, { contacts });
}

export function getAllContacts(): TrustedContact[] {
  return readContacts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createContact(data: Omit<TrustedContact, 'id' | 'createdAt'>): TrustedContact {
  const contacts = readContacts();
  const contact: TrustedContact = {
    ...data,
    id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  contacts.push(contact);
  writeContacts(contacts);
  return contact;
}

export function updateContact(id: string, updates: Partial<TrustedContact>): TrustedContact | undefined {
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx >= 0) {
    contacts[idx] = { ...contacts[idx], ...updates };
    writeContacts(contacts);
    return contacts[idx];
  }
  return undefined;
}

export function deleteContact(id: string): boolean {
  const contacts = readContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx >= 0) {
    contacts.splice(idx, 1);
    writeContacts(contacts);
    return true;
  }
  return false;
}

function readShareSpaces(): ShareSpace[] {
  const defaultValue = { spaces: [] as ShareSpace[] };
  const data = readJSONFile<{ spaces: ShareSpace[] }>(SHARE_SPACES_FILE, defaultValue);
  if (!fs.existsSync(SHARE_SPACES_FILE)) {
    writeJSONFile(SHARE_SPACES_FILE, data);
  }
  return data.spaces;
}

function writeShareSpaces(spaces: ShareSpace[]): void {
  writeJSONFile(SHARE_SPACES_FILE, { spaces });
}

export function getAllShareSpaces(): ShareSpace[] {
  return readShareSpaces().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getShareSpaceById(id: string): ShareSpace | undefined {
  return readShareSpaces().find(s => s.id === id);
}

export function createShareSpace(data: Omit<ShareSpace, 'id' | 'createdAt' | 'updatedAt'>): ShareSpace {
  const spaces = readShareSpaces();
  const now = new Date().toISOString();
  const space: ShareSpace = {
    ...data,
    id: `space_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  spaces.push(space);
  writeShareSpaces(spaces);
  return space;
}

export function updateShareSpace(id: string, updates: Partial<ShareSpace>): ShareSpace | undefined {
  const spaces = readShareSpaces();
  const idx = spaces.findIndex(s => s.id === id);
  if (idx >= 0) {
    spaces[idx] = { ...spaces[idx], ...updates, updatedAt: new Date().toISOString() };
    writeShareSpaces(spaces);
    return spaces[idx];
  }
  return undefined;
}

export function deleteShareSpace(id: string): boolean {
  const spaces = readShareSpaces();
  const idx = spaces.findIndex(s => s.id === id);
  if (idx >= 0) {
    spaces.splice(idx, 1);
    writeShareSpaces(spaces);
    const links = readShareLinks().filter(l => l.spaceId !== id);
    writeShareLinks(links);
    const audits = readAuditLogs().filter(a => a.spaceId !== id);
    writeAuditLogs(audits);
    const feedbacks = readFeedbacks().filter(f => f.spaceId !== id);
    writeFeedbacks(feedbacks);
    return true;
  }
  return false;
}

function readShareLinks(): ShareLink[] {
  const defaultValue = { links: [] as ShareLink[] };
  const data = readJSONFile<{ links: ShareLink[] }>(SHARE_LINKS_FILE, defaultValue);
  if (!fs.existsSync(SHARE_LINKS_FILE)) {
    writeJSONFile(SHARE_LINKS_FILE, data);
  }
  return data.links;
}

function writeShareLinks(links: ShareLink[]): void {
  writeJSONFile(SHARE_LINKS_FILE, { links });
}

export function getLinksBySpaceId(spaceId: string): ShareLink[] {
  return readShareLinks().filter(l => l.spaceId === spaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getShareLinkByToken(token: string): ShareLink | undefined {
  return readShareLinks().find(l => l.token === token);
}

export function createShareLink(data: Omit<ShareLink, 'id' | 'token' | 'visitCount' | 'createdAt' | 'revokedAt' | 'isActive'>): ShareLink {
  const links = readShareLinks();
  const link: ShareLink = {
    ...data,
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    token: Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15),
    visitCount: 0,
    createdAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  };
  links.push(link);
  writeShareLinks(links);
  return link;
}

export function revokeShareLink(id: string): ShareLink | undefined {
  const links = readShareLinks();
  const idx = links.findIndex(l => l.id === id);
  if (idx >= 0) {
    links[idx] = { ...links[idx], isActive: false, revokedAt: new Date().toISOString() };
    writeShareLinks(links);
    return links[idx];
  }
  return undefined;
}

export function incrementLinkVisit(token: string): ShareLink | undefined {
  const links = readShareLinks();
  const idx = links.findIndex(l => l.token === token);
  if (idx >= 0) {
    links[idx] = { ...links[idx], visitCount: links[idx].visitCount + 1 };
    writeShareLinks(links);
    return links[idx];
  }
  return undefined;
}

function readAuditLogs(): ShareAuditLog[] {
  const defaultValue = { logs: [] as ShareAuditLog[] };
  const data = readJSONFile<{ logs: ShareAuditLog[] }>(SHARE_AUDIT_FILE, defaultValue);
  if (!fs.existsSync(SHARE_AUDIT_FILE)) {
    writeJSONFile(SHARE_AUDIT_FILE, data);
  }
  return data.logs;
}

function writeAuditLogs(logs: ShareAuditLog[]): void {
  writeJSONFile(SHARE_AUDIT_FILE, { logs });
}

export function getAuditLogsBySpaceId(spaceId: string): ShareAuditLog[] {
  return readAuditLogs().filter(a => a.spaceId === spaceId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function createAuditLog(data: Omit<ShareAuditLog, 'id' | 'timestamp'>): ShareAuditLog {
  const logs = readAuditLogs();
  const log: ShareAuditLog = {
    ...data,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  logs.push(log);
  writeAuditLogs(logs);
  return log;
}

function readFeedbacks(): ShareFeedback[] {
  const defaultValue = { feedbacks: [] as ShareFeedback[] };
  const data = readJSONFile<{ feedbacks: ShareFeedback[] }>(SHARE_FEEDBACK_FILE, defaultValue);
  if (!fs.existsSync(SHARE_FEEDBACK_FILE)) {
    writeJSONFile(SHARE_FEEDBACK_FILE, data);
  }
  return data.feedbacks;
}

function writeFeedbacks(feedbacks: ShareFeedback[]): void {
  writeJSONFile(SHARE_FEEDBACK_FILE, { feedbacks });
}

export function getFeedbacksBySpaceId(spaceId: string): ShareFeedback[] {
  return readFeedbacks().filter(f => f.spaceId === spaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createFeedback(data: Omit<ShareFeedback, 'id' | 'createdAt'>): ShareFeedback {
  const feedbacks = readFeedbacks();
  const fb: ShareFeedback = {
    ...data,
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  feedbacks.push(fb);
  writeFeedbacks(feedbacks);
  return fb;
}

function readPrivateNotes(): EntryPrivateNote[] {
  const defaultValue = { notes: [] as EntryPrivateNote[] };
  const data = readJSONFile<{ notes: EntryPrivateNote[] }>(PRIVATE_NOTES_FILE, defaultValue);
  if (!fs.existsSync(PRIVATE_NOTES_FILE)) {
    writeJSONFile(PRIVATE_NOTES_FILE, data);
  }
  return data.notes;
}

function writePrivateNotes(notes: EntryPrivateNote[]): void {
  writeJSONFile(PRIVATE_NOTES_FILE, { notes });
}

export function getPrivateNote(entryId: string): EntryPrivateNote | undefined {
  return readPrivateNotes().find(n => n.entryId === entryId);
}

export function getAllPrivateNotes(): EntryPrivateNote[] {
  return readPrivateNotes();
}

export function savePrivateNote(entryId: string, note: string): EntryPrivateNote {
  const notes = readPrivateNotes();
  const idx = notes.findIndex(n => n.entryId === entryId);
  const pn: EntryPrivateNote = { entryId, note, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    notes[idx] = pn;
  } else {
    notes.push(pn);
  }
  writePrivateNotes(notes);
  return pn;
}

export function deletePrivateNote(entryId: string): boolean {
  const notes = readPrivateNotes();
  const idx = notes.findIndex(n => n.entryId === entryId);
  if (idx >= 0) {
    notes.splice(idx, 1);
    writePrivateNotes(notes);
    return true;
  }
  return false;
}

function readHealingPlans(): HealingPlan[] {
  const defaultValue = { plans: [] as HealingPlan[] };
  const data = readJSONFile<{ plans: HealingPlan[] }>(HEALING_PLANS_FILE, defaultValue);
  if (!fs.existsSync(HEALING_PLANS_FILE)) {
    writeJSONFile(HEALING_PLANS_FILE, data);
  }
  return data.plans;
}

function writeHealingPlans(plans: HealingPlan[]): void {
  writeJSONFile(HEALING_PLANS_FILE, { plans });
}

export function getAllHealingPlans(): HealingPlan[] {
  return readHealingPlans().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActiveHealingPlans(): HealingPlan[] {
  return readHealingPlans().filter(p => p.status === 'active').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getHealingPlanById(id: string): HealingPlan | undefined {
  return readHealingPlans().find(p => p.id === id);
}

export function createHealingPlan(data: Omit<HealingPlan, 'id' | 'createdAt' | 'updatedAt'>): HealingPlan {
  const plans = readHealingPlans();
  const now = new Date().toISOString();
  const plan: HealingPlan = {
    ...data,
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  plans.push(plan);
  writeHealingPlans(plans);
  return plan;
}

export function updateHealingPlan(id: string, updates: Partial<HealingPlan>): HealingPlan | undefined {
  const plans = readHealingPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx >= 0) {
    plans[idx] = { ...plans[idx], ...updates, updatedAt: new Date().toISOString() };
    writeHealingPlans(plans);
    return plans[idx];
  }
  return undefined;
}

export function deleteHealingPlan(id: string): boolean {
  const plans = readHealingPlans();
  const idx = plans.findIndex(p => p.id === id);
  if (idx >= 0) {
    plans.splice(idx, 1);
    writeHealingPlans(plans);
    const actions = readHealingActions().filter(a => a.planId !== id);
    writeHealingActions(actions);
    const completions = readHealingCompletions().filter(c => c.planId !== id);
    writeHealingCompletions(completions);
    const reviews = readHealingReviews().filter(r => r.planId !== id);
    writeHealingReviews(reviews);
    const suggestions = readHealingSuggestions().filter(s => s.planId !== id);
    writeHealingSuggestions(suggestions);
    return true;
  }
  return false;
}

function readHealingActions(): HealingAction[] {
  const defaultValue = { actions: [] as HealingAction[] };
  const data = readJSONFile<{ actions: HealingAction[] }>(HEALING_ACTIONS_FILE, defaultValue);
  if (!fs.existsSync(HEALING_ACTIONS_FILE)) {
    writeJSONFile(HEALING_ACTIONS_FILE, data);
  }
  return data.actions;
}

function writeHealingActions(actions: HealingAction[]): void {
  writeJSONFile(HEALING_ACTIONS_FILE, { actions });
}

export function getActionsByPlanId(planId: string): HealingAction[] {
  return readHealingActions()
    .filter(a => a.planId === planId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function getHealingActionById(id: string): HealingAction | undefined {
  return readHealingActions().find(a => a.id === id);
}

export function getAllHealingActions(params?: { date?: string; status?: string; category?: string }): HealingAction[] {
  let actions = readHealingActions();
  if (params?.date) {
    actions = actions.filter(a => !a.reminderDate || a.reminderDate === params.date);
  }
  if (params?.status) {
    actions = actions.filter(a => a.status === params.status);
  }
  if (params?.category) {
    actions = actions.filter(a => a.category === params.category);
  }
  return actions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createHealingAction(data: Omit<HealingAction, 'id' | 'createdAt' | 'updatedAt'>): HealingAction {
  const actions = readHealingActions();
  const now = new Date().toISOString();
  const action: HealingAction = {
    ...data,
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  actions.push(action);
  writeHealingActions(actions);
  return action;
}

export function createHealingActionsBatch(actionsData: Omit<HealingAction, 'id' | 'createdAt' | 'updatedAt'>[]): HealingAction[] {
  const actions = readHealingActions();
  const now = new Date().toISOString();
  const created: HealingAction[] = [];
  for (const data of actionsData) {
    const action: HealingAction = {
      ...data,
      id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    actions.push(action);
    created.push(action);
  }
  writeHealingActions(actions);
  return created;
}

export function updateHealingAction(id: string, updates: Partial<HealingAction>): HealingAction | undefined {
  const actions = readHealingActions();
  const idx = actions.findIndex(a => a.id === id);
  if (idx >= 0) {
    actions[idx] = { ...actions[idx], ...updates, updatedAt: new Date().toISOString() };
    writeHealingActions(actions);
    return actions[idx];
  }
  return undefined;
}

export function deleteHealingAction(id: string): boolean {
  const actions = readHealingActions();
  const idx = actions.findIndex(a => a.id === id);
  if (idx >= 0) {
    actions.splice(idx, 1);
    writeHealingActions(actions);
    const completions = readHealingCompletions().filter(c => c.actionId !== id);
    writeHealingCompletions(completions);
    const reviews = readHealingReviews().filter(r => r.actionId !== id);
    writeHealingReviews(reviews);
    return true;
  }
  return false;
}

function readHealingCompletions(): HealingCompletionRecord[] {
  const defaultValue = { completions: [] as HealingCompletionRecord[] };
  const data = readJSONFile<{ completions: HealingCompletionRecord[] }>(HEALING_COMPLETIONS_FILE, defaultValue);
  if (!fs.existsSync(HEALING_COMPLETIONS_FILE)) {
    writeJSONFile(HEALING_COMPLETIONS_FILE, data);
  }
  return data.completions;
}

function writeHealingCompletions(completions: HealingCompletionRecord[]): void {
  writeJSONFile(HEALING_COMPLETIONS_FILE, { completions });
}

export function getCompletionsByActionId(actionId: string): HealingCompletionRecord[] {
  return readHealingCompletions()
    .filter(c => c.actionId === actionId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getCompletionsByPlanId(planId: string): HealingCompletionRecord[] {
  return readHealingCompletions()
    .filter(c => c.planId === planId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getCompletionsByDate(date: string): HealingCompletionRecord[] {
  return readHealingCompletions().filter(c => c.date === date);
}

export function getCompletionsByDateRange(start: string, end: string): HealingCompletionRecord[] {
  return readHealingCompletions()
    .filter(c => c.date >= start && c.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function createHealingCompletion(data: Omit<HealingCompletionRecord, 'id' | 'createdAt'>): HealingCompletionRecord {
  const completions = readHealingCompletions();
  const now = new Date().toISOString();
  const record: HealingCompletionRecord = {
    ...data,
    id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };
  completions.push(record);
  writeHealingCompletions(completions);
  return record;
}

export function updateHealingCompletion(id: string, updates: Partial<HealingCompletionRecord>): HealingCompletionRecord | undefined {
  const completions = readHealingCompletions();
  const idx = completions.findIndex(c => c.id === id);
  if (idx >= 0) {
    completions[idx] = { ...completions[idx], ...updates };
    writeHealingCompletions(completions);
    return completions[idx];
  }
  return undefined;
}

function readHealingReviews(): HealingReviewNote[] {
  const defaultValue = { reviews: [] as HealingReviewNote[] };
  const data = readJSONFile<{ reviews: HealingReviewNote[] }>(HEALING_REVIEWS_FILE, defaultValue);
  if (!fs.existsSync(HEALING_REVIEWS_FILE)) {
    writeJSONFile(HEALING_REVIEWS_FILE, data);
  }
  return data.reviews;
}

function writeHealingReviews(reviews: HealingReviewNote[]): void {
  writeJSONFile(HEALING_REVIEWS_FILE, { reviews });
}

export function getReviewsByPlanId(planId: string): HealingReviewNote[] {
  return readHealingReviews()
    .filter(r => r.planId === planId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getReviewsByActionId(actionId: string): HealingReviewNote[] {
  return readHealingReviews()
    .filter(r => r.actionId === actionId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getReviewsByDate(date: string): HealingReviewNote[] {
  return readHealingReviews().filter(r => r.date === date);
}

export function createHealingReview(data: Omit<HealingReviewNote, 'id' | 'createdAt' | 'updatedAt'>): HealingReviewNote {
  const reviews = readHealingReviews();
  const now = new Date().toISOString();
  const review: HealingReviewNote = {
    ...data,
    id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  reviews.push(review);
  writeHealingReviews(reviews);
  return review;
}

export function updateHealingReview(id: string, updates: Partial<HealingReviewNote>): HealingReviewNote | undefined {
  const reviews = readHealingReviews();
  const idx = reviews.findIndex(r => r.id === id);
  if (idx >= 0) {
    reviews[idx] = { ...reviews[idx], ...updates, updatedAt: new Date().toISOString() };
    writeHealingReviews(reviews);
    return reviews[idx];
  }
  return undefined;
}

export function deleteHealingReview(id: string): boolean {
  const reviews = readHealingReviews();
  const idx = reviews.findIndex(r => r.id === id);
  if (idx >= 0) {
    reviews.splice(idx, 1);
    writeHealingReviews(reviews);
    return true;
  }
  return false;
}

function readHealingSuggestions(): HealingSuggestion[] {
  const defaultValue = { suggestions: [] as HealingSuggestion[] };
  const data = readJSONFile<{ suggestions: HealingSuggestion[] }>(HEALING_SUGGESTIONS_FILE, defaultValue);
  if (!fs.existsSync(HEALING_SUGGESTIONS_FILE)) {
    writeJSONFile(HEALING_SUGGESTIONS_FILE, data);
  }
  return data.suggestions;
}

function writeHealingSuggestions(suggestions: HealingSuggestion[]): void {
  writeJSONFile(HEALING_SUGGESTIONS_FILE, { suggestions });
}

export function getSuggestionsByDate(date: string): HealingSuggestion[] {
  return readHealingSuggestions()
    .filter(s => s.date === date)
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

export function getSuggestionsByDateRange(start: string, end: string): HealingSuggestion[] {
  return readHealingSuggestions()
    .filter(s => s.date >= start && s.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveHealingSuggestions(suggestions: Omit<HealingSuggestion, 'id' | 'createdAt'>[]): HealingSuggestion[] {
  const existing = readHealingSuggestions();
  const now = new Date().toISOString();
  const created: HealingSuggestion[] = [];
  for (const s of suggestions) {
    const suggestion: HealingSuggestion = {
      ...s,
      id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
    };
    existing.push(suggestion);
    created.push(suggestion);
  }
  writeHealingSuggestions(existing);
  return created;
}

export function clearSuggestionsByDate(date: string): number {
  const existing = readHealingSuggestions();
  const remaining = existing.filter(s => s.date !== date);
  const removed = existing.length - remaining.length;
  writeHealingSuggestions(remaining);
  return removed;
}
