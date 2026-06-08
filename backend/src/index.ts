import express from 'express';
import cors from 'cors';
import path from 'path';
import entriesRouter from './routes/entries';
import statsRouter from './routes/stats';
import cycleRouter from './routes/cycle';
import uploadRouter from './routes/upload';
import insightsRouter from './routes/insights';
import sharingRouter from './routes/sharing';

const app = express();
const PORT = 9102;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '女性心情手账与周期追踪系统 API 运行正常' });
});

app.use('/api/entries', entriesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/cycle', cycleRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/sharing', sharingRouter);

app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📝 API 文档:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/entries`);
  console.log(`   POST /api/entries`);
  console.log(`   GET  /api/stats/phase`);
  console.log(`   GET  /api/stats/trend`);
  console.log(`   GET  /api/stats/keywords`);
  console.log(`   GET  /api/stats/yearly/:year`);
  console.log(`   GET  /api/cycle`);
  console.log(`   PUT  /api/cycle`);
  console.log(`   POST /api/upload`);
  console.log(`   GET  /api/insights/rules`);
  console.log(`   PUT  /api/insights/rules`);
  console.log(`   GET  /api/insights/alerts`);
  console.log(`   GET  /api/insights/alerts/dates`);
  console.log(`   POST /api/insights/alerts/refresh`);
  console.log(`   GET  /api/insights/summary`);
  console.log(`   POST /api/insights/analyze`);
  console.log(`   GET  /api/sharing/contacts`);
  console.log(`   POST /api/sharing/contacts`);
  console.log(`   GET  /api/sharing/spaces`);
  console.log(`   POST /api/sharing/spaces`);
  console.log(`   GET  /api/sharing/spaces/:id`);
  console.log(`   PUT  /api/sharing/spaces/:id`);
  console.log(`   DELETE /api/sharing/spaces/:id`);
  console.log(`   POST /api/sharing/spaces/:id/links`);
  console.log(`   POST /api/sharing/links/:id/revoke`);
  console.log(`   GET  /api/sharing/spaces/:id/audit`);
  console.log(`   GET  /api/sharing/spaces/:id/feedbacks`);
  console.log(`   PUT  /api/sharing/notes/:entryId`);
  console.log(`   GET  /api/sharing/public/:token`);
  console.log(`   POST /api/sharing/public/:token/feedback`);
});
