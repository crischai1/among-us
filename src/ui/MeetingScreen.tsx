import { useState } from 'react';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { Chat } from './Chat';
import { CrewmateSvg } from './CrewmateSvg';
import { useNow } from './GameHud';

export function MeetingScreen() {
  const pub = useGame((s) => s.pub)!;
  const priv = useGame((s) => s.priv)!;
  const selfId = useSession((s) => s.selfId);
  const now = useNow(250);
  const [pending, setPending] = useState<string | null>(null);
  const m = pub.meeting!;
  const me = pub.players.find((p) => p.id === selfId);
  const iAmDead = !!me?.dead;
  const canVote = m.stage === 'voting' && !iAmDead && priv.vote === null;
  const left = Math.max(0, Math.ceil((m.endsAt - now) / 1000));
  const res = m.results;
  const voted = new Set(m.votedIds);
  // Only impostors are sent their team, so crewmates never see red names.
  const team = new Set(priv.team);
  const players = [...pub.players].filter((p) => !p.disconnected || !p.dead);
  players.sort((a, b) => Number(a.dead) - Number(b.dead));

  const vote = (target: string) => {
    send({ t: 'vote', target });
    setPending(null);
  };
  const votersFor = (target: string) =>
    res?.votes ? Object.entries(res.votes).filter(([, t]) => t === target).map(([v]) => pub.players.find((p) => p.id === v)!) : [];
  const anonCount = (target: string) => (res && !res.votes ? res.counts[target] ?? 0 : 0);

  return (
    <div className="meeting-backdrop">
      <div className="meeting panel">
        <header className="meeting-head">
          <h2 className="outline-text">{m.kind === 'report' ? 'Dead Body Reported' : 'Who Is The Impostor?'}</h2>
          <div className="meeting-timer">
            {m.stage === 'discussion' && `Voting begins in: ${left}s`}
            {m.stage === 'voting' && `Voting ends in: ${left}s`}
            {m.stage === 'results' && 'Results'}
          </div>
        </header>
        <div className="meeting-body">
          <div className="vote-grid">
            {players.map((p) => {
              const isCaller = p.id === m.callerId;
              const selectable = canVote && !p.dead && !p.disconnected;
              return (
                <div
                  key={p.id}
                  className={`vote-card ${p.dead ? 'dead' : ''} ${pending === p.id ? 'pending' : ''} ${priv.vote === p.id ? 'mine' : ''} ${selectable ? 'selectable' : ''}`}
                  onClick={() => selectable && setPending(pending === p.id ? null : p.id)}
                >
                  <CrewmateSvg color={p.color} size={40} dead={p.dead} />
                  <div className={`vote-name ${team.has(p.id) ? 'imp' : ''}`}>
                    {p.name}
                    {p.id === selfId && ' (you)'}
                  </div>
                  {isCaller && <span className="megaphone" title="Called the meeting">📢</span>}
                  {voted.has(p.id) && !res && <span className="voted-badge">I VOTED</span>}
                  {p.dead && <span className="dead-x">✕</span>}
                  {pending === p.id && (
                    <span className="confirm" onClick={(e) => e.stopPropagation()}>
                      <button className="yes" onClick={() => vote(p.id)}>
                        ✔
                      </button>
                      <button className="no" onClick={() => setPending(null)}>
                        ✕
                      </button>
                    </span>
                  )}
                  {res && (
                    <div className="voter-chips">
                      {votersFor(p.id).map((v) => (
                        <CrewmateSvg key={v.id} color={v.color} size={16} />
                      ))}
                      {Array.from({ length: anonCount(p.id) }, (_, i) => (
                        <CrewmateSvg key={i} color={15} size={16} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Chat
            className="meeting-chat"
            channels={iAmDead ? ['meeting', 'ghost'] : ['meeting']}
            canSend={m.stage !== 'results' || true}
            placeholder={iAmDead ? 'Ghost chat (only ghosts see this)' : 'Discuss…'}
          />
        </div>
        <footer className="meeting-foot">
          <div className="skip-area">
            {canVote && pending !== 'skip' && (
              <button className="btn" onClick={() => setPending('skip')}>
                SKIP VOTE
              </button>
            )}
            {pending === 'skip' && (
              <span className="skip-confirm">
                Skip? <button className="btn small primary" onClick={() => vote('skip')}>Yes</button>{' '}
                <button className="btn small" onClick={() => setPending(null)}>No</button>
              </span>
            )}
            {res && (
              <div className="skip-chips">
                Skipped:
                {votersFor('skip').map((v) => (
                  <CrewmateSvg key={v.id} color={v.color} size={16} />
                ))}
                {Array.from({ length: anonCount('skip') }, (_, i) => (
                  <CrewmateSvg key={i} color={15} size={16} />
                ))}
              </div>
            )}
          </div>
          {iAmDead && <div className="meeting-note">You are dead — you can’t vote.</div>}
          {priv.vote && !res && <div className="meeting-note">Vote cast. Waiting for others…</div>}
        </footer>
      </div>
    </div>
  );
}
