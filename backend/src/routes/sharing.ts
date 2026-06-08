import { Router } from 'express';
import * as store from '../store';
import {
  TrustedContact,
  ShareSpace,
  ShareLink,
  FieldVisibility,
  DiaryEntry,
  InsightAlert,
  ContactType,
} from '../types';
import { attachCyclePhase, attachCyclePhases } from '../utils/stats';

const router = Router();

const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  moodScore: true,
  keywords: true,
  notes: true,
  photos: true,
  cyclePhase: true,
  specialEvent: true,
  insights: true,
};

function desensitizeText(text: string): string {
  if (!text) return text;
  const patterns = [
    /1[3-9]\d{9}/g,
    /\d{17}[\dXx]/g,
    /\w+@\w+\.\w+/g,
    /[\u4e00-\u9fa5]{2,4}(?:先生|女士|小姐|老师|医生)/g,
    /(?:北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆)[\u4e00-\u9fa5]{0,10}(?:区|县|街道|路|街|号)/g,
  ];
  let result = text;
  patterns.forEach(p => {
    result = result.replace(p, m => '*'.repeat(Math.max(3, Math.floor(m.length * 0.6))));
  });
  return result;
}

function applyFieldVisibility(
  entry: DiaryEntry,
  visibility: FieldVisibility,
  desensitize: boolean
): Partial<DiaryEntry> {
  const result: Partial<DiaryEntry> = { id: entry.id, date: entry.date };
  if (visibility.moodScore) result.moodScore = entry.moodScore;
  if (visibility.keywords) result.keywords = entry.keywords;
  if (visibility.notes) {
    result.notes = desensitize ? desensitizeText(entry.notes) : entry.notes;
  }
  if (visibility.photos) result.photos = entry.photos;
  if (visibility.cyclePhase) {
    result.cyclePhase = entry.cyclePhase;
    result.cycleDay = entry.cycleDay;
  }
  if (visibility.specialEvent) {
    result.isSpecialEvent = entry.isSpecialEvent;
    result.specialEventTitle = entry.specialEventTitle;
  }
  result.stickers = entry.stickers;
  return result;
}

function applyInsightVisibility(
  alerts: InsightAlert[],
  visibility: FieldVisibility
): InsightAlert[] {
  if (!visibility.insights) return [];
  return alerts.map(a => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    description: a.description,
    date: a.date,
    affectedDates: a.affectedDates,
    details: visibility.notes ? a.details : {},
    ruleSnapshot: a.ruleSnapshot,
    createdAt: a.createdAt,
  }));
}

function validateDateRange(start: string, end: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(start) && regex.test(end) && start <= end;
}

function isLinkValid(link: ShareLink): boolean {
  if (!link.isActive) return false;
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return false;
  if (link.maxVisits !== null && link.visitCount >= link.maxVisits) return false;
  return true;
}

router.get('/contacts', (_req, res) => {
  res.json(store.getAllContacts());
});

router.post('/contacts', (req, res) => {
  const { name, type, email, phone, note } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  const validTypes: ContactType[] = ['trusted', 'doctor', 'counselor'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'invalid contact type' });
  }
  const contact = store.createContact({
    name,
    type,
    email: typeof email === 'string' ? email : undefined,
    phone: typeof phone === 'string' ? phone : undefined,
    note: typeof note === 'string' ? note : undefined,
  });
  res.status(201).json(contact);
});

router.put('/contacts/:id', (req, res) => {
  const { id } = req.params;
  const updated = store.updateContact(id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Contact not found' });
  }
});

router.delete('/contacts/:id', (req, res) => {
  const { id } = req.params;
  const success = store.deleteContact(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Contact not found' });
  }
});

router.get('/spaces', (_req, res) => {
  const spaces = store.getAllShareSpaces();
  const enriched = spaces.map(s => ({
    ...s,
    links: store.getLinksBySpaceId(s.id),
    feedbackCount: store.getFeedbacksBySpaceId(s.id).length,
    auditCount: store.getAuditLogsBySpaceId(s.id).length,
  }));
  res.json(enriched);
});

