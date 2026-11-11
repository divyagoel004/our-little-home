import { useState } from 'react';
import { X } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { useLive } from '../hooks/useLive';
import { deleteBoard, fetchBoard, postBoard } from '../services/home';
import { errorText, timeAgo } from '../lib/format';
import { Empty, ErrorBox, Loading } from './Ui';
import type { BoardMessage } from '../types';

const COLORS: BoardMessage['color'][] = ['blush', 'sage', 'champagne'];

export function Board() {
  const { me, nameOf, toast } = useHome();
  const live = useLive<BoardMessage[]>('board', fetchBoard, ['board_messages'], []);
  const [text, setText] = useState('');
  const [color, setColor] = useState<BoardMessage['color']>('blush');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await postBoard(me.id, text.trim().slice(0, 300), color); setText(''); await live.reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const del = async (id: string) => { try { await deleteBoard(id); await live.reload(); } catch (e) { toast(errorText(e), 'error'); } };

  return (
    <section className="stack" aria-labelledby="board-h">
      <h2 id="board-h" style={{ marginBottom: 0 }}>Our little message board</h2>
      <div className="card tight row" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: 1, minWidth: 200 }}><span className="sr">Leave a note</span>
          <input type="text" value={text} maxLength={300} placeholder="Leave a little note on the fridge…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void post()} />
        </label>
        <div className="row" style={{ gap: '.3rem' }} role="group" aria-label="Note colour">
          {COLORS.map((c) => <button key={c} aria-label={c} aria-pressed={color === c} className="icon-btn" style={{ background: `var(--${c === 'blush' ? 'blush' : c === 'sage' ? 'sage' : 'champagne'})`, outline: color === c ? '2px solid var(--brown)' : 'none' }} onClick={() => setColor(c)} />)}
        </div>
        <button className="btn primary" onClick={post} disabled={busy || !text.trim()}>Pin it ♡</button>
      </div>
      {live.error && <ErrorBox text={live.error} retry={() => void live.reload()} />}
      {live.loading ? <Loading rows={1} /> : live.data.length === 0 ? (
        <Empty title="The board is waiting">Pin the first little note for your love.</Empty>
      ) : (
        <div className="board">
          {live.data.map((m, i) => (
            <div key={m.id} className={`sticky ${m.color}`} style={{ ['--rot' as string]: `${((i * 37) % 7) - 3}deg` }}>
              {m.author_id === me.id && <button onClick={() => void del(m.id)} aria-label="Remove note"><X size={14} /></button>}
              {m.content}
              <small>{nameOf(m.author_id)} · {timeAgo(m.created_at)}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
