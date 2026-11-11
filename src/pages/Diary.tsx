import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Search, Trash2, Users, Heart, List } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { useLive } from '../hooks/useLive';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { deleteDiary, fetchDiary } from '../services/home';
import { removePhoto } from '../services/storage';
import { errorText, localDateKey, longDate, parseDateKey, timeOf } from '../lib/format';
import { MOODS, moodOf } from '../lib/moods';
import { Empty, ErrorBox, Loading, Modal, PageHead } from '../components/Ui';
import { DiaryEditor, visibilityText } from '../components/DiaryEditor';
import type { DiaryEntry, MoodKey } from '../types';

const QUESTIONS: [keyof DiaryEntry, string][] = [
  ['content', 'What happened today'],
  ['day_feeling', 'How my day was'],
  ['thinking_about', 'What I’m thinking about'],
  ['wish_to_tell', 'Something I wish I could tell you'],
  ['grateful_for', 'I’m grateful for'],
];

const entryDay = (e: DiaryEntry) => localDateKey(new Date(e.created_at));

function Page({ e, mine, urls, onEdit, onDelete, pName }: { e: DiaryEntry; mine: boolean; urls: Record<string, string>; onEdit: () => void; onDelete: () => void; pName: string }) {
  const m = moodOf(e.mood);
  const v = visibilityText(e.visibility, pName);
  const Icon = e.visibility === 'private' ? Lock : e.visibility === 'both' ? Users : Heart;
  return (
    <motion.article className="journal" layout initial={{ opacity: 0, rotateY: -14, y: 12 }} animate={{ opacity: 1, rotateY: 0, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45 }} style={{ transformOrigin: 'left center' }}>
      <h3>{e.title || 'A little page'}</h3>
      <div className="meta">
        <span className="muted">{longDate(e.created_at)} · {timeOf(e.created_at)}</span>
        {m && <span className="chip" style={{ background: m.color }}>{m.emoji} {m.label}</span>}
        {mine && <span className="chip"><Icon size={12} /> {v.label}</span>}
      </div>
      {QUESTIONS.map(([k, q]) => (e[k] ? <div key={k}><div className="q">{q}</div><p className="a">{String(e[k])}</p></div> : null))}
      {e.photo_url && (urls[e.photo_url] ? <img className="photo" src={urls[e.photo_url]} alt={e.title || 'Attached photo'} loading="lazy" /> : <div className="skeleton" style={{ marginTop: '.8rem' }} />)}
      {mine && (
        <div className="row" style={{ marginTop: '.8rem' }}>
          <button className="btn small" onClick={onEdit}><Pencil size={14} /> Edit</button>
          <button className="btn small danger" onClick={onDelete}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </motion.article>
  );
}

function Calendar({ entries, selected, onSelect }: { entries: DiaryEntry[]; selected: string | null; onSelect: (k: string | null) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const days = useMemo(() => { const s = new Map<string, number>(); entries.forEach((e) => s.set(entryDay(e), (s.get(entryDay(e)) ?? 0) + 1)); return s; }, [entries]);
  const first = cursor.getDay();
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const today = localDateKey();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const key = (day: number) => localDateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day, 12));
  return (
    <div className="card stack" style={{ gap: '.6rem' }}>
      <div className="row between">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
        <h3 style={{ margin: 0 }}>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <button className="icon-btn" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
      </div>
      <div className="cal" role="grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="dow">{d}</div>)}
        {cells.map((d, i) => d === null ? <div key={`b${i}`} className="blank" /> : (
          <button key={d} className={`${days.has(key(d)) ? 'has' : ''} ${selected === key(d) ? 'sel' : ''} ${today === key(d) ? 'today' : ''}`} onClick={() => onSelect(selected === key(d) ? null : key(d))} aria-label={`${key(d)}${days.has(key(d)) ? `, ${days.get(key(d))} entries` : ''}`}>
            {d}{days.has(key(d)) && <span className="dot">♥</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Diary({ whose }: { whose: 'mine' | 'theirs' }) {
  const { me, partner, toast } = useHome();
  const mine = whose === 'mine';
  const live = useLive<DiaryEntry[]>('diary', fetchDiary, ['diary_entries'], []);
  const [q, setQ] = useState('');
  const [moodF, setMoodF] = useState<MoodKey | null>(null);
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [day, setDay] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; entry: DiaryEntry | null }>({ open: false, entry: null });
  const [del, setDel] = useState<DiaryEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const ownerId = mine ? me.id : partner?.id;
  const base = useMemo(() => live.data.filter((e) => e.author_id === ownerId && (mine || e.visibility !== 'private')), [live.data, ownerId, mine]);
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => base.filter((e) => {
    if (moodF && e.mood !== moodF) return false;
    if (day && entryDay(e) !== day) return false;
    if (needle && !`${e.title} ${e.content} ${e.day_feeling} ${e.thinking_about} ${e.wish_to_tell} ${e.grateful_for}`.toLowerCase().includes(needle)) return false;
    return true;
  }), [base, moodF, day, needle]);

  const groups = useMemo(() => {
    const m = new Map<string, DiaryEntry[]>();
    filtered.forEach((e) => { const k = entryDay(e); m.set(k, [...(m.get(k) ?? []), e]); });
    return [...m.entries()];
  }, [filtered]);

  const urls = useSignedUrls(filtered.map((e) => e.photo_url));
  const pName = partner?.display_name ?? 'your love';

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteDiary(del.id); await removePhoto(del.photo_url); toast('That page is gone.'); setDel(null); await live.reload(); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <PageHead title={mine ? 'My Diary' : `${partner?.display_name ?? 'Your love'}’s Diary`} hand={mine ? 'a page for every feeling' : 'only the pages they chose to share with you'}>
        {mine && <button className="btn primary" onClick={() => setEditor({ open: true, entry: null })}><Plus size={18} /> Write a new page</button>}
      </PageHead>

      <div className="card tight stack" style={{ gap: '.7rem' }}>
        <div className="row">
          <label className="field" style={{ flex: 1, minWidth: 180 }}><span className="sr">Search</span>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 14, opacity: .6 }} />
              <input type="search" placeholder="Search the pages…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
          </label>
          <div className="seg" role="group" aria-label="View">
            <button className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')}><List size={14} style={{ verticalAlign: -2 }} /> Timeline</button>
            <button className={view === 'calendar' ? 'on' : ''} onClick={() => setView('calendar')}><CalendarDays size={14} style={{ verticalAlign: -2 }} /> Calendar</button>
          </div>
        </div>
        <div className="row" style={{ gap: '.35rem' }} aria-label="Filter by mood">
          <button className={`chip btnish ${moodF === null ? 'active' : ''}`} onClick={() => setMoodF(null)}>All moods</button>
          {MOODS.map((m) => <button key={m.key} className={`chip btnish ${moodF === m.key ? 'active' : ''}`} onClick={() => setMoodF(moodF === m.key ? null : m.key)} aria-pressed={moodF === m.key}>{m.emoji} {m.label}</button>)}
        </div>
      </div>

      {view === 'calendar' && <Calendar entries={base} selected={day} onSelect={setDay} />}
      {day && <div className="row"><span className="chip active">{longDate(parseDateKey(day))}</span><button className="btn small" onClick={() => setDay(null)}>Show all days</button></div>}

      {live.error && <ErrorBox text={live.error} retry={() => void live.reload()} />}
      {live.loading ? <Loading rows={3} /> : !mine && !partner ? (
        <Empty title="Waiting for your love">Their diary will live here once they’ve joined.</Empty>
      ) : base.length === 0 ? (
        mine ? <Empty title="A blank first page">Nothing written yet. Tell today to the page — it’s only for whoever you choose.</Empty>
             : <Empty title="Nothing shared yet">When {pName} shares a page with you, it will appear here, softly and instantly ♡</Empty>
      ) : filtered.length === 0 ? (
        <Empty title="No pages like that">Try a different word, mood or day.</Empty>
      ) : (
        <AnimatePresence initial={false}>
          {groups.map(([k, list]) => (
            <section key={k} className="timeline-group">
              <h4>{longDate(parseDateKey(k))}</h4>
              <div className="stack">
                {list.map((e) => <Page key={e.id} e={e} mine={mine} urls={urls} pName={pName} onEdit={() => setEditor({ open: true, entry: e })} onDelete={() => setDel(e)} />)}
              </div>
            </section>
          ))}
        </AnimatePresence>
      )}

      <DiaryEditor open={editor.open} entry={editor.entry} onClose={() => setEditor({ open: false, entry: null })} onSaved={() => void live.reload()} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove this page?">
        <p>“{del?.title || 'A little page'}” will be deleted for good — for you and for anyone it was shared with.</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setDel(null)}>Keep it</button>
          <button className="btn danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Removing…' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
