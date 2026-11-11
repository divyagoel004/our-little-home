import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from './Ui';
import { useHome } from '../hooks/HomeContext';
import { useAuth } from '../hooks/useAuth';
import { saveAnniversary, setShareLastSeen, updateProfile } from '../services/home';
import { errorText } from '../lib/format';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, myPresence, settings, toast, sound, reloadAll } = useHome();
  const { signOut } = useAuth();
  const [name, setName] = useState(me.display_name);
  const [anniv, setAnniv] = useState(settings?.anniversary_date ?? '');
  const [share, setShare] = useState(myPresence?.share_last_seen ?? true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setName(me.display_name); setAnniv(settings?.anniversary_date ?? ''); setShare(myPresence?.share_last_seen ?? true); }
  }, [open, me.display_name, settings?.anniversary_date, myPresence?.share_last_seen]);

  const save = async () => {
    const n = name.trim();
    if (!n) return toast('Please keep a name for yourself ♡', 'error');
    setBusy(true);
    try {
      if (n !== me.display_name) await updateProfile(me.id, { display_name: n.slice(0, 40) });
      if ((anniv || null) !== (settings?.anniversary_date ?? null)) await saveAnniversary(me.id, anniv || null);
      if (share !== (myPresence?.share_last_seen ?? true)) await setShareLastSeen(me.id, share);
      reloadAll();
      toast('Saved ♡');
      onClose();
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Little settings">
      <div className="stack">
        <label className="field">Your name in our home
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">Our anniversary
          <input type="date" value={anniv} onChange={(e) => setAnniv(e.target.value)} />
          <span className="hint">Shared by both of us — it powers the “days together” counter.</span>
        </label>
        <label className="row" style={{ gap: '.6rem', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} style={{ width: 22, height: 22, marginTop: 3 }} />
          <span><b>Let my love see when I was last here</b><br /><span className="small muted">When this is off, your “last seen” is hidden from them — this is enforced by the database, not just the screen.</span></span>
        </label>
        <div>
          <b>Cozy sound</b> <span className="small muted">(off unless you turn it on)</span>
          <div className="row" style={{ marginTop: '.4rem' }}>
            <div className="seg" role="group" aria-label="Sound type">
              <button className={sound.kind === 'rain' ? 'on' : ''} onClick={() => sound.setKind('rain')}>🌧️ Rain</button>
              <button className={sound.kind === 'fire' ? 'on' : ''} onClick={() => sound.setKind('fire')}>🔥 Fireplace</button>
            </div>
            <button className="btn small" onClick={sound.toggle}>{sound.on ? 'Turn off' : 'Turn on'}</button>
          </div>
        </div>
        <div className="row between">
          <button className="btn danger small" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
          <div className="row"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
        </div>
      </div>
    </Modal>
  );
}
