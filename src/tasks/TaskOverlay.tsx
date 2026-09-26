import { useEffect, useRef, useState } from 'react';
import { TASK_DEFS } from '../../shared/rules/tasks';
import { closeOverlay, setTaskFinishing } from '../game/actions';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { TASK_GAMES } from './registry';
import { TASK_THEME } from './theme';

/** Extra wait so network jitter can't make the server see the task as finished too fast. */
const REPORT_MARGIN_MS = 500;

export function TaskOverlay({ stationId }: { stationId: string }) {
  const task = useGame((s) => s.priv?.tasks.find((t) => !t.done && t.stationId === stationId));
  const commsDown = useGame((s) => !!s.priv?.commsDown);
  const [done, setDone] = useState(false);
  const [snapshot] = useState(task);
  const openedAt = useRef(performance.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Comms sabotage hides the task list but shouldn't kick you out of a task.
    if (!task && !done && !commsDown) useGame.getState().set({ overlay: null });
  }, [task, done, commsDown]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      setTaskFinishing(false);
    },
    [],
  );

  const t = snapshot ?? task;
  if (!t) return null;
  const Game = TASK_GAMES[t.type];
  const complete = () => {
    if (done) return;
    setDone(true);
    setTaskFinishing(true);
    // The server enforces a minimum time per step; report only once that has safely passed.
    const minMs = TASK_DEFS[t.type].minMs[t.step] ?? 0;
    const wait = Math.max(0, minMs + REPORT_MARGIN_MS - (performance.now() - openedAt.current));
    timers.current.push(
      setTimeout(() => {
        send({ t: 'taskDone', stationId });
        setTaskFinishing(false);
      }, wait),
      setTimeout(() => useGame.getState().set({ overlay: null }), Math.max(900, wait + 250)),
    );
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
