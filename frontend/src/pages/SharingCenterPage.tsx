import { useState, useEffect, useMemo } from 'react';
import { sharingApi } from '../api';
import type {
  TrustedContact,
  ShareSpaceWithStats,
  ShareSpaceDetail,
  ShareLink,
  ShareAuditLog,
  ShareFeedback,
  FieldVisibility,
  ContactType,
  DiaryEntry,
  InsightAlert,
} from '../types';
import {
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_EMOJI,
  FIELD_LABELS,
  FIELD_EMOJI,
  PHASE_NAMES,
  PHASE_COLORS,
  MOOD_EMOJI,
  INSIGHT_SEVERITY_COLORS,
  INSIGHT_RULE_LABELS,
} from '../types';
import { formatLocalDate } from '../utils/date';

const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  moodScore: true,
  keywords: true,
  notes: true,
  photos: true,
  cyclePhase: true,
  specialEvent: true,
  insights: true,
};

type SharingTab = 'spaces' | 'contacts' | 'preview';

const CONTACT_TYPE_OPTIONS: { key: ContactType; label: string }[] = [
  { key: 'trusted', label: '🤝 可信联系人' },
  { key: 'doctor', label: '🏥 医生' },
  { key: 'counselor', label: '💆 心理咨询师' },
];

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function SharingCenterPage() {
  const [activeTab, setActiveTab] = useState<SharingTab>('spaces');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [spaces, setSpaces] = useState<ShareSpaceWithStats[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ShareSpaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [spaceDetailTab, setSpaceDetailTab] = useState<'overview' | 'links' | 'audit' | 'feedbacks' | 'preview'>('overview');

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', type: 'trusted' as ContactType, email: '', phone: '', note: '' });

  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<ShareSpaceWithStats | null>(null);
  const [spaceForm, setSpaceForm] = useState({
    name: '',
    description: '',
    contactIds: [] as string[],
    startDate: '',
    endDate: '',
    fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
    desensitizeNotes: true,
  });

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ expiresAt: '', maxVisits: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [contactsData, spacesData] = await Promise.all([
        sharingApi.getContacts(),
        sharingApi.getSpaces(),
      ]);
      setContacts(contactsData);
      setSpaces(spacesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadSpaceDetail(id: string) {
    setLoading(true);
    try {
      const detail = await sharingApi.getSpaceDetail(id);
      setSelectedSpace(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreateContact() {
    setEditingContact(null);
    setContactForm({ name: '', type: 'trusted', email: '', phone: '', note: '' });
    setShowContactModal(true);
  }

  function openEditContact(c: TrustedContact) {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      type: c.type,
      email: c.email || '',
      phone: c.phone || '',
      note: c.note || '',
    });
    setShowContactModal(true);
  }

  async function handleSaveContact() {
    if (!contactForm.name.trim()) return;
    try {
      if (editingContact) {
        await sharingApi.updateContact(editingContact.id, contactForm);
      } else {
        await sharingApi.createContact(contactForm);
      }
      setShowContactModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteContact(id: string) {
    if (!confirm('确定要删除这个联系人吗？')) return;
    try {
      await sharingApi.deleteContact(id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function openCreateSpace() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    setEditingSpace(null);
    setSpaceForm({
      name: '',
      description: '',
      contactIds: [],
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(today),
      fieldVisibility: { ...DEFAULT_FIELD_VISIBILITY },
      desensitizeNotes: true,
    });
    setShowSpaceModal(true);
  }

  function openEditSpace(s: ShareSpaceWithStats) {
    setEditingSpace(s);
    setSpaceForm({
      name: s.name,
      description: s.description || '',
      contactIds: [...s.contactIds],
      startDate: s.startDate,
      endDate: s.endDate,
      fieldVisibility: { ...s.fieldVisibility },
      desensitizeNotes: s.desensitizeNotes,
    });
    setShowSpaceModal(true);
  }

  async function handleSaveSpace() {
    if (!spaceForm.name.trim() || !spaceForm.startDate || !spaceForm.endDate) return;
    try {
      if (editingSpace) {
        await sharingApi.updateSpace(editingSpace.id, spaceForm);
      } else {
        await sharingApi.createSpace(spaceForm);
      }
      setShowSpaceModal(false);
      await loadData();
      if (selectedSpace && editingSpace && selectedSpace.space.id === editingSpace.id) {
        await loadSpaceDetail(editingSpace.id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteSpace(id: string) {
    if (!confirm('确定要删除这个共享空间吗？相关的所有链接、访问记录和留言都将被删除。')) return;
    try {
      await sharingApi.deleteSpace(id);
      if (selectedSpace?.space.id === id) {
        setSelectedSpace(null);
      }
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateLink() {
    if (!selectedSpace) return;
    try {
      const data: { expiresAt?: string; maxVisits?: number } = {};
      if (linkForm.expiresAt) {
        const d = new Date(linkForm.expiresAt);
        d.setHours(23, 59, 59);
        data.expiresAt = d.toISOString();
      }
      if (linkForm.maxVisits) {
        const n = parseInt(linkForm.maxVisits, 10);
        if (!isNaN(n) && n > 0) data.maxVisits = n;
      }
      await sharingApi.createLink(selectedSpace.space.id, data);
      setShowLinkModal(false);
      setLinkForm({ expiresAt: '', maxVisits: '' });
      await loadSpaceDetail(selectedSpace.space.id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRevokeLink(linkId: string) {
    if (!selectedSpace) return;
    if (!confirm('确定要撤销这个分享链接吗？撤销后链接将无法访问。')) return;
    try {
      await sharingApi.revokeLink(linkId);
      await loadSpaceDetail(selectedSpace.space.id);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }

  function copyShareUrl(link: ShareLink) {
    const url = `${window.location.origin}/share/${link.token}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('分享链接已复制到剪贴板:\n' + url);
    }).catch(() => {
      prompt('请复制以下分享链接:', url);
    });
  }

  function toggleSpaceContact(contactId: string) {
    setSpaceForm(prev => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId],
    }));
  }

  function toggleFieldVisibility(field: keyof FieldVisibility) {
    setSpaceForm(prev => ({
      ...prev,
      fieldVisibility: { ...prev.fieldVisibility, [field]: !prev.fieldVisibility[field] },
    }));
  }

  const feedbacksByDate = useMemo(() => {
    if (!selectedSpace) return [];
    const byDate: Record<string, ShareFeedback[]> = {};
    selectedSpace.feedbacks.forEach(f => {
      const d = f.createdAt.slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(f);
    });
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));
  }, [selectedSpace]);

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
            <h2 className="card-title" style={{ marginBottom: 0 }}>💞 陪伴式支持网络与授权共享中心</h2>
            <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: 4 }}>
              创建安全的共享空间，与信任的人分享你的心情旅程
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setSelectedSpace(null); setActiveTab('contacts'); }}>
              👥 联系人管理
            </button>
            <button className="btn btn-primary" onClick={openCreateSpace}>
              + 新建共享空间
            </button>
          </div>
        </div>

        <div className="nav-bar" style={{ justifyContent: 'flex-start', marginBottom: 0, padding: 6 }}>
          {[
            { key: 'spaces', label: '📂 共享空间' },
            { key: 'contacts', label: '👥 可信联系人' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key as SharingTab); setSelectedSpace(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'spaces' && !selectedSpace && (
        <div>
          {loading && <div className="empty-state"><div className="empty-state-emoji">⏳</div><div className="empty-state-text">加载中...</div></div>}
          {!loading && spaces.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-emoji">💞</div>
                <div className="empty-state-text">还没有共享空间</div>
                <p style={{ color: '#9a7b8d', marginTop: 10, fontSize: '0.9em' }}>
                  创建你的第一个共享空间，与信任的人温柔分享
                </p>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={openCreateSpace}>
                  + 创建共享空间
                </button>
              </div>
            </div>
          )}
          {!loading && spaces.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {spaces.map(s => (
                <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => loadSpaceDetail(s.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.1em', color: '#4a2c3d', marginBottom: 4 }}>💞 {s.name}</h3>
                      {s.description && <p style={{ fontSize: '0.85em', color: '#9a7b8d', margin: 0 }}>{s.description}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span className="tag">📅 {s.startDate} ~ {s.endDate}</span>
                    <span className="tag">共 {daysBetween(s.startDate, s.endDate)} 天</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.85em', color: '#9a7b8d' }}>
                    <span>🔗 {s.links.length} 个链接</span>
                    <span>👀 {s.auditCount} 次访问</span>
                    <span>💬 {s.feedbackCount} 条留言</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em' }} onClick={() => openEditSpace(s)}>
                      ✏️ 编辑
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em', color: '#E57373' }} onClick={() => handleDeleteSpace(s.id)}>
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'spaces' && selectedSpace && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85em', marginBottom: 8 }} onClick={() => setSelectedSpace(null)}>
                  ← 返回列表
                </button>
                <h2 style={{ fontSize: '1.3em', color: '#4a2c3d', margin: 0 }}>💞 {selectedSpace.space.name}</h2>
                {selectedSpace.space.description && <p style={{ color: '#9a7b8d', marginTop: 4, marginBottom: 0 }}>{selectedSpace.space.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => openEditSpace(selectedSpace.space as unknown as ShareSpaceWithStats)}>
                  ✏️ 编辑设置
                </button>
              </div>
            </div>
            <div className="nav-bar" style={{ justifyContent: 'flex-start', margin: '16px 0 0', padding: 6 }}>
              {[
                { key: 'overview', label: '📊 概览' },
                { key: 'links', label: '🔗 分享链接' },
                { key: 'audit', label: '📋 访问记录' },
                { key: 'feedbacks', label: '💬 留言时间线' },
                { key: 'preview', label: '👁️ 分享预览' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`nav-item ${spaceDetailTab === tab.key ? 'active' : ''}`}
                  onClick={() => setSpaceDetailTab(tab.key as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {spaceDetailTab === 'overview' && (
            <div>
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                  <div className="stat-label">共享天数</div>
                  <div className="stat-value">{daysBetween(selectedSpace.space.startDate, selectedSpace.space.endDate)}</div>
                  <div className="stat-sub">{selectedSpace.space.startDate} ~ {selectedSpace.space.endDate}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">包含记录</div>
                  <div className="stat-value">{selectedSpace.entries.length}</div>
                  <div className="stat-sub">条心情记录</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">分享链接</div>
                  <div className="stat-value">{selectedSpace.links.length}</div>
                  <div className="stat-sub">{selectedSpace.links.filter(l => l.isActive).length} 个有效</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">总访问量</div>
                  <div className="stat-value">{selectedSpace.audits.length}</div>
                  <div className="stat-sub">{selectedSpace.feedbacks.length} 条留言</div>
                </div>
              </div>
              <div className="row">
                <div className="col">
                  <div className="card">
                    <h3 className="card-title">👥 共享联系人</h3>
                    {selectedSpace.contacts.length === 0 ? (
                      <p style={{ color: '#9a7b8d' }}>还没有添加联系人</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedSpace.contacts.map(c => (
                          <div key={c.id} className="phase-card" style={{ borderLeftColor: '#c44eff', padding: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '1.5em' }}>{CONTACT_TYPE_EMOJI[c.type]}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: '#4a2c3d' }}>{c.name}</div>
                                <div style={{ fontSize: '0.8em', color: '#9a7b8d' }}>{CONTACT_TYPE_LABELS[c.type]}</div>
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
                    <h3 className="card-title">🔍 字段可见性</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                      {(Object.keys(selectedSpace.space.fieldVisibility) as (keyof FieldVisibility)[]).map(k => (
                        <div key={k} style={{
                          padding: 10,
                          borderRadius: 10,
                          background: selectedSpace.space.fieldVisibility[k]
                            ? 'rgba(255,107,157,0.1)'
                            : 'rgba(154,123,141,0.08)',
                          opacity: selectedSpace.space.fieldVisibility[k] ? 1 : 0.5,
                        }}>
                          <div style={{ fontSize: '1.2em' }}>{FIELD_EMOJI[k]}</div>
                          <div style={{ fontSize: '0.85em', fontWeight: 500, color: '#4a2c3d' }}>
                            {FIELD_LABELS[k]}
                          </div>
                          <div style={{ fontSize: '0.75em', color: selectedSpace.space.fieldVisibility[k] ? '#ff6b9d' : '#9a7b8d' }}>
                            {selectedSpace.space.fieldVisibility[k] ? '✓ 可见' : '✗ 隐藏'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, fontSize: '0.85em', color: '#9a7b8d' }}>
                      日记脱敏：{selectedSpace.space.desensitizeNotes ? '🔒 已启用（手机号/邮箱/地址等将被遮蔽）' : '🔓 未启用'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {spaceDetailTab === 'links' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h3 className="card-title" style={{ marginBottom: 0 }}>🔗 分享链接</h3>
                <button className="btn btn-primary" onClick={() => { setLinkForm({ expiresAt: '', maxVisits: '' }); setShowLinkModal(true); }}>
                  + 生成新链接
                </button>
              </div>
              {selectedSpace.links.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">🔗</div>
                  <div className="empty-state-text">还没有生成分享链接</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedSpace.links.map(link => {
                    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                    const isMaxed = link.maxVisits !== null && link.visitCount >= link.maxVisits;
                    const status = !link.isActive ? 'revoked' : isExpired ? 'expired' : isMaxed ? 'maxed' : 'active';
                    const statusLabel = status === 'active' ? '✅ 有效' : status === 'revoked' ? '🚫 已撤销' : status === 'expired' ? '⏰ 已过期' : '👥 已满';
                    const statusColor = status === 'active' ? '#81C784' : '#E57373';
                    return (
                      <div key={link.id} className="phase-card" style={{ borderLeftColor: status === 'active' ? '#81C784' : '#E57373', padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: '1.1em' }}>🔗</span>
                              <code style={{
                                fontSize: '0.8em',
                                background: 'rgba(196,78,255,0.08)',
                                padding: '4px 8px',
                                borderRadius: 6,
                                wordBreak: 'break-all',
                                color: '#c44eff',
                              }}>
                                {link.token}
                              </code>
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.85em', color: '#9a7b8d', marginTop: 8 }}>
                              <span>创建于 {formatDateTime(link.createdAt)}</span>
                              <span>👀 访问 {link.visitCount}{link.maxVisits ? ` / ${link.maxVisits}` : ''} 次</span>
                              {link.expiresAt && <span>⏰ 到期 {formatDateTime(link.expiresAt)}</span>}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <span style={{ color: statusColor, fontSize: '0.85em', fontWeight: 500 }}>{statusLabel}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em' }} onClick={() => copyShareUrl(link)}>
                              📋 复制链接
                            </button>
                            {status === 'active' && (
                              <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em', color: '#E57373' }} onClick={() => handleRevokeLink(link.id)}>
                                🚫 撤销
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {spaceDetailTab === 'audit' && (
            <div className="card">
              <h3 className="card-title">📋 访问审计记录</h3>
              {selectedSpace.audits.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">📋</div>
                  <div className="empty-state-text">暂无访问记录</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedSpace.audits.map(log => (
                    <div key={log.id} className="timeline-event" style={{ borderLeftColor: log.action === 'view' ? '#64B5F6' : '#81C784' }}>
                      <div style={{ minWidth: 140 }}>
                        <div className="timeline-date">{formatDateTime(log.timestamp)}</div>
                        <span className="phase-badge" style={{ background: log.action === 'view' ? '#64B5F6' : '#81C784', fontSize: '0.75em', marginTop: 4, display: 'inline-block' }}>
                          {log.action === 'view' ? '👀 查看' : '💬 留言'}
                        </span>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">
                          {log.visitorName ? `${log.visitorName}` : '匿名访客'}
                        </div>
                        {log.ip && <div style={{ fontSize: '0.8em', color: '#9a7b8d' }}>IP: {log.ip}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {spaceDetailTab === 'feedbacks' && (
            <div className="card">
              <h3 className="card-title">💬 温柔留言时间线</h3>
              {selectedSpace.feedbacks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-emoji">💬</div>
                  <div className="empty-state-text">还没有收到留言</div>
                  <p style={{ color: '#9a7b8d', marginTop: 10, fontSize: '0.9em' }}>
                    分享链接后，联系人可以留下温暖的鼓励和支持
                  </p>
                </div>
              ) : (
                feedbacksByDate.map(([date, feedbacks]) => (
                  <div key={date} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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
                      <span style={{ color: '#9a7b8d', fontSize: '0.85em' }}>{feedbacks.length} 条留言</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 10 }}>
                      {feedbacks.map(fb => (
                        <div key={fb.id} className="timeline-event" style={{ borderLeftColor: '#81C784' }}>
                          <div style={{ minWidth: 100 }}>
                            <div style={{ fontSize: '0.8em', color: '#9a7b8d' }}>{formatDateTime(fb.createdAt)}</div>
                          </div>
                          <div className="timeline-content">
                            <div style={{
                              background: 'linear-gradient(135deg, rgba(129,199,132,0.15) 0%, rgba(100,181,246,0.15) 100%)',
                              borderRadius: 14,
                              padding: 14,
                            }}>
                              <div style={{ fontWeight: 600, color: '#4a2c3d', marginBottom: 6 }}>
                                💝 {fb.visitorName}
                              </div>
                              <p style={{ lineHeight: 1.7, color: '#4a2c3d', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {fb.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {spaceDetailTab === 'preview' && (
            <div>
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="card-title">👁️ 分享预览</h3>
                <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginTop: -10, marginBottom: 20 }}>
                  这是联系人通过分享链接看到的内容
                </p>
                <div style={{
                  padding: 16,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(255,107,157,0.05) 0%, rgba(196,78,255,0.05) 100%)',
                  border: '2px dashed rgba(255,107,157,0.2)',
                }}>
                  <h2 style={{ fontSize: '1.2em', color: '#4a2c3d', margin: 0 }}>💞 {selectedSpace.space.name}</h2>
                  {selectedSpace.space.description && <p style={{ color: '#9a7b8d', marginTop: 6, marginBottom: 0 }}>{selectedSpace.space.description}</p>}
                  <p style={{ color: '#9a7b8d', fontSize: '0.85em', marginTop: 10, marginBottom: 0 }}>
                    📅 共享时间：{selectedSpace.space.startDate} ~ {selectedSpace.space.endDate}
                  </p>
                </div>
              </div>

              {selectedSpace.space.fieldVisibility.insights && selectedSpace.alerts.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 className="card-title">🔮 洞察预警</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedSpace.alerts.slice(0, 5).map(alert => (
                      <div key={alert.id} className="timeline-event" style={{ borderLeftColor: INSIGHT_SEVERITY_COLORS[alert.severity] }}>
                        <div style={{ minWidth: 100 }}>
                          <div className="timeline-date">{alert.date}</div>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-title">{alert.title}</div>
                          <p style={{ fontSize: '0.85em', color: '#9a7b8d', margin: '4px 0 0' }}>
                            {INSIGHT_RULE_LABELS[alert.type]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="card-title">📝 心情记录</h3>
                {selectedSpace.entries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-emoji">📝</div>
                    <div className="empty-state-text">此范围内没有记录</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedSpace.entries.map((entry, idx) => {
                      const fullEntry = entry as Partial<DiaryEntry> & { date: string };
                      const privateNote = selectedSpace.privateNotes[selectedSpace.entries[idx] && (selectedSpace.entries[idx] as any).id ? (selectedSpace.entries[idx] as any).id : ''];
                      return (
                        <div key={idx} className="entry-preview">
                          <div className="entry-preview-date">📅 {fullEntry.date}</div>
                          {fullEntry.cyclePhase && (
                            <span className="phase-badge" style={{ background: PHASE_COLORS[fullEntry.cyclePhase], marginBottom: 8 }}>
                              {PHASE_NAMES[fullEntry.cyclePhase]}
                            </span>
                          )}
                          {fullEntry.moodScore !== undefined && (
                            <div className="entry-preview-mood">{MOOD_EMOJI[Math.min(Math.max(fullEntry.moodScore, 1), 10)]} {fullEntry.moodScore}/10</div>
                          )}
                          {fullEntry.keywords && fullEntry.keywords.length > 0 && (
                            <div className="tags-container" style={{ marginBottom: 8 }}>
                              {fullEntry.keywords.map((k, i) => (
                                <span key={i} className="tag">#{k}</span>
                              ))}
                            </div>
                          )}
                          {fullEntry.notes && (
                            <div className="entry-preview-notes">{fullEntry.notes}</div>
                          )}
                          {fullEntry.photos && fullEntry.photos.length > 0 && (
                            <div className="entry-preview-photos">
                              {fullEntry.photos.map((p, i) => (
                                <img key={i} src={p.startsWith('http') ? p : `/${p}`} alt="" />
                              ))}
                            </div>
                          )}
                          {fullEntry.isSpecialEvent && fullEntry.specialEventTitle && (
                            <div style={{ marginTop: 10 }}>
                              <span className="special-event-badge">🎉 {fullEntry.specialEventTitle}</span>
                            </div>
                          )}
                          {privateNote && (
                            <div style={{
                              marginTop: 12,
                              padding: 10,
                              borderRadius: 10,
                              background: 'rgba(255,183,77,0.12)',
                              border: '1px dashed rgba(255,183,77,0.4)',
                              fontSize: '0.85em',
                              color: '#f57c00',
                            }}>
                              🔒 私密备注（仅自己可见）：{privateNote}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>👥 可信联系人</h3>
              <button className="btn btn-primary" onClick={openCreateContact}>+ 添加联系人</button>
            </div>
            {contacts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-emoji">👥</div>
                <div className="empty-state-text">还没有添加联系人</div>
                <p style={{ color: '#9a7b8d', marginTop: 10, fontSize: '0.9em' }}>
                  添加家人、朋友、医生或咨询师，分享你的心情旅程
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {contacts.map(c => (
                  <div key={c.id} className="phase-card" style={{ borderLeftColor: '#c44eff', padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ff6b9d 0%, #c44eff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5em',
                      }}>
                        {CONTACT_TYPE_EMOJI[c.type]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1em', color: '#4a2c3d' }}>{c.name}</div>
                        <div style={{ fontSize: '0.85em', color: '#9a7b8d' }}>{CONTACT_TYPE_LABELS[c.type]}</div>
                      </div>
                    </div>
                    {c.email && <div style={{ fontSize: '0.85em', color: '#7a5c6f', marginBottom: 4 }}>📧 {c.email}</div>}
                    {c.phone && <div style={{ fontSize: '0.85em', color: '#7a5c6f', marginBottom: 4 }}>📱 {c.phone}</div>}
                    {c.note && <div style={{ fontSize: '0.85em', color: '#9a7b8d', marginTop: 6 }}>📝 {c.note}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em' }} onClick={() => openEditContact(c)}>
                        ✏️ 编辑
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85em', color: '#E57373' }} onClick={() => handleDeleteContact(c.id)}>
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showContactModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(74,44,61,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setShowContactModal(false)}>
          <div className="card" style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3em', marginBottom: 20 }}>{editingContact ? '✏️ 编辑联系人' : '👥 添加联系人'}</h2>
            <div className="form-group">
              <label>姓名 *</label>
              <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="联系人姓名" />
            </div>
            <div className="form-group">
              <label>类型 *</label>
              <select value={contactForm.type} onChange={e => setContactForm(p => ({ ...p, type: e.target.value as ContactType }))}>
                {CONTACT_TYPE_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input type="text" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="可选" />
            </div>
            <div className="form-group">
              <label>电话</label>
              <input type="text" value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="可选" />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea value={contactForm.note} onChange={e => setContactForm(p => ({ ...p, note: e.target.value }))} placeholder="添加一些备注信息" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowContactModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveContact}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showSpaceModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(74,44,61,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setShowSpaceModal(false)}>
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3em', marginBottom: 20 }}>{editingSpace ? '✏️ 编辑共享空间' : '💞 新建共享空间'}</h2>

            <div className="form-group">
              <label>空间名称 *</label>
              <input type="text" value={spaceForm.name} onChange={e => setSpaceForm(p => ({ ...p, name: e.target.value }))} placeholder="例如：给妈妈的心情分享" />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea value={spaceForm.description} onChange={e => setSpaceForm(p => ({ ...p, description: e.target.value }))} placeholder="简单描述这个共享空间的用途" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>开始日期 *</label>
                <input type="date" value={spaceForm.startDate} onChange={e => setSpaceForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>结束日期 *</label>
                <input type="date" value={spaceForm.endDate} onChange={e => setSpaceForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label>共享联系人</label>
              {contacts.length === 0 ? (
                <p style={{ color: '#9a7b8d', fontSize: '0.9em' }}>还没有联系人，请先在「联系人管理」中添加</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {contacts.map(c => (
                    <button
                      key={c.id}
                      className={`tag ${spaceForm.contactIds.includes(c.id) ? 'selected' : ''}`}
                      onClick={() => toggleSpaceContact(c.id)}
                      type="button"
                    >
                      {CONTACT_TYPE_EMOJI[c.type]} {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>字段可见性</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {(Object.keys(DEFAULT_FIELD_VISIBILITY) as (keyof FieldVisibility)[]).map(k => (
                  <label key={k} className="checkbox-row" style={{
                    padding: 10,
                    borderRadius: 10,
                    background: spaceForm.fieldVisibility[k] ? 'rgba(255,107,157,0.08)' : 'rgba(154,123,141,0.05)',
                  }}>
                    <input
                      type="checkbox"
                      checked={spaceForm.fieldVisibility[k]}
                      onChange={() => toggleFieldVisibility(k)}
                    />
                    <span>
                      <span style={{ fontSize: '1.1em', marginRight: 4 }}>{FIELD_EMOJI[k]}</span>
                      {FIELD_LABELS[k]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={spaceForm.desensitizeNotes}
                  onChange={e => setSpaceForm(p => ({ ...p, desensitizeNotes: e.target.checked }))}
                />
                <span>🔒 启用日记内容脱敏（自动遮蔽手机号、邮箱、地址等隐私信息）</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowSpaceModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveSpace}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(74,44,61,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setShowLinkModal(false)}>
          <div className="card" style={{ maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3em', marginBottom: 20 }}>🔗 生成分享链接</h2>
            <p style={{ color: '#9a7b8d', fontSize: '0.9em', marginBottom: 20 }}>
              留空表示不设置限制
            </p>
            <div className="form-group">
              <label>有效期至</label>
              <input type="date" value={linkForm.expiresAt} onChange={e => setLinkForm(p => ({ ...p, expiresAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>最大访问次数</label>
              <input type="number" value={linkForm.maxVisits} onChange={e => setLinkForm(p => ({ ...p, maxVisits: e.target.value }))} placeholder="不限制请留空" min={1} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateLink}>生成链接</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
