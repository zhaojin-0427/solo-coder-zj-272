import { useState, useEffect, useMemo } from 'react';
import { healingApi, entriesApi, cycleApi } from '../api';
import type {
  HealingPlanWithStats,
  HealingPlan,
  HealingAction,
  HealingSuggestion,
  HealingReviewNote,
  HealingProgressStats,
  HealingActionCategory,
  HealingActionPriority,
  HealingActionStatus,
  CycleInfo,
  DiaryEntry,
} from '../types';
import {
  HEALING_CATEGORY_LABELS,
  HEALING_CATEGORY_EMOJI,
  HEALING_CATEGORY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  PLAN_STATUS_LABELS,
  SUGGESTION_SOURCE_LABELS,
  PHASE_NAMES,
  MOOD_EMOJI,
} from '../types';
import { todayStr, formatLocalDate } from '../utils/date';

type TabKey = 'plans' | 'suggestions' | 'calendar' | 'progress' | 'reviews';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'plans', label: '计划列表', icon: '📋' },
  { key: 'suggestions', label: '智能建议', icon: '💡' },
  { key: 'calendar', label: '行动日历', icon: '📅' },
  { key: 'progress', label: '进度统计', icon: '📊' },
  { key: 'reviews', label: '复盘时间线', icon: '📝' },
];

