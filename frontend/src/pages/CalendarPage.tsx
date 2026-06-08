import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { entriesApi, cycleApi, insightsApi, healingApi, remindersApi } from '../api';
import type { DiaryEntry, CycleInfo, HealingSuggestion, ReminderInstance } from '../types';
import { MOOD_EMOJI, PHASE_NAMES, PHASE_COLORS, STICKER_EMOJI, HEALING_CATEGORY_EMOJI, HEALING_CATEGORY_LABELS, HEALING_CATEGORY_COLORS, PRIORITY_LABELS, SUGGESTION_SOURCE_LABELS, REMINDER_TYPE_LABELS, REMINDER_TYPE_COLORS } from '../types';
import { formatLocalDate, todayStr } from '../utils/date';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [alertDates, setAlertDates] = useState<Set<string>>(new Set());
  const [reminderDates, setReminderDates] = useState<Set<string>>(new Set());
  const [selectedDateSuggestions, setSelectedDateSuggestions] = useState<HealingSuggestion[]>([]);
  const [selectedDateReminders, setSelectedDateReminders] = useState<ReminderInstance[]>([]);

  const { start, end } = useMemo(() => {
    const s = new Date(year, month, 1, 12, 0, 0);
    const e = new Date(year, month + 1, 0, 12, 0, 0);
    return {
      start: formatLocalDate(s),
      end: formatLocalDate(e),
    };
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [start, end]);

  useEffect(() => {
    if (selectedDate) {
      healingApi.getTodaySuggestions(selectedDate)
        .then(setSelectedDateSuggestions)
        .catch(() => setSelectedDateSuggestions([]));
      remindersApi.getInstances({ date: selectedDate })
        .then(setSelectedDateReminders)
        .catch(() => setSelectedDateReminders([]));
    } else {
      setSelectedDateSuggestions([]);
      setSelectedDateReminders([]);
    }
  }, [selectedDate]);

  async function loadData() {
    try {
      const [list, cycle, alerts, reminders] = await Promise.all([
        entriesApi.getAll({ start, end }),
        cycleApi.get(),
        insightsApi.getAlertDates(),
        remindersApi.getInstanceDates({ start, end }),
      ]);
      setEntries(list);
      setCycleInfo(cycle);
      setAlertDates(new Set(alerts));
      setReminderDates(new Set(reminders));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (selectedDate) {
      const entry = entries.find(e => e.date === selectedDate) || null;
      setSelectedEntry(entry);
    }
  }, [selectedDate, entries]);

  function getDaysToRender() {
    const days: { date: Date; inMonth: boolean }[] = [];
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, inMonth: false });
    }
    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDate; i++) {
      days.push({ date: new Date(year, month, i), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      days.push({ date: d, inMonth: false });
    }
    return days;
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  function goToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDate(todayStr());
  }

  const days = getDaysToRender();
  const today = todayStr();
  const entriesByDate = useMemo(() => {
    const map: Record<string, DiaryEntry> = {};
    entries.forEach(e => { map[e.date] = e; });
    return map;
  }, [entries]);

  const monthAvgMood = useMemo(() => {
    if (entries.length === 0) return 0;
    return entries.reduce((s, e) => s + e.moodScore, 0) / entries.length;
  }, [entries]);

  return (
    <div className="row">
      <div className="col" style={{ minWidth: 400 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="card-title" style={{ margin: 0 }}>📅 月历视图</h2>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.85em' }}
              onClick={() => navigate('/search')}
            >
              🔍 搜索筛选
            </button>
          </div>
          <div className="calendar-header">
            <div className="calendar-nav">
              <button onClick={prevMonth}>‹</button>
              <button onClick={goToday}>今</button>
              <button onClick={nextMonth}>›</button>
            </div>
            <div className="calendar-title">{year} 年 {month + 1} 月</div>
            <div style={{ minWidth: 80, textAlign: 'right', fontSize: '0.9em', color: '#ff6b9d', fontWeight: 500 }}>
              {entries.length > 0 ? `😊 ${monthAvgMood.toFixed(1)}分` : '无记录'}
            </div>
          </div>

          <div className="calendar">
            {WEEKDAYS.map(w => (
              <div key={w} className="calendar-weekday">{w}</div>
            ))}
            {days.map(({ date, inMonth }) => {
              const dateStr = formatLocalDate(date);
              const entry = entriesByDate[dateStr];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasAlert = alertDates.has(dateStr);
              const hasReminder = reminderDates.has(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`calendar-day ${!inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasAlert ? 'has-alert' : ''}`}
                  onClick={() => inMonth && setSelectedDate(dateStr)}
                >
                  <span className="day-number">{date.getDate()}</span>
                  {entry && (
                    <span className="day-mood" title={`${entry.moodScore}分`}>
                      {MOOD_EMOJI[Math.min(Math.max(entry.moodScore, 1), 10)]}
                    </span>
                  )}
                  {entry?.cyclePhase && (
                    <span
                      className="day-phase"
                      style={{ background: PHASE_COLORS[entry.cyclePhase] }}
                      title={PHASE_NAMES[entry.cyclePhase]}
                    />
                  )}
                  {entry?.isSpecialEvent && (
                    <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.7em' }}>⭐</span>
                  )}
                  {hasAlert && !entry?.isSpecialEvent && (
                    <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.7em' }}>🔔</span>
                  )}
                  {hasReminder && !hasAlert && !entry?.isSpecialEvent && (
                    <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.7em' }}>⏰</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: PHASE_COLORS.menstrual }} />
              {PHASE_NAMES.menstrual}
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: PHASE_COLORS.follicular }} />
              {PHASE_NAMES.follicular}
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: PHASE_COLORS.ovulation }} />
              {PHASE_NAMES.ovulation}
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: PHASE_COLORS.luteal }} />
              {PHASE_NAMES.luteal}
            </div>
            <div className="legend-item">
              <span style={{ fontSize: '0.9em' }}>🔔</span>
              预警日期
            </div>
            <div className="legend-item">
              <span style={{ fontSize: '0.9em' }}>⏰</span>
              有提醒
            </div>
          </div>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h2 className="card-title">📖 {selectedDate ? selectedDate : '请选择日期'}</h2>
          {!selectedDate && (
            <div className="empty-state">
              <div className="empty-state-emoji">📅</div>
              <div className="empty-state-text">点击日历中的日期查看详情</div>
            </div>
          )}
          {selectedDate && !selectedEntry && (
            <div className="empty-state">
              <div className="empty-state-emoji">✏️</div>
              <div className="empty-state-text">这一天还没有记录</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/')}
              >
                去记录
              </button>
            </div>
          )}
          {selectedEntry && (
            <div>
              <div className="entry-header-info">
                <div className="entry-preview-mood" style={{ margin: 0 }}>
                  {MOOD_EMOJI[Math.min(Math.max(selectedEntry.moodScore, 1), 10)]}
                  <span style={{ fontSize: '0.6em', color: '#9a7b8d', marginLeft: 8 }}>
                    {selectedEntry.moodScore}/10
                  </span>
                </div>
                {selectedEntry.cyclePhase && (
                  <span
                    className="phase-badge"
                    style={{ background: PHASE_COLORS[selectedEntry.cyclePhase] }}
                  >
                    {PHASE_NAMES[selectedEntry.cyclePhase]}
                    {selectedEntry.cycleDay ? ` · 第${selectedEntry.cycleDay}天` : ''}
                  </span>
                )}
                <span className={`visibility-badge ${selectedEntry.visibility}`}>
                  {selectedEntry.visibility === 'private' ? '🔒 私密' : '🌍 公开'}
                </span>
                {selectedEntry.isSpecialEvent && (
                  <span className="special-event-badge">⭐ {selectedEntry.specialEventTitle || '特殊事件'}</span>
                )}
              </div>

              {selectedEntry.keywords.length > 0 && (
                <div className="tags-container" style={{ margin: '12px 0' }}>
                  {selectedEntry.keywords.map(k => (
                    <span key={k} className="tag selected">{k}</span>
                  ))}
                </div>
              )}

              {selectedEntry.stickers.length > 0 && (
                <div className="entry-preview-stickers">
                  {selectedEntry.stickers.map(s => (
                    <span key={s}>{STICKER_EMOJI[s]}</span>
                  ))}
                </div>
              )}

              {selectedEntry.notes && (
                <p className="entry-preview-notes">{selectedEntry.notes}</p>
              )}

              {selectedEntry.photos.length > 0 && (
                <div className="entry-preview-photos">
                  {selectedEntry.photos.map((p, i) => (
                    <img key={i} src={p} alt="" />
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDateReminders.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 className="card-title" style={{ marginBottom: 12 }}>⏰ 当日提醒</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDateReminders.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: `${REMINDER_TYPE_COLORS[r.ruleType]}15`,
                      borderLeft: `3px solid ${REMINDER_TYPE_COLORS[r.ruleType]}`,
                      opacity: r.status !== 'pending' ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8em', color: REMINDER_TYPE_COLORS[r.ruleType], fontWeight: 500 }}>
                        {REMINDER_TYPE_LABELS[r.ruleType]}
                      </span>
                      <span style={{ fontSize: '0.75em', color: '#9a7b8d' }}>⏰ {r.triggerTime}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: '0.7em',
                          fontWeight: 500,
                          background:
                            r.status === 'completed'
                              ? 'rgba(129,199,132,0.18)'
                              : r.status === 'ignored'
                              ? 'rgba(158,158,158,0.18)'
                              : 'rgba(255,183,77,0.18)',
                          color:
                            r.status === 'completed'
                              ? '#388e3c'
                              : r.status === 'ignored'
                              ? '#757575'
                              : '#f57c00',
                        }}
                      >
                        {r.status === 'completed' ? '已完成' : r.status === 'ignored' ? '已忽略' : '待处理'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95em', fontWeight: 500, color: '#4a2c3d', marginBottom: 2 }}>
                      {r.title}
                    </div>
                    {r.description && (
                      <div style={{ fontSize: '0.85em', color: '#7a5c6f', lineHeight: 1.5 }}>
                        {r.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDateSuggestions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 className="card-title" style={{ marginBottom: 12 }}>💚 疗愈建议</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDateSuggestions.slice(0, 3).map(s => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
