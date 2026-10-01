export function cpuInput(w, f, o) {
  const a = f.ai, d = Math.abs(o.x - f.x), out = {};
  const toward = o.x > f.x ? 'r' : 'l', away = toward === 'r' ? 'l' : 'r', r = Math.random();
  if (--a.t <= 0) {
    a.t = 8 + (Math.random() * 18 | 0); a.duck = Math.random() < .4;
    a.m = d > 320 ? (r < .3 ? 'fire' : 'fwd')
        : d > 140 ? (r < .45 ? 'fwd' : r < .55 ? 'jump' : r < .8 ? 'fire' : 'wait')
        : (r < .3 ? 'p' : r < .5 ? 'k' : r < .62 ? 'sweep' : r < .75 ? 'back' : r < .85 ? 'duck' : 'wait');
  }
  if (o.atk && d < 150 && Math.random() < .05) a.m = 'back';
  if (w.fireballs.some(b => b.owner !== f && Math.abs(b.x - f.x) < 220) && Math.random() < .08) a.m = Math.random() < .5 ? 'back' : 'jump';
  if (f.y < 470 && d < 170 && Math.random() < .12) out.k = 1;                                   // fly kick on the way down
  if (f.meter >= 100 && d < (f.mv.s.type === 'rise' ? 120 : 380) && Math.random() < .03) out.x = 1;   // super art
  if (f.atk && f.atk !== 's' && f.hit && Math.random() < .25) {                           // combo: follow up after a hit
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
