import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Lock, Users, Heart, X } from 'lucide-react';
import { Modal } from './Ui';
import { MOODS } from '../lib/moods';
import { errorText, longDate } from '../lib/format';
import { useHome } from '../hooks/HomeContext';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { createDiary, updateDiary } from '../services/home';
import { removePhoto, uploadPhoto } from '../services/storage';
import type { DiaryDraft, DiaryEntry, Visibility } from '../types';

const blank: DiaryDraft = { title: '', content: '', day_feeling: '', thinking_about: '', wish_to_tell: '', grateful_for: '', mood: 'peaceful', visibility: 'private', photo_url: null };

export function visibilityText(v: Visibility, partnerName: string): { label: string; sentence: string } {
  if (v === 'private') return { label: 'Just for me', sentence: 'Only you can read this entry. Nobody else can see it.' };
  if (v === 'partner') return { label: `For ${partnerName}`, sentence: `${partnerName} will be able to read this entry in “Your Diary”.` };
  return { label: 'For both of us', sentence: `This entry is shared — you and ${partnerName} can both read it.` };
}

export function DiaryEditor({ open, onClose, entry, onSaved }: { open: boolean; onClose: () => void; entry: DiaryEntry | null; onSaved: () => void }) {
  const { me, partner, toast } = useHome();
  const pName = partner?.display_name ?? 'your love';
  const [d, setD] = useState<DiaryDraft>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePic, setRemovePic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urls = useSignedUrls([entry?.photo_url]);

  useEffect(() => {
    if (!open) return;
    setD(entry ? { title: entry.title, content: entry.content, day_feeling: entry.day_feeling, thinking_about: entry.thinking_about, wish_to_tell: entry.wish_to_tell, grateful_for: entry.grateful_for, mood: entry.mood, visibility: entry.visibility, photo_url: entry.photo_url } : blank);
    setFile(null); setPreview(null); setRemovePic(false); setErr(null);
  }, [open, entry]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const set = <K extends keyof DiaryDraft>(k: K, v: DiaryDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const vis = visibilityText(d.visibility, pName);

  const save = async () => {
    setErr(null);
    if (!(d.title + d.content + d.day_feeling + d.thinking_about + d.wish_to_tell + d.grateful_for).trim()) {
      setErr('Write at least a little something first ♡');
      return;
    }
    setBusy(true);
    let newPath: string | null = null;
    try {
      let photo = removePic ? null : d.photo_url;
      if (file) { newPath = await uploadPhoto('diary', me.id, file); photo = newPath; }
      const draft = { ...d, photo_url: photo };
      if (entry) await updateDiary(entry.id, draft); else await createDiary(me.id, draft);
      if (entry?.photo_url && entry.photo_url !== photo) await removePhoto(entry.photo_url);
      toast(entry ? 'Entry updated ♡' : 'Saved to your diary ♡');
      onSaved();
      onClose();
    } catch (e) {
      if (newPath) await removePhoto(newPath);
      setErr(`Your words are safe here — but saving didn’t work: ${errorText(e)}`);
    } finally { setBusy(false); }
  };

  const shownPhoto = preview ?? (!removePic && d.photo_url ? urls[d.photo_url] : null);

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit this page' : 'A new page'}>
      <div className="stack">
        <div className="small muted">{longDate(entry ? entry.created_at : new Date())}</div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700, marginBottom: '.4rem' }}>Who can read this page?</legend>
          <div className="vis-grid" role="radiogroup" aria-label="Who can read this page">
            {([
              ['private', Lock, 'Just for me', 'Only I can read it'],
              ['partner', Heart, `For ${pName}`, 'Shared with my love'],
              ['both', Users, 'For both of us', 'We both read it'],
            ] as const).map(([k, Icon, t, s]) => (
              <button key={k} type="button" role="radio" aria-checked={d.visibility === k} className={`vis-opt ${d.visibility === k ? 'sel' : ''}`} onClick={() => set('visibility', k)}>
                <b><Icon size={16} /> {t}</b><span className="small muted">{s}</span>
              </button>
            ))}
          </div>
          <div className={`vis-banner ${d.visibility}`} style={{ marginTop: '.6rem' }} role="status">
            {d.visibility === 'private' ? <Lock size={18} /> : <Users size={18} />}
            <span><b>{vis.label}.</b> {vis.sentence}</span>
          </div>
        </fieldset>

        <label className="field">Title <input type="text" maxLength={140} value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Today in a few words" /></label>
        <label className="field">What happened today? <textarea value={d.content} onChange={(e) => set('content', e.target.value)} /></label>
        <label className="field">How was my day? <textarea value={d.day_feeling} onChange={(e) => set('day_feeling', e.target.value)} /></label>
        <label className="field">What I’m thinking about <textarea value={d.thinking_about} onChange={(e) => set('thinking_about', e.target.value)} /></label>
        <label className="field">Something I wish I could tell you <textarea value={d.wish_to_tell} onChange={(e) => set('wish_to_tell', e.target.value)} /></label>
        <label className="field">I’m grateful for <textarea value={d.grateful_for} onChange={(e) => set('grateful_for', e.target.value)} /></label>

        <div>
          <div style={{ fontWeight: 700, marginBottom: '.4rem' }}>How does it feel?</div>
          <div className="mood-grid" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => <button key={m.key} type="button" role="radio" aria-checked={d.mood === m.key} className={`mood-opt ${d.mood === m.key ? 'sel' : ''}`} onClick={() => set('mood', m.key)}>{m.emoji} {m.label}</button>)}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: '.4rem' }}>A photo (optional)</div>
          {shownPhoto && <img src={shownPhoto} alt="Chosen" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14, marginBottom: '.5rem' }} />}
          <div className="row">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemovePic(false); e.target.value = ''; }} />
            <button type="button" className="btn small" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> {shownPhoto ? 'Change photo' : 'Add photo'}</button>
            {shownPhoto && <button type="button" className="btn small danger" onClick={() => { setFile(null); setRemovePic(true); }}><X size={14} /> Remove</button>}
          </div>
        </div>

        {err && <div className="error-box" role="alert">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : `Save — ${vis.label}`}</button>
        </div>
      </div>
    </Modal>
  );
}
