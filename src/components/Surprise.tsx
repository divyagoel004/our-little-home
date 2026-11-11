import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { useLive } from '../hooks/useLive';
import { createSurprise, deleteSurprise, fetchSurprises } from '../services/home';
import { errorText } from '../lib/format';
import { Modal } from './Ui';
import type { Surprise, SurpriseCategory } from '../types';

const CATS: { key: SurpriseCategory; label: string }[] = [
  { key: 'love_note', label: 'Love note' },
  { key: 'reason', label: 'A reason I love you' },
  { key: 'question', label: 'A question for us' },
  { key: 'affirmation', label: 'A little affirmation' },
];

export function SurpriseCard() {
  const { me, nameOf, toast, burstHearts } = useHome();
  const live = useLive<Surprise[]>('surprises', fetchSurprises, ['daily_surprises'], []);
  const [current, setCurrent] = useState<Surprise | null>(null);
  const [manage, setManage] = useState(false);
  const [text, setText] = useState('');
  const [cat, setCat] = useState<SurpriseCategory>('love_note');
  const [busy, setBusy] = useState(false);

  const give = () => {
    const pool = live.data;
    if (!pool.length) return;
    // prefer notes written by my love, but include mine too
    const theirs = pool.filter((s) => s.author_id !== me.id);
    const from = theirs.length && Math.random() < 0.75 ? theirs : pool;
    let next = from[Math.floor(Math.random() * from.length)];
    if (from.length > 1 && current && next.id === current.id) next = from.find((s) => s.id !== current.id) ?? next;
    setCurrent(next);
    burstHearts();
  };

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await createSurprise(me.id, text.trim().slice(0, 500), cat);
      setText('');
      await live.reload();
      toast('Tucked away for later ♡');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    try { await deleteSurprise(id); await live.reload(); if (current?.id === id) setCurrent(null); } catch (e) { toast(errorText(e), 'error'); }
  };

  return (
    <section className="surprise-box" aria-labelledby="surp-h">
      <h2 id="surp-h" style={{ marginBottom: '.2rem' }}>A Little Something for You ♡</h2>
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.id} initial={{ opacity: 0, scale: .96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="surprise-text">“{current.content}”</div>
            <div className="small muted">{CATS.find((c) => c.key === current.category)?.label} · from {nameOf(current.author_id)}</div>
          </motion.div>
        ) : (
          <motion.p key="none" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {live.data.length ? 'Press the button for something just for you.' : 'Nothing is tucked away yet — write the first little surprise for each other.'}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="row" style={{ justifyContent: 'center', marginTop: '.8rem' }}>
        <button className="btn primary" onClick={give} disabled={!live.data.length}><Gift size={18} /> Give Me A Little Surprise</button>
        <button className="btn small" onClick={() => setManage(true)}><Plus size={14} /> Write one</button>
      </div>
      <Modal open={manage} onClose={() => setManage(false)} title="Surprises we've written">
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>Every surprise is written by one of us — nothing here is auto-generated.</p>
          <label className="field">What would you like them to find?
            <textarea value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Write it in your own words…" />
          </label>
          <div className="row">{CATS.map((c) => <button key={c.key} className={`chip btnish ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>{c.label}</button>)}</div>
          <button className="btn primary" onClick={add} disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Tuck it away ♡'}</button>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
          {live.data.length === 0 && <p className="muted">No surprises yet.</p>}
          {live.data.map((s) => (
            <div key={s.id} className="row between card tight">
              <div style={{ minWidth: 0, flex: 1 }}>“{s.content}”<div className="small muted">{nameOf(s.author_id)} · {CATS.find((c) => c.key === s.category)?.label}</div></div>
              {s.author_id === me.id && <button className="icon-btn" onClick={() => void del(s.id)} aria-label="Delete surprise"><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}
