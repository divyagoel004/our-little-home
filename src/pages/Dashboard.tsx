import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookHeart, BookOpen, Camera, Heart, Sprout, Pencil } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { useNow } from '../hooks/useNow';
import { clockIn, daysBetween, greetingFor, longDate, timeAgo } from '../lib/format';
import { MOODS, moodOf } from '../lib/moods';
import { saveMoodAndThought } from '../services/home';
import { errorText } from '../lib/format';
import { SurpriseCard } from '../components/Surprise';
import { Board } from '../components/Board';
import type { MoodKey } from '../types';

const SMALL = [
  'Take a breath. You are home.',
  'The kettle’s on. The lamp is warm.',
  'Someone out there is thinking of you.',
  'Nothing to prove here — only to be.',
  'Distance is just love taking the long way.',
  'Today can be small and still be good.',
];

export default function Dashboard() {
  const { me, partner, myMeter, partnerMeter, presenceOf, settings, toast, reloadAll } = useHome();
  const now = useNow(1000);
  const d = new Date(now);
  const mine = clockIn(me.timezone, d);
  const theirs = partner ? clockIn(partner.timezone, d) : null;
  const small = SMALL[Math.floor(now / 60000) % SMALL.length];
  const myPresence = partner ? presenceOf(partner.id) : null;

  const [editing, setEditing] = useState(false);
  const [thought, setThought] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = () => { setThought(myMeter?.daily_thought ?? ''); setMood(myMeter?.current_mood ?? null); setEditing(true); };
  const saveThought = async () => {
    setBusy(true);
    try { await saveMoodAndThought(me.id, mood, thought.trim().slice(0, 280)); reloadAll(); setEditing(false); toast('Saved ♡'); }
    catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  const together = settings?.anniversary_date ? daysBetween(settings.anniversary_date, d) : null;
  const hello = useMemo(() => (mine.hour >= 21 || mine.hour < 5 ? `${greetingFor(mine.hour)}, ${me.display_name} ♡` : `${greetingFor(mine.hour)}, ${me.display_name} ♡`), [mine.hour, me.display_name]);
  const pMood = moodOf(partnerMeter?.current_mood);
  const myMood = moodOf(myMeter?.current_mood);

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <motion.section className="hello" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1>{hello}</h1>
        <div className="hand">Hey, my love ♡ — {longDate(d)}</div>
        <p className="muted" style={{ margin: 0 }}>{small}</p>
      </motion.section>

      <section className="clocks" aria-label="Clocks">
        <div className="card clock">
          <div className="small muted">{me.display_name} · {mine.day}</div>
          <div className="time">{mine.time}</div>
          <div className="small muted">{myMood ? `${myMood.emoji} ${myMood.label}` : 'no mood set'}</div>
        </div>
        <div className="card clock">
          <div className="small muted">{partner ? `${partner.display_name} · ${theirs?.day}` : 'Waiting for your love'}</div>
          <div className="time">{theirs ? theirs.time : '—'}</div>
          <div className="small muted">
            {pMood ? `${pMood.emoji} ${pMood.label} · ` : ''}
            {partner && (myPresence ? `last here ${timeAgo(myPresence.last_seen_at, now)}` : 'last seen is private')}
          </div>
        </div>
        <div className="card clock">
          <div className="small muted">Days together</div>
          <div className="time">{together !== null ? (together >= 0 ? together.toLocaleString() : '—') : '♡'}</div>
          <div className="small muted">{together !== null ? (together >= 0 ? 'and counting' : 'counting down…') : 'set our anniversary in settings'}</div>
        </div>
      </section>

      <section className="grid2" aria-label="Thoughts of the day">
        <div className="card stack" style={{ gap: '.5rem' }}>
          <div className="row between"><h3 style={{ margin: 0 }}>My thought today</h3>{!editing && <button className="btn small" onClick={startEdit}><Pencil size={14} /> Edit</button>}</div>
          {editing ? (
            <>
              <textarea value={thought} maxLength={280} onChange={(e) => setThought(e.target.value)} placeholder="One little thought for today…" />
              <div className="mood-grid">
                {MOODS.map((m) => <button key={m.key} className={`mood-opt ${mood === m.key ? 'sel' : ''}`} onClick={() => setMood(mood === m.key ? null : m.key)} aria-pressed={mood === m.key}>{m.emoji} {m.label}</button>)}
              </div>
              <div className="row"><button className="btn primary" onClick={saveThought} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button className="btn" onClick={() => setEditing(false)}>Cancel</button></div>
            </>
          ) : myMeter?.daily_thought ? (
            <><p className="hand" style={{ margin: 0 }}>“{myMeter.daily_thought}”</p><div className="small muted">updated {timeAgo(myMeter.thought_updated_at, now)}</div></>
          ) : <p className="muted" style={{ margin: 0 }}>You haven’t shared a thought yet today.</p>}
        </div>
        <div className="card stack" style={{ gap: '.5rem' }}>
          <h3 style={{ margin: 0 }}>{partner ? `${partner.display_name}’s thought today` : 'Their thought today'}</h3>
          {partnerMeter?.daily_thought ? (
            <><p className="hand" style={{ margin: 0 }}>“{partnerMeter.daily_thought}”</p><div className="small muted">updated {timeAgo(partnerMeter.thought_updated_at, now)}</div></>
          ) : <p className="muted" style={{ margin: 0 }}>Nothing yet — it will appear here the moment they write it.</p>}
        </div>
      </section>

      <SurpriseCard />

      <nav className="tiles" aria-label="Rooms">
        <Link className="tile" to="/my-diary"><BookHeart /><h3>My Diary</h3><span className="small muted">Write today down</span></Link>
        <Link className="tile" to="/their-diary"><BookOpen /><h3>Your Diary</h3><span className="small muted">Read what’s shared with you</span></Link>
        <Link className="tile" to="/feelings"><Heart /><h3>Our Feelings</h3><span className="small muted">Miss you · Love you</span></Link>
        <Link className="tile" to="/future"><Sprout /><h3>Future Us</h3><span className="small muted">Letters to open later</span></Link>
        <Link className="tile" to="/memories"><Camera /><h3>Our Little Memories</h3><span className="small muted">Polaroids &amp; moments</span></Link>
      </nav>

      <Board />
    </div>
  );
}
