export function cpuInput(w, f, o) {
  const a = f.ai, d = Math.abs(o.x - f.x), out = {};
  const level = Math.max(0, Math.min(2, w.difficulty ?? 1));
  const toward = o.x > f.x ? 'r' : 'l', away = toward === 'r' ? 'l' : 'r', r = Math.random();
  const waitBias = [0.34, 0.18, 0.06][level], reaction = [0.015, 0.05, 0.12][level];
  if (--a.t <= 0) {
    a.t = [22, 8, 4][level] + (Math.random() * [20, 18, 9][level] | 0); a.duck = Math.random() < [.15, .4, .7][level];
    if (r < waitBias) a.m = 'wait';
    else {
      const act = (r - waitBias) / (1 - waitBias);
      a.m = d > 320 ? (act < .3 ? 'fire' : 'fwd')
          : d > 140 ? (act < .45 ? 'fwd' : act < .55 ? 'jump' : act < .8 ? 'fire' : 'wait')
          : (act < .3 ? 'p' : act < .5 ? 'k' : act < .62 ? 'sweep' : act < .75 ? 'back' : act < .85 ? 'duck' : 'wait');
    }
  }
  if (o.atk && d < 150 && Math.random() < reaction) a.m = 'back';
  if (w.fireballs.some(b => b.owner !== f && Math.abs(b.x - f.x) < 220) && Math.random() < reaction * 1.5) a.m = Math.random() < .5 ? 'back' : 'jump';
  if (f.y < 470 && d < 170 && Math.random() < [.04, .12, .22][level]) out.k = 1;
  if (f.meter >= 100 && d < (f.mv.s.type === 'rise' ? 120 : 380) && Math.random() < [.01, .03, .09][level]) out.x = 1;
  if (f.atk && f.atk !== 's' && f.hit && Math.random() < [.1, .25, .48][level]) {                           // combo: follow up after a hit
    const q = Math.random(); if (q < .4) out.s = 1; else if (q < .7) out.p = 1; else out.k = 1;
  }
  switch (a.m) {
    case 'fwd': out[toward] = 1; break;
    case 'back': out[away] = 1; if (a.duck) out.d = 1; break;
    case 'sweep': out.d = 1; out.k = 1; a.m = 'wait'; break;
    case 'duck': out.d = 1; break;
    case 'jump': out.u = 1; out[toward] = 1; a.m = 'wait'; break;
    case 'fire': if (f.mv.s.type === 'rise' && d > 110) out[toward] = 1; else out.s = 1; a.m = 'wait'; break;
    case 'p': out.p = 1; a.m = 'wait'; break;
    case 'k': out.k = 1; a.m = 'wait'; break;
  }
  return out;
}
