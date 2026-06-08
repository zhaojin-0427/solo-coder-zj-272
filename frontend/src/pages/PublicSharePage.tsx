import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sharingApi } from '../api';
import type { PublicShareData, DiaryEntry, InsightAlert } from '../types';
import {
  PHASE_NAMES,
  PHASE_COLORS,
  MOOD_EMOJI,
  INSIGHT_SEVERITY_COLORS,
  INSIGHT_RULE_LABELS,
} from '../types';

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    if (token) loadData(token);
  }, [token]);

  async function loadData(t: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await sharingApi.getPublicShare(t);
      setData(result);
    } catch (e: any) {
      const msg = e?.response?.data?.error || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitFeedback() {
    if (!token || !feedbackName.trim() || !feedbackMsg.trim()) return;
    setSubmitting(true);
    try {
      await sharingApi.submitFeedback(token, feedbackName.trim(), feedbackMsg.trim());
      setFeedbackSuccess(true);
      setFeedbackMsg('');
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (e) {
      setError('留言提交失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 40 }}>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">⏳</div>
            <div className="empty-state-text">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 40 }}>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-emoji">😔</div>
            <div className="empty-state-text">无法访问此分享</div>
            <p style={{ color: '#9a7b8d', marginTop: 10, fontSize: '0.9em' }}>{error}</p>
            <p style={{ color: '#9a7b8d', marginTop: 6, fontSize: '0.85em' }}>
              可能是链接已过期、被撤销或访问次数已满
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{
          padding: 20,
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(255,107,157,0.08) 0%, rgba(196,78,255,0.08) 100%)',
          border: '2px solid rgba(255,107,157,0.15)',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '1.6em',
            background: 'linear-gradient(135deg, #ff6b9d 0%, #c44eff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8,
          }}>
            💞 {data.space.name}
          </h1>
          {data.space.description && (
            <p style={{ color: '#7a5c6f', marginTop: 6, marginBottom: 0 }}>{data.space.description}</p>
          )}
          <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: 12, marginBottom: 0 }}>
            📅 共享时间：{data.space.startDate} ~ {data.space.endDate}
          </p>
        </div>
        <p style={{ color: '#9a7b8d', fontSize: '0.85em', textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
          这是 TA 精心准备的心情分享，愿这份温柔的记录能让你更了解 TA 💗
        </p>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="card-title">🔮 情绪洞察与预警</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.alerts.map((alert: InsightAlert) => (
              <div key={alert.id} className="timeline-event" style={{ borderLeftColor: INSIGHT_SEVERITY_COLORS[alert.severity] }}>
                <div style={{ minWidth: 100 }}>
                  <div className="timeline-date">{alert.date}</div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{alert.title}</div>
                  <p style={{ fontSize: '0.85em', color: '#9a7b8d', margin: '4px 0 0' }}>
                    {INSIGHT_RULE_LABELS[alert.type]}
                  </p>
                  <p style={{ fontSize: '0.9em', color: '#4a2c3d', margin: '6px 0 0' }}>
                    {alert.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">📝 心情记录</h2>
        {data.entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-emoji">🌸</div>
            <div className="empty-state-text">此范围内暂无记录</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.entries.map((entry, idx) => {
              const e = entry as Partial<DiaryEntry> & { date: string };
              return (
                <div key={idx} className="entry-preview">
                  <div className="entry-preview-date">📅 {e.date}</div>
                  {e.cyclePhase && (
                    <span className="phase-badge" style={{ background: PHASE_COLORS[e.cyclePhase], marginBottom: 8 }}>
                      {PHASE_NAMES[e.cyclePhase]}
                    </span>
                  )}
                  {e.moodScore !== undefined && (
                    <div className="entry-preview-mood">
                      {MOOD_EMOJI[Math.min(Math.max(e.moodScore, 1), 10)]} {e.moodScore}/10
                    </div>
                  )}
                  {e.keywords && e.keywords.length > 0 && (
                    <div className="tags-container" style={{ marginBottom: 8 }}>
                      {e.keywords.map((k, i) => (
                        <span key={i} className="tag">#{k}</span>
                      ))}
                    </div>
                  )}
                  {e.notes && (
                    <div className="entry-preview-notes">{e.notes}</div>
                  )}
                  {e.photos && e.photos.length > 0 && (
                    <div className="entry-preview-photos">
                      {e.photos.map((p, i) => (
                        <img key={i} src={p.startsWith('http') ? p : `/${p}`} alt="" />
                      ))}
                    </div>
                  )}
                  {e.isSpecialEvent && e.specialEventTitle && (
                    <div style={{ marginTop: 10 }}>
                      <span className="special-event-badge">🎉 {e.specialEventTitle}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">💝 留下温柔的话</h2>
        <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: -10, marginBottom: 20 }}>
          你的鼓励和支持对 TA 来说非常重要 🌸
        </p>
        {feedbackSuccess ? (
          <div style={{
            padding: 20,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(129,199,132,0.15) 0%, rgba(100,181,246,0.15) 100%)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2em', marginBottom: 8 }}>💗</div>
            <div style={{ color: '#4a2c3d', fontWeight: 500 }}>留言已送达，TA 会收到你的心意</div>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>你的称呼 *</label>
              <input
                type="text"
                value={feedbackName}
                onChange={e => setFeedbackName(e.target.value)}
                placeholder="让 TA 知道是谁留下的话"
              />
            </div>
            <div className="form-group">
              <label>想对 TA 说的话 *</label>
              <textarea
                value={feedbackMsg}
                onChange={e => setFeedbackMsg(e.target.value)}
                placeholder="写下你的鼓励、关心或想说的话..."
                rows={5}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmitFeedback}
                disabled={submitting || !feedbackName.trim() || !feedbackMsg.trim()}
              >
                {submitting ? '发送中...' : '💝 发送留言'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
