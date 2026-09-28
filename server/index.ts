import { DEFAULT_PORT } from '../shared/constants';
import { llmConfig } from './bots/chat';
import { createAppServer } from './server';

// Settings (e.g. BOT_LLM_KEY) can live in a .env file; real environment variables win.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
const dev = process.env.DEV === '1';

const clientPort = Number(process.env.CLIENT_PORT ?? 5173);

// DEV only: NET_LAG=120 NET_JITTER=250 npm run dev simulates bad wifi.
const simNet =
  dev && (process.env.NET_LAG || process.env.NET_JITTER)
    ? { lagMs: Number(process.env.NET_LAG ?? 0), jitterMs: Number(process.env.NET_JITTER ?? 0) }
    : undefined;

createAppServer({ port, dev, devClientPort: dev ? clientPort : undefined, simNet }).then(() => {
  const llm = llmConfig();
  console.log(`Bot chat: ${llm ? `LLM (${llm.model})` : 'built-in lines (set BOT_LLM_KEY for LLM chat)'}`);
  if (simNet) console.log(`Simulating a bad connection: ${simNet.lagMs} ms lag + up to ${simNet.jitterMs} ms jitter each way`);
  if (dev) {
    console.log(`Game server (WebSocket) on :${port} [DEV]`);
    console.log(`Open the game at http://localhost:${clientPort}`);
  } else {
    console.log(`Among Us server on http://localhost:${port} (ws: /ws)`);
  }
});
