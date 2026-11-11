import { useCallback, useEffect, useRef, useState } from 'react';

export type Ambience = 'rain' | 'fire';
interface Engine { ctx: AudioContext; master: GainNode }

function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.5;
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    }
  }
  return buf;
}

/** Procedural rain / fireplace ambience (no audio files). OFF by default; the user switches it on. */
export function useAmbientSound() {
  const [on, setOn] = useState(false);
  const [kind, setKindState] = useState<Ambience>(() => {
    try { return (localStorage.getItem('olh-ambience') as Ambience) || 'rain'; } catch { return 'rain'; }
  });
  const engine = useRef<Engine | null>(null);
  const nodes = useRef<AudioNode[]>([]);
  const crackle = useRef<number | undefined>(undefined);

  const stopNodes = () => {
    window.clearInterval(crackle.current);
    for (const n of nodes.current) {
      try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* already stopped */ }
      try { n.disconnect(); } catch { /* ignore */ }
    }
    nodes.current = [];
  };

  const build = useCallback((e: Engine, k: Ambience) => {
    const { ctx, master } = e;
    stopNodes();
    if (k === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 'white');
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0.2;
      src.connect(bp).connect(g).connect(master);
      const low = ctx.createBufferSource();
      low.buffer = noiseBuffer(ctx, 'brown'); low.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      low.connect(lp).connect(g2).connect(master);
      src.start(); low.start();
      nodes.current = [src, bp, g, low, lp, g2];
    } else {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 'brown'); src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = ctx.createGain(); g.gain.value = 0.5;
      src.connect(lp).connect(g).connect(master);
      src.start();
      nodes.current = [src, lp, g];
      // little crackles
      crackle.current = window.setInterval(() => {
        if (Math.random() > 0.6) return;
        const t = ctx.currentTime;
        const o = ctx.createBufferSource();
        o.buffer = noiseBuffer(ctx, 'white');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800 + Math.random() * 3000;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.35 * Math.random(), t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + Math.random() * 0.06);
        o.connect(hp).connect(cg).connect(master);
        o.start(t, Math.random() * 2, 0.12);
      }, 180);
    }
  }, []);

  const ensure = (): Engine => {
    if (engine.current) return engine.current;
    const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    engine.current = { ctx, master };
    return engine.current;
  };

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try {
        const e = ensure();
        if (next) { build(e, kind); void e.ctx.resume(); }
        const t = e.ctx.currentTime;
        e.master.gain.cancelScheduledValues(t);
        e.master.gain.setValueAtTime(e.master.gain.value, t);
        e.master.gain.linearRampToValueAtTime(next ? 0.32 : 0, t + (next ? 1.5 : 0.5));
        if (!next) window.setTimeout(stopNodes, 700);
      } catch { return false; }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, build]);

  const setKind = useCallback((k: Ambience) => {
    setKindState(k);
    try { localStorage.setItem('olh-ambience', k); } catch { /* ignore */ }
    if (on && engine.current) build(engine.current, k);
  }, [on, build]);

  useEffect(() => () => {
    stopNodes();
    engine.current?.ctx.close().catch(() => undefined);
    engine.current = null;
  }, []);

  return { on, toggle, kind, setKind };
}
