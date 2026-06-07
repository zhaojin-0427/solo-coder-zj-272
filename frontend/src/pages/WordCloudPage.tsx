import { useState, useEffect, useMemo } from 'react';
import { statsApi } from '../api';
import type { CyclePhase } from '../types';
import { PHASE_NAMES, PHASE_COLORS } from '../types';

type FilterKey = 'all' | CyclePhase;

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'menstrual', label: PHASE_NAMES.menstrual },
  { key: 'follicular', label: PHASE_NAMES.follicular },
  { key: 'ovulation', label: PHASE_NAMES.ovulation },
  { key: 'luteal', label: PHASE_NAMES.luteal },
];

export default function WordCloudPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [phaseStats, setPhaseStats] = useState<{
    phase: CyclePhase;
    phaseName: string;
    keywordFrequency: { keyword: string; count: number }[];
  }[]>([]);

  useEffect(() => {
    statsApi.getPhaseStats().then(setPhaseStats).catch(console.error);
  }, []);

  const keywordData = useMemo(() => {
    if (filter === 'all') {
      const map: Record<string, number> = {};
      phaseStats.forEach(p => {
        p.keywordFrequency.forEach(k => {
          map[k.keyword] = (map[k.keyword] || 0) + k.count;
        });
      });
      return Object.entries(map)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count);
    }
    const found = phaseStats.find(p => p.phase === filter);
    return found ? found.keywordFrequency : [];
  }, [phaseStats, filter]);

  const maxCount = Math.max(1, ...keywordData.map(k => k.count));

  function getSize(count: number): number {
    const min = 14;
    const max = 42;
    const ratio = count / maxCount;
    return min + (max - min) * ratio;
  }

  function getColor(count: number, idx: number): string {
    const colors = ['#ff6b9d', '#c44eff', '#64B5F6', '#81C784', '#FFB74D', '#E57373', '#BA68C8'];
    if (filter !== 'all' && phaseStats.find(p => p.phase === filter)) {
      return PHASE_COLORS[filter];
    }
    return colors[idx % colors.length];
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">☁️ 心情词云</h2>

        <div className="range-selector">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`range-btn ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
              style={filter === opt.key && opt.key !== 'all' ? {
                background: PHASE_COLORS[opt.key],
              } : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {keywordData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-emoji">✨</div>
            <div className="empty-state-text">还没有关键词数据，快去记录吧</div>
          </div>
        ) : (
          <div className="keyword-cloud" style={{ minHeight: 300 }}>
            {keywordData.map((k, i) => (
              <span
                key={k.keyword}
                className="keyword-item"
                style={{
                  fontSize: `${getSize(k.count)}px`,
                  color: getColor(k.count, i),
                  opacity: 0.5 + 0.5 * (k.count / maxCount),
                  padding: `${6 + k.count}px ${10 + k.count * 2}px`,
                  fontWeight: k.count > maxCount * 0.5 ? 700 : 500,
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
        <h2 className="card-title">📊 关键词排行榜</h2>
        {keywordData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-emoji">🏆</div>
            <div className="empty-state-text">暂无排名数据</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keywordData.slice(0, 20).map((k, i) => (
              <div
                key={k.keyword}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: i < 3 ? 'linear-gradient(135deg, rgba(255,107,157,0.08) 0%, rgba(196,78,255,0.08) 100%)' : 'rgba(255,255,255,0.5)',
                }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#e8dde4',
                  color: i < 3 ? 'white' : '#9a7b8d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9em',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontWeight: 500, color: '#4a2c3d' }}>{k.keyword}</span>
                <div style={{
                  flex: 2,
                  height: 8,
                  background: 'rgba(255,107,157,0.08)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginRight: 12,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(k.count / maxCount) * 100}%`,
                    borderRadius: 4,
                    background: filter !== 'all' && filter !== 'all' as any ? PHASE_COLORS[filter] : 'linear-gradient(90deg, #ff6b9d 0%, #c44eff 100%)',
                  }} />
                </div>
                <span style={{
                  color: '#ff6b9d',
                  fontWeight: 700,
                  minWidth: 30,
                  textAlign: 'right',
                }}>
                  {k.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
