export function cpuInput(w, f, o) {
  const a = f.ai, d = Math.abs(o.x - f.x), out = {};
  const toward = o.x > f.x ? 'r' : 'l', away = toward === 'r' ? 'l' : 'r', r = Math.random();
  if (--a.t <= 0) {
    a.t = 8 + (Math.random() * 18 | 0);
    a.m = d > 320 ? (r < .3 ? 'fire' : 'fwd')
        : d > 140 ? (r < .45 ? 'fwd' : r < .55 ? 'jump' : r < .8 ? 'fire' : 'wait')
        : (r < .35 ? 'p' : r < .6 ? 'k' : r < .75 ? 'back' : r < .85 ? 'duck' : 'wait');
  }
  if (o.atk && d < 150 && Math.random() < .05) a.m = 'back';
  if (w.fireballs.some(b => b.owner !== f && Math.abs(b.x - f.x) < 220) && Math.random() < .08) a.m = Math.random() < .5 ? 'back' : 'jump';
  switch (a.m) {
    case 'fwd': out[toward] = 1; break;
    case 'back': out[away] = 1; break;
    case 'duck': out.d = 1; break;
    case 'jump': out.u = 1; out[toward] = 1; a.m = 'wait'; break;
    case 'fire': out.s = 1; a.m = 'wait'; break;
    case 'p': out.p = 1; a.m = 'wait'; break;
    case 'k': out.k = 1; a.m = 'wait'; break;
  }
  return out;
}
