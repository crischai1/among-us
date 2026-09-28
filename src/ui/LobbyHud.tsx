import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../shared/constants';
import { ROLES, ROLE_LABEL, type Role } from '../../shared/types';
import { doUse, openOverlay } from '../game/actions';
import { leaveRoom, send } from '../net/session';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { Chat } from './Chat';

export function LobbyHud() {
  const room = useSession((s) => s.room);
  const selfId = useSession((s) => s.selfId);
  const use = useGame((s) => s.nearby.use);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [devRole, setDevRole] = useState<Role | ''>(() => (new URLSearchParams(location.search).get('role') as Role) ?? '');
  if (!room) return null;
  const isHost = room.hostId === selfId;
  const connected = room.members.filter((m) => m.connected).length;
  const enough = room.dev || connected >= MIN_PLAYERS;
  const link = `${location.origin}${location.pathname}?room=${room.code}`;

  return (
    <div className="hud lobby-hud">
      <div className="lobby-top">
        <div className="panel invite">
          <div className="invite-label">Room code</div>
          <div className="invite-code outline-text">{room.code}</div>
          <button
            className="btn small"
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </div>
        <div className="lobby-count panel">
          <span className="outline-text">
            {room.members.length}/{MAX_PLAYERS}
          </span>
          <ul>
            {room.members.map((m) => (
              <li key={m.id} className={m.connected ? '' : 'dim'}>
                {m.isHost && '👑 '}
                {m.bot && <span title="Bot">🤖 </span>}
                {m.name}
                {m.id === selfId && ' (you)'}
                {isHost && m.id !== selfId && (
                  <button className="kick" title={m.bot ? 'Remove bot' : 'Kick'} onClick={() => send({ t: 'kick', id: m.id })}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isHost && room.members.length < MAX_PLAYERS && (
            <button className="btn small add-bot" onClick={() => send({ t: 'addBot' })}>
              ＋ Add bot
            </button>
          )}
          {(isHost || room.members.some((m) => m.bot)) && (
            <div className="beta-note">
              <span className="beta-tag">BETA</span> Bots are experimental: they may get stuck or play oddly.
            </div>
          )}
        </div>
        <button className="btn small danger leave" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="lobby-chat">
        <button className="btn small" onClick={() => setChatOpen(!chatOpen)}>
          {chatOpen ? 'Hide chat' : 'Chat'}
        </button>
        {chatOpen && <Chat channels={['lobby']} canSend className="panel" />}
      </div>

      <div className="lobby-bottom">
        {room.dev && (
          <label className="dev-role panel">
            DEV role
            <select
              value={devRole}
              onChange={(e) => {
                const r = (e.target.value || null) as Role | null;
                setDevRole(r ?? '');
                send({ t: 'devRole', role: r });
              }}
            >
              <option value="">random</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="btn" onClick={() => openOverlay({ kind: 'colors' })}>
          🎨 Customize
        </button>
        <button className="btn" onClick={() => openOverlay({ kind: 'settings' })}>
          ⚙ {isHost ? 'Settings' : 'View Settings'}
        </button>
        {isHost ? (
          <button className="btn primary start" disabled={!enough} onClick={() => send({ t: 'start' })} title={enough ? '' : `Need ${MIN_PLAYERS} players`}>
            START {!enough && `(${connected}/${MIN_PLAYERS})`}
          </button>
        ) : (
          <div className="waiting panel">Waiting for host to start…</div>
        )}
        {use?.kind === 'laptop' && (
          <button className="btn blue" onClick={doUse}>
            USE (E)
          </button>
        )}
      </div>
    </div>
  );
}
