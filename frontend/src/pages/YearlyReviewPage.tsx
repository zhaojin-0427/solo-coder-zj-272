import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { statsApi, cycleApi } from '../api';
import type { YearlyReview, CycleInfo } from '../types';
import { MOOD_EMOJI, PHASE_NAMES, PHASE_COLORS } from '../types';

export default function YearlyReviewPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [review, setReview] = useState<YearlyReview | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      statsApi.getYearlyReview(year),
      cycleApi.get(),
    ])
      .then(([r, c]) => {
        setReview(r);
        setCycleInfo(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const trendData = useMemo(() => {
    if (!review) return [];
    return review.monthlyTrend.map(m => ({
      ...m,
      displayMonth: m.month.slice(5) + '月',
      hasData: m.count > 0,
    }));
  }, [review]);

  const maxKwCount = Math.max(1, ...(review?.topKeywords.map(k => k.count) || [0]));

  const phaseColors = ['#E57373', '#81C784', '#FFB74D', '#64B5F6'];

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 3; y <= currentYear; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  if (loading && !review) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-emoji">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div>
      <div className="card">
        <h2 className="card-title">🎉 {year} 年度回顾</h2>

        <div className="range-selector">
          {years.map(y => (
            <button
              key={y}
              className={`range-btn ${year === y ? 'active' : ''}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">记录总天数</div>
            <div className="stat-value">{review.totalEntries}</div>
            <div className="stat-sub">天 / 365</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">年度平均心情</div>
            <div className="stat-value">{review.avgMood}</div>
            <div className="stat-sub">{MOOD_EMOJI[Math.min(Math.max(Math.round(review.avgMood), 1), 10)]}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">特殊事件</div>
            <div className="stat-value">{review.specialEvents.length}</div>
            <div className="stat-sub">个值得铭记的日子</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">年度关键词数</div>
            <div className="stat-value">{review.topKeywords.length}</div>
            <div className="stat-sub">种情绪</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📈 全年心情趋势</h2>
        <div className="chart-container" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b9d" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#c44eff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ee" />
              <XAxis dataKey="displayMonth" stroke="#9a7b8d" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9a7b8d" domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        background: 'white',
                        padding: '12px 16px',
                        borderRadius: 12,
                        boxShadow: '0 4px 20px rgba(255,107,157,0.2)',
                      }}>
                        <div style={{ fontWeight: 600, color: '#4a2c3d', marginBottom: 6 }}>
                          {year}年{displayMonthToNum(d.displayMonth)}月
                        </div>
                        <div style={{ color: '#ff6b9d', fontSize: '1.4em', fontWeight: 600 }}>
                          {d.avgMood || '-'} 分 {d.hasData ? MOOD_EMOJI[Math.min(Math.max(Math.round(d.avgMood), 1), 10)] : ''}
                        </div>
                        <div style={{ color: '#9a7b8d', fontSize: '0.85em' }}>
                          {d.count} 条记录
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="avgMood"
                stroke="url(#moodLine)"
                strokeWidth={3}
                fill="url(#yearlyGradient)"
                connectNulls
              />
              <defs>
                <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff6b9d" />
                  <stop offset="100%" stopColor="#c44eff" />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ee" vertical={false} />
              <XAxis dataKey="displayMonth" stroke="#9a7b8d" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9a7b8d" tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        background: 'white',
                        padding: '10px 14px',
                        borderRadius: 12,
                        boxShadow: '0 4px 20px rgba(255,107,157,0.2)',
                      }}>
                        <div style={{ fontWeight: 600, color: '#4a2c3d' }}>{d.displayMonth}</div>
                        <div style={{ color: '#ff6b9d' }}>{d.count} 条记录</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {trendData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#ff6b9d' : '#c44eff'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <h2 className="card-title">⭐ 特殊事件时间线</h2>
            {review.specialEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-emoji">🎀</div>
                <div className="empty-state-text">今年还没有特殊事件标记</div>
              </div>
            ) : (
              <div>
                {review.specialEvents.map(ev => (
                  <div key={ev.date} className="timeline-event">
                    <div className="timeline-date">
                      {ev.date.slice(5).replace('-', '/')}
                      <div style={{ fontSize: '1.4em', marginTop: 4 }}>
                        {MOOD_EMOJI[Math.min(Math.max(ev.moodScore, 1), 10)]}
                      </div>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">{ev.title}</div>
                      <div style={{ color: '#9a7b8d', fontSize: '0.85em' }}>
                        心情 {ev.moodScore}/10
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h2 className="card-title">🏷️ 年度 TOP 关键词</h2>
            {review.topKeywords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-emoji">✨</div>
                <div className="empty-state-text">暂无关键词</div>
              </div>
            ) : (
              <div className="keyword-cloud">
                {review.topKeywords.map((k, i) => (
                  <span
                    key={k.keyword}
                    className="keyword-item"
                    style={{
                      fontSize: `${14 + 20 * (k.count / maxKwCount)}px`,
                      opacity: 0.5 + 0.5 * (k.count / maxKwCount),
                      color: ['#ff6b9d', '#c44eff', '#64B5F6', '#81C784', '#FFB74D'][i % 5],
                      padding: `${6 + k.count}px ${10 + k.count * 2}px`,
                      fontWeight: k.count > maxKwCount * 0.5 ? 700 : 500,
                    }}
                    title={`出现 ${k.count} 次`}
                  >
                    {k.keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">🌸 年度周期情绪分布</h2>
            <div className="chart-container" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={review.phaseBreakdown.map(p => ({
                    name: p.phaseName,
                    value: p.avgMood,
                    count: p.count,
                    color: PHASE_COLORS[p.phase],
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ee" vertical={false} />
                  <XAxis dataKey="name" stroke="#9a7b8d" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9a7b8d" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            background: 'white',
                            padding: '10px 14px',
                            borderRadius: 12,
                            boxShadow: '0 4px 20px rgba(255,107,157,0.2)',
                          }}>
                            <div style={{ fontWeight: 600, color: '#4a2c3d' }}>{d.name}</div>
                            <div style={{ color: '#ff6b9d', fontSize: '1.2em' }}>{d.value} 分</div>
                            <div style={{ color: '#9a7b8d', fontSize: '0.85em' }}>{d.count} 条</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {review.phaseBreakdown.map((p, i) => (
                      <Cell key={i} fill={PHASE_COLORS[p.phase]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {review.phaseBreakdown.map(p => (
              <div key={p.phase} className="phase-card" style={{ borderLeftColor: PHASE_COLORS[p.phase] }}>
                <div className="phase-card-header">
                  <span className="phase-name" style={{ color: PHASE_COLORS[p.phase] }}>
                    {p.phaseName}
                  </span>
                  <span className="phase-avg" style={{ color: PHASE_COLORS[p.phase] }}>
                    {p.avgMood} 分
                  </span>
                </div>
                <div className="mood-bar">
                  <div
                    className="mood-bar-fill"
                    style={{
                      width: `${(p.avgMood / 10) * 100}%`,
                      background: PHASE_COLORS[p.phase],
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.85em', color: '#9a7b8d' }}>
                  {p.count} 条记录
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function displayMonthToNum(display: string): number {
  return parseInt(display.replace('月', ''), 10);
}
