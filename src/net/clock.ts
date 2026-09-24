/** Estimates the server clock offset from ping/pong round trips (median of recent samples). */
const samples: number[] = [];
let offset = 0;
let rtt = 0;

export function addClockSample(clientSent: number, serverTime: number, clientRecv: number): void {
  rtt = clientRecv - clientSent;
  samples.push(serverTime - (clientSent + rtt / 2));
  if (samples.length > 7) samples.shift();
  const sorted = [...samples].sort((a, b) => a - b);
  offset = sorted[Math.floor(sorted.length / 2)];
}

export const serverNow = (): number => Date.now() + offset;
export const lastRtt = (): number => rtt;
