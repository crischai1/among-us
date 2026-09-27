import { useEffect, useState } from 'react';
import { colorOf } from '../../../shared/colors';
import { isImpostorRole, ROLE_LABEL, type Role } from '../../../shared/types';
import { useGame } from '../../store/game';
import { useSession } from '../../store/session';
import { CrewmateSvg } from '../CrewmateSvg';

export function Cutscenes() {
  const phase = useGame((s) => s.pub?.phase);
  const splash = useGame((s) => s.meetingSplash);
  const killed = useGame((s) => s.killedByColor);
  return (
    <>
      {phase === 'reveal' && <RoleReveal />}
      {splash && <MeetingSplash kind={splash.kind} callerColor={splash.callerColor} bodyColor={splash.bodyColor} />}
      {killed !== null && <KillOverlay killerColor={killed} />}
      {phase === 'ejection' && <Ejection />}
      {phase === 'gameover' && <GameOver />}
    </>
  );
}

const ROLE_BLURB: Record<Role, string> = {
  crewmate: 'Do your tasks and find the Impostors',
  impostor: 'Kill the Crewmates',
  engineer: 'You can use the vents',
  scientist: 'Check vitals anywhere on the ship',
  shapeshifter: 'Disguise yourself as other crewmates',
};

function RoleReveal() {
  const priv = useGame((s) => s.priv);
  const pub = useGame((s) => s.pub);
  const selfId = useSession((s) => s.selfId);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStage(1), 1400);
    return () => clearTimeout(t);
  }, []);
  if (!priv || !pub) return null;
  const imp = isImpostorRole(priv.role);
  const team = imp ? pub.players.filter((p) => priv.team.includes(p.id)) : pub.players;
  const me = team.find((p) => p.id === selfId);
  const others = team.filter((p) => p.id !== selfId);
  const lineup = me ? [...others.slice(0, Math.ceil(others.length / 2)), me, ...others.slice(Math.ceil(others.length / 2))] : others;
  return (
    <div className="cutscene reveal">
      {stage === 0 ? (
        <div className="shhh">
          <CrewmateSvg color={me?.color ?? 0} hat={me?.hat} size={150} />
          <div className="shhh-text outline-text">Shhhhh!</div>
        </div>
      ) : (
        <div className={`reveal-role ${imp ? 'imp' : 'crew'}`}>
          <div className="reveal-glow" />
          <h1 className="outline-text">{ROLE_LABEL[priv.role]}</h1>
          <p>
            {imp && priv.team.length > 1 ? `There are ${priv.team.length} Impostors. ` : ''}
            {!imp && `There ${countImps(pub)} among us. `}
            {ROLE_BLURB[priv.role]}
          </p>
          <div className="lineup">
            {lineup.map((p, i) => {
              const center = p.id === selfId;
              const off = i - (lineup.length - 1) / 2;
              return (
                <div key={p.id} className="lineup-item" style={{ zIndex: 20 - Math.abs(off), transform: `translateY(${Math.abs(off) * -6}px) scale(${center ? 1.25 : 1 - Math.abs(off) * 0.05})` }}>
                  <CrewmateSvg color={p.color} hat={p.hat} size={80} facing={off < 0 ? 1 : -1} />
                  <span className="lineup-name" style={{ color: imp ? '#ff5b5b' : '#fff' }}>
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function countImps(pub: { players: unknown[] }): string {
  // Crewmates don't know the exact count, only the configured number.
  const n = useSession.getState().room?.settings.impostors ?? 1;
  const cap = pub.players.length <= 6 ? 1 : pub.players.length <= 8 ? 2 : 3;
  const k = Math.min(n, cap);
  return k === 1 ? 'is 1 Impostor' : `are ${k} Impostors`;
}

function MeetingSplash({ kind, callerColor, bodyColor }: { kind: 'emergency' | 'report'; callerColor: number; bodyColor: number | null }) {
  return (
    <div className={`cutscene splash ${kind}`}>
      <div className="splash-rays" />
      <div className="splash-content">
        <CrewmateSvg color={callerColor} size={140} />
        {kind === 'report' && bodyColor !== null && <CrewmateSvg color={bodyColor} size={90} dead className="splash-body" />}
        <h1 className="outline-text">{kind === 'report' ? 'DEAD BODY REPORTED' : 'EMERGENCY MEETING'}</h1>
      </div>
    </div>
  );
}

function KillOverlay({ killerColor }: { killerColor: number }) {
  const selfId = useSession((s) => s.selfId);
  const me = useGame((s) => s.pub?.players.find((p) => p.id === selfId));
  return (
    <div className="cutscene kill">
      <div className="kill-band">
        <div className="kill-killer">
          <CrewmateSvg color={killerColor} size={150} />
          <div className="knife">🔪</div>
        </div>
        <div className="kill-victim">
          <CrewmateSvg color={me?.color ?? 0} size={150} facing={-1} />
        </div>
      </div>
      <div className="kill-text outline-text" style={{ color: colorOf(killerColor).body }}>
        You were killed
      </div>
    </div>
  );
}

function Ejection() {
  const ej = useGame((s) => s.pub?.ejection);
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!ej) return;
    const start = performance.now() + 1800;
    const id = setInterval(() => setTyped(Math.max(0, Math.floor((performance.now() - start) / 55))), 50);
    return () => clearInterval(id);
  }, [ej]);
  if (!ej) return null;
  return (
    <div className="cutscene ejection">
      <div className="starfield" />
      {ej.color !== null && (
        <div className="ejected">
          <CrewmateSvg color={ej.color} size={90} />
        </div>
      )}
      <div className="eject-text">
        <div className="outline-text">{ej.text.slice(0, typed)}</div>
        {typed > ej.text.length + 8 && <div className="eject-sub">{ej.subtext}</div>}
      </div>
    </div>
  );
}

function GameOver() {
  const pub = useGame((s) => s.pub);
  const selfId = useSession((s) => s.selfId);
  if (!pub?.gameOver) return null;
  const { winner, reason, roles } = pub.gameOver;
  const myRole = selfId ? roles[selfId] : 'crewmate';
  const iWon = (winner === 'impostors') === isImpostorRole(myRole);
  const winners = pub.players.filter((p) => (winner === 'impostors') === isImpostorRole(roles[p.id]));
  const reasonText = {
    tasks: 'Crewmates completed all tasks',
    vote: 'All Impostors were ejected',
    kills: 'Impostors outnumbered the crew',
    sabotage: 'Sabotage was not fixed in time',
    disconnect: 'The Impostors left the game',
    dev: 'Ended by dev command',
  }[reason];
  return (
    <div className={`cutscene gameover ${iWon ? 'won' : 'lost'}`}>
      <h1 className={`outline-text ${iWon ? 'victory' : 'defeat'}`}>{iWon ? 'Victory' : 'Defeat'}</h1>
      <p>{reasonText}</p>
      <div className="lineup">
        {winners.map((p) => (
          <div key={p.id} className="lineup-item">
            <CrewmateSvg color={p.color} hat={p.hat} size={80} dead={p.dead && false} ghost={p.dead} />
            <span className="lineup-name" style={{ color: winner === 'impostors' ? '#ff5b5b' : '#8cf' }}>
              {p.name}
            </span>
          </div>
        ))}
      </div>
      <div className="roles-list">
        {pub.players.map((p) => (
          <span key={p.id} className={isImpostorRole(roles[p.id]) ? 'imp' : ''}>
            {p.name}: {ROLE_LABEL[roles[p.id]]}
          </span>
        ))}
      </div>
      <p className="muted">Returning to lobby…</p>
    </div>
  );
}
