import { useEffect, useRef, useState } from 'react';
import { MAX_CHAT_LENGTH } from '../../shared/constants';
import { send } from '../net/session';
import { useGame, type ChatMsg } from '../store/game';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';

const OPEN_EVENT = 'chat:open';
let focusPending = false;

/** Ask whichever chat is on screen (lobby, ghost or meeting) to open and focus its input. */
export function openChat(): void {
  focusPending = true;
  window.dispatchEvent(new Event(OPEN_EVENT));
  // A chat that mounts in response picks this up; don't let it linger if there's no chat at all.
  setTimeout(() => (focusPending = false), 200);
}

/** Collapsible chats use this to expand when `openChat()` is called. */
export function useOnOpenChat(cb: () => void): void {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const h = () => ref.current();
    window.addEventListener(OPEN_EVENT, h);
    return () => window.removeEventListener(OPEN_EVENT, h);
  }, []);
}

interface Props {
  channels: ChatMsg['channel'][];
  canSend: boolean;
  placeholder?: string;
  className?: string;
}

export function Chat({ channels, canSend, placeholder = 'Type a message…', className }: Props) {
  const chat = useGame((s) => s.chat);
  const selfId = useSession((s) => s.selfId);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgs = chat.filter((m) => channels.includes(m.channel));

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    useGame.getState().set({ unread: 0 });
  }, [msgs.length]);

  useEffect(() => {
    const focus = () => {
      focusPending = false;
      inputRef.current?.focus();
    };
    if (focusPending) focus();
    window.addEventListener(OPEN_EVENT, focus);
    return () => window.removeEventListener(OPEN_EVENT, focus);
  }, []);

  return (
    <div className={`chat ${className ?? ''}`}>
      <div className="chat-list" ref={listRef}>
        {msgs.length === 0 && <div className="chat-empty">No messages yet</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.fromId === selfId ? 'mine' : ''} ${m.dead ? 'dead' : ''}`}>
            <CrewmateSvg color={m.color} size={26} ghost={m.dead} />
            <div className="chat-bubble">
              <div className="chat-name">{m.name}</div>
              <div className="chat-text">{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t || !canSend) return;
          send({ t: 'chat', text: t });
          setText('');
        }}
      >
        <input
          ref={inputRef}
          className="field"
          value={text}
          disabled={!canSend}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={canSend ? placeholder : 'You can’t chat right now'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            // Esc hands the keyboard back to the game.
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
        />
        <button className="btn small" type="submit" disabled={!canSend || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