router.get('/spaces/:id', (req, res) => {
  const { id } = req.params;
  const space = store.getShareSpaceById(id);
  if (!space) {
    return res.status(404).json({ error: 'Share space not found' });
  }
  const contacts = store.getAllContacts().filter(c => space.contactIds.includes(c.id));
  const links = store.getLinksBySpaceId(id);
  const feedbacks = store.getFeedbacksBySpaceId(id);
  const audits = store.getAuditLogsBySpaceId(id);

  const cycleInfo = store.getCycleInfo();
  const entries = store.getEntriesByDateRange(space.startDate, space.endDate);
  const entriesWithCycle = attachCyclePhases(entries, cycleInfo);
  const filteredEntries = entriesWithCycle.map(e =>
    applyFieldVisibility(e, space.fieldVisibility, space.desensitizeNotes)
  );

  const allAlerts = store.getInsightAlerts();
  const alertsInRange = allAlerts.filter(
    a => a.date >= space.startDate && a.date <= space.endDate
  );
  const filteredAlerts = applyInsightVisibility(alertsInRange, space.fieldVisibility);

  const privateNotes = store.getAllPrivateNotes().reduce((acc, n) => {
    acc[n.entryId] = n.note;
    return acc;
  }, {} as Record<string, string>);

  res.json({
    space,
    contacts,
    links,
    feedbacks,
    audits,
    entries: filteredEntries,
    alerts: filteredAlerts,
    privateNotes,
  });
});

router.post('/spaces', (req, res) => {
  const {
    name,
    description,
    contactIds,
    startDate,
    endDate,
    fieldVisibility,
    desensitizeNotes,
  } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, startDate and endDate are required' });
  }
  if (!validateDateRange(startDate, endDate)) {
    return res.status(400).json({ error: 'invalid date range' });
  }

  const space = store.createShareSpace({
    name,
    description: typeof description === 'string' ? description : undefined,
    contactIds: Array.isArray(contactIds) ? contactIds : [],
    startDate,
    endDate,
    fieldVisibility: fieldVisibility && typeof fieldVisibility === 'object'
      ? { ...DEFAULT_FIELD_VISIBILITY, ...fieldVisibility }
      : DEFAULT_FIELD_VISIBILITY,
    desensitizeNotes: typeof desensitizeNotes === 'boolean' ? desensitizeNotes : true,
  });
  res.status(201).json(space);
});

router.put('/spaces/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (updates.startDate || updates.endDate) {
    const space = store.getShareSpaceById(id);
    if (!space) {
      return res.status(404).json({ error: 'Share space not found' });
    }
    const s = updates.startDate || space.startDate;
    const e = updates.endDate || space.endDate;
    if (!validateDateRange(s, e)) {
      return res.status(400).json({ error: 'invalid date range' });
    }
  }
  const updated = store.updateShareSpace(id, updates);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Share space not found' });
  }
});

router.delete('/spaces/:id', (req, res) => {
  const { id } = req.params;
  const success = store.deleteShareSpace(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Share space not found' });
  }
});

router.post('/spaces/:id/links', (req, res) => {
  const { id } = req.params;
  const space = store.getShareSpaceById(id);
  if (!space) {
    return res.status(404).json({ error: 'Share space not found' });
  }
  const { expiresAt, maxVisits } = req.body;
  const link = store.createShareLink({
    spaceId: id,
    expiresAt: typeof expiresAt === 'string' && expiresAt ? expiresAt : null,
    maxVisits: typeof maxVisits === 'number' ? maxVisits : null,
  });
  res.status(201).json(link);
});

router.post('/links/:id/revoke', (req, res) => {
  const { id } = req.params;
  const revoked = store.revokeShareLink(id);
  if (revoked) {
    res.json(revoked);
  } else {
    res.status(404).json({ error: 'Share link not found' });
  }
});

