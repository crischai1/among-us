import { useEffect, useRef, useState } from 'react';
import { MAX_CHAT_LENGTH } from '../../shared/constants';
import { send } from '../net/session';
import { useGame, type ChatMsg } from '../store/game';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';

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
  const msgs = chat.filter((m) => channels.includes(m.channel));

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    useGame.getState().set({ unread: 0 });
  }, [msgs.length]);

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
          className="field"
          value={text}
          disabled={!canSend}
          maxLength={MAX_CHAT_LENGTH}
          placeholder={canSend ? placeholder : 'You can’t chat right now'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button className="btn small" type="submit" disabled={!canSend || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
