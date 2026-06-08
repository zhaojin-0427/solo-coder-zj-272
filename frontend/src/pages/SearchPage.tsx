import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api';
import type {
  DiaryEntry,
  EntrySearchFilters,
  EntrySearchResult,
  SearchMetadata,
  CyclePhase,
  Visibility,
  StickerType,
} from '../types';
import {
  MOOD_EMOJI,
  STICKER_EMOJI,
  PHASE_NAMES,
  PHASE_COLORS,
  STICKER_LABELS,
} from '../types';

const PRESET_KEYWORDS = [
  '开心', '平静', '焦虑', '疲惫', '充实', '失落',
  '兴奋', '感动', '烦躁', '放松', '孤独', '幸福',
  '压力', '自信', '迷茫', '温暖', '感恩', '期待',
  '生气', '难过', '惬意', '惊喜', 'emo', '元气'
];

const MOOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SearchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
  const [result, setResult] = useState<EntrySearchResult | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moodMin, setMoodMin] = useState<number | ''>('');
  const [moodMax, setMoodMax] = useState<number | ''>('');
  const [cyclePhases, setCyclePhases] = useState<CyclePhase[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [stickers, setStickers] = useState<StickerType[]>([]);
  const [visibility, setVisibility] = useState<Visibility | ''>('');
  const [isSpecialEvent, setIsSpecialEvent] = useState<boolean | ''>('');
  const [hasPhotos, setHasPhotos] = useState<boolean | ''>('');
  const [hasReminders, setHasReminders] = useState<boolean | ''>('');
  const [hasAlerts, setHasAlerts] = useState<boolean | ''>('');
  const [keywordMatch, setKeywordMatch] = useState<'any' | 'all'>('any');

  useEffect(() => {
    searchApi.getMetadata().then(setMetadata).catch(console.error);
    doSearch();
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (moodMin !== '') count++;
    if (moodMax !== '') count++;
    if (cyclePhases.length > 0) count++;
    if (keywords.length > 0) count++;
    if (stickers.length > 0) count++;
    if (visibility) count++;
    if (isSpecialEvent !== '') count++;
    if (hasPhotos !== '') count++;
    if (hasReminders !== '') count++;
    if (hasAlerts !== '') count++;
    return count;
  }, [startDate, endDate, moodMin, moodMax, cyclePhases, keywords, stickers, visibility, isSpecialEvent, hasPhotos, hasReminders, hasAlerts]);

  function buildFilters(): EntrySearchFilters {
    const f: EntrySearchFilters = {};
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    if (moodMin !== '') f.moodMin = Number(moodMin);
    if (moodMax !== '') f.moodMax = Number(moodMax);
    if (cyclePhases.length > 0) f.cyclePhases = cyclePhases;
    if (keywords.length > 0) f.keywords = keywords;
    if (stickers.length > 0) f.stickers = stickers;
    if (visibility) f.visibility = visibility;
    if (isSpecialEvent !== '') f.isSpecialEvent = isSpecialEvent as boolean;
    if (hasPhotos !== '') f.hasPhotos = hasPhotos as boolean;
    if (hasReminders !== '') f.hasReminders = hasReminders as boolean;
    if (hasAlerts !== '') f.hasAlerts = hasAlerts as boolean;
    if (keywords.length > 0) f.keywordMatch = keywordMatch;
    return f;
  }

  async function doSearch() {
    setLoading(true);
    try {
      const r = await searchApi.searchEntries(buildFilters());
      setResult(r);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setStartDate('');
    setEndDate('');
    setMoodMin('');
    setMoodMax('');
    setCyclePhases([]);
    setKeywords([]);
    setStickers([]);
    setVisibility('');
    setIsSpecialEvent('');
    setHasPhotos('');
    setHasReminders('');
    setHasAlerts('');
    setKeywordMatch('any');
  }

  function toggleCyclePhase(p: CyclePhase) {
    setCyclePhases(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function toggleKeyword(kw: string) {
    setKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  }

  function addCustomKeyword() {
    const trimmed = customKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords(prev => [...prev, trimmed]);
      setCustomKeyword('');
    }
  }

  function toggleSticker(s: StickerType) {
    setStickers(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function goToDate(date: string) {
    navigate('/', { state: { date } });
  }

  function goToCalendarDate(date: string) {
    const d = new Date(date + 'T12:00:00');
    navigate('/calendar', { state: { year: d.getFullYear(), month: d.getMonth(), date } });
  }

  return (
    <div className="row">
      <div className="col" style={{ minWidth: 380, maxWidth: 460 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="card-title" style={{ margin: 0 }}>🔍 搜索筛选条件</h2>
            {activeFilterCount > 0 && (
              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85em' }} onClick={clearFilters}>
                清空 ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="form-group">
            <label>日期范围</label>
            <div className="row" style={{ gap: 10 }}>
              <div className="col">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="开始日期"
                />
              </div>
              <div className="col">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  placeholder="结束日期"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>心情评分区间</label>
            <div className="row" style={{ gap: 10 }}>
              <div className="col">
                <select value={moodMin} onChange={e => setMoodMin(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">最低分不限</option>
                  {MOOD_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}分 - {MOOD_EMOJI[n]}</option>
                  ))}
                </select>
              </div>
              <div className="col">
                <select value={moodMax} onChange={e => setMoodMax(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">最高分不限</option>
                  {MOOD_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}分 - {MOOD_EMOJI[n]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>周期阶段（可多选）</label>
            <div className="tags-container">
              {metadata?.cyclePhases.map(p => (
                <button
                  key={p.value}
                  className={`tag ${cyclePhases.includes(p.value) ? 'selected' : ''}`}
                  onClick={() => toggleCyclePhase(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>关键词（可多选）</label>
            <div style={{ marginBottom: 8, display: 'flex', gap: 10, fontSize: '0.85em' }}>
              <label className="checkbox-row" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={keywordMatch === 'any'}
                  onChange={() => setKeywordMatch('any')}
                />
                <span>匹配任一</span>
              </label>
              <label className="checkbox-row" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={keywordMatch === 'all'}
                  onChange={() => setKeywordMatch('all')}
                />
                <span>必须全部</span>
              </label>
            </div>
            <div className="tags-container">
              {PRESET_KEYWORDS.map(kw => (
                <button
                  key={kw}
                  className={`tag ${keywords.includes(kw) ? 'selected' : ''}`}
                  onClick={() => toggleKeyword(kw)}
                >
                  {kw}
                </button>
              ))}
            </div>
            <div className="tag-input-row">
              <input
                type="text"
                placeholder="添加自定义关键词..."
                value={customKeyword}
                onChange={e => setCustomKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomKeyword())}
              />
              <button className="btn btn-secondary" onClick={addCustomKeyword}>添加</button>
            </div>
            {keywords.length > 0 && (
              <div className="tags-container" style={{ marginTop: 10 }}>
                {keywords.map(kw => (
                  <span key={kw} className="tag selected remove" onClick={() => toggleKeyword(kw)}>
                    {kw} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>贴纸（可多选）</label>
            <div className="stickers-grid">
              {metadata?.stickerOptions.map(s => (
                <button
                  key={s.value}
                  className={`sticker-btn ${stickers.includes(s.value) ? 'active' : ''}`}
                  onClick={() => toggleSticker(s.value)}
                  title={STICKER_LABELS[s.value]}
                >
                  {STICKER_EMOJI[s.value]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>可见性</label>
            <div className="visibility-toggle">
              <button
                className={`visibility-btn ${visibility === '' ? 'active' : ''}`}
                onClick={() => setVisibility('')}
              >
                不限
              </button>
              <button
                className={`visibility-btn ${visibility === 'private' ? 'active' : ''}`}
                onClick={() => setVisibility('private')}
              >
                🔒 私密
              </button>
              <button
                className={`visibility-btn ${visibility === 'public' ? 'active' : ''}`}
                onClick={() => setVisibility('public')}
              >
                🌍 公开
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isSpecialEvent === true}
                onChange={e => setIsSpecialEvent(e.target.checked ? true : '')}
              />
              <span>仅显示特殊事件</span>
            </label>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <div className="col">
              <div className="form-group">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasPhotos === true}
                    onChange={e => setHasPhotos(e.target.checked ? true : '')}
                  />
                  <span>有照片</span>
                </label>
              </div>
            </div>
            <div className="col">
              <div className="form-group">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasReminders === true}
                    onChange={e => setHasReminders(e.target.checked ? true : '')}
                  />
                  <span>有提醒</span>
                </label>
              </div>
            </div>
            <div className="col">
              <div className="form-group">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasAlerts === true}
                    onChange={e => setHasAlerts(e.target.checked ? true : '')}
                  />
                  <span>有预警</span>
                </label>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05em' }} onClick={doSearch} disabled={loading}>
            {loading ? '🔄 搜索中...' : '🔍 开始搜索'}
          </button>
        </div>

        {result && activeFilterCount > 0 && (
          <div className="card">
            <h2 className="card-title">📋 当前条件摘要</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.dateSemantics.label !== '全部记录' && (
                <span className="tag selected">📅 {result.dateSemantics.label}</span>
              )}
              {moodMin !== '' && <span className="tag selected">😊 ≥{moodMin}分</span>}
              {moodMax !== '' && <span className="tag selected">😊 ≤{moodMax}分</span>}
              {cyclePhases.map(p => (
                <span key={p} className="tag selected">🌙 {PHASE_NAMES[p]}</span>
              ))}
              {keywords.map(kw => (
                <span key={kw} className="tag selected">#{kw}</span>
              ))}
              {stickers.map(s => (
                <span key={s} className="tag selected">{STICKER_EMOJI[s]}</span>
              ))}
              {visibility && <span className="tag selected">{visibility === 'private' ? '🔒 私密' : '🌍 公开'}</span>}
              {isSpecialEvent === true && <span className="tag selected">⭐ 特殊事件</span>}
              {hasPhotos === true && <span className="tag selected">📷 有照片</span>}
              {hasReminders === true && <span className="tag selected">⏰ 有提醒</span>}
              {hasAlerts === true && <span className="tag selected">🔔 有预警</span>}
            </div>
          </div>
        )}
      </div>

      <div className="col">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              📊 搜索结果
              {result && (
                <span style={{ marginLeft: 10, fontSize: '0.7em', color: '#9a7b8d', fontWeight: 'normal' }}>
                  {result.dateSemantics.label}
                </span>
              )}
            </h2>
            {result && (
              <span style={{ fontSize: '0.9em', color: '#ff6b9d', fontWeight: 500 }}>
                共 {result.stats.total} 条
              </span>
            )}
          </div>

          {loading && (
            <div className="empty-state">
              <div className="empty-state-emoji">🔄</div>
              <div className="empty-state-text">搜索中...</div>
            </div>
          )}

          {!loading && result && (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-label">总记录数</div>
                  <div className="stat-value">{result.stats.total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">平均心情</div>
                  <div className="stat-value">{result.stats.avgMood}</div>
                  <div className="stat-sub">{result.stats.total > 0 ? `${MOOD_EMOJI[Math.round(result.stats.avgMood)] || '😐'}` : ''}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">心情区间</div>
                  <div className="stat-value" style={{ fontSize: '1.3em' }}>
                    {result.stats.total > 0 ? `${result.stats.minMood} ~ ${result.stats.maxMood}` : '-'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">特殊事件</div>
                  <div className="stat-value">{result.stats.specialEventCount}</div>
                </div>
              </div>

              <div className="row" style={{ gap: 16, marginBottom: 20 }}>
                <div className="col">
                  <div style={{ fontSize: '0.9em', color: '#7a5c6f', marginBottom: 8, fontWeight: 500 }}>
                    📷 {result.stats.withPhotosCount} 条带照片
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#7a5c6f', marginBottom: 8, fontWeight: 500 }}>
                    ⏰ {result.stats.withRemindersCount} 条带提醒
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#7a5c6f', fontWeight: 500 }}>
                    🔔 {result.stats.withAlertsCount} 条带预警
                  </div>
                </div>
                <div className="col">
                  <div style={{ fontSize: '0.9em', color: '#7a5c6f', marginBottom: 8, fontWeight: 500 }}>周期阶段分布：</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.stats.phaseBreakdown.map(p => (
                      <div key={p.phase} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PHASE_COLORS[p.phase] }} />
                        <span style={{ fontSize: '0.85em', color: '#7a5c6f', minWidth: 60 }}>{p.phaseName}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,107,157,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              background: PHASE_COLORS[p.phase],
                              width: `${result.stats.total > 0 ? (p.count / result.stats.total * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8em', color: '#9a7b8d', minWidth: 30, textAlign: 'right' }}>{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {result.stats.keywordBreakdown.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.9em', color: '#7a5c6f', marginBottom: 8, fontWeight: 500 }}>
                    高频关键词：
                  </div>
                  <div className="keyword-cloud">
                    {result.stats.keywordBreakdown.slice(0, 15).map(kw => (
                      <span
                        key={kw.keyword}
                        className="keyword-item"
                        style={{
                          fontSize: `${12 + Math.min(kw.count, 10) * 1.2}px`,
                          fontWeight: kw.count >= 5 ? 600 : 400,
                        }}
                      >
                        #{kw.keyword} ({kw.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">📝 匹配记录列表</h2>
          {!loading && result && result.entries.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-emoji">🔍</div>
              <div className="empty-state-text">没有找到匹配的记录</div>
              <div style={{ fontSize: '0.85em', color: '#9a7b8d', marginTop: 8 }}>
                请尝试调整筛选条件
              </div>
            </div>
          )}
          {!loading && result && result.entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.entries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onGoToDate={goToDate} onGoToCalendar={goToCalendarDate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onGoToDate,
  onGoToCalendar,
}: {
  entry: DiaryEntry;
  onGoToDate: (date: string) => void;
  onGoToCalendar: (date: string) => void;
}) {
  return (
    <div
      className="timeline-event"
      style={{ cursor: 'pointer' }}
      onClick={() => onGoToDate(entry.date)}
    >
      <div style={{ minWidth: 100 }}>
        <div className="timeline-date" style={{ fontWeight: 500 }}>{entry.date}</div>
        <div style={{ fontSize: '1.8em', marginTop: 4 }}>{MOOD_EMOJI[Math.min(Math.max(entry.moodScore, 1), 10)]}</div>
        <div style={{ fontSize: '0.85em', color: '#ff6b9d', fontWeight: 500 }}>{entry.moodScore}/10分</div>
      </div>
      <div className="timeline-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {entry.cyclePhase && (
            <span className="phase-badge" style={{ background: PHASE_COLORS[entry.cyclePhase] }}>
              {PHASE_NAMES[entry.cyclePhase]}
              {entry.cycleDay ? ` · 第${entry.cycleDay}天` : ''}
            </span>
          )}
          <span className={`visibility-badge ${entry.visibility}`}>
            {entry.visibility === 'private' ? '🔒 私密' : '🌍 公开'}
          </span>
          {entry.isSpecialEvent && (
            <span className="special-event-badge">⭐ {entry.specialEventTitle || '特殊事件'}</span>
          )}
          {entry.photos.length > 0 && (
            <span style={{ fontSize: '0.8em', color: '#7a5c6f', background: 'rgba(255,107,157,0.08)', padding: '3px 8px', borderRadius: 8 }}>
              📷 {entry.photos.length}张
            </span>
          )}
        </div>

        {entry.keywords.length > 0 && (
          <div className="tags-container" style={{ margin: '8px 0' }}>
            {entry.keywords.map(k => (
              <span key={k} className="tag selected" style={{ fontSize: '0.75em', padding: '3px 10px' }}>{k}</span>
            ))}
          </div>
        )}

        {entry.stickers.length > 0 && (
          <div style={{ fontSize: '1.1em', margin: '6px 0' }}>
            {entry.stickers.map((s, i) => (
              <span key={i} style={{ marginRight: 4 }}>{STICKER_EMOJI[s]}</span>
            ))}
          </div>
        )}

        {entry.notes && (
          <div style={{
            fontSize: '0.9em',
            color: '#4a2c3d',
            lineHeight: 1.6,
            marginTop: 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {entry.notes}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8em' }}
            onClick={e => { e.stopPropagation(); onGoToDate(entry.date); }}
          >
            📝 查看/编辑记录
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8em' }}
            onClick={e => { e.stopPropagation(); onGoToCalendar(entry.date); }}
          >
            📅 在日历中查看
          </button>
        </div>
      </div>
    </div>
  );
}
