import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { remindersApi } from '../api';
import type { ReminderRule, ReminderInstance, ReminderSummary } from '../types';
import {
  REMINDER_TYPE_LABELS,
  REMINDER_TYPE_COLORS,
  REMINDER_STATUS_LABELS,
} from '../types';
import { todayStr, parseDate } from '../utils/date';

type TabKey = 'today' | 'upcoming' | 'history' | 'rules';

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatDateLabel(dateStr: string): string {
  const today = todayStr();
  const d = parseDate(dateStr);
  const todayD = parseDate(today);
  const diff = Math.round((d.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === -1) return '昨天';
  if (diff > 1 && diff <= 7) return `${WEEKDAY_CN[d.getDay()]}`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function ReminderCard({
  reminder,
  onComplete,
  onIgnore,
  showDate = false,
}: {
  reminder: ReminderInstance;
  onComplete?: () => void;
  onIgnore?: () => void;
  showDate?: boolean;
}) {
  const typeColor = REMINDER_TYPE_COLORS[reminder.ruleType];
  const typeLabel = REMINDER_TYPE_LABELS[reminder.ruleType];
  const isHandled = reminder.status !== 'pending';

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: 18,
        opacity: isHandled ? 0.6 : 1,
        borderLeft: `4px solid ${typeColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: `${typeColor}22`,
                color: typeColor,
                fontSize: '0.8em',
                fontWeight: 500,
              }}
            >
              {typeLabel}
            </span>
            {showDate && (
              <span style={{ fontSize: '0.85em', color: '#9a7b8d' }}>
                📅 {formatDateLabel(reminder.triggerDate)}
              </span>
            )}
            <span style={{ fontSize: '0.85em', color: '#9a7b8d' }}>
              ⏰ {reminder.triggerTime}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: '0.75em',
                fontWeight: 500,
                background:
                  reminder.status === 'completed'
                    ? 'rgba(129,199,132,0.18)'
                    : reminder.status === 'ignored'
                    ? 'rgba(158,158,158,0.18)'
                    : 'rgba(255,183,77,0.18)',
                color:
                  reminder.status === 'completed'
                    ? '#388e3c'
                    : reminder.status === 'ignored'
                    ? '#757575'
                    : '#f57c00',
              }}
            >
              {REMINDER_STATUS_LABELS[reminder.status]}
            </span>
          </div>
          <h3 style={{ fontSize: '1.05em', color: '#4a2c3d', marginBottom: 6 }}>
            {reminder.title}
          </h3>
          {reminder.description && (
            <p style={{ fontSize: '0.9em', color: '#7a5c6f', margin: 0, lineHeight: 1.6 }}>
              {reminder.description}
            </p>
          )}
        </div>
        {!isHandled && (onComplete || onIgnore) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {onComplete && (
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85em' }}
                onClick={onComplete}
              >
                ✅ 完成
              </button>
            )}
            {onIgnore && (
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.8em' }}
                onClick={onIgnore}
              >
                忽略
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  onToggle,
  onUpdateTime,
}: {
  rule: ReminderRule;
  onToggle: () => void;
  onUpdateTime: (time: string) => void;
}) {
  const typeColor = REMINDER_TYPE_COLORS[rule.type];
  const typeLabel = REMINDER_TYPE_LABELS[rule.type];

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: 18,
        opacity: rule.enabled ? 1 : 0.55,
        borderLeft: `4px solid ${typeColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: `${typeColor}22`,
                color: typeColor,
                fontSize: '0.8em',
                fontWeight: 500,
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: '0.75em',
                fontWeight: 500,
                background: rule.enabled
                  ? 'rgba(129,199,132,0.18)'
                  : 'rgba(158,158,158,0.18)',
                color: rule.enabled ? '#388e3c' : '#757575',
              }}
            >
              {rule.enabled ? '已启用' : '已关闭'}
            </span>
          </div>
          <h3 style={{ fontSize: '1.05em', color: '#4a2c3d', marginBottom: 4 }}>
            {rule.name}
          </h3>
          <p style={{ fontSize: '0.88em', color: '#7a5c6f', margin: 0, marginBottom: 12, lineHeight: 1.5 }}>
            {rule.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ margin: 0, fontSize: '0.85em' }}>提醒时间：</label>
              <input
                type="time"
                value={rule.time}
                disabled={!rule.enabled}
                onChange={e => onUpdateTime(e.target.value)}
                style={{ width: 120, padding: '6px 10px', fontSize: '0.9em' }}
              />
            </div>
            {rule.daysAhead !== undefined && (
              <div style={{ fontSize: '0.85em', color: '#7a5c6f' }}>
                提前 {rule.daysAhead} 天
              </div>
            )}
            {rule.moodThreshold !== undefined && (
              <div style={{ fontSize: '0.85em', color: '#7a5c6f' }}>
                情绪 ≤ {rule.moodThreshold} 分
              </div>
            )}
            {rule.consecutiveDays !== undefined && (
              <div style={{ fontSize: '0.85em', color: '#7a5c6f' }}>
                连续 {rule.consecutiveDays} 天
              </div>
            )}
          </div>
        </div>
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: 50,
            height: 28,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={onToggle}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              inset: 0,
              background: rule.enabled
                ? 'linear-gradient(135deg, #ff6b9d 0%, #c44eff 100%)'
                : '#ccc',
              borderRadius: 28,
              transition: '0.3s',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: rule.enabled ? 24 : 4,
              top: 4,
              width: 20,
              height: 20,
              background: 'white',
              borderRadius: '50%',
              transition: '0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('today');
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshMsg, setRefreshMsg] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [sum, r] = await Promise.all([
        remindersApi.getSummary(),
        remindersApi.getRules(),
      ]);
      setSummary(sum);
      setRules(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRefresh() {
    try {
      const res = await remindersApi.refresh();
      setRefreshMsg(`✨ 已刷新，生成 ${res.created} 条新提醒`);
      setTimeout(() => setRefreshMsg(''), 3000);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleComplete(id: string) {
    try {
      await remindersApi.completeInstance(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleIgnore(id: string) {
    try {
      await remindersApi.ignoreInstance(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleToggleRule(ruleId: string, currentEnabled: boolean) {
    try {
      await remindersApi.updateRule(ruleId, { enabled: !currentEnabled });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdateTime(ruleId: string, time: string) {
    try {
      await remindersApi.updateRule(ruleId, { time });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  const todayReminders = summary?.today ?? [];
  const upcomingReminders = summary?.next7Days ?? [];
  const historyReminders = summary?.history ?? [];

  const upcomingByDate = useMemo(() => {
    const map: Record<string, ReminderInstance[]> = {};
    for (const r of upcomingReminders) {
      if (!map[r.triggerDate]) map[r.triggerDate] = [];
      map[r.triggerDate].push(r);
    }
    return map;
  }, [upcomingReminders]);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'today', label: '今日提醒', count: todayReminders.length },
    { key: 'upcoming', label: '未来7天', count: upcomingReminders.length },
    { key: 'history', label: '历史记录' },
    { key: 'rules', label: '提醒规则' },
  ];

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>🔔 提醒中心</h2>
            <p style={{ marginTop: 6, marginBottom: 0, color: '#7a5c6f', fontSize: '0.9em' }}>
              {summary?.pendingCount
                ? `还有 ${summary.pendingCount} 条待处理的提醒`
                : '暂时没有待处理的提醒'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {refreshMsg && (
              <span style={{ alignSelf: 'center', color: '#388e3c', fontSize: '0.9em' }}>
                {refreshMsg}
              </span>
            )}
            <button className="btn btn-secondary" onClick={handleRefresh}>
              🔄 刷新提醒
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 20,
          background: 'rgba(255,255,255,0.7)',
          padding: 6,
          borderRadius: 16,
          flexWrap: 'wrap',
        }}
      >
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: '1 1 auto',
              padding: '10px 16px',
              border: 'none',
              borderRadius: 12,
              background: tab === t.key ? 'linear-gradient(135deg, #ff6b9d 0%, #c44eff 100%)' : 'transparent',
              color: tab === t.key ? 'white' : '#7a5c6f',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: 500,
              transition: 'all 0.25s ease',
              minWidth: 100,
            }}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '1px 8px',
                  borderRadius: 10,
                  fontSize: '0.75em',
                  background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,107,157,0.15)',
                  color: tab === t.key ? 'white' : '#ff6b9d',
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-emoji">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : (
        <>
          {tab === 'today' && (
            <>
              {todayReminders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">✨</div>
                  <div className="empty-state-text">今天没有待处理的提醒</div>
                  <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={handleRefresh}>
                    点击刷新提醒
                  </button>
                </div>
              ) : (
                todayReminders.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onComplete={() => handleComplete(r.id)}
                    onIgnore={() => handleIgnore(r.id)}
                  />
                ))
              )}
            </>
          )}

          {tab === 'upcoming' && (
            <>
              {Object.keys(upcomingByDate).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">📅</div>
                  <div className="empty-state-text">未来 7 天没有待处理的提醒</div>
                  <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={handleRefresh}>
                    点击刷新提醒
                  </button>
                </div>
              ) : (
                Object.entries(upcomingByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, list]) => (
                    <div key={date}>
                      <div
                        style={{
                          padding: '8px 16px',
                          margin: '8px 0 12px',
                          color: '#7a5c6f',
                          fontSize: '0.9em',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ width: 3, height: 16, background: 'linear-gradient(180deg,#ff6b9d,#c44eff)', borderRadius: 2 }} />
                        📅 {formatDateLabel(date)} · {date}
                      </div>
                      {list.map(r => (
                        <ReminderCard
                          key={r.id}
                          reminder={r}
                          onComplete={() => handleComplete(r.id)}
                          onIgnore={() => handleIgnore(r.id)}
                        />
                      ))}
                    </div>
                  ))
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {historyReminders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">📜</div>
                  <div className="empty-state-text">最近 30 天没有历史提醒记录</div>
                </div>
              ) : (
                historyReminders.map(r => (
                  <ReminderCard key={r.id} reminder={r} showDate />
                ))
              )}
            </>
          )}

          {tab === 'rules' && (
            <>
              {rules.map(r => (
                <RuleCard
                  key={r.id}
                  rule={r}
                  onToggle={() => handleToggleRule(r.id, r.enabled)}
                  onUpdateTime={time => handleUpdateTime(r.id, time)}
                />
              ))}
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'rgba(255,183,77,0.08)', fontSize: '0.85em', color: '#7a5c6f' }}>
                💡 提示：修改规则后，点击右上角「刷新提醒」按钮可以根据新规则重新生成未来的提醒实例。
              </div>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/')}
          style={{ marginRight: 10 }}
        >
          ← 去记录
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
          查看月历 →
        </button>
      </div>
    </div>
  );
}
