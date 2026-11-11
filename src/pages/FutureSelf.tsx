import { useEffect, useState } from 'react';
import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHome } from '../hooks/HomeContext';
import { useLive } from '../hooks/useLive';
import { useNow } from '../hooks/useNow';
import { createFutureNote, deleteFutureNote, fetchFutureNotes, updateFutureNote } from '../services/home';
import { countdownParts, errorText, localDateKey, longDate } from '../lib/format';
import { Empty, ErrorBox, Loading, Modal, PageHead } from '../components/Ui';
import type { FutureNote } from '../types';

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateKey(d); };

function Countdown({ date, onDone }: { date: string; onDone: () => void }) {
  const now = useNow(1000);
  const p = countdownParts(date, now);
  useEffect(() => { if (p.done) onDone(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [p.done]);
  return (
    <div className="countdown" role="timer" aria-label="Time until this letter opens">
      {([['days', p.days], ['hrs', p.hours], ['min', p.minutes], ['sec', p.seconds]] as const).map(([l, v]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><small>{l}</small></div>)}
    </div>
  );
}

function Editor({ open, onClose, note, onSaved }: { open: boolean; onClose: () => void; note: FutureNote | null; onSaved: () => void }) {
  const { toast } = useHome();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(tomorrow());
  const [vis, setVis] = useState<'private' | 'shared'>('private');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? ''); setContent(''); setDate(note?.opening_date ?? tomorrow()); setVis(note?.visibility ?? 'private'); setErr(null);
  }, [open, note]);

  const save = async () => {
    setErr(null);
    if (!note && !content.trim()) return setErr('Write your letter first ♡');
    if (date < tomorrow()) return setErr('Choose a day in the future — the letter needs time to wait.');
    setBusy(true);
    try {
      const payload = { title: title.trim(), content, opening_date: date, visibility: vis };
      if (note) await updateFutureNote(note.id, payload); else await createFutureNote(payload);
      toast(note ? 'Letter updated ♡' : 'Sealed until then ♡');
      onSaved(); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={note ? 'Change this sealed letter' : 'Seal a letter'}>
      <div className="stack">
        <label className="field">Title <input type="text" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Open when…" /></label>
        <label className="field">Your letter
          <textarea style={{ minHeight: 180 }} value={content} onChange={(e) => setContent(e.target.value)} />
          {note && <span className="hint">Sealed letters can’t be read, even by you. Leave this empty to keep exactly what you wrote; type here to replace it.</span>}
        </label>
        <label className="field">Opening date <input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} />
          <span className="hint">It stays completely locked — for everyone — until this day.</span></label>
        <div className="vis-grid" role="radiogroup" aria-label="Who can read it when it opens">
          <button type="button" role="radio" aria-checked={vis === 'private'} className={`vis-opt ${vis === 'private' ? 'sel' : ''}`} onClick={() => setVis('private')}><b><Lock size={16} /> Private</b><span className="small muted">Just for future me</span></button>
          <button type="button" role="radio" aria-checked={vis === 'shared'} className={`vis-opt ${vis === 'shared' ? 'sel' : ''}`} onClick={() => setVis('shared')}><b><LockOpen size={16} /> Shared</b><span className="small muted">We both read it when it opens</span></button>
        </div>
        {err && <div className="error-box" role="alert">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Sealing…' : note ? 'Save changes' : 'Seal it ♡'}</button></div>
      </div>
    </Modal>
  );
}

export default function FutureSelf() {
  const { me, nameOf, toast } = useHome();
  const live = useLive<FutureNote[]>('future', fetchFutureNotes, [], []);
  const [editor, setEditor] = useState<{ open: boolean; note: FutureNote | null }>({ open: false, note: null });
  const [del, setDel] = useState<FutureNote | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteFutureNote(del.id); toast('The letter is gone.'); setDel(null); await live.reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  const locked = live.data.filter((n) => n.is_locked);
  const opened = live.data.filter((n) => !n.is_locked).sort((a, b) => (a.opening_date < b.opening_date ? 1 : -1));

  return (
    <div className="stack">
      <PageHead title="Letters to Our Future Selves ♡" hand="write now, open later">
        <p className="muted">A sealed letter stays locked until its day — the words aren’t even sent to the screen before then.</p>
        <button className="btn primary" onClick={() => setEditor({ open: true, note: null })}><Plus size={18} /> Seal a new letter</button>
      </PageHead>
      {live.error && <ErrorBox text={live.error} retry={() => void live.reload()} />}
      {live.loading ? <Loading rows={2} /> : live.data.length === 0 ? (
        <Empty title="No letters waiting yet">Write one to the two of you, a year from now. Future-you will be so glad.</Empty>
      ) : (
        <>
          {locked.length > 0 && <h2>Still sealed</h2>}
          {locked.map((n) => {
            const mineN = n.author_id === me.id;
            return (
              <motion.div key={n.id} className="card letter-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="seal"><Lock size={22} /></div>
                <div className="stack" style={{ gap: '.5rem', flex: 1, minWidth: 0 }}>
                  <div><h3 style={{ margin: 0 }}>{mineN ? n.title || 'A letter to future me' : `A letter from ${nameOf(n.author_id)}`}</h3>
                    <div className="small muted">Opens {longDate(n.opening_date)} · {n.visibility === 'shared' ? 'shared with both of us' : 'private'}</div></div>
                  <Countdown date={n.opening_date} onDone={() => void live.reload()} />
                  {mineN && (
                    <div className="row">
                      <button className="btn small" onClick={() => setEditor({ open: true, note: n })}><Pencil size={14} /> Change</button>
                      <button className="btn small danger" onClick={() => setDel(n)}><Trash2 size={14} /> Delete</button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {opened.length > 0 && <h2 style={{ marginTop: '1rem' }}>Opened</h2>}
          {opened.map((n) => (
            <motion.div key={n.id} className="card stack" style={{ gap: '.6rem' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="row"><div className="seal" style={{ background: 'radial-gradient(circle at 35% 30%, #cbd7c2, #9fb093)' }}><LockOpen size={22} /></div>
                <div><h3 style={{ margin: 0 }}>{n.title || (n.author_id === me.id ? 'A letter to future me' : `A letter from ${nameOf(n.author_id)}`)}</h3>
                  <div className="small muted">From {nameOf(n.author_id)} · opened {longDate(n.opening_date)}</div></div></div>
              <div className="letter-open">{n.content}</div>
            </motion.div>
          ))}
        </>
      )}
      <Editor open={editor.open} note={editor.note} onClose={() => setEditor({ open: false, note: null })} onSaved={() => void live.reload()} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this sealed letter?">
        <p>It hasn’t opened yet, so it can still be deleted. This can’t be undone.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={() => setDel(null)}>Keep it</button><button className="btn danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button></div>
      </Modal>
    </div>
  );
}
