import { Router } from 'express';
import * as store from '../store';
import { validateCycleParams } from '../utils/cycle';

const router = Router();

router.get('/', (req, res) => {
  res.json(store.getCycleInfo());
});

router.put('/', (req, res) => {
  const { lastPeriodDate, cycleLength, periodLength } = req.body;

  const cl = cycleLength !== undefined && cycleLength !== null ? Number(cycleLength) : undefined;
  const pl = periodLength !== undefined && periodLength !== null ? Number(periodLength) : undefined;

  const validation = validateCycleParams(cl, pl);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (lastPeriodDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lastPeriodDate)) {
      return res.status(400).json({ error: '日期格式必须为 YYYY-MM-DD' });
    }
    const d = new Date(lastPeriodDate + 'T12:00:00');
    if (isNaN(d.getTime())) {
      return res.status(400).json({ error: '无效的日期' });
    }
  }

  const updates: any = {};
  if (lastPeriodDate) updates.lastPeriodDate = lastPeriodDate;
  if (cl !== undefined) updates.cycleLength = cl;
  if (pl !== undefined) updates.periodLength = pl;

  res.json(store.updateCycleInfo(updates));
});

export default router;
