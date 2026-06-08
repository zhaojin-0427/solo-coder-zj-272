import { Router } from 'express';
import * as store from '../store';
import {
  generateHealingPlan,
  generateDailySuggestions,
  calculateProgressStats,
  shouldTriggerAction,
} from '../utils/healing';
import { attachCyclePhases } from '../utils/stats';
import type {
  HealingPlan,
  HealingAction,
  HealingCompletionRecord,
  HealingReviewNote,
} from '../types';

const router = Router();

router.get('/plans', (_req, res) => {
  const plans = store.getAllHealingPlans();
  const withStats = plans.map(plan => {
    const actions = store.getActionsByPlanId(plan.id);
    const totalActions = actions.length;
    const completedActions = actions.filter(a => a.status === 'completed').length;
    return {
      ...plan,
      totalActions,
      completedActions,
      completionRate: totalActions > 0 ? completedActions / totalActions : 0,
      inProgressActions: actions.filter(a => a.status === 'in_progress').length,
      pendingActions: actions.filter(a => a.status === 'pending').length,
    };
  });
  res.json(withStats);
});

router.get('/plans/active', (_req, res) => {
  const plans = store.getActiveHealingPlans();
  const withStats = plans.map(plan => {
    const actions = store.getActionsByPlanId(plan.id);
    const totalActions = actions.length;
    const completedActions = actions.filter(a => a.status === 'completed').length;
    return {
      ...plan,
      totalActions,
      completedActions,
      completionRate: totalActions > 0 ? completedActions / totalActions : 0,
      inProgressActions: actions.filter(a => a.status === 'in_progress').length,
      pendingActions: actions.filter(a => a.status === 'pending').length,
    };
  });
  res.json(withStats);
});

router.get('/plans/:id', (req, res) => {
  const plan = store.getHealingPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const actions = store.getActionsByPlanId(plan.id);
  const stats = calculateProgressStats(plan.id);
  res.json({ plan, actions, stats });
});

router.post('/plans/generate', (req, res) => {
  const { windowDays = 30 } = req.body || {};
  const days = windowDays === 90 ? 90 : 30;
  const result = generateHealingPlan(days);
  res.json(result);
});

router.post('/plans', (req, res) => {
  const data = req.body;
  if (!data.title || !data.startDate || !data.endDate) {
    return res.status(400).json({ error: '标题、开始日期和结束日期为必填项' });
  }
  const plan = store.createHealingPlan({
    title: data.title,
    description: data.description,
    status: data.status || 'active',
    startDate: data.startDate,
    endDate: data.endDate,
    generatedFrom: 'manual',
  });
  res.json(plan);
});

router.put('/plans/:id', (req, res) => {
  const updated = store.updateHealingPlan(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Plan not found' });
  }
});

router.delete('/plans/:id', (req, res) => {
  const ok = store.deleteHealingPlan(req.params.id);
  res.json({ success: ok });
});

router.get('/plans/:id/actions', (req, res) => {
  const actions = store.getActionsByPlanId(req.params.id);
  res.json(actions);
});

router.post('/plans/:id/actions', (req, res) => {
  const plan = store.getHealingPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const data = req.body;
  const existing = store.getActionsByPlanId(req.params.id);
  const action = store.createHealingAction({
    planId: req.params.id,
    title: data.title || '新行动项',
    description: data.description,
    category: data.category || 'other',
    priority: data.priority || 'medium',
    status: data.status || 'pending',
    trigger: data.trigger,
    reminderDate: data.reminderDate,
    dueDate: data.dueDate || plan.endDate,
    linkedEntryId: data.linkedEntryId,
    sortOrder: data.sortOrder ?? existing.length,
  });
  res.json(action);
});

router.get('/actions', (req, res) => {
  const { date, status, category } = req.query as { date?: string; status?: string; category?: string };
  const actions = store.getAllHealingActions({ date, status, category });
  res.json(actions);
});

router.get('/actions/today', (req, res) => {
  const today = req.query.date as string || new Date().toISOString().slice(0, 10);
  const cycleInfo = store.getCycleInfo();
  const entry = store.getEntryByDate(today);
  const activePlans = store.getActiveHealingPlans();
  const allActions: HealingAction[] = [];
  for (const plan of activePlans) {
    const actions = store.getActionsByPlanId(plan.id);
    for (const action of actions) {
      if (action.status === 'completed' || action.status === 'cancelled') continue;
      if (action.reminderDate && action.reminderDate !== today) continue;
      if (shouldTriggerAction(action, today, entry || undefined, cycleInfo)) {
        allActions.push(action);
      }
    }
  }
  allActions.sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return pOrder[a.priority] - pOrder[b.priority];
  });
  res.json(allActions);
});

router.put('/actions/:id', (req, res) => {
  const updated = store.updateHealingAction(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Action not found' });
  }
});

router.delete('/actions/:id', (req, res) => {
  const ok = store.deleteHealingAction(req.params.id);
  res.json({ success: ok });
});

router.post('/actions/:id/complete', (req, res) => {
  const { id } = req.params;
  const { date, completed = true, moodBefore, moodAfter, durationMinutes, notes } = req.body || {};
  const action = store.getHealingActionById(id);
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }
  const completionDate = date || new Date().toISOString().slice(0, 10);
  const record = store.createHealingCompletion({
    actionId: id,
    planId: action.planId,
    date: completionDate,
    completed: !!completed,
    moodBefore,
    moodAfter,
    durationMinutes,
    notes,
  });
  if (completed) {
    store.updateHealingAction(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }
  res.json({ record, action: store.getHealingActionById(id) });
});

router.get('/actions/:id/completions', (req, res) => {
  const records = store.getCompletionsByActionId(req.params.id);
  res.json(records);
});

router.get('/plans/:id/completions', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  let records = store.getCompletionsByPlanId(req.params.id);
  if (start) records = records.filter(r => r.date >= start);
  if (end) records = records.filter(r => r.date <= end);
  res.json(records);
});

router.get('/plans/:id/reviews', (req, res) => {
  const reviews = store.getReviewsByPlanId(req.params.id);
  res.json(reviews);
});

router.post('/plans/:id/reviews', (req, res) => {
  const plan = store.getHealingPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const data = req.body;
  if (!data.content || !data.date) {
    return res.status(400).json({ error: '日期和内容为必填项' });
  }
  const review = store.createHealingReview({
    planId: req.params.id,
    actionId: data.actionId,
    entryId: data.entryId,
    date: data.date,
    content: data.content,
    moodScore: data.moodScore,
    tags: data.tags,
  });
  res.json(review);
});

router.put('/reviews/:id', (req, res) => {
  const updated = store.updateHealingReview(req.params.id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Review not found' });
  }
});

router.delete('/reviews/:id', (req, res) => {
  const ok = store.deleteHealingReview(req.params.id);
  res.json({ success: ok });
});

router.get('/suggestions/today', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  let suggestions = store.getSuggestionsByDate(date);
  if (suggestions.length === 0) {
    suggestions = generateDailySuggestions(date);
  }
  res.json(suggestions);
});

router.get('/suggestions/range', (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end are required' });
  }
  const suggestions = store.getSuggestionsByDateRange(start, end);
  res.json(suggestions);
});

router.post('/suggestions/refresh', (req, res) => {
  const date = (req.body?.date as string) || new Date().toISOString().slice(0, 10);
  const suggestions = generateDailySuggestions(date);
  res.json({ refreshed: suggestions.length, suggestions });
});

router.get('/plans/:id/progress', (req, res) => {
  const plan = store.getHealingPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const stats = calculateProgressStats(req.params.id);
  res.json(stats);
});

export default router;
