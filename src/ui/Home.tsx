import { useMemo, useState } from 'react';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '../../shared/constants';
import { createRoom, joinRoom, savedName } from '../net/session';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';
import { HelpOverlay } from './HelpOverlay';
import { isTouchDevice } from '../input/touch';

export function Home() {
  const error = useSession((s) => s.error);
  const status = useSession((s) => s.status);
  const [name, setName] = useState(savedName());
  const [help, setHelp] = useState(false);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const busy = status === 'connecting';
  const cleanName = name.trim();
  const floaters = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ color: (i * 5) % 18, left: 8 + i * 16, delay: i * -3.3, dur: 16 + i * 2 })),
    [],
  );

  return (
    <div className="home">
      <div className="home-stars" />
      {floaters.map((f, i) => (
        <div key={i} className="home-floater" style={{ left: `${f.left}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }}>
          <CrewmateSvg color={f.color} size={46} />
        </div>
      ))}
      <div className="home-card panel">
        <h1 className="home-title outline-text">AMONG US</h1>
        <label className="home-label">
          Name
          <input
            className="field"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Your name"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="btn primary home-create" disabled={!cleanName || busy} onClick={() => createRoom(cleanName)}>
          Create Game
        </button>
        <div className="home-or">or join with a code</div>
        <form
          className="home-join"
          onSubmit={(e) => {
            e.preventDefault();
            if (cleanName && code.length === ROOM_CODE_LENGTH) joinRoom(code, cleanName);
          }}
        >
          <input
            className="field home-code"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            placeholder="ABCDEF"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          />
          <button className="btn blue" type="submit" disabled={!cleanName || code.length !== ROOM_CODE_LENGTH || busy}>
            Join
          </button>
        </form>
        {busy && <div className="home-status">Connecting…</div>}
        {error && <div className="home-error">{error}</div>}
        <button className="btn small home-howto" onClick={() => setHelp(true)}>
          ❓ How to Play · Rules &amp; Map
        </button>
        <div className="home-help">
          {isTouchDevice
            ? 'Touch and drag anywhere to move · tap the buttons to act'
            : 'WASD / arrows to move · E use · Q kill · R report · V vent · Tab map · / chat'}
        </div>
      </div>
      {help && <HelpOverlay onClose={() => setHelp(false)} />}
    </div>
  );
}
