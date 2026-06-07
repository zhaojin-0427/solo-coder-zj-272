import { Router } from 'express';
import * as store from '../store';
import {
  calculatePhaseStats,
  calculateMoodTrend,
  calculateKeywordCloud,
  calculateYearlyReview,
} from '../utils/stats';

const router = Router();

router.get('/phase', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const cycleInfo = store.getCycleInfo();
  let entries;
  if (start && end) {
    entries = store.getEntriesByDateRange(start, end);
  } else {
    entries = store.getAllEntries();
  }
  const stats = calculatePhaseStats(entries, cycleInfo);
  res.json(stats);
});

router.get('/trend', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const cycleInfo = store.getCycleInfo();
  let entries;
  if (start && end) {
    entries = store.getEntriesByDateRange(start, end);
  } else {
    entries = store.getAllEntries();
  }
  const trend = calculateMoodTrend(entries, cycleInfo);
  res.json(trend);
});

router.get('/keywords', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  let entries;
  if (start && end) {
    entries = store.getEntriesByDateRange(start, end);
  } else {
    entries = store.getAllEntries();
  }
  const keywords = calculateKeywordCloud(entries);
  res.json(keywords);
});

router.get('/yearly/:year', (req, res) => {
  const year = parseInt(req.params.year, 10);
  if (isNaN(year)) {
    return res.status(400).json({ error: 'Invalid year' });
  }
  const cycleInfo = store.getCycleInfo();
  const entries = store.getAllEntries();
  const review = calculateYearlyReview(entries, year, cycleInfo);
  res.json(review);
});

export default router;
