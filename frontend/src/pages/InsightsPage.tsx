import { useState, useEffect, useMemo } from 'react';
import { insightsApi, healingApi } from '../api';
import type {
  InsightAlert,
  InsightSummary,
  InsightRuleConfig,
  InsightRuleType,
  InsightSeverity,
  HealingSuggestion,
} from '../types';
import {
  INSIGHT_RULE_LABELS,
  INSIGHT_SEVERITY_LABELS,
  INSIGHT_SEVERITY_COLORS,
  PHASE_NAMES,
  MOOD_EMOJI,
  HEALING_CATEGORY_EMOJI,
  HEALING_CATEGORY_LABELS,
  HEALING_CATEGORY_COLORS,
  PRIORITY_LABELS,
  SUGGESTION_SOURCE_LABELS,
} from '../types';
import { formatLocalDate, todayStr } from '../utils/date';

const SEVERITY_EMOJI: Record<InsightSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  alert: '🚨',
};

const TYPE_EMOJI: Record<InsightRuleType, string> = {
  consecutive_low_mood: '📉',
  luteal_mood_decline: '🌙',
  premenstrual_keyword_spike: '📊',
  post_event_mood_drop: '🎭',
};

type TimeRange = '7' | '30' | '90' | 'all';

const RANGE_OPTIONS: { key: TimeRange; label: string; days: number }[] = [
  { key: '7', label: '近7天', days: 7 },
  { key: '30', label: '近30天', days: 30 },
  { key: '90', label: '近90天', days: 90 },
  { key: 'all', label: '全部', days: -1 },
];

type FilterSeverity = InsightSeverity | 'all';
type FilterType = InsightRuleType | 'all';

const THRESHOLD_LABELS: Record<string, Record<string, string>> = {
  consecutive_low_mood: {
    lowMoodThreshold: '低分阈值（≤此分为低分）',
    consecutiveDays: '连续天数',
  },
  luteal_mood_decline: {
    minDeclinePoints: '最小下降分数',
    minComparisonDays: '最少对比天数',
  },
  premenstrual_keyword_spike: {
    spikeMultiplier: '异常倍数（相对于平日）',
    minOccurrences: '最少出现次数',
    windowDays: '观察窗口（天）',
  },
  post_event_mood_drop: {
    eventMoodThreshold: '事件高情绪阈值',
    dropPoints: '回落分数',
    dropWindowDays: '回落观察窗口（天）',
  },
};

