import { Router } from 'express';
import * as store from '../store';

const router = Router();

router.get('/', (req, res) => {
  res.json(store.getCycleInfo());
});

router.put('/', (req, res) => {
  const { lastPeriodDate, cycleLength, periodLength } = req.body;
  const updates: any = {};
  if (lastPeriodDate) updates.lastPeriodDate = lastPeriodDate;
  if (cycleLength) updates.cycleLength = Number(cycleLength);
  if (periodLength) updates.periodLength = Number(periodLength);
  res.json(store.updateCycleInfo(updates));
});

export default router;
