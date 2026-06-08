import axios from 'axios';
import type {
  DiaryEntry,
  CycleInfo,
  PhaseMoodStats,
  YearlyReview,
  MoodTrendPoint,
  InsightRuleConfig,
  InsightAlert,
  InsightSummary,
  TrustedContact,
  ShareSpace,
  ShareSpaceWithStats,
  ShareLink,
  ShareAuditLog,
  ShareFeedback,
  EntryPrivateNote,
  ShareSpaceDetail,
  PublicShareData,
  HealingPlan,
  HealingPlanWithStats,
  HealingAction,
  HealingCompletionRecord,
  HealingReviewNote,
  HealingSuggestion,
  HealingProgressStats,
} from './types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const entriesApi = {
  getAll: (params?: { start?: string; end?: string }) =>
    api.get<DiaryEntry[]>('/entries', { params }).then(r => r.data),
  getByDate: (date: string) =>
    api.get<DiaryEntry | null>(`/entries/date/${date}`).then(r => r.data),
  getById: (id: string) =>
    api.get<DiaryEntry>(`/entries/${id}`).then(r => r.data),
  create: (data: Partial<DiaryEntry>) =>
    api.post<DiaryEntry>('/entries', data).then(r => r.data),
  update: (id: string, data: Partial<DiaryEntry>) =>
    api.put<DiaryEntry>(`/entries/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/entries/${id}`).then(r => r.data),
};

export const statsApi = {
  getPhaseStats: (params?: { start?: string; end?: string }) =>
    api.get<PhaseMoodStats[]>('/stats/phase', { params }).then(r => r.data),
  getTrend: (params?: { start?: string; end?: string }) =>
    api.get<MoodTrendPoint[]>('/stats/trend', { params }).then(r => r.data),
  getKeywords: (params?: { start?: string; end?: string }) =>
    api.get<{ keyword: string; count: number }[]>('/stats/keywords', { params }).then(r => r.data),
  getYearlyReview: (year: number) =>
    api.get<YearlyReview>(`/stats/yearly/${year}`).then(r => r.data),
};

export const cycleApi = {
  get: () => api.get<CycleInfo>('/cycle').then(r => r.data),
  update: (data: Partial<CycleInfo>) =>
    api.put<CycleInfo>('/cycle', data).then(r => r.data),
};

