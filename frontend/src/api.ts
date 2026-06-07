import axios from 'axios';
import type { DiaryEntry, CycleInfo, PhaseMoodStats, YearlyReview, MoodTrendPoint } from './types';

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
