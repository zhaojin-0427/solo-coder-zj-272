import { Router } from 'express';
import * as store from '../store';
import {
  runInsightAnalysis,
  buildInsightSummary,
  generateAndSaveAlerts,
} from '../utils/insights';
import { attachCyclePhases } from '../utils/stats';
import { InsightRuleConfig } from '../types';

const router = Router();

router.get('/rules', (_req, res) => {
  res.json(store.getInsightRules());
});

router.put('/rules', (req, res) => {
  const rules = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: '规则必须是数组' });
  }
  const updated = store.updateInsightRules(rules as InsightRuleConfig[]);
  res.json(updated);
});

router.put('/rules/:type', (req, res) => {
  const { type } = req.params;
  const updates = req.body;
  const updated = store.updateInsightRule(type, updates);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

router.get('/alerts', (req, res) => {
  const { start, end, type, severity, limit } = req.query as {
    start?: string;
    end?: string;
    type?: string;
    severity?: string;
    limit?: string;
  };
  const params: any = {};
  if (start) params.start = start;
  if (end) params.end = end;
  if (type) params.type = type;
  if (severity) params.severity = severity;
  if (limit) params.limit = parseInt(limit, 10);
  res.json(store.getInsightAlerts(params));
});

router.get('/alerts/dates', (_req, res) => {
  res.json(store.getAlertDates());
});

router.post('/alerts/refresh', (_req, res) => {
  const alerts = generateAndSaveAlerts();
  res.json({ refreshed: alerts.length, alerts });
});

router.get('/summary', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const cycleInfo = store.getCycleInfo();
  let entries;
  if (start && end) {
    entries = store.getEntriesByDateRange(start, end);
  } else {
    entries = store.getAllEntries();
  }
  entries = attachCyclePhases(entries, cycleInfo);

  const alerts = store.getInsightAlerts(
    start && end ? { start, end } : undefined
  );
  const summary = buildInsightSummary(alerts, entries, cycleInfo);
  res.json(summary);
});

router.post('/analyze', (_req, res) => {
  const entries = store.getAllEntries();
  const cycleInfo = store.getCycleInfo();
  const rules = store.getInsightRules();
  const alerts = runInsightAnalysis(entries, cycleInfo, rules);
  const summary = buildInsightSummary(alerts, entries, cycleInfo);
  res.json({ alerts, summary });
});

export default router;