router.get('/spaces/:id/audit', (req, res) => {
  const { id } = req.params;
  if (!store.getShareSpaceById(id)) {
    return res.status(404).json({ error: 'Share space not found' });
  }
  res.json(store.getAuditLogsBySpaceId(id));
});

router.get('/spaces/:id/feedbacks', (req, res) => {
  const { id } = req.params;
  if (!store.getShareSpaceById(id)) {
    return res.status(404).json({ error: 'Share space not found' });
  }
  res.json(store.getFeedbacksBySpaceId(id));
});

router.get('/notes/:entryId', (req, res) => {
  const { entryId } = req.params;
  const note = store.getPrivateNote(entryId);
  res.json(note || { entryId, note: '', updatedAt: null });
});

router.put('/notes/:entryId', (req, res) => {
  const { entryId } = req.params;
  const { note } = req.body;
  if (typeof note !== 'string') {
    return res.status(400).json({ error: 'note is required' });
  }
  const saved = store.savePrivateNote(entryId, note);
  res.json(saved);
});

router.delete('/notes/:entryId', (req, res) => {
  const { entryId } = req.params;
  const success = store.deletePrivateNote(entryId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

router.get('/public/:token', (req, res) => {
  const { token } = req.params;
  const link = store.getShareLinkByToken(token);
  if (!link) {
    return res.status(404).json({ error: 'Share link not found' });
  }
  if (!isLinkValid(link)) {
    return res.status(403).json({ error: 'Share link is expired or revoked' });
  }

  const space = store.getShareSpaceById(link.spaceId);
  if (!space) {
    return res.status(404).json({ error: 'Share space not found' });
  }

  const ip = req.ip || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] as string | undefined;

  store.incrementLinkVisit(token);
  store.createAuditLog({
    spaceId: space.id,
    linkId: link.id,
    action: 'view',
    ip,
    userAgent: ua,
  });

  const cycleInfo = store.getCycleInfo();
  const entries = store.getEntriesByDateRange(space.startDate, space.endDate);
  const entriesWithCycle = attachCyclePhases(entries, cycleInfo);
  const filteredEntries = entriesWithCycle.map(e =>
    applyFieldVisibility(e, space.fieldVisibility, space.desensitizeNotes)
  );

  const allAlerts = store.getInsightAlerts();
  const alertsInRange = allAlerts.filter(
    a => a.date >= space.startDate && a.date <= space.endDate
  );
  const filteredAlerts = applyInsightVisibility(alertsInRange, space.fieldVisibility);

  res.json({
    space: {
      id: space.id,
      name: space.name,
      description: space.description,
      startDate: space.startDate,
      endDate: space.endDate,
    },
    entries: filteredEntries,
    alerts: filteredAlerts,
  });
});

router.post('/public/:token/feedback', (req, res) => {
  const { token } = req.params;
  const { visitorName, message } = req.body;

  if (!visitorName || !message) {
    return res.status(400).json({ error: 'visitorName and message are required' });
  }

  const link = store.getShareLinkByToken(token);
  if (!link) {
    return res.status(404).json({ error: 'Share link not found' });
  }
  if (!isLinkValid(link)) {
    return res.status(403).json({ error: 'Share link is expired or revoked' });
  }

  const space = store.getShareSpaceById(link.spaceId);
  if (!space) {
    return res.status(404).json({ error: 'Share space not found' });
  }

  const ip = req.ip || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] as string | undefined;

  const feedback = store.createFeedback({
    spaceId: space.id,
    linkId: link.id,
    visitorName: String(visitorName),
    message: String(message),
  });

  store.createAuditLog({
    spaceId: space.id,
    linkId: link.id,
    visitorName: String(visitorName),
    action: 'feedback',
    ip,
    userAgent: ua,
  });

  res.status(201).json(feedback);
});

export default router;
