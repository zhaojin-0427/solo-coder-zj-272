import { Router } from 'express';
import * as store from '../store';
import {
  EntrySearchFilters,
  CyclePhase,
  Visibility,
  StickerType,
  ALL_STICKER_TYPES,
  CYCLE_PHASE_LABELS,
  VISIBILITY_LABELS,
  STICKER_LABELS,
} from '../types';

const router = Router();

function parseBool(val: any): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return undefined;
}

function parseNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function parseArray(val: any): string[] | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) return val.filter(v => v !== undefined && v !== null && v !== '');
  if (typeof val === 'string') {
    const parts = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return parts.length > 0 ? parts : undefined;
  }
  return undefined;
}

function parseDate(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return undefined;
}

router.get('/entries', (req, res) => {
  const filters: EntrySearchFilters = {};

  filters.startDate = parseDate(req.query.startDate);
  filters.endDate = parseDate(req.query.endDate);
  filters.moodMin = parseNumber(req.query.moodMin);
  filters.moodMax = parseNumber(req.query.moodMax);

  const phaseArr = parseArray(req.query.cyclePhases);
  if (phaseArr) {
    const validPhases: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];
    filters.cyclePhases = phaseArr.filter(p => validPhases.includes(p as CyclePhase)) as CyclePhase[];
    if (filters.cyclePhases.length === 0) delete filters.cyclePhases;
  }

  const kwArr = parseArray(req.query.keywords);
  if (kwArr && kwArr.length > 0) {
    filters.keywords = kwArr;
  }

  const stickerArr = parseArray(req.query.stickers);
  if (stickerArr) {
    filters.stickers = stickerArr.filter(s => ALL_STICKER_TYPES.includes(s as StickerType)) as StickerType[];
    if (filters.stickers.length === 0) delete filters.stickers;
  }

  const vis = req.query.visibility;
  if (vis === 'private' || vis === 'public') {
    filters.visibility = vis as Visibility;
  }

  filters.isSpecialEvent = parseBool(req.query.isSpecialEvent);
  filters.hasPhotos = parseBool(req.query.hasPhotos);
  filters.hasReminders = parseBool(req.query.hasReminders);
  filters.hasAlerts = parseBool(req.query.hasAlerts);

  const km = req.query.keywordMatch;
  if (km === 'any' || km === 'all') {
    filters.keywordMatch = km;
  }

  const result = store.searchEntries(filters);
  res.json(result);
});

router.get('/metadata', (_req, res) => {
  res.json({
    cyclePhases: (['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map(p => ({
      value: p,
      label: CYCLE_PHASE_LABELS[p],
    })),
    visibilityOptions: (['private', 'public'] as Visibility[]).map(v => ({
      value: v,
      label: VISIBILITY_LABELS[v],
    })),
    stickerOptions: ALL_STICKER_TYPES.map(s => ({
      value: s,
      label: STICKER_LABELS[s],
    })),
  });
});

export default router;
