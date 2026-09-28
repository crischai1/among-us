import { describe, expect, it } from 'vitest';
import { REVEAL_MS } from '../../shared/constants';
import type { ConsoleKind } from '../../shared/types';
import { makeGame, place } from './helpers';

describe('ghosts can use consoles', () => {
  for (const kind of ['cams', 'admin', 'vitals'] as ConsoleKind[]) {
    it(`a ghost opens ${kind} and gets its data`, () => {
      const h = makeGame(5, { p0: 'impostor' });
      h.advance(REVEAL_MS + 100);
      const ghost = h.g.byId.get('p1')!;
      ghost.alive = false;
      const st = h.g.map.def.stations.find((s) => s.kind === kind)!;
      place(h.g, 'p1', st.x, st.y + 20);
      h.act('p1', { t: 'console', kind, open: true });
      h.advance(600);
      expect(ghost.console).toBe(kind);
      const priv = h.last('p1', 'priv')!.state;
      expect(priv.console).toBe(kind);
      if (kind === 'admin') expect(priv.admin).not.toBeNull();
      if (kind === 'vitals') expect(priv.vitals).not.toBeNull();
    });
  }

  it("a ghost watching cams doesn't light up the camera indicator", () => {
    const h = makeGame(5, { p0: 'impostor' });
    h.advance(REVEAL_MS + 100);
    h.g.byId.get('p1')!.alive = false;
    const cams = h.g.map.def.stations.find((s) => s.kind === 'cams')!;
    place(h.g, 'p1', cams.x, cams.y + 20);
    h.act('p1', { t: 'console', kind: 'cams', open: true });
    h.g.markPub();
    h.advance(100);
    expect(h.last('p2', 'pub')!.state.camsInUse).toBe(false);
  });

  it('a ghost still has to be at the console', () => {
    const h = makeGame(5, { p0: 'impostor' });
    h.advance(REVEAL_MS + 100);
    const ghost = h.g.byId.get('p1')!;
    ghost.alive = false;
    const cams = h.g.map.def.stations.find((s) => s.kind === 'cams')!;
    place(h.g, 'p1', cams.x + 600, cams.y + 600);
    h.act('p1', { t: 'console', kind: 'cams', open: true });
    expect(ghost.console).toBeNull();
  });
});
