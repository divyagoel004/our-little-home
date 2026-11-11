import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CozyRoom } from '../components/CozyRoom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { isConfigured, redirectUrl } from '../lib/config';
import { errorText } from '../lib/format';

export default function Welcome() {
  const { status, me, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const inside = status === 'ready';

  const come = () => (inside ? nav('/home') : setOpen(true));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const addr = email.trim().toLowerCase();
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
        nav('/home');
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: redirectUrl() } });
        if (error) throw error;
        setSent(true);
      }
    } catch (x) {
      setErr(errorText(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
        <CozyRoom />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }} style={{ display: 'grid', gap: '.7rem', justifyItems: 'center', width: '100%' }}>
        <h1>Welcome Home, Love ♡</h1>
        <p className="sub muted">No matter how far apart we are, this little place will always belong to us.</p>

        {!isConfigured && (
          <div className="error-box" role="alert" style={{ maxWidth: 440 }}>
            This home isn’t connected yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see the README).
          </div>
        )}
        {status === 'denied' && (
          <div className="error-box" role="alert" style={{ maxWidth: 440 }}>
            This home is private — this account isn’t one of the two keys. <button className="btn small" onClick={() => void signOut()}>Sign out</button>
          </div>
        )}
        {status === 'loading' && <p className="hand">Opening the door…</p>}

        {!open && status !== 'loading' && status !== 'denied' && (
          <>
            {inside && <div className="signed-in-as">Welcome back, {me?.display_name} ♡</div>}
            <button className="btn primary" onClick={come} style={{ fontSize: '1.1rem', padding: '.8rem 2rem' }} disabled={!isConfigured}>Come Inside ♡</button>
          </>
        )}

        {open && !inside && (
          <motion.form className="card login-card stack" onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ marginBottom: 0 }}>Just the two of us</h2>
            {sent ? (
              <div className="ok-box">A little link is on its way to <b>{email}</b>. Open it on this device ♡ (it can take a minute).</div>
            ) : (
              <>
                <label className="field">Your email
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </label>
                {mode === 'password' && (
                  <label className="field">Password
                    <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </label>
                )}
                {err && <div className="error-box" role="alert">{err}</div>}
                <button className="btn primary" disabled={busy}>{busy ? 'One moment…' : mode === 'password' ? 'Come Inside ♡' : 'Send me a link ♡'}</button>
                <button type="button" className="btn small" onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setErr(null); }}>
                  {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
                </button>
              </>
            )}
            <button type="button" className="btn small" style={{ border: 0 }} onClick={() => { setOpen(false); setSent(false); setErr(null); }}>Back</button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
