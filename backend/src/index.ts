import express from 'express';
import cors from 'cors';
import path from 'path';
import entriesRouter from './routes/entries';
import statsRouter from './routes/stats';
import cycleRouter from './routes/cycle';
import uploadRouter from './routes/upload';

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
});
