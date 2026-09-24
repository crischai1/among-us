import { DEFAULT_PORT } from '../shared/constants';
import { createAppServer } from './server';

const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
const dev = process.env.DEV === '1';

createAppServer({ port, dev }).then(() => {
  console.log(`Among Us server on http://localhost:${port} (ws: /ws)${dev ? ' [DEV]' : ''}`);
});
