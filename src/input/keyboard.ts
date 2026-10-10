/** Keyboard state for movement plus one-shot action keys. */
import { stickInput } from './touch';

const down = new Set<string>();
type ActionHandler = (key: string, e: KeyboardEvent) => void;
const handlers = new Set<ActionHandler>();

const isTyping = (): boolean => {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
};

export function installKeyboard(): () => void {
  const onDown = (e: KeyboardEvent) => {
    if (isTyping()) {
      if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'tab') e.preventDefault();
    if (k === ' ' && e.target === document.body) e.preventDefault();
    if (!down.has(k)) handlers.forEach((h) => h(k, e));
    down.add(k);
  };
  const onUp = (e: KeyboardEvent) => down.delete(e.key.toLowerCase());
  const onBlur = () => down.clear();
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', onBlur);
  };
}

export function onAction(h: ActionHandler): () => void {
  handlers.add(h);
  return () => handlers.delete(h);
}

export function moveInput(): { dx: number; dy: number } {
  if (isTyping()) return { dx: 0, dy: 0 };
  const l = down.has('a') || down.has('arrowleft');
  const r = down.has('d') || down.has('arrowright');
  const u = down.has('w') || down.has('arrowup');
  const d = down.has('s') || down.has('arrowdown');
  if (l || r || u || d) return { dx: (r ? 1 : 0) - (l ? 1 : 0), dy: (d ? 1 : 0) - (u ? 1 : 0) };
  return stickInput();
}
