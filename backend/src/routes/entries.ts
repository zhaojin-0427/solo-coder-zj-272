import { Router } from 'express';
import * as store from '../store';
import { DiaryEntry, Visibility, StickerType } from '../types';
import { attachCyclePhase, attachCyclePhases } from '../utils/stats';

const router = Router();

router.get('/', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  const cycleInfo = store.getCycleInfo();
  let entries: DiaryEntry[];
  if (start && end) {
    entries = store.getEntriesByDateRange(start, end);
  } else {
    entries = store.getAllEntries();
  }
  entries = attachCyclePhases(entries, cycleInfo);
  res.json(entries);
});

router.get('/date/:date', (req, res) => {
  const { date } = req.params;
  const cycleInfo = store.getCycleInfo();
  const entry = store.getEntryByDate(date);
  if (entry) {
    res.json(attachCyclePhase(entry, cycleInfo));
  } else {
    res.json(null);
  }
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const cycleInfo = store.getCycleInfo();
  const entry = store.getEntryById(id);
  if (entry) {
    res.json(attachCyclePhase(entry, cycleInfo));
  } else {
    res.status(404).json({ error: 'Entry not found' });
  }
});

router.post('/', (req, res) => {
  const {
    date,
    moodScore,
    keywords,
    notes,
    photos,
    stickers,
    visibility,
    isSpecialEvent,
    specialEventTitle,
  } = req.body;

  if (!date || moodScore === undefined) {
    return res.status(400).json({ error: 'date and moodScore are required' });
  }

  const entry = store.createEntry({
    date,
    moodScore: Number(moodScore),
    keywords: keywords || [],
    notes: notes || '',
    photos: photos || [],
    stickers: stickers || [],
    visibility: (visibility as Visibility) || 'private',
    isSpecialEvent: Boolean(isSpecialEvent),
    specialEventTitle: specialEventTitle,
  });

  const cycleInfo = store.getCycleInfo();
  res.status(201).json(attachCyclePhase(entry, cycleInfo));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const cycleInfo = store.getCycleInfo();
  const updated = store.updateEntry(id, updates);
  if (updated) {
    res.json(attachCyclePhase(updated, cycleInfo));
  } else {
    res.status(404).json({ error: 'Entry not found' });
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const success = store.deleteEntry(id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Entry not found' });
  }
});

export default router;
