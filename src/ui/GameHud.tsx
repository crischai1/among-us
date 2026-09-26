import { useEffect, useState } from 'react';
import { CRITICAL_SABOTAGES, isImpostorRole, ROLE_LABEL } from '../../shared/types';
import { canPressButton, doKill, doReport, doUse, doVent, openOverlay, toggleMap } from '../game/actions';
import { lastRtt, serverNow } from '../net/clock';
import { leaveRoom, send } from '../net/session';
import { camera } from '../render/loop';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { jitter, world } from '../world/world';
import { TASK_THEME } from '../tasks/theme';
import { Chat } from './Chat';
import { Cutscenes } from './cutscenes/Cutscenes';
import { MeetingScreen } from './MeetingScreen';

/** Re-render periodically so countdowns tick. */
export function useNow(ms = 200): number {
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

export function GameHud() {
  const pub = useGame((s) => s.pub);
  const priv = useGame((s) => s.priv);
  const selfId = useSession((s) => s.selfId);
  if (!pub || !priv) return <div className="hud-loading">Loading…</div>;
  const me = pub.players.find((p) => p.id === selfId);
  const dead = !!me?.dead;
  const showPlayHud = pub.phase === 'playing';

  return (
    <div className="hud game-hud">
      {showPlayHud && (
        <>
          <TaskPanel dead={dead} />
          <SabotageBanner />
          <CriticalFlash />
          <TopRight dead={dead} />
          <ActionButtons dead={dead} />
          {priv.venting && <VentArrows />}
          {dead && <GhostChat />}
        </>
      )}
      {pub.phase === 'meeting' && pub.meeting && pub.meeting.stage !== 'intro' && <MeetingScreen />}
      <Cutscenes />
    </div>
  );
}

function TaskPanel({ dead }: { dead: boolean }) {
  const pub = useGame((s) => s.pub)!;
  const priv = useGame((s) => s.priv)!;
  const [open, setOpen] = useState(true);
  const now = useNow(500);
  const imp = isImpostorRole(priv.role);
  const sab = pub.sabotage;

  return (
    <div className="task-panel">
      {pub.taskBar !== null && (
        <div className="taskbar">
          <div className="taskbar-fill" style={{ width: `${pub.taskBar * 100}%` }} />
          <span className="outline-text">TOTAL TASKS COMPLETED</span>
        </div>
      )}
      <div className="panel task-list">
        <button className="task-toggle" onClick={() => setOpen(!open)}>
          Tasks {open ? '◀' : '▶'}
        </button>
        {open && (
          <div className="task-items">
            <div className={`role-line ${imp ? 'imp' : ''}`}>
              {ROLE_LABEL[priv.role]}
              {imp && ': Sabotage and kill everyone.'}
            </div>
            {dead && <div className="ghost-line">{imp ? 'You are dead. You can still sabotage.' : 'You are dead. Finish your tasks to help your crew win.'}</div>}
            {sab && (
              <div className="task sab">
                {sab.label}
                {sab.endsAt && ` ${secs(sab.endsAt - now)}s`}
                {sab.kind === 'reactor' && ` (${sab.reactorHeld.length}/${sab.stations.length})`}
                {sab.kind === 'o2' && ` (${sab.o2Done.length}/${sab.stations.length})`}
              </div>
            )}
            {priv.commsDown && !imp ? (
              <div className="task sab">Comms Sabotaged</div>
            ) : (
              <>
                {imp && <div className="fake-label">Fake Tasks:</div>}
                {priv.tasks.map((t) => (
                  <div key={t.id} className={`task ${t.done ? 'done' : t.step > 0 ? 'progress' : ''} ${imp ? 'fake' : ''}`}>
                    <span className="task-icon">{t.done ? '✓' : TASK_THEME[t.type].icon}</span>
                    <span>
                      {t.room}: {t.name}
                      {t.steps > 1 && ` (${t.done ? t.steps : t.step}/${t.steps})`}
                    </span>
                  </div>
                ))}
              </>
            )}
            {priv.role === 'engineer' && <div className="hint">You can use vents.</div>}
            {priv.role === 'scientist' && <div className="hint">Check vitals anywhere.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Red alarm flash over the whole screen while a critical sabotage counts down. */
function CriticalFlash() {
  const critical = useGame((s) => s.pub?.phase === 'playing' && !!s.pub.sabotage && CRITICAL_SABOTAGES.includes(s.pub.sabotage.kind));
  return critical ? <div className="crit-flash" aria-hidden /> : null;
}

function SabotageBanner() {
  const sab = useGame((s) => s.pub?.sabotage);
  const now = useNow(250);
  if (!sab || !CRITICAL_SABOTAGES.includes(sab.kind) || !sab.endsAt) return null;
  return (
    <div className="sab-banner outline-text">
      {sab.label} in {secs(sab.endsAt - now)}
    </div>
  );
}

/** Shows only when the connection is struggling, so a laggy player knows why. */
function ConnectionBadge() {
  useNow(1000);
  const rtt = lastRtt();
  const delay = jitter.delay;
  if (rtt < 180 && delay < 180) return null;
  const bad = rtt > 350 || delay > 330;
  return (
    <span className={`conn-badge ${bad ? 'bad' : ''}`} title="Round-trip time to the server">
      📶 {Math.round(rtt)} ms
    </span>
  );
}

function TopRight({ dead }: { dead: boolean }) {
  const room = useSession((s) => s.room);
  return (
    <div className="top-right">
      <button className="hud-btn small-round" title="Map (Tab)" onClick={toggleMap}>
        🗺
      </button>
      <button className="hud-btn small-round" title="Settings" onClick={() => openOverlay({ kind: 'settings' })}>
        ⚙
      </button>
      <ConnectionBadge />
      {room?.dev && <span className="dev-tag">DEV{dead ? ' · ghost' : ''}</span>}
      <button
        className="hud-btn small-round"
        title="Leave game"
        onClick={() => {
          if (confirm('Leave the game?')) leaveRoom();
        }}
      >
        ⏏
      </button>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  enabled,
  cooldown,
  className,
  hotkey,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  enabled: boolean;
  cooldown?: number;
  className?: string;
  hotkey?: string;
}) {
  const cd = cooldown && cooldown > 0 ? secs(cooldown) : 0;
  return (
    <button className={`action ${className ?? ''} ${enabled && !cd ? 'on' : ''}`} disabled={!enabled || cd > 0} onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-label outline-text">{label}</span>
      {hotkey && <span className="action-key">{hotkey}</span>}
      {cd > 0 && <span className="action-cd outline-text">{cd}</span>}
    </button>
  );
}

function ActionButtons({ dead }: { dead: boolean }) {
  const nearby = useGame((s) => s.nearby);
  const priv = useGame((s) => s.priv)!;
  const pub = useGame((s) => s.pub)!;
  const now = useNow(200);
  const imp = isImpostorRole(priv.role);
  const use = nearby.use;
  const useEnabled = !!use && (use.kind !== 'button' || canPressButton());
  const buttonWait = use?.kind === 'button' ? pub.buttonReadyAt - now : 0;

  return (
    <div className="actions">
      {imp && (
        <ActionButton
          label="SABOTAGE"
          icon="☢"
          enabled
          className="sabotage"
          onClick={() => openOverlay({ kind: 'map' })}
        />
      )}
      {!dead && priv.role === 'shapeshifter' && (
        <ActionButton
          label={priv.shift?.as ? 'REVERT' : 'SHIFT'}
          icon="🎭"
          hotkey="F"
          enabled={!priv.venting}
          cooldown={priv.shift?.as ? 0 : (priv.shift?.readyAt ?? 0) - now}
          onClick={() => (priv.shift?.as ? send({ t: 'revert' }) : openOverlay({ kind: 'shift' }))}
        />
      )}
      {!dead && priv.role === 'scientist' && (
        <ActionButton
          label="VITALS"
          icon="💓"
          enabled={(priv.battery?.leftMs ?? 0) > 0}
          cooldown={(priv.battery?.leftMs ?? 1) <= 0 ? (priv.battery?.readyAt ?? 0) - now : 0}
          onClick={() => {
            send({ t: 'portableVitals', open: true });
            openOverlay({ kind: 'portableVitals' });
          }}
        />
      )}
      {!dead && (priv.role === 'engineer' || imp) && (
        <ActionButton
          label={priv.venting ? 'EXIT' : 'VENT'}
          icon="⛶"
          hotkey="V"
          enabled={!!priv.venting || !!nearby.vent}
          cooldown={priv.role === 'engineer' && !priv.venting ? priv.ventReadyAt - now : 0}
          onClick={doVent}
        />
      )}
      {!dead && imp && (
        <ActionButton label="KILL" icon="🔪" hotkey="Q" className="kill" enabled={nearby.kill !== null} cooldown={priv.killReadyAt - now} onClick={doKill} />
      )}
      {!dead && <ActionButton label="REPORT" icon="📢" hotkey="R" className="report" enabled={nearby.report !== null} onClick={doReport} />}
      <ActionButton
        label={use?.kind === 'button' && pub.sabotage ? 'LOCKED' : use ? use.label.toUpperCase() : 'USE'}
        icon={use?.kind === 'button' ? '🔴' : '✋'}
        hotkey="E"
        className="use"
        enabled={useEnabled}
        cooldown={buttonWait}
        onClick={doUse}
      />
    </div>
  );
}

function VentArrows() {
  const priv = useGame((s) => s.priv)!;
  useNow(100);
  const cur = priv.venting ? world.map.vents.get(priv.venting) : undefined;
  if (!cur) return null;
  const cx = window.innerWidth / 2 + (cur.x - camera.x) * camera.zoom;
  const cy = window.innerHeight / 2 + (cur.y - camera.y) * camera.zoom;
  const arrows = cur.links
    .map((id) => {
      const v = world.map.vents.get(id)!;
      return { id, v, a: Math.atan2(v.y - cur.y, v.x - cur.x), r: 100 };
    })
    .sort((p, q) => p.a - q.a);
  // Push arrows that point in similar directions further out so they don't overlap.
  for (let i = 1; i < arrows.length; i++) {
    if (Math.abs(arrows[i].a - arrows[i - 1].a) < 0.6) arrows[i].r = arrows[i - 1].r + 64;
  }
  return (
    <div className="vent-arrows">
      {arrows.map(({ id, v, a, r }) => (
        <button
          key={id}
          className="vent-arrow"
          title={world.map.rooms.get(v.room)?.name}
          style={{ left: cx + Math.cos(a) * r, top: cy + Math.sin(a) * r }}
          onClick={() => send({ t: 'vent', action: 'move', ventId: id })}
        >
          <span style={{ transform: `rotate(${a}rad)` }}>➜</span>
          <small>{world.map.rooms.get(v.room)?.name}</small>
        </button>
      ))}
    </div>
  );
}

function GhostChat() {
  const [open, setOpen] = useState(false);
  const unread = useGame((s) => s.unread);
  return (
    <div className="ghost-chat">
      <button className="btn small" onClick={() => setOpen(!open)}>
        👻 Ghost chat {!open && unread > 0 && <b className="badge">{unread}</b>}
      </button>
      {open && <Chat channels={['ghost']} canSend className="panel" placeholder="Only ghosts can see this" />}
    </div>
  );
}

