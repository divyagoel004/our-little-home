import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { useLive } from '../hooks/useLive';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { createMemory, deleteMemory, fetchMemories, updateMemory } from '../services/home';
import { removePhoto, uploadPhoto } from '../services/storage';
import { errorText, localDateKey, longDate } from '../lib/format';
import { Empty, ErrorBox, Loading, Modal, PageHead } from '../components/Ui';
import type { Memory } from '../types';

type View = 'polaroid' | 'scrapbook' | 'timeline';

function Editor({ open, onClose, memory, onSaved }: { open: boolean; onClose: () => void; memory: Memory | null; onSaved: () => void }) {
  const { me, toast } = useHome();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(localDateKey());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drop, setDrop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const urls = useSignedUrls([memory?.image_url]);

  useEffect(() => {
    if (!open) return;
    setTitle(memory?.title ?? ''); setDesc(memory?.description ?? ''); setDate(memory?.memory_date ?? localDateKey()); setFile(null); setDrop(false); setErr(null);
  }, [open, memory]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u);
  }, [file]);

  const shown = preview ?? (!drop && memory?.image_url ? urls[memory.image_url] : null);

  const save = async () => {
    setErr(null);
    if (!title.trim()) return setErr('Give this memory a little caption ♡');
    setBusy(true);
    let newPath: string | null = null;
    try {
      let image = drop ? null : memory?.image_url ?? null;
      if (file) { newPath = await uploadPhoto('memories', me.id, file); image = newPath; }
      const body = { title: title.trim().slice(0, 140), description: desc.trim(), image_url: image, memory_date: date };
      if (memory) await updateMemory(memory.id, body); else await createMemory(me.id, body);
      if (memory?.image_url && memory.image_url !== image) await removePhoto(memory.image_url);
      toast('Added to our wall ♡'); onSaved(); onClose();
    } catch (e) { if (newPath) await removePhoto(newPath); setErr(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={memory ? 'Edit this memory' : 'Pin a memory'}>
      <div className="stack">
        {shown && <img src={shown} alt="Chosen" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 14 }} />}
        <div className="row">
          <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDrop(false); e.target.value = ''; }} />
          <button className="btn small" onClick={() => ref.current?.click()}><ImagePlus size={16} /> {shown ? 'Change photo' : 'Add photo'}</button>
          {shown && <button className="btn small danger" onClick={() => { setFile(null); setDrop(true); }}><X size={14} /> Remove</button>}
        </div>
        <label className="field">Caption <input type="text" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The night we…" /></label>
        <label className="field">The story <textarea value={desc} maxLength={5000} onChange={(e) => setDesc(e.target.value)} /></label>
        <label className="field">When was it? <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        {err && <div className="error-box" role="alert">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save ♡'}</button></div>
      </div>
    </Modal>
  );
}

export default function Memories() {
  const { me, nameOf, toast } = useHome();
  const live = useLive<Memory[]>('memories', fetchMemories, ['memories'], []);
  const urls = useSignedUrls(live.data.map((m) => m.image_url));
  const [view, setView] = useState<View>('polaroid');
  const [editor, setEditor] = useState<{ open: boolean; memory: Memory | null }>({ open: false, memory: null });
  const [del, setDel] = useState<Memory | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteMemory(del.id); await removePhoto(del.image_url); toast('Memory removed.'); setDel(null); await live.reload(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  const Tools = ({ m }: { m: Memory }) => m.author_id === me.id ? (
    <div className="row" style={{ marginTop: '.4rem' }}>
      <button className="btn small" onClick={() => setEditor({ open: true, memory: m })} aria-label={`Edit ${m.title}`}><Pencil size={13} /></button>
      <button className="btn small danger" onClick={() => setDel(m)} aria-label={`Delete ${m.title}`}><Trash2 size={13} /></button>
    </div>
  ) : null;

  const Card = ({ m, i }: { m: Memory; i: number }) => (
    <figure className="polaroid" style={{ ['--rot' as string]: `${((i * 53) % 9) - 4}deg` }}>
      <span className="tape" aria-hidden />
      {m.image_url ? (urls[m.image_url] ? <img src={urls[m.image_url]} alt={m.title} loading="lazy" /> : <div className="ph skeleton" />) : <div className="ph">💗</div>}
      <figcaption>
        <div className="t">{m.title}</div>
        <div className="small muted">{longDate(m.memory_date)} · by {nameOf(m.author_id)}</div>
        {m.description && <p className="small" style={{ margin: '.3rem 0 0', whiteSpace: 'pre-wrap' }}>{m.description}</p>}
        <Tools m={m} />
      </figcaption>
    </figure>
  );

  return (
    <div className="stack">
      <PageHead title="Our Little Memories" hand="tiny moments, pinned forever">
        <div className="row">
          <button className="btn primary" onClick={() => setEditor({ open: true, memory: null })}><Plus size={18} /> Pin a memory</button>
          <div className="seg" role="group" aria-label="Wall style">
            <button className={view === 'polaroid' ? 'on' : ''} onClick={() => setView('polaroid')}>Polaroids</button>
            <button className={view === 'scrapbook' ? 'on' : ''} onClick={() => setView('scrapbook')}>Scrapbook</button>
            <button className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')}>Timeline</button>
          </div>
        </div>
      </PageHead>
      {live.error && <ErrorBox text={live.error} retry={() => void live.reload()} />}
      {live.loading ? <Loading rows={2} /> : live.data.length === 0 ? (
        <Empty title="Our wall is waiting">Pin the first photo or moment — the two of you will fill this in over the years.</Empty>
      ) : view === 'timeline' ? (
        <div className="tl">
          {live.data.map((m) => (
            <div key={m.id} className="tl-item">
              <div className="hand">{longDate(m.memory_date)}</div>
              <h3 style={{ margin: 0 }}>{m.title}</h3>
              {m.description && <p style={{ whiteSpace: 'pre-wrap', margin: '.2rem 0' }}>{m.description}</p>}
              {m.image_url && urls[m.image_url] && <img src={urls[m.image_url]} alt={m.title} loading="lazy" />}
              <div className="small muted">by {nameOf(m.author_id)}</div>
              <Tools m={m} />
            </div>
          ))}
        </div>
      ) : (
        <div className={view === 'polaroid' ? 'polaroids' : 'scrap'}>{live.data.map((m, i) => <Card key={m.id} m={m} i={i} />)}</div>
      )}
      <Editor open={editor.open} memory={editor.memory} onClose={() => setEditor({ open: false, memory: null })} onSaved={() => void live.reload()} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove this memory?">
        <p>“{del?.title}” will be removed from the wall for both of you.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={() => setDel(null)}>Keep it</button><button className="btn danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Removing…' : 'Remove'}</button></div>
      </Modal>
    </div>
  );
}
