import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { startAiFeedbackWorker } from './modules/aiFeedback/worker.js';
import { attachRealtime } from './realtime/socket.js';

const app = createApp();
const server = http.createServer(app);
attachRealtime(server);

server.listen(config.port, () => {
  console.log(`[LMS] Backend dang chay tai http://localhost:${config.port}`);
  // AiFeedbackWorker (BackgroundService ben .NET): xu ly hang doi AI1/AI2/AI3 sau khi hoc sinh nop bai.
  startAiFeedbackWorker();
});

// Tat gon gang khi docker stop / Ctrl+C.
async function shutdown(signal: string) {
  console.log(`[LMS] Nhan ${signal}, dang tat...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