export const uploadApi = {
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<{ url: string; filename: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const insightsApi = {
  getRules: () =>
    api.get<InsightRuleConfig[]>('/insights/rules').then(r => r.data),
  updateRules: (rules: InsightRuleConfig[]) =>
    api.put<InsightRuleConfig[]>('/insights/rules', rules).then(r => r.data),
  updateRule: (type: string, updates: Partial<InsightRuleConfig>) =>
    api.put<InsightRuleConfig>(`/insights/rules/${type}`, updates).then(r => r.data),
  getAlerts: (params?: {
    start?: string;
    end?: string;
    type?: string;
    severity?: string;
    limit?: number;
  }) =>
    api.get<InsightAlert[]>('/insights/alerts', { params }).then(r => r.data),
  getAlertDates: () =>
    api.get<string[]>('/insights/alerts/dates').then(r => r.data),
  refreshAlerts: () =>
    api.post<{ refreshed: number; alerts: InsightAlert[] }>('/insights/alerts/refresh').then(r => r.data),
  getSummary: (params?: { start?: string; end?: string }) =>
    api.get<InsightSummary>('/insights/summary', { params }).then(r => r.data),
  analyze: () =>
    api.post<{ alerts: InsightAlert[]; summary: InsightSummary }>('/insights/analyze').then(r => r.data),
};

export const sharingApi = {
  getContacts: () =>
    api.get<TrustedContact[]>('/sharing/contacts').then(r => r.data),
  createContact: (data: Partial<TrustedContact>) =>
    api.post<TrustedContact>('/sharing/contacts', data).then(r => r.data),
  updateContact: (id: string, data: Partial<TrustedContact>) =>
    api.put<TrustedContact>(`/sharing/contacts/${id}`, data).then(r => r.data),
  deleteContact: (id: string) =>
    api.delete(`/sharing/contacts/${id}`).then(r => r.data),

  getSpaces: () =>
    api.get<ShareSpaceWithStats[]>('/sharing/spaces').then(r => r.data),
  getSpaceDetail: (id: string) =>
    api.get<ShareSpaceDetail>(`/sharing/spaces/${id}`).then(r => r.data),
  createSpace: (data: Partial<ShareSpace>) =>
    api.post<ShareSpace>('/sharing/spaces', data).then(r => r.data),
  updateSpace: (id: string, data: Partial<ShareSpace>) =>
    api.put<ShareSpace>(`/sharing/spaces/${id}`, data).then(r => r.data),
  deleteSpace: (id: string) =>
    api.delete(`/sharing/spaces/${id}`).then(r => r.data),

  createLink: (spaceId: string, data?: { expiresAt?: string; maxVisits?: number }) =>
    api.post<ShareLink>(`/sharing/spaces/${spaceId}/links`, data || {}).then(r => r.data),
  revokeLink: (id: string) =>
    api.post<ShareLink>(`/sharing/links/${id}/revoke`).then(r => r.data),

  getAuditLogs: (spaceId: string) =>
    api.get<ShareAuditLog[]>(`/sharing/spaces/${spaceId}/audit`).then(r => r.data),
  getFeedbacks: (spaceId: string) =>
    api.get<ShareFeedback[]>(`/sharing/spaces/${spaceId}/feedbacks`).then(r => r.data),

  getPrivateNote: (entryId: string) =>
    api.get<EntryPrivateNote>(`/sharing/notes/${entryId}`).then(r => r.data),
  savePrivateNote: (entryId: string, note: string) =>
    api.put<EntryPrivateNote>(`/sharing/notes/${entryId}`, { note }).then(r => r.data),
  deletePrivateNote: (entryId: string) =>
    api.delete(`/sharing/notes/${entryId}`).then(r => r.data),

  getPublicShare: (token: string) =>
    api.get<PublicShareData>(`/sharing/public/${token}`).then(r => r.data),
  submitFeedback: (token: string, visitorName: string, message: string) =>
    api.post<ShareFeedback>(`/sharing/public/${token}/feedback`, { visitorName, message }).then(r => r.data),
};

export const healingApi = {
  getPlans: () =>
    api.get<HealingPlanWithStats[]>('/healing/plans').then(r => r.data),
  getActivePlans: () =>
    api.get<HealingPlanWithStats[]>('/healing/plans/active').then(r => r.data),
  getPlanDetail: (id: string) =>
    api.get<{ plan: HealingPlan; actions: HealingAction[]; stats: HealingProgressStats }>(`/healing/plans/${id}`).then(r => r.data),
  generatePlan: (windowDays: 30 | 90 = 30) =>
    api.post<{ plan: HealingPlan; actions: HealingAction[] }>('/healing/plans/generate', { windowDays }).then(r => r.data),
  createPlan: (data: Partial<HealingPlan>) =>
    api.post<HealingPlan>('/healing/plans', data).then(r => r.data),
  updatePlan: (id: string, data: Partial<HealingPlan>) =>
    api.put<HealingPlan>(`/healing/plans/${id}`, data).then(r => r.data),
  deletePlan: (id: string) =>
    api.delete(`/healing/plans/${id}`).then(r => r.data),

  getPlanActions: (planId: string) =>
    api.get<HealingAction[]>(`/healing/plans/${planId}/actions`).then(r => r.data),
  createAction: (planId: string, data: Partial<HealingAction>) =>
    api.post<HealingAction>(`/healing/plans/${planId}/actions`, data).then(r => r.data),
  getActions: (params?: { date?: string; status?: string; category?: string }) =>
    api.get<HealingAction[]>('/healing/actions', { params }).then(r => r.data),
  getTodayActions: (date?: string) =>
    api.get<HealingAction[]>('/healing/actions/today', { params: date ? { date } : {} }).then(r => r.data),
  updateAction: (id: string, data: Partial<HealingAction>) =>
    api.put<HealingAction>(`/healing/actions/${id}`, data).then(r => r.data),
  deleteAction: (id: string) =>
    api.delete(`/healing/actions/${id}`).then(r => r.data),
  completeAction: (id: string, data?: { date?: string; completed?: boolean; moodBefore?: number; moodAfter?: number; durationMinutes?: number; notes?: string }) =>
    api.post<{ record: HealingCompletionRecord; action: HealingAction }>(`/healing/actions/${id}/complete`, data || {}).then(r => r.data),
  getActionCompletions: (actionId: string) =>
    api.get<HealingCompletionRecord[]>(`/healing/actions/${actionId}/completions`).then(r => r.data),
  getPlanCompletions: (planId: string, params?: { start?: string; end?: string }) =>
    api.get<HealingCompletionRecord[]>(`/healing/plans/${planId}/completions`, { params }).then(r => r.data),

  getPlanReviews: (planId: string) =>
    api.get<HealingReviewNote[]>(`/healing/plans/${planId}/reviews`).then(r => r.data),
  createReview: (planId: string, data: Partial<HealingReviewNote>) =>
    api.post<HealingReviewNote>(`/healing/plans/${planId}/reviews`, data).then(r => r.data),
  updateReview: (id: string, data: Partial<HealingReviewNote>) =>
    api.put<HealingReviewNote>(`/healing/reviews/${id}`, data).then(r => r.data),
  deleteReview: (id: string) =>
    api.delete(`/healing/reviews/${id}`).then(r => r.data),

  getTodaySuggestions: (date?: string) =>
    api.get<HealingSuggestion[]>('/healing/suggestions/today', { params: date ? { date } : {} }).then(r => r.data),
  getSuggestionsRange: (start: string, end: string) =>
    api.get<HealingSuggestion[]>('/healing/suggestions/range', { params: { start, end } }).then(r => r.data),
  refreshSuggestions: (date?: string) =>
    api.post<{ refreshed: number; suggestions: HealingSuggestion[] }>('/healing/suggestions/refresh', date ? { date } : {}).then(r => r.data),

  getPlanProgress: (planId: string) =>
    api.get<HealingProgressStats>(`/healing/plans/${planId}/progress`).then(r => r.data),
};
