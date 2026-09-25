import { useEffect, useState } from 'react';
import { closeOverlay } from '../game/actions';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { TASK_GAMES } from './registry';
import { TASK_THEME } from './theme';

export function TaskOverlay({ stationId }: { stationId: string }) {
  const task = useGame((s) => s.priv?.tasks.find((t) => !t.done && t.stationId === stationId));
  const [done, setDone] = useState(false);
  const [snapshot] = useState(task);

  useEffect(() => {
    if (!task && !done) useGame.getState().set({ overlay: null });
  }, [task, done]);

  const t = snapshot ?? task;
  if (!t) return null;
  const Game = TASK_GAMES[t.type];
  const complete = () => {
    if (done) return;
    setDone(true);
    send({ t: 'taskDone', stationId });
    setTimeout(() => useGame.getState().set({ overlay: null }), 900);
  };

  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div
        className="panel task-frame"
        style={{ '--task-accent': TASK_THEME[t.type].color } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <div className="task-title">
          <span className="task-title-icon">{TASK_THEME[t.type].icon}</span>
          {t.name} <span>· {t.room}</span>
          {t.steps > 1 && <span className="task-steps">Step {t.step + 1} of {t.steps}</span>}
        </div>
        <div className="task-body">
          <Game step={t.step} params={t.params} onComplete={complete} />
          {done && <div className="task-complete outline-text">Task Completed!</div>}
        </div>
      </div>
    </div>
  );
}
