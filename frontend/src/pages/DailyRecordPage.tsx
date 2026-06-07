import { useState, useEffect, useRef } from 'react';
import { entriesApi, uploadApi, cycleApi } from '../api';
import type { DiaryEntry, StickerType, Visibility, CycleInfo } from '../types';
import { MOOD_EMOJI, STICKER_EMOJI, PHASE_NAMES, PHASE_COLORS } from '../types';
import { todayStr } from '../utils/date';

const PRESET_KEYWORDS = [
  '开心', '平静', '焦虑', '疲惫', '充实', '失落',
  '兴奋', '感动', '烦躁', '放松', '孤独', '幸福',
  '压力', '自信', '迷茫', '温暖', '感恩', '期待',
  '生气', '难过', '惬意', '惊喜', 'emo', '元气'
];

const ALL_STICKERS: StickerType[] = [
  'heart', 'star', 'flower', 'sun', 'moon',
  'cloud', 'rainbow', 'music', 'coffee', 'book',
  'sparkle', 'leaf', 'gift', 'cat', 'ribbon'
];

export default function DailyRecordPage() {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [moodScore, setMoodScore] = useState<number>(6);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stickers, setStickers] = useState<StickerType[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [specialEventTitle, setSpecialEventTitle] = useState('');
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [savedMsg, setSavedMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [date]);

  async function loadData() {
    try {
      const [entry, cycle] = await Promise.all([
        entriesApi.getByDate(date),
        cycleApi.get(),
      ]);
      setCycleInfo(cycle);
      if (entry) {
        setExistingEntry(entry);
        setMoodScore(entry.moodScore);
        setKeywords(entry.keywords);
        setNotes(entry.notes);
        setPhotos(entry.photos);
        setStickers(entry.stickers);
        setVisibility(entry.visibility);
        setIsSpecialEvent(entry.isSpecialEvent);
        setSpecialEventTitle(entry.specialEventTitle || '');
      } else {
        setExistingEntry(null);
        setMoodScore(6);
        setKeywords([]);
        setNotes('');
        setPhotos([]);
        setStickers([]);
        setVisibility('private');
        setIsSpecialEvent(false);
        setSpecialEventTitle('');
      }
    } catch (e) {
      console.error('Load data error:', e);
    }
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadApi.uploadPhoto(files[i]);
        setPhotos(prev => [...prev, result.url]);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(url: string) {
    setPhotos(prev => prev.filter(p => p !== url));
  }

  async function handleSave() {
    try {
      const payload: Partial<DiaryEntry> = {
        date,
        moodScore,
        keywords,
        notes,
        photos,
        stickers,
        visibility,
        isSpecialEvent,
        specialEventTitle: isSpecialEvent ? specialEventTitle : undefined,
      };
      if (existingEntry) {
        await entriesApi.update(existingEntry.id, payload);
      } else {
        await entriesApi.create(payload);
      }
      setSavedMsg('✨ 记录已保存');
      setTimeout(() => setSavedMsg(''), 2500);
      loadData();
    } catch (e) {
      console.error('Save error:', e);
      setSavedMsg('❌ 保存失败，请重试');
      setTimeout(() => setSavedMsg(''), 2500);
    }
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h2 className="card-title">📝 今日记录</h2>

          <div className="form-group">
            <label>日期</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>心情评分</label>
            <div className="mood-slider">
              <div className="mood-slider-row">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    className={`mood-emoji-btn ${moodScore === score ? 'active' : ''}`}
                    onClick={() => setMoodScore(score)}
                    title={`${score}分`}
                  >
                    {MOOD_EMOJI[score]}
                  </button>
                ))}
              </div>
              <div className="mood-scale-display">
                {moodScore} 分 {MOOD_EMOJI[moodScore]}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>今日关键词（可多选）</label>
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
            <label>今日随笔</label>
            <textarea
              placeholder="写下今天的故事、感受或思考..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>贴纸</label>
            <div className="stickers-grid">
              {ALL_STICKERS.map(s => (
                <button
                  key={s}
                  className={`sticker-btn ${stickers.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleSticker(s)}
                  title={s}
                >
                  {STICKER_EMOJI[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>照片</label>
            {photos.length > 0 && (
              <div className="photos-preview">
                {photos.map((p, i) => (
                  <div key={i} className="photo-item">
                    <img src={p} alt="" />
                    <button className="photo-remove" onClick={() => removePhoto(p)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              📷 上传照片
            </button>
          </div>

          <div className="form-group">
            <label>可见性</label>
            <div className="visibility-toggle">
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
                checked={isSpecialEvent}
                onChange={e => setIsSpecialEvent(e.target.checked)}
              />
              <span>标记为特殊事件</span>
            </label>
            {isSpecialEvent && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="事件名称（如：生日、纪念日...）"
                  value={specialEventTitle}
                  onChange={e => setSpecialEventTitle(e.target.value)}
                />
              </div>
            )}
          </div>

          {savedMsg && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(129,199,132,0.15)', color: '#388e3c', marginBottom: 16, textAlign: 'center' }}>
              {savedMsg}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05em' }} onClick={handleSave}>
            💾 保存今日记录
          </button>
        </div>
      </div>

      <div className="col">
        <div className="card">
          <h2 className="card-title">✨ 记录预览</h2>
          <div className="entry-preview">
            <div className="entry-header-info">
              <span className="entry-preview-date">📅 {date}</span>
              {existingEntry?.cyclePhase && cycleInfo && (
                <span
                  className="phase-badge"
                  style={{ background: PHASE_COLORS[existingEntry.cyclePhase] }}
                >
                  {PHASE_NAMES[existingEntry.cyclePhase]}
                  {existingEntry.cycleDay ? ` · 第${existingEntry.cycleDay}天` : ''}
                </span>
              )}
              <span className={`visibility-badge ${visibility}`}>
                {visibility === 'private' ? '🔒 私密' : '🌍 公开'}
              </span>
              {isSpecialEvent && (
                <span className="special-event-badge">⭐ {specialEventTitle || '特殊事件'}</span>
              )}
            </div>
            <div className="entry-preview-mood">
              {MOOD_EMOJI[moodScore]} <span style={{ fontSize: '0.6em', color: '#9a7b8d', marginLeft: 8 }}>{moodScore}/10</span>
            </div>
            {keywords.length > 0 && (
              <div className="tags-container">
                {keywords.map(kw => (
                  <span key={kw} className="tag selected">{kw}</span>
                ))}
              </div>
            )}
            {stickers.length > 0 && (
              <div className="entry-preview-stickers">
                {stickers.map(s => (
                  <span key={s}>{STICKER_EMOJI[s]}</span>
                ))}
              </div>
            )}
            {notes && (
              <p className="entry-preview-notes">{notes}</p>
            )}
            {photos.length > 0 && (
              <div className="entry-preview-photos">
                {photos.map((p, i) => (
                  <img key={i} src={p} alt="" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">🔄 周期设置</h2>
          <div className="form-group">
            <label>上次月经开始日期</label>
            <input
              type="date"
              value={cycleInfo?.lastPeriodDate || ''}
              onChange={e => cycleApi.update({ lastPeriodDate: e.target.value }).then(setCycleInfo)}
            />
          </div>
          <div className="row">
            <div className="col">
              <div className="form-group">
                <label>周期长度（天）</label>
                <input
                  type="number"
                  min="21"
                  max="40"
                  value={cycleInfo?.cycleLength || 28}
                  onChange={e => cycleApi.update({ cycleLength: Number(e.target.value) }).then(setCycleInfo)}
                />
              </div>
            </div>
            <div className="col">
              <div className="form-group">
                <label>经期长度（天）</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={cycleInfo?.periodLength || 5}
                  onChange={e => cycleApi.update({ periodLength: Number(e.target.value) }).then(setCycleInfo)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
