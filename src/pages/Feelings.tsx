import { useEffect, useState } from 'react';
import { useHome } from '../hooks/HomeContext';
import { useNow } from '../hooks/useNow';
import { saveMeter } from '../services/home';
import { errorText } from '../lib/format';
import { LoveHeart, MeterCaption, MissFlower } from '../components/Meters';
import { PageHead } from '../components/Ui';
import type { FeelingMeter } from '../types';

function EditableMeter({ kind, meter }: { kind: 'miss' | 'love'; meter: FeelingMeter | null }) {
  const { toast, burstHearts, reloadAll } = useHome();
  const now = useNow(30000);
  const saved = kind === 'miss' ? meter?.miss_you_value ?? 0 : meter?.love_you_value ?? 0;
  const [val, setVal] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  useEffect(() => { setVal(saved); }, [saved]);

  const save = async () => {
    setBusy(true);
    try {
      await saveMeter(kind, val);
      if (val > saved) { burstHearts(); setPulse((p) => p + 1); }
      reloadAll();
      toast(kind === 'miss' ? 'Your missing-you is in the air ♡' : 'Your love is felt ♡');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="card meter-card">
      <h3 style={{ margin: 0 }}>{kind === 'miss' ? 'I Miss You' : 'I Love You'}</h3>
      {kind === 'miss' ? <MissFlower value={val} /> : <LoveHeart value={val} pulse={pulse} />}
      <MeterCaption kind={kind} value={saved} updatedAt={(kind === 'miss' ? meter?.miss_updated_at : meter?.love_updated_at) ?? null} now={now} />
      <label className="field" style={{ width: '100%' }}>
        <span className="sr">{kind === 'miss' ? 'Miss you' : 'Love you'} level</span>
        <input type="range" min={0} max={100} value={val} onChange={(e) => setVal(Number(e.target.value))} aria-valuetext={`${val} out of 100`} />
      </label>
      <button className="btn primary" onClick={save} disabled={busy || val === saved}>{busy ? 'Saving…' : val === saved ? 'Up to date' : `Update to ${val}`}</button>
    </div>
  );
}

function ReadOnlyMeter({ kind, meter }: { kind: 'miss' | 'love'; meter: FeelingMeter | null }) {
  const now = useNow(30000);
  const v = kind === 'miss' ? meter?.miss_you_value ?? 0 : meter?.love_you_value ?? 0;
  const [pulse, setPulse] = useState(0);
  const [prev, setPrev] = useState(v);
  useEffect(() => { if (v > prev) setPulse((p) => p + 1); setPrev(v); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [v]);
  return (
    <div className="card meter-card">
      <h3 style={{ margin: 0 }}>{kind === 'miss' ? 'I Miss You' : 'I Love You'}</h3>
      {kind === 'miss' ? <MissFlower value={v} /> : <LoveHeart value={v} pulse={pulse} />}
      <MeterCaption kind={kind} value={v} updatedAt={(kind === 'miss' ? meter?.miss_updated_at : meter?.love_updated_at) ?? null} now={now} />
    </div>
  );
}

export default function Feelings() {
  const { me, partner, myMeter, partnerMeter } = useHome();
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHead title="Our Feelings" hand="two little gardens, tended by two people">
        <p className="muted">These only change when each of you changes your own — nothing moves by itself, and there’s nothing to compare. They’re just here to be felt.</p>
      </PageHead>
      <section aria-labelledby="mine-h" className="stack">
        <h2 id="mine-h" className="person-tag">{me.display_name} <span className="muted small">(you — only you can change these)</span></h2>
        <div className="grid2"><EditableMeter kind="miss" meter={myMeter} /><EditableMeter kind="love" meter={myMeter} /></div>
      </section>
      <section aria-labelledby="theirs-h" className="stack">
        <h2 id="theirs-h" className="person-tag">{partner ? partner.display_name : 'Your love'} <span className="muted small">(updates live)</span></h2>
        {partner ? (
          <div className="grid2"><ReadOnlyMeter kind="miss" meter={partnerMeter} /><ReadOnlyMeter kind="love" meter={partnerMeter} /></div>
        ) : <div className="card empty"><span className="hand">Waiting for your love to arrive…</span></div>}
      </section>
    </div>
  );
}
