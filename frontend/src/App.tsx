import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DailyRecordPage from './pages/DailyRecordPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import WordCloudPage from './pages/WordCloudPage';
import YearlyReviewPage from './pages/YearlyReviewPage';

const navItems = [
  { key: 'daily', label: '每日记录', path: '/' },
  { key: 'calendar', label: '月历视图', path: '/calendar' },
  { key: 'stats', label: '周期统计', path: '/stats' },
  { key: 'wordcloud', label: '心情词云', path: '/wordcloud' },
  { key: 'yearly', label: '年度回顾', path: '/yearly' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-container">
      <div className="header">
        <h1>🌸 心情手账 & 周期追踪</h1>
        <p>记录每一天的情绪与身体，温柔地了解自己</p>
      </div>

      <nav className="nav-bar">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="page">
        <Routes>
          <Route path="/" element={<DailyRecordPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/wordcloud" element={<WordCloudPage />} />
          <Route path="/yearly" element={<YearlyReviewPage />} />
        </Routes>
      </div>
    </div>
  );
}
