import { Router } from 'express';
import * as store from '../store';
import {
  generateRemindersForDate,
  generateRemindersForDateRange,
  getReminderSummary,
} from '../utils/reminders';
import { REMINDER_TYPE_LABELS } from '../types';

const router = Router();

router.get('/rules', (_req, res) => {
  const rules = store.getReminderRules();
  res.json(rules);
});

router.put('/rules', (req, res) => {
  const rules = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'rules must be an array' });
  }
  const updated = store.updateReminderRules(rules);
  res.json(updated);
});

router.put('/rules/:id', (req, res) => {
  const updated = store.updateReminderRule(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

router.get('/instances', (req, res) => {
  const { start, end, date, status, ruleType, ruleId, limit } = req.query as {
    start?: string;
    end?: string;
    date?: string;
    status?: string;
    ruleType?: string;
    ruleId?: string;
    limit?: string;
  };
  const instances = store.getReminderInstances({
    start,
    end,
    date,
    status,
    ruleType,
    ruleId,
    limit: limit ? Number(limit) : undefined,
  });
  res.json(instances);
});

router.get('/instances/dates', (req, res) => {
  const { start, end, status } = req.query as { start?: string; end?: string; status?: string };
  const dates = store.getReminderDates({ start, end, status });
  res.json(dates);
});

router.get('/instances/:id', (req, res) => {
  const instance = store.getReminderInstanceById(req.params.id);
  if (instance) {
    res.json(instance);
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

router.post('/instances', (req, res) => {
  const data = req.body;
  if (!data.ruleId || !data.ruleType || !data.title || !data.triggerDate || !data.triggerTime) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const instance = store.createReminderInstance({
    ruleId: data.ruleId,
    ruleType: data.ruleType,
    title: data.title,
    description: data.description || '',
    triggerDate: data.triggerDate,
    triggerTime: data.triggerTime,
    status: data.status || 'pending',
    linkedEntryId: data.linkedEntryId,
    linkedActionId: data.linkedActionId,
  });
  res.json(instance);
});

router.put('/instances/:id', (req, res) => {
  const updated = store.updateReminderInstance(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

router.post('/instances/:id/complete', (req, res) => {
  const updated = store.updateReminderInstance(req.params.id, { status: 'completed' });
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

router.post('/instances/:id/ignore', (req, res) => {
  const updated = store.updateReminderInstance(req.params.id, { status: 'ignored' });
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

router.post('/refresh', (req, res) => {
  const { date, start, end } = req.body || {};
  let created;
  if (date) {
    created = generateRemindersForDate(date);
  } else if (start && end) {
    created = generateRemindersForDateRange(start, end);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    created = generateRemindersForDateRange(today, in7Days);
  }
  res.json({ created: created.length, instances: created });
});

router.get('/summary', (_req, res) => {
  const summary = getReminderSummary();
  res.json(summary);
});

router.get('/type-labels', (_req, res) => {
  res.json(REMINDER_TYPE_LABELS);
});

export default router;
