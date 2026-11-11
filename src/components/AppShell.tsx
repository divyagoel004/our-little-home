import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookHeart, Camera, Heart, Home, Settings, Sprout, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { useHome } from '../hooks/HomeContext';
import { Atmosphere } from './Atmosphere';
import { Loading, Toasts } from './Ui';
import { SettingsModal } from './SettingsModal';

const NAV = [
  { to: '/home', label: 'Our Home', short: 'Home', icon: Home },
  { to: '/my-diary', label: 'My Diary', short: 'Mine', icon: BookHeart },
  { to: '/their-diary', label: 'Your Diary', short: 'Yours', icon: BookOpen },
  { to: '/feelings', label: 'Our Feelings', short: 'Feelings', icon: Heart },
  { to: '/future', label: 'Future Us', short: 'Future', icon: Sprout },
  { to: '/memories', label: 'Our Little Memories', short: 'Memories', icon: Camera },
];

export function AppShell() {
  const { sound, myMeter, partnerMeter } = useHome();
  const [settings, setSettings] = useState(false);
  const loc = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);

  // atmosphere follows the most recently chosen mood of the two of you
  const mood = (() => {
    const a = myMeter, b = partnerMeter;
    const pick = [a, b].filter((m) => m?.current_mood).sort((x, y) => (y!.updated_at > x!.updated_at ? 1 : -1))[0];
    return pick?.current_mood ?? null;
  })();

  return (
    <div className="shell">
      <Atmosphere mood={mood} />
      <header className="topbar">
        <NavLink to="/home" className="brand">Our Little Home <span className="heart">♡</span></NavLink>
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}><n.icon size={16} />{n.label}</NavLink>
          ))}
        </nav>
        <div className="top-actions">
          <button className={`icon-btn ${sound.on ? 'on' : ''}`} onClick={sound.toggle} aria-pressed={sound.on} aria-label={sound.on ? `Turn ${sound.kind} sound off` : `Turn ${sound.kind} sound on`} title={sound.on ? 'Sound on' : 'Sound off'}>
            {sound.on ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings"><Settings size={18} /></button>
        </div>
      </header>
      <main className="page" style={{ position: 'relative', zIndex: 2 }}>
        <Suspense fallback={<Loading rows={3} />}><Outlet /></Suspense>
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}><n.icon size={20} /><span>{n.short}</span></NavLink>
        ))}
      </nav>
      <Toasts />
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