export default function HealingPlanPage() {
  const today = todayStr();
  const [tab, setTab] = useState<TabKey>('plans');
  const [plans, setPlans] = useState<HealingPlanWithStats[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<HealingPlan | null>(null);
  const [selectedActions, setSelectedActions] = useState<HealingAction[]>([]);
  const [progressStats, setProgressStats] = useState<HealingProgressStats | null>(null);
  const [suggestions, setSuggestions] = useState<HealingSuggestion[]>([]);
  const [reviews, setReviews] = useState<HealingReviewNote[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [todayActions, setTodayActions] = useState<HealingAction[]>([]);
  const [calendarDate, setCalendarDate] = useState<{ year: number; month: number }>(
    { year: new Date().getFullYear(), month: new Date().getMonth() }
  );
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanStart, setNewPlanStart] = useState(today);
  const [newPlanEnd, setNewPlanEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatLocalDate(d);
  });
  const [newReview, setNewReview] = useState('');
  const [newReviewDate, setNewReviewDate] = useState(today);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (tab === 'calendar') {
      loadCalendarData();
    }
  }, [tab, calendarDate, selectedPlan]);

  async function loadAllData() {
    setLoading(true);
    try {
      const [plansData, suggData, cycle, todayActs] = await Promise.all([
        healingApi.getPlans(),
        healingApi.getTodaySuggestions(today),
        cycleApi.get(),
        healingApi.getTodayActions(today),
      ]);
      setPlans(plansData);
      setSuggestions(suggData);
      setCycleInfo(cycle);
      setTodayActions(todayActs);
      if (plansData.length > 0) {
        await selectPlan(plansData[0].id);
      }
    } catch (e) {
      console.error('Load healing data error:', e);
    }
    setLoading(false);
  }

  async function selectPlan(planId: string) {
    try {
      const { plan, actions, stats } = await healingApi.getPlanDetail(planId);
      setSelectedPlan(plan);
      setSelectedActions(actions);
      setProgressStats(stats);
      const revs = await healingApi.getPlanReviews(planId);
      setReviews(revs);
    } catch (e) {
      console.error('Select plan error:', e);
    }
  }

  async function loadCalendarData() {
    try {
      if (selectedPlan) {
        const { actions } = await healingApi.getPlanDetail(selectedPlan.id);
        setSelectedActions(actions);
      }
    } catch (e) {
      console.error('Calendar data error:', e);
    }
  }

  async function handleGeneratePlan(windowDays: 30 | 90) {
    try {
      const { plan, actions } = await healingApi.generatePlan(windowDays);
      setPlans(await healingApi.getPlans());
      setSelectedPlan(plan);
      setSelectedActions(actions);
      setShowCreateModal(false);
    } catch (e) {
      console.error('Generate plan error:', e);
    }
  }

  async function handleCreatePlan() {
    if (!newPlanTitle.trim()) return;
    try {
      const plan = await healingApi.createPlan({
        title: newPlanTitle,
        startDate: newPlanStart,
        endDate: newPlanEnd,
        status: 'active',
      });
      setPlans(await healingApi.getPlans());
      setSelectedPlan(plan);
      setSelectedActions([]);
      setShowCreateModal(false);
      setNewPlanTitle('');
    } catch (e) {
      console.error('Create plan error:', e);
    }
  }

  async function handleToggleAction(action: HealingAction) {
    try {
      if (action.status === 'completed') {
        await healingApi.updateAction(action.id, { status: 'pending', completedAt: undefined });
      } else {
        await healingApi.completeAction(action.id, { date: today, completed: true });
      }
      if (selectedPlan) {
        await selectPlan(selectedPlan.id);
      }
      setPlans(await healingApi.getPlans());
      setTodayActions(await healingApi.getTodayActions(today));
    } catch (e) {
      console.error('Toggle action error:', e);
    }
  }

  async function handleActionStatusChange(actionId: string, status: HealingActionStatus) {
    try {
      if (status === 'completed') {
        await healingApi.completeAction(actionId, { date: today, completed: true });
      } else {
        await healingApi.updateAction(actionId, { status, completedAt: undefined });
      }
      if (selectedPlan) await selectPlan(selectedPlan.id);
    } catch (e) {
      console.error('Status change error:', e);
    }
  }

  async function handleRefreshSuggestions() {
    try {
      const { suggestions: newSuggs } = await healingApi.refreshSuggestions(today);
      setSuggestions(newSuggs);
    } catch (e) {
      console.error('Refresh suggestions error:', e);
    }
  }

  async function handleAddReview() {
    if (!selectedPlan || !newReview.trim()) return;
    try {
      await healingApi.createReview(selectedPlan.id, {
        date: newReviewDate,
        content: newReview,
      });
      setReviews(await healingApi.getPlanReviews(selectedPlan.id));
      setNewReview('');
    } catch (e) {
      console.error('Add review error:', e);
    }
  }

  async function handleAddQuickAction(category: HealingActionCategory) {
    if (!selectedPlan) return;
    const defaultTitles: Record<HealingActionCategory, string> = {
      breathing: '呼吸练习',
      sleep: '改善睡眠',
      exercise: '运动健身',
      diet: '饮食调理',
      social: '社交互动',
      medical: '就医咨询',
      mindfulness: '正念冥想',
      hobby: '兴趣爱好',
      other: '其他行动',
    };
    try {
      await healingApi.createAction(selectedPlan.id, {
        title: defaultTitles[category],
        category,
        priority: 'medium',
        status: 'pending',
        reminderDate: today,
      });
      await selectPlan(selectedPlan.id);
    } catch (e) {
      console.error('Add quick action error:', e);
    }
  }

  const calendarDays = useMemo(() => {
    const days: { date: Date; inMonth: boolean }[] = [];
    const firstDay = new Date(calendarDate.year, calendarDate.month, 1);
    const firstWeekday = firstDay.getDay();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      days.push({ date: new Date(calendarDate.year, calendarDate.month, -i), inMonth: false });
    }
    const lastDate = new Date(calendarDate.year, calendarDate.month + 1, 0).getDate();
    for (let i = 1; i <= lastDate; i++) {
      days.push({ date: new Date(calendarDate.year, calendarDate.month, i), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, inMonth: false });
    }
    return days;
  }, [calendarDate]);

  const actionsByDate = useMemo(() => {
    const map: Record<string, HealingAction[]> = {};
    selectedActions.forEach(a => {
      const d = a.reminderDate;
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(a);
      }
    });
    return map;
  }, [selectedActions]);

  const todayEntry = useMemo(() => null as DiaryEntry | null, []);

  function prevMonth() {
    if (calendarDate.month === 0) {
      setCalendarDate({ year: calendarDate.year - 1, month: 11 });
    } else {
      setCalendarDate({ ...calendarDate, month: calendarDate.month - 1 });
    }
  }

  function nextMonth() {
    if (calendarDate.month === 11) {
      setCalendarDate({ year: calendarDate.year + 1, month: 0 });
    } else {
      setCalendarDate({ ...calendarDate, month: calendarDate.month + 1 });
    }
  }

  if (loading) {
    return <div className="card"><div className="empty-state"><div className="empty-state-emoji">🌸</div><div className="empty-state-text">加载中...</div></div></div>;
  }

  return (
    <div>
      <div className="create-plan-bar">
        <button className="btn btn-primary" onClick={() => handleGeneratePlan(30)}>
          ✨ 基于近30天数据生成
        </button>
        <button className="btn btn-primary" onClick={() => handleGeneratePlan(90)}>
          🌟 基于近90天数据生成
        </button>
        <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)}>
          ➕ 手动创建计划
        </button>
      </div>

      {suggestions.length > 0 && tab === 'plans' && (
        <div className="card">
          <div className="card-title">💡 今日疗愈建议</div>
          {suggestions.slice(0, 3).map((s: HealingSuggestion) => (
            <div key={s.id} className="suggestion-card" style={{ borderLeftColor: HEALING_CATEGORY_COLORS[s.category] }}>
              <div className="action-header">
                <span className="action-category-icon">{HEALING_CATEGORY_EMOJI[s.category]}</span>
                <span className="action-title">{s.title}</span>
                <span className="priority-tag" style={{ background: PRIORITY_COLORS[s.priority] }}>
                  {PRIORITY_LABELS[s.priority]}
                </span>
                <span className="category-tag" style={{ background: HEALING_CATEGORY_COLORS[s.category] }}>
                  {HEALING_CATEGORY_LABELS[s.category]}
                </span>
              </div>
              <div className="action-description">{s.description}</div>
              <div className="suggestion-reason">
                <span className="source-tag">{SUGGESTION_SOURCE_LABELS[s.source]}</span>
                {s.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {todayActions.length > 0 && tab === 'plans' && (
        <div className="card">
          <div className="card-title">🎯 今日待执行行动</div>
          {todayActions.map(a => (
            <div key={a.id} className={`action-item ${a.status === 'completed' ? 'completed' : ''}`}
              style={{ borderLeftColor: HEALING_CATEGORY_COLORS[a.category] }}>
              <button
                className={`action-check ${a.status === 'completed' ? 'checked' : ''}`}
                onClick={() => handleToggleAction(a)}
              >
                ✓
              </button>
              <div className="action-body">
                <div className="action-header">
                  <span className="action-category-icon">{HEALING_CATEGORY_EMOJI[a.category]}</span>
                  <span className="action-title">{a.title}</span>
                  <span className="priority-tag" style={{ background: PRIORITY_COLORS[a.priority] }}>
                    {PRIORITY_LABELS[a.priority]}
                  </span>
                  <span className={`status-tag ${a.status}`}>{STATUS_LABELS[a.status]}</span>
                </div>
                {a.description && <div className="action-description">{a.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="healing-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`healing-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="row">
          <div className="col" style={{ minWidth: 320 }}>
            <div className="card">
              <div className="card-title">📋 我的疗愈计划</div>
              {plans.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">🌱</div>
                  <div className="empty-state-text">还没有疗愈计划，点击上方按钮创建吧！</div>
                </div>
              ) : (
                plans.map(p => (
                  <div
                    key={p.id}
                    className="plan-card"
                    style={{
                      borderLeftColor: p.status === 'active' ? '#81C784'
                        : p.status === 'paused' ? '#FFB74D'
                        : p.status === 'completed' ? '#64B5F6'
                        : '#A1887F',
                      outline: selectedPlan?.id === p.id ? '3px solid rgba(255, 107, 157, 0.3)' : 'none',
                    }}
                    onClick={() => selectPlan(p.id)}
                  >
                    <div className="plan-card-header">
                      <div>
                        <div className="plan-title">{p.title}</div>
                      </div>
                      <span className={`plan-status-badge ${p.status}`}>{PLAN_STATUS_LABELS[p.status]}</span>
                    </div>
                    <div className="plan-meta">
                      <span>📅 {p.startDate} ~ {p.endDate}</span>
                      {p.generatedFrom && <span>🤖 {p.generatedFrom === 'manual' ? '手动创建' : `自动生成(${p.generatedFrom === 'auto_30d' ? '30天' : '90天'})`}</span>}
                    </div>
                    <div className="plan-progress-bar">
                      <div className="plan-progress-fill" style={{ width: `${Math.round(p.completionRate * 100)}%` }} />
                    </div>
                    <div className="plan-progress-text">
                      <span>进度 {Math.round(p.completionRate * 100)}%</span>
                      <span>{p.completedActions} / {p.totalActions} 完成</span>
                    </div>
                    <div className="plan-stats-row">
                      <div className="plan-stat-item">
                        <span className="plan-stat-dot" style={{ background: '#81C784' }} />
                        已完成 {p.completedActions}
                      </div>
                      <div className="plan-stat-item">
                        <span className="plan-stat-dot" style={{ background: '#64B5F6' }} />
                        进行中 {p.inProgressActions}
                      </div>
                      <div className="plan-stat-item">
                        <span className="plan-stat-dot" style={{ background: '#FFB74D' }} />
                        待执行 {p.pendingActions}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col">
            {selectedPlan ? (
              <>
                <div className="card">
                  <div className="card-title">
                    🎯 {selectedPlan.title} 的行动项
                    {selectedPlan.generationParams && (
                      <span style={{ fontSize: '0.75em', color: '#9a7b8d', fontWeight: 'normal', marginLeft: 12 }}>
                        平均心情 {selectedPlan.generationParams.avgMood} 分 · 
                        高频关键词 {selectedPlan.generationParams.topKeywords.slice(0, 3).join('、')}
                        {selectedPlan.generationParams.dominantPhase && ` · 主要阶段 ${PHASE_NAMES[selectedPlan.generationParams.dominantPhase]}`}
                      </span>
                    )}
                  </div>

                  <div className="quick-action-grid">
                    {(Object.keys(HEALING_CATEGORY_LABELS) as HealingActionCategory[]).map(cat => (
                      <button
                        key={cat}
                        className="quick-action-btn"
                        onClick={() => handleAddQuickAction(cat)}
                      >
                        <div className="quick-action-emoji">{HEALING_CATEGORY_EMOJI[cat]}</div>
                        <div className="quick-action-label">+ {HEALING_CATEGORY_LABELS[cat]}</div>
                      </button>
                    ))}
                  </div>

                  {selectedActions.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-emoji">🎯</div>
                      <div className="empty-state-text">还没有行动项，点击上方快速添加</div>
                    </div>
                  ) : (
                    selectedActions.map(a => (
                      <div
                        key={a.id}
                        className={`action-item ${a.status === 'completed' ? 'completed' : ''}`}
                        style={{ borderLeftColor: HEALING_CATEGORY_COLORS[a.category] }}
                      >
                        <button
                          className={`action-check ${a.status === 'completed' ? 'checked' : ''}`}
                          onClick={() => handleToggleAction(a)}
                        >
                          ✓
                        </button>
                        <div className="action-body">
                          <div className="action-header">
                            <span className="action-category-icon">{HEALING_CATEGORY_EMOJI[a.category]}</span>
                            <span className="action-title">{a.title}</span>
                            <span className="priority-tag" style={{ background: PRIORITY_COLORS[a.priority] }}>
                              {PRIORITY_LABELS[a.priority]}
                            </span>
                            <select
                              className="status-tag"
                              value={a.status}
                              style={{ padding: '3px 8px', cursor: 'pointer', border: 'none', outline: 'none' }}
                              onChange={(e) => handleActionStatusChange(a.id, e.target.value as HealingActionStatus)}
                            >
                              <option value="pending">{STATUS_LABELS.pending}</option>
                              <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                              <option value="completed">{STATUS_LABELS.completed}</option>
                              <option value="skipped">{STATUS_LABELS.skipped}</option>
                              <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                            </select>
                          </div>
                          {a.description && <div className="action-description">{a.description}</div>}
                          <div className="action-tags">
                            <span className="category-tag" style={{ background: HEALING_CATEGORY_COLORS[a.category] }}>
                              {HEALING_CATEGORY_LABELS[a.category]}
                            </span>
                            {a.reminderDate && <span className="source-tag">📅 {a.reminderDate}</span>}
                            {a.trigger?.cyclePhases && (
                              <span className="source-tag">
                                🌙 {a.trigger.cyclePhases.map(p => PHASE_NAMES[p]).join('、')}
                              </span>
                            )}
                            {a.trigger?.moodThreshold && (
                              <span className="source-tag">
                                😊 心情 {a.trigger.moodThreshold.min ?? '-'}~{a.trigger.moodThreshold.max ?? '-'} 分
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-emoji">👈</div>
                  <div className="empty-state-text">请从左侧选择一个计划查看详情</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex' }}>
            <span>💡 智能建议 ({today})</span>
            <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85em' }} onClick={handleRefreshSuggestions}>
              🔄 刷新建议
            </button>
          </div>
          {suggestions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-emoji">✨</div>
              <div className="empty-state-text">暂无建议，点击刷新获取今日疗愈建议</div>
            </div>
          ) : (
            suggestions.map(s => (
              <div key={s.id} className="suggestion-card" style={{ borderLeftColor: HEALING_CATEGORY_COLORS[s.category] }}>
                <div className="action-header">
                  <span className="action-category-icon">{HEALING_CATEGORY_EMOJI[s.category]}</span>
                  <span className="action-title">{s.title}</span>
                  <span className="priority-tag" style={{ background: PRIORITY_COLORS[s.priority] }}>
                    {PRIORITY_LABELS[s.priority]}
                  </span>
                  <span className="category-tag" style={{ background: HEALING_CATEGORY_COLORS[s.category] }}>
                    {HEALING_CATEGORY_LABELS[s.category]}
                  </span>
                </div>
                <div className="action-description">{s.description}</div>
                <div className="suggestion-reason">
                  <span className="source-tag">{SUGGESTION_SOURCE_LABELS[s.source]}</span>
                  {s.reason}
                </div>
                {selectedPlan && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: 10, padding: '8px 16px', fontSize: '0.85em' }}
                    onClick={() => healingApi.createAction(selectedPlan.id, {
                      title: s.title,
                      description: s.description,
                      category: s.category,
                      priority: s.priority,
                      status: 'pending',
                      reminderDate: today,
                    }).then(() => selectPlan(selectedPlan.id))}
                  >
                    ➕ 添加到「{selectedPlan.title}」
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="row">
          <div className="col" style={{ minWidth: 400 }}>
            <div className="card">
              <div className="calendar-header">
                <div className="calendar-nav">
                  <button onClick={prevMonth}>‹</button>
                  <button onClick={() => setCalendarDate({ year: new Date().getFullYear(), month: new Date().getMonth() })}>今</button>
                  <button onClick={nextMonth}>›</button>
                </div>
                <div className="calendar-title">{calendarDate.year} 年 {calendarDate.month + 1} 月</div>
                <div style={{ minWidth: 80 }} />
              </div>
              <div className="calendar">
                {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                  <div key={w} className="calendar-weekday">{w}</div>
                ))}
                {calendarDays.map(({ date, inMonth }) => {
                  const dateStr = formatLocalDate(date);
                  const dayActions = actionsByDate[dateStr] || [];
                  const isToday = dateStr === today;
                  return (
                    <div
                      key={dateStr}
                      className={`calendar-day ${!inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    >
                      <span className="day-number">{date.getDate()}</span>
                      {dayActions.length > 0 && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {dayActions.slice(0, 3).map(a => (
                            <span
                              key={a.id}
                              style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: a.status === 'completed' ? '#81C784' : HEALING_CATEGORY_COLORS[a.category],
                              }}
                              title={a.title}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="legend" style={{ marginTop: 16 }}>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#81C784' }} />
                  已完成行动
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#ff6b9d' }} />
                  待完成行动
                </div>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card">
              <div className="card-title">📝 行动项说明</div>
              <p style={{ color: '#7a5c6f', lineHeight: 1.8, marginBottom: 16 }}>
                日历中的彩色圆点代表当天安排的疗愈行动。绿色圆点表示已完成的行动。
                你可以在「计划列表」标签页为行动设置提醒日期，它们会自动显示在日历中。
              </p>
              <div className="legend">
                {(Object.keys(HEALING_CATEGORY_LABELS) as HealingActionCategory[]).map(cat => (
                  <div key={cat} className="legend-item">
                    <span className="legend-dot" style={{ background: HEALING_CATEGORY_COLORS[cat] }} />
                    {HEALING_CATEGORY_EMOJI[cat]} {HEALING_CATEGORY_LABELS[cat]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'progress' && selectedPlan && progressStats && (
        <div className="row">
          <div className="col">
            <div className="card">
              <div className="card-title">📊 总体进度</div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">完成率</div>
                  <div className="stat-value">{Math.round(progressStats.completionRate * 100)}%</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">已完成 / 总计</div>
                  <div className="stat-value">{progressStats.completedActions}/{progressStats.totalActions}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🏷️ 分类完成情况</div>
              {(Object.keys(progressStats.byCategory) as HealingActionCategory[])
                .filter(cat => progressStats.byCategory[cat].total > 0)
                .map(cat => {
                  const stat = progressStats.byCategory[cat];
                  const rate = stat.total > 0 ? stat.completed / stat.total : 0;
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9em' }}>
                        <span style={{ color: '#4a2c3d', fontWeight: 500 }}>
                          {HEALING_CATEGORY_EMOJI[cat]} {HEALING_CATEGORY_LABELS[cat]}
                        </span>
                        <span style={{ color: '#7a5c6f' }}>
                          {stat.completed}/{stat.total} ({Math.round(rate * 100)}%)
                        </span>
                      </div>
                      <div className="mood-bar">
                        <div className="mood-bar-fill" style={{ width: `${rate * 100}%`, background: HEALING_CATEGORY_COLORS[cat] }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="col">
            <div className="card">
              <div className="card-title">⭐ 优先级完成情况</div>
              {(Object.keys(progressStats.byPriority) as HealingActionPriority[])
                .filter(p => progressStats.byPriority[p].total > 0)
                .map(p => {
                  const stat = progressStats.byPriority[p];
                  const rate = stat.total > 0 ? stat.completed / stat.total : 0;
                  return (
                    <div key={p} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9em' }}>
                        <span style={{ color: '#4a2c3d', fontWeight: 500 }}>
                          {PRIORITY_LABELS[p]}优先级
                        </span>
                        <span style={{ color: '#7a5c6f' }}>
                          {stat.completed}/{stat.total} ({Math.round(rate * 100)}%)
                        </span>
                      </div>
                      <div className="mood-bar">
                        <div className="mood-bar-fill" style={{ width: `${rate * 100}%`, background: PRIORITY_COLORS[p] }} />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="card">
              <div className="card-title">📈 执行与心情关联</div>
              <p style={{ color: '#7a5c6f', fontSize: '0.9em', marginBottom: 12 }}>
                行动完成率与心情评分的对应关系（每3天一组）
              </p>
              {progressStats.moodCorrelation.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 10px' }}>
                  <div className="empty-state-emoji" style={{ fontSize: '2.5em' }}>📊</div>
                  <div className="empty-state-text" style={{ fontSize: '0.95em' }}>还没有足够的数据</div>
                </div>
              ) : (
                progressStats.moodCorrelation.map((pt, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255, 107, 157, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85em', color: '#7a5c6f' }}>
                        完成率 {Math.round(pt.completionRate * 100)}%
                      </span>
                      <span style={{ fontSize: '1.3em' }}>
                        {MOOD_EMOJI[Math.min(Math.max(Math.round(pt.avgMood), 1), 10)]}
                      </span>
                      <span style={{ fontSize: '0.9em', fontWeight: 600, color: '#ff6b9d' }}>
                        {pt.avgMood.toFixed(1)} 分
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'progress' && (!selectedPlan || !progressStats) && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">📊</div>
            <div className="empty-state-text">请先从「计划列表」选择一个计划</div>
          </div>
        </div>
      )}

      {tab === 'reviews' && selectedPlan && (
        <div className="row">
          <div className="col">
            <div className="card">
              <div className="card-title">✍️ 添加复盘笔记</div>
              <div className="form-group">
                <label>日期</label>
                <input type="date" value={newReviewDate} onChange={e => setNewReviewDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>复盘内容</label>
                <textarea
                  value={newReview}
                  onChange={e => setNewReview(e.target.value)}
                  placeholder="记录今天的感受、行动效果、情绪变化..."
                  style={{ minHeight: 100 }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddReview} disabled={!newReview.trim()}>
                💾 保存复盘
              </button>
            </div>
          </div>
          <div className="col">
            <div className="card">
              <div className="card-title">📜 复盘时间线</div>
              {reviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">📝</div>
                  <div className="empty-state-text">还没有复盘笔记，记录一下你的感受吧</div>
                </div>
              ) : (
                <div className="review-timeline">
                  {reviews.map(r => (
                    <div key={r.id} className="review-item">
                      <div className="review-date">
                        📅 {r.date}
                        {r.moodScore && <span style={{ marginLeft: 10 }}>{MOOD_EMOJI[Math.min(Math.max(r.moodScore, 1), 10)]} {r.moodScore}分</span>}
                      </div>
                      <div className="review-content">{r.content}</div>
                      {r.tags && r.tags.length > 0 && (
                        <div className="review-tags-row">
                          {r.tags.map((t, i) => (
                            <span key={i} className="tag" style={{ cursor: 'default' }}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'reviews' && !selectedPlan && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">📝</div>
            <div className="empty-state-text">请先从「计划列表」选择一个计划</div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20,
        }} onClick={() => setShowCreateModal(false)}>
          <div
            className="card"
            style={{ maxWidth: 420, width: '100%', margin: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-title">➕ 创建新计划</div>
            <div className="form-group">
              <label>计划名称</label>
              <input
                type="text"
                value={newPlanTitle}
                onChange={e => setNewPlanTitle(e.target.value)}
                placeholder="给你的疗愈计划起个名字"
              />
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="col" style={{ minWidth: 0 }}>
                <div className="form-group">
                  <label>开始日期</label>
                  <input type="date" value={newPlanStart} onChange={e => setNewPlanStart(e.target.value)} />
                </div>
              </div>
              <div className="col" style={{ minWidth: 0 }}>
                <div className="form-group">
                  <label>结束日期</label>
                  <input type="date" value={newPlanEnd} onChange={e => setNewPlanEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreatePlan} disabled={!newPlanTitle.trim()}>
                创建计划
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
