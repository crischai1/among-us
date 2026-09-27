// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PrivState, PubState } from '../../shared/types';

vi.mock('../../src/net/session', () => ({ send: () => {} }));
// jsdom has no scrolling; the meeting chat scrolls to its newest message.
Element.prototype.scrollTo = () => {};

const { useGame } = await import('../../src/store/game');
const { useSession } = await import('../../src/store/session');
const { MeetingScreen } = await import('../../src/ui/MeetingScreen');

const pub = {
  phase: 'meeting',
  phaseEndsAt: 0,
  players: ['Red', 'Blue', 'Green'].map((name, i) => ({ id: `p${i}`, name, color: i, hat: 0, dead: false, disconnected: false })),
  taskBar: 0,
  sabotage: null,
  doors: {},
  camsInUse: false,
  buttonReadyAt: 0,
  meeting: { stage: 'discussion', endsAt: Date.now() + 10_000, kind: 'emergency', callerId: 'p1', bodyColor: null, votedIds: [], results: null },
  ejection: null,
  gameOver: null,
} as PubState;

const priv = (team: string[]) => ({ role: team.length ? 'impostor' : 'crewmate', team, vote: null, tasks: [] }) as unknown as PrivState;

const nameClass = (name: string) => screen.getByText(name, { exact: false }).className;

describe('meeting names', () => {
  it('impostors see their team in red', () => {
    useSession.setState({ selfId: 'p0' });
    useGame.setState({ pub, priv: priv(['p0', 'p2']) });
    render(<MeetingScreen />);
    expect(nameClass('Red')).toContain('imp');
    expect(nameClass('Green')).toContain('imp');
    expect(nameClass('Blue')).not.toContain('imp');
  });

  it('crewmates see nobody in red', () => {
    useSession.setState({ selfId: 'p1' });
    useGame.setState({ pub, priv: priv([]) });
    render(<MeetingScreen />);
    for (const n of ['Red', 'Blue', 'Green']) expect(nameClass(n)).not.toContain('imp');
  });
});
