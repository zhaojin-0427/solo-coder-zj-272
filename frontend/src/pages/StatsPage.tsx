import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend, ReferenceLine
} from 'recharts';
import { statsApi, cycleApi, entriesApi } from '../api';
import type { PhaseMoodStats, MoodTrendPoint, CycleInfo, DiaryEntry } from '../types';
import { PHASE_NAMES, PHASE_COLORS, MOOD_EMOJI } from '../types';

type RangeKey = '7' | '30' | '90' | 'all';

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: '近7天', days: 7 },
  { key: '30', label: '近30天', days: 30 },
  { key: '90', label: '近90天', days: 90 },
  { key: 'all', label: '全部', days: -1 },
];

export default function StatsPage() {
  const [range, setRange] = useState<RangeKey>('30');
  const [phaseStats, setPhaseStats] = useState<PhaseMoodStats[]>([]);
  const [trend, setTrend] = useState<MoodTrendPoint[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([]);

  const dateRange = useMemo(() => {
    const opt = RANGE_OPTIONS.find(o => o.key === range)!;
    if (opt.days < 0) return {};
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - opt.days + 1);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [range]);

  useEffect(() => {
    loadData();
  }, [range, dateRange.start, dateRange.end]);

  async function loadData() {
    try {
      const params = dateRange.start ? { start: dateRange.start, end: dateRange.end } : undefined;
      const [phases, trendData, cycle, entries] = await Promise.all([
        statsApi.getPhaseStats(params),
        statsApi.getTrend(params),
        cycleApi.get(),
        entriesApi.getAll(params),
      ]);
      setPhaseStats(phases);
      setTrend(trendData);
      setCycleInfo(cycle);
      setAllEntries(entries);
    } catch (e) {
      console.error(e);
    }
  }

  const chartData = useMemo(() => {
    return trend.map(p => ({
      ...p,
      displayDate: p.date.slice(5),
      phaseColor: p.cyclePhase ? PHASE_COLORS[p.cyclePhase] : '#ccc',
      phaseName: p.cyclePhase ? PHASE_NAMES[p.cyclePhase] : '',
    }));
  }, [trend]);

  const overallAvg = useMemo(() => {
    if (allEntries.length === 0) return 0;
    return allEntries.reduce((s, e) => s + e.moodScore, 0) / allEntries.length;
  }, [allEntries]);

  const barData = useMemo(() => {
    return phaseStats.map(p => ({
      ...p,
      color: PHASE_COLORS[p.phase],
    }));
  }, [phaseStats]);

  const allKeywords = useMemo(() => {
    const kwMap: Record<string, number> = {};
    phaseStats.forEach(p => {
      p.keywordFrequency.forEach(k => {
        kwMap[k.keyword] = (kwMap[k.keyword] || 0) + k.count;
      });
    });
    return Object.entries(kwMap)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [phaseStats]);

  return (
    <div>
      <div className="card">
        <h2 className="card-title">📊 周期统计</h2>

        <div className="range-selector">
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

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">记录天数</div>
            <div className="stat-value">{allEntries.length}</div>
            <div className="stat-sub">天</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">平均心情</div>
            <div className="stat-value">{overallAvg.toFixed(1)}</div>
            <div className="stat-sub">{MOOD_EMOJI[Math.min(Math.max(Math.round(overallAvg), 1), 10)]}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">周期长度</div>
            <div className="stat-value">{cycleInfo?.cycleLength || 28}</div>
            <div className="stat-sub">天</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">经期长度</div>
            <div className="stat-value">{cycleInfo?.periodLength || 5}</div>
            <div className="stat-sub">天</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">📈 情绪波动曲线</h2>
        {chartData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-emoji">📊</div>
            <div className="empty-state-text">暂无数据</div>
          </div>
        ) : (
          <div className="chart-container" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ff6b9d" />
                    <stop offset="100%" stopColor="#c44eff" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ee" />
                <XAxis
                  dataKey="displayDate"
                  stroke="#9a7b8d"
                  tick={{ fontSize: 11 }}
                  interval={chartData.length > 30 ? Math.floor(chartData.length / 15) : 0}
                />
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
                          border: 'none',
                        }}>
                          <div style={{ color: '#4a2c3d', fontWeight: 600, marginBottom: 6 }}>
                            📅 {d.date}
                          </div>
                          <div style={{ color: '#ff6b9d', fontSize: '1.2em', marginBottom: 6 }}>
                            {MOOD_EMOJI[Math.min(Math.max(d.moodScore, 1), 10)]} {d.moodScore}/10
                          </div>
                          {d.phaseName && (
                            <div style={{
                              padding: '3px 10px',
                              borderRadius: 10,
                              background: d.phaseColor,
                              color: 'white',
                              fontSize: '0.85em',
                              display: 'inline-block',
                            }}>
                              {d.phaseName}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={5.5} stroke="#f0e6ee" strokeDasharray="5 5" />
                <Line
                  type="monotone"
                  dataKey="moodScore"
                  stroke="url(#moodGradient)"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        key={payload.date}
                        cx={cx}
                        cy={cy}
                        r={chartData.length > 30 ? 3 : 5}
                        fill={payload.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 8, stroke: '#ff6b9d', strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <h2 className="card-title">🌸 各周期阶段情绪平均分</h2>
            {barData.every(b => b.count === 0) ? (
              <div className="empty-state">
                <div className="empty-state-emoji">📊</div>
                <div className="empty-state-text">暂无数据</div>
              </div>
            ) : (
              <>
                <div className="chart-container" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e6ee" vertical={false} />
                      <XAxis dataKey="phaseName" stroke="#9a7b8d" tick={{ fontSize: 12 }} />
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
                                  {d.phaseName}
                                </div>
                                <div style={{ color: '#ff6b9d', fontSize: '1.3em', fontWeight: 600 }}>
                                  {d.avgMood} 分
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
                      <Bar dataKey="avgMood" radius={[8, 8, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {phaseStats.map(p => (
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
                      <div className="mood-bar-fill" style={{
                        width: `${(p.avgMood / 10) * 100}%`,
                        background: `linear-gradient(90deg, ${PHASE_COLORS[p.phase]} 0%, #c44eff 100%)`,
                      }} />
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#9a7b8d' }}>
                      {p.count} 条记录
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h2 className="card-title">🏷️ 各阶段关键词频率</h2>
            {phaseStats.map(p => (
              <div key={p.phase} className="phase-card" style={{ borderLeftColor: PHASE_COLORS[p.phase], marginBottom: 16 }}>
                <div className="phase-card-header">
                  <span className="phase-name" style={{ color: PHASE_COLORS[p.phase] }}>
                    {p.phaseName}
                  </span>
                  <span style={{ fontSize: '0.85em', color: '#9a7b8d' }}>TOP 关键词</span>
                </div>
                {p.keywordFrequency.length === 0 ? (
                  <div style={{ color: '#9a7b8d', fontSize: '0.9em' }}>暂无数据</div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    {p.keywordFrequency.slice(0, 5).map(k => (
                      <div key={k.keyword} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        fontSize: '0.9em',
                      }}>
                        <span style={{ color: '#4a2c3d' }}>{k.keyword}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 80,
                            height: 6,
                            background: 'rgba(255,107,157,0.1)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, k.count * 20)}%`,
                              background: PHASE_COLORS[p.phase],
                              borderRadius: 3,
                            }} />
                          </div>
                          <span style={{ color: PHASE_COLORS[p.phase], fontWeight: 600, minWidth: 20, textAlign: 'right' }}>
                            {k.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