export default function InsightsPage() {
  const [range, setRange] = useState<TimeRange>('30');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [alerts, setAlerts] = useState<InsightAlert[]>([]);
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [rules, setRules] = useState<InsightRuleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'timeline' | 'rules'>('overview');
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<InsightAlert | null>(null);
  const [todaySuggestions, setTodaySuggestions] = useState<HealingSuggestion[]>([]);

  useEffect(() => {
    healingApi.getTodaySuggestions()
      .then(setTodaySuggestions)
      .catch(() => setTodaySuggestions([]));
  }, []);

  const dateRange = useMemo(() => {
    const opt = RANGE_OPTIONS.find(o => o.key === range)!;
    if (opt.days < 0) return {};
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - opt.days + 1);
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end),
    };
  }, [range]);

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    try {
      const params = dateRange.start ? { start: dateRange.start, end: dateRange.end } : undefined;
      const [alertsData, summaryData, rulesData] = await Promise.all([
        insightsApi.getAlerts(params),
        insightsApi.getSummary(params),
        insightsApi.getRules(),
      ]);
      setAlerts(alertsData);
      setSummary(summaryData);
      setRules(rulesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    try {
      await insightsApi.refreshAlerts();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRuleToggle(rule: InsightRuleConfig) {
    try {
      const updated = await insightsApi.updateRule(rule.type, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.type === rule.type ? updated : r));
      await insightsApi.refreshAlerts();
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleThresholdChange(
    rule: InsightRuleConfig,
    key: string,
    value: number
  ) {
    setSavingRule(rule.type);
    try {
      const newThresholds = { ...rule.thresholds, [key]: value };
      const updated = await insightsApi.updateRule(rule.type, { thresholds: newThresholds });
      setRules(prev => prev.map(r => r.type === rule.type ? updated : r));
      await insightsApi.refreshAlerts();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRule(null);
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterType]);

  const timelineEvents = useMemo(() => {
    const byDate: Record<string, InsightAlert[]> = {};
    filteredAlerts.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });
    return Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => ({ date, alerts: list }));
  }, [filteredAlerts]);

  return (
    <div>
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: 0 }}>🔮 情绪洞察与周期预警中心</h2>
            <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: 4 }}>
              智能识别情绪模式与周期波动，帮助你更好地了解自己
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="range-selector" style={{ marginBottom: 0 }}>
              {RANGE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  className={`range-btn ${range === opt.key ? 'active' : ''}`}
                  onClick={() => setRange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
              {loading ? '🔄 分析中...' : '🔄 重新分析'}
            </button>
          </div>
        </div>

        <div className="nav-bar" style={{ justifyContent: 'flex-start', marginBottom: 0, padding: 6 }}>
          {[
            { key: 'overview', label: '📊 洞察概览' },
            { key: 'alerts', label: '📋 预警列表' },
            { key: 'timeline', label: '📅 时间线' },
            { key: 'rules', label: '⚙️ 规则设置' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        todaySuggestions.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="card-title">💚 今日疗愈建议</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaySuggestions.slice(0, 3).map(s => (
                <div key={s.id} className="healing-mini-card">
                  <div className="healing-mini-header">
                    <span className="category-tag" style={{ background: HEALING_CATEGORY_COLORS[s.category] }}>
                      {HEALING_CATEGORY_EMOJI[s.category]} {HEALING_CATEGORY_LABELS[s.category]}
                    </span>
                    <span className={`priority-tag priority-${s.priority}`}>
                      {PRIORITY_LABELS[s.priority]}
                    </span>
                  </div>
                  <div className="healing-mini-title">{s.title}</div>
                  {s.description && (
                    <div className="healing-mini-desc">{s.description}</div>
                  )}
                  <div className="source-tag">
                    来源：{SUGGESTION_SOURCE_LABELS[s.source] || s.source}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: '0.9em' }}
              onClick={() => { window.location.hash = '#/healing'; }}
            >
              查看完整疗愈计划 →
            </button>
          </div>
        )
      )}

      {activeTab === 'overview' && summary && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">预警总数</div>
              <div className="stat-value">{summary.totalAlerts}</div>
              <div className="stat-sub">条预警</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">严重警告</div>
              <div className="stat-value" style={{ color: '#E57373', background: 'none', WebkitTextFillColor: '#E57373' }}>
                {summary.alertsBySeverity.alert}
              </div>
              <div className="stat-sub">🚨 需要关注</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">平均心情</div>
              <div className="stat-value">{summary.periodOverview.avgMood}</div>
              <div className="stat-sub">
                {MOOD_EMOJI[Math.min(Math.max(Math.round(summary.periodOverview.avgMood), 1), 10)]}
                {' '}
                {summary.periodOverview.moodTrend === 'rising' && '📈 上升'}
                {summary.periodOverview.moodTrend === 'falling' && '📉 下降'}
                {summary.periodOverview.moodTrend === 'stable' && '➡️ 稳定'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">高频阶段</div>
              <div className="stat-value" style={{ fontSize: '1.3em' }}>
                {summary.periodOverview.mostFrequentPhase
                  ? PHASE_NAMES[summary.periodOverview.mostFrequentPhase]
                  : '—'}
              </div>
              <div className="stat-sub">出现最多</div>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="card">
                <h3 className="card-title">📊 预警类型分布</h3>
                {Object.entries(summary.alertsByType).map(([type, count]) => (
                  <div key={type} className="phase-card" style={{
                    borderLeftColor: type === 'consecutive_low_mood' ? '#E57373'
                      : type === 'luteal_mood_decline' ? '#64B5F6'
                      : type === 'premenstrual_keyword_spike' ? '#FFB74D'
                      : '#c44eff',
                  }}>
                    <div className="phase-card-header">
                      <span className="phase-name" style={{
                        color: type === 'consecutive_low_mood' ? '#E57373'
                          : type === 'luteal_mood_decline' ? '#64B5F6'
                          : type === 'premenstrual_keyword_spike' ? '#FFB74D'
                          : '#c44eff',
                      }}>
                        {TYPE_EMOJI[type as InsightRuleType]} {INSIGHT_RULE_LABELS[type as InsightRuleType]}
                      </span>
                      <span className="phase-avg" style={{
                        color: type === 'consecutive_low_mood' ? '#E57373'
                          : type === 'luteal_mood_decline' ? '#64B5F6'
                          : type === 'premenstrual_keyword_spike' ? '#FFB74D'
                          : '#c44eff',
                      }}>
                        {count} 条
                      </span>
                    </div>
                    <div className="mood-bar">
                      <div className="mood-bar-fill" style={{
                        width: `${summary.totalAlerts > 0 ? (count / summary.totalAlerts) * 100 : 0}%`,
                        background: `linear-gradient(90deg, ${type === 'consecutive_low_mood' ? '#E57373'
                          : type === 'luteal_mood_decline' ? '#64B5F6'
                          : type === 'premenstrual_keyword_spike' ? '#FFB74D'
                          : '#c44eff'} 0%, #c44eff 100%)`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col">
              <div className="card">
                <h3 className="card-title">🔥 最近预警</h3>
                {summary.recentAlerts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-emoji">✅</div>
                    <div className="empty-state-text">暂无预警，状态良好</div>
                  </div>
                ) : (
                  summary.recentAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="timeline-event"
                      style={{ borderLeftColor: INSIGHT_SEVERITY_COLORS[alert.severity], cursor: 'pointer' }}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="timeline-date">{alert.date}</div>
                      <div className="timeline-content">
                        <div className="timeline-title">
                          {SEVERITY_EMOJI[alert.severity]} {alert.title}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#9a7b8d' }}>
                          {INSIGHT_RULE_LABELS[alert.type]}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <label>严重程度</label>
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value as FilterSeverity)}
              >
                <option value="all">全部</option>
                <option value="alert">🚨 警告</option>
                <option value="warning">⚠️ 注意</option>
                <option value="info">ℹ️ 提示</option>
              </select>
            </div>
            <div>
              <label>预警类型</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
              >
                <option value="all">全部类型</option>
                {(Object.keys(INSIGHT_RULE_LABELS) as InsightRuleType[]).map(t => (
                  <option key={t} value={t}>{TYPE_EMOJI[t]} {INSIGHT_RULE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end', color: '#9a7b8d', fontSize: '0.9em' }}>
              共 {filteredAlerts.length} 条预警
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-emoji">✅</div>
              <div className="empty-state-text">当前没有符合条件的预警</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="timeline-event"
                  style={{ borderLeftColor: INSIGHT_SEVERITY_COLORS[alert.severity], cursor: 'pointer' }}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div style={{ minWidth: 110 }}>
                    <div className="timeline-date">{alert.date}</div>
                    <span className="phase-badge" style={{
                      background: INSIGHT_SEVERITY_COLORS[alert.severity],
                      fontSize: '0.75em',
                      marginTop: 4,
                      display: 'inline-block',
                    }}>
                      {SEVERITY_EMOJI[alert.severity]} {INSIGHT_SEVERITY_LABELS[alert.severity]}
                    </span>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">
                      {TYPE_EMOJI[alert.type]} {alert.title}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#9a7b8d', marginBottom: 4 }}>
                      {INSIGHT_RULE_LABELS[alert.type]}
                    </div>
                    <p style={{ fontSize: '0.9em', color: '#4a2c3d', margin: 0 }}>
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <label>严重程度</label>
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value as FilterSeverity)}
              >
                <option value="all">全部</option>
                <option value="alert">🚨 警告</option>
                <option value="warning">⚠️ 注意</option>
                <option value="info">ℹ️ 提示</option>
              </select>
            </div>
            <div>
              <label>预警类型</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
              >
                <option value="all">全部类型</option>
                {(Object.keys(INSIGHT_RULE_LABELS) as InsightRuleType[]).map(t => (
                  <option key={t} value={t}>{TYPE_EMOJI[t]} {INSIGHT_RULE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-emoji">✅</div>
              <div className="empty-state-text">时间线上暂无预警</div>
            </div>
          ) : (
            timelineEvents.map(({ date, alerts: dayAlerts }) => (
              <div key={date} style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, #ff6b9d 0%, #c44eff 100%)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.9em',
                  }}>
                    📅 {date}
                  </span>
                  <span style={{ color: '#9a7b8d', fontSize: '0.85em' }}>
                    {dayAlerts.length} 条预警
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 10 }}>
                  {dayAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="timeline-event"
                      style={{ borderLeftColor: INSIGHT_SEVERITY_COLORS[alert.severity], cursor: 'pointer' }}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="timeline-content">
                        <div className="timeline-title">
                          {SEVERITY_EMOJI[alert.severity]} {TYPE_EMOJI[alert.type]} {alert.title}
                        </div>
                        <p style={{ fontSize: '0.9em', color: '#4a2c3d', margin: '6px 0 0' }}>
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="card">
          <h3 className="card-title">⚙️ 预警规则设置</h3>
          <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: -10, marginBottom: 20 }}>
            自定义预警触发的阈值条件，开启或关闭各类检测
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rules.map(rule => (
              <div key={rule.type} className="phase-card" style={{
                borderLeftColor: rule.type === 'consecutive_low_mood' ? '#E57373'
                  : rule.type === 'luteal_mood_decline' ? '#64B5F6'
                  : rule.type === 'premenstrual_keyword_spike' ? '#FFB74D'
                  : '#c44eff',
                padding: 20,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 6,
                    }}>
                      <span style={{ fontSize: '1.4em' }}>{TYPE_EMOJI[rule.type]}</span>
                      <span style={{ fontWeight: 600, fontSize: '1.1em', color: '#4a2c3d' }}>
                        {rule.name}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9em', color: '#9a7b8d', margin: 0 }}>
                      {rule.description}
                    </p>
                  </div>
                  <label className="checkbox-row" style={{ minWidth: 100 }}>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleRuleToggle(rule)}
                    />
                    <span>{rule.enabled ? '已启用' : '已关闭'}</span>
                  </label>
                </div>
                {rule.enabled && (
                  <div style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255,107,157,0.1)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16,
                  }}>
                    {Object.entries(rule.thresholds).map(([key, value]) => (
                      <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                        <label>{THRESHOLD_LABELS[rule.type]?.[key] || key}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={e => handleThresholdChange(rule, key, Number(e.target.value))}
                          min={0}
                          step={key.includes('ultiplier') || key.includes('oints') || key.includes('core') ? 0.5 : 1}
                          disabled={savingRule === rule.type}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAlert && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(74,44,61,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }} onClick={() => setSelectedAlert(null)}>
          <div
            className="card"
            style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: '1.5em' }}>{SEVERITY_EMOJI[selectedAlert.severity]}</span>
                  <h2 style={{ margin: 0, fontSize: '1.3em' }}>{selectedAlert.title}</h2>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="phase-badge" style={{ background: INSIGHT_SEVERITY_COLORS[selectedAlert.severity] }}>
                    {INSIGHT_SEVERITY_LABELS[selectedAlert.severity]}
                  </span>
                  <span className="phase-badge" style={{
                    background: selectedAlert.type === 'consecutive_low_mood' ? '#E57373'
                      : selectedAlert.type === 'luteal_mood_decline' ? '#64B5F6'
                      : selectedAlert.type === 'premenstrual_keyword_spike' ? '#FFB74D'
                      : '#c44eff',
                  }}>
                    {TYPE_EMOJI[selectedAlert.type]} {INSIGHT_RULE_LABELS[selectedAlert.type]}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 14px' }}
                onClick={() => setSelectedAlert(null)}
              >
                ×
              </button>
            </div>

            <p style={{ marginTop: 16, lineHeight: 1.7, color: '#4a2c3d' }}>
              {selectedAlert.description}
            </p>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12, color: '#4a2c3d' }}>📅 影响日期</h4>
              <div className="tags-container">
                {selectedAlert.affectedDates.map(d => (
                  <span key={d} className="tag selected">{d}</span>
                ))}
              </div>
            </div>

            {selectedAlert.details && Object.keys(selectedAlert.details).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 12, color: '#4a2c3d' }}>📊 详细数据</h4>
                <div style={{
                  background: 'rgba(255,107,157,0.05)',
                  borderRadius: 12,
                  padding: 16,
                }}>
                  {Object.entries(selectedAlert.details).map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      fontSize: '0.9em',
                      borderBottom: '1px solid rgba(255,107,157,0.08)',
                    }}>
                      <span style={{ color: '#9a7b8d' }}>{k}</span>
                      <span style={{ color: '#4a2c3d', fontWeight: 500 }}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
