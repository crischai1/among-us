import { SETTINGS_SCHEMA, type GameSettings, type SettingDef } from '../../shared/settings';
import { send } from '../net/session';
import { useSession } from '../store/session';

function fmt(def: SettingDef, v: unknown): string {
  if (def.type === 'bool') return v ? 'On' : 'Off';
  if (def.type === 'select') return def.options.find((o) => o.value === v)?.label ?? String(v);
  return `${v}${def.unit ?? ''}`;
}

export function SettingsPanel({ settings, editable }: { settings: GameSettings; editable: boolean }) {
  const groups = [...new Set(SETTINGS_SCHEMA.map((d) => d.group))];
  const patch = (key: keyof GameSettings, value: unknown) => send({ t: 'setSettings', patch: { [key]: value } });
  return (
    <div className="settings">
      {!editable && <div className="settings-note">Only the host can change settings.</div>}
      {groups.map((g) => (
        <section key={g} className="settings-group">
          <h3>{g}</h3>
          {SETTINGS_SCHEMA.filter((d) => d.group === g).map((d) => {
            const v = settings[d.key];
            return (
              <div key={d.key} className="settings-row">
                <span>{d.label}</span>
                {editable ? (
                  d.type === 'number' ? (
                    <span className="stepper">
                      <button className="btn small" disabled={(v as number) <= d.min} onClick={() => patch(d.key, (v as number) - d.step)}>
                        −
                      </button>
                      <b>{fmt(d, v)}</b>
                      <button className="btn small" disabled={(v as number) >= d.max} onClick={() => patch(d.key, (v as number) + d.step)}>
                        +
                      </button>
                    </span>
                  ) : d.type === 'select' ? (
                    <span className="stepper">
                      {d.options.map((o) => (
                        <button key={o.value} className={`btn small ${o.value === v ? 'blue' : ''}`} onClick={() => patch(d.key, o.value)}>
                          {o.label}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <button className={`btn small ${v ? 'primary' : ''}`} onClick={() => patch(d.key, !v)}>
                      {v ? 'On' : 'Off'}
                    </button>
                  )
                ) : (
                  <b>{fmt(d, v)}</b>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const room = useSession((s) => s.room);
  const selfId = useSession((s) => s.selfId);
  if (!room) return null;
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel settings-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>
          ✕
        </button>
        <h2 className="outline-text">Game Settings</h2>
        <SettingsPanel settings={room.settings} editable={room.hostId === selfId && !room.inGame} />
      </div>
    </div>
  );
}
