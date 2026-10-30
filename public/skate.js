// Forsidens animation: et skateboard, der kickflipper og bliver til et spørgsmålstegn.
(function () {
  const T = { hold: 5, drop: 1, ud: 1.7, ind: 1.9, flip: 1.2 };
  const LOOP = T.hold + T.drop + T.ud + T.ind + T.flip;
  const START = T.hold + T.drop + T.ud;

  // Spørgsmålstegnets form kommer fra skrifttypen Bricolage Grotesque; boardet er tegnet i samme stil.
  const FORM_Q = [-69,-136,-63,-139,-57,-142,-51,-144,-46,-146,-39,-148,-33,-150,-27,-152,-21,-153,-15,-154,-8,-155,-2,-155,5,-155,11,-155,17,-155,24,-154,30,-153,36,-152,42,-151,49,-149,54,-147,60,-144,66,-141,71,-137,76,-133,81,-129,84,-124,88,-118,91,-113,93,-107,95,-101,96,-94,97,-88,97,-82,97,-75,97,-69,96,-63,95,-56,94,-50,92,-44,89,-38,86,-33,82,-27,78,-22,74,-18,69,-14,64,-10,59,-6,54,-2,49,2,44,6,39,10,34,14,30,19,27,24,24,30,21,36,20,42,20,49,20,55,20,55,8,55,-3,55,-15,55,-27,55,-39,55,-39,55,-39,51,-39,47,-40,43,-40,38,-40,34,-40,30,-39,26,-39,22,-38,18,-37,14,-36,10,-34,6,-33,2,-31,-2,-29,-5,-26,-9,-24,-12,-21,-15,-18,-18,-15,-21,-12,-24,-9,-26,-6,-29,-2,-31,1,-33,5,-36,8,-38,11,-41,15,-43,18,-46,20,-49,23,-52,25,-56,26,-60,27,-64,27,-68,26,-72,25,-76,23,-80,20,-83,17,-85,13,-87,9,-88,5,-89,1,-89,-3,-90,-7,-89,-11,-89,-15,-88,-19,-87,-23,-86,-27,-85,-31,-84,-35,-83,-39,-81,-43,-80,-47,-78,-50,-76,-54,-74,-54,-74,-57,-86,-60,-99,-63,-111,-66,-123,-69,-136];
  const FORM_B = [-146,-42,-142,-39,-137,-36,-133,-33,-129,-31,-124,-29,-119,-27,-115,-25,-110,-24,-105,-23,-99,-23,-94,-23,-89,-23,-84,-23,-79,-23,-74,-23,-69,-23,-64,-23,-59,-23,-54,-23,-48,-23,-43,-23,-38,-23,-33,-23,-28,-23,-23,-23,-18,-23,-13,-23,-8,-23,-3,-23,3,-23,8,-23,13,-23,18,-23,23,-23,28,-23,33,-23,38,-23,43,-23,48,-23,54,-23,59,-23,64,-23,69,-23,74,-23,79,-23,84,-23,89,-23,94,-23,99,-23,105,-23,110,-24,115,-25,119,-27,124,-29,129,-31,133,-33,137,-36,142,-39,146,-42,146,-42,151,-35,157,-28,163,-20,169,-13,174,-6,174,-6,169,-2,164,1,159,5,154,8,148,11,143,13,137,16,131,18,126,19,120,21,114,22,107,23,101,23,95,23,89,23,83,23,77,23,71,23,64,23,58,23,52,23,46,23,40,23,34,23,28,23,21,23,15,23,9,23,3,23,-3,23,-9,23,-15,23,-21,23,-28,23,-34,23,-40,23,-46,23,-52,23,-58,23,-64,23,-71,23,-77,23,-83,23,-89,23,-95,23,-101,23,-107,23,-114,22,-120,21,-126,19,-131,18,-137,16,-143,13,-148,11,-154,8,-159,5,-164,1,-169,-2,-174,-6,-174,-6,-169,-13,-163,-20,-157,-28,-151,-35,-146,-42];
  const PRIK = 'M-0.5 40.5L-12.7 39.7L-24.6 36.6L-35.2 30.3L-42.4 20.5L-45.8 8.7L-46.3 -3.6L-44.3 -15.8L-38.9 -26.8L-29.6 -34.7L-18.1 -39.1L-5.9 -40.8L6.4 -40.7L18.5 -38.9L30.0 -34.3L39.1 -26.3L44.4 -15.2L46.3 -3.1L45.6 9.2L41.9 20.9L34.4 30.6L23.8 36.7L11.8 39.7L-0.5 40.5Z';
  const L = 174, BUND = 71;

  const sti = (f) => { let d = ''; for (let i = 0; i < f.length; i += 2) d += (i ? 'L' : 'M') + f[i] + ' ' + f[i + 1]; return d + 'Z'; };
  const blod = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const lerp = (a, b, u) => a + (b - a) * u;
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const el = (id) => document.getElementById(id);
  const vinkel = { a: 0, b: 0 };
  let titelX = 0;

  el('skate-daek').setAttribute('d', sti(FORM_B));
  el('skate-bue').setAttribute('d', sti(FORM_Q));
  ['skate-hjul-a', 'skate-hjul-b', 'skate-prik'].forEach((id) => el(id).setAttribute('d', PRIK));

  const korn = document.createElement('canvas');
  korn.width = korn.height = 256;
  const kx = korn.getContext('2d'), kd = kx.createImageData(256, 256);
  for (let i = 0; i < kd.data.length; i += 4) {
    const v = Math.random() * 255;
    kd.data[i] = kd.data[i + 1] = kd.data[i + 2] = v;
    kd.data[i + 3] = 255;
  }
  kx.putImageData(kd, 0, 0);
  el('skate-korn').style.backgroundImage = 'url(' + korn.toDataURL() + ')';

  const tegn = (t, dt, tid) => {
    const stor = window.innerWidth >= 900;
    const hero = el('skate-hero').getBoundingClientRect();
    const scene = el('skate-scene').getBoundingClientRect();
    const pl = el('skate-plads').getBoundingClientRect();
    const skala = stor ? scene.width / 930 : scene.width / 640;
    const skalaBraet = stor ? skala : skala * 0.786;
    const px = pl.left - hero.left + pl.width / 2, py = pl.top - hero.top + pl.height / 2;
    const gy = hero.height - 8 - BUND * skalaBraet;
    let spg = true, x = px, y = py, drej = 0, flip = 0, r = t;
    if (r < T.hold) {
      const env = klem(Math.min(r, T.hold - r) / 0.6, 0, 1);
      y += Math.sin(tid * 1.7) * 8 * skala * env;
      drej = Math.sin(tid * 1.1) * 1.4 * env;
    } else if ((r -= T.hold) < T.drop) {
      const p = r / T.drop;
      flip = 2 * Math.PI * blod(klem(p / 0.85, 0, 1));
      spg = flip < Math.PI / 2;
      y = lerp(py, gy, p * p) - Math.sin(Math.PI * p) * 40 * skala;
      if (!spg) drej = -90 * (1 - blod(klem((p - 0.3) / 0.6, 0, 1)));
    } else if ((r -= T.drop) < T.ud) {
      const p = r / T.ud;
      spg = false; y = gy; x = lerp(px, hero.width + L * skalaBraet + 40, Math.pow(p, 1.5));
    } else if ((r -= T.ud) < T.ind) {
      const p = r / T.ind;
      spg = false; y = gy; x = lerp(-L * skalaBraet - 40, px, 1 - Math.pow(1 - p, 1.5));
    } else {
      const p = (r - T.ind) / T.flip;
      flip = 2 * Math.PI * blod(klem((p - 0.1) / 0.9, 0, 1));
      spg = flip >= 1.5 * Math.PI;
      y = lerp(gy, py, 1 - Math.pow(1 - p, 3));
      if (!spg) drej = -90 * blod(klem(p / 0.5, 0, 1));
    }
    const braet = el('skate-braet'), tegnet = el('skate-spg');
    braet.setAttribute('display', spg ? 'none' : 'inline');
    tegnet.setAttribute('display', spg ? 'inline' : 'none');
    const f = Math.cos(flip), xy = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + drej.toFixed(2) + ') ';
    braet.setAttribute('transform', xy + 'scale(' + skalaBraet.toFixed(3) + ' ' + (skalaBraet * f).toFixed(3) + ')');
    tegnet.setAttribute('transform', xy + 'scale(' + (skala * f).toFixed(3) + ' ' + skala.toFixed(3) + ')');

    [['kam-1', 'a'], ['kam-2', 'b']].forEach(([id, k]) => {
      const kam = el(id), b = kam.getBoundingClientRect();
      const cx = b.left - hero.left + b.width / 2, cy = b.top - hero.top + b.height / 2;
      const mal = klem(Math.atan2(cy - y, Math.max(cx - x, 40)) * 180 / Math.PI * 0.8, -10, 8);
      vinkel[k] += (mal - vinkel[k]) * Math.min(1, dt * 5);
      kam.style.transform = 'rotate(' + vinkel[k].toFixed(2) + 'deg)';
    });
    titelX += (klem((x - hero.width * 0.15) / hero.width, -1, 1) * (stor ? 10 : 5) - titelX) * Math.min(1, dt * 2.5);
    el('skate-titel').style.transform = 'translateX(' + titelX.toFixed(2) + 'px)';
  };

  if (location.search.includes('frys')) {
    window.skateTegn = tegn;
    tegn(0, 1, 0);
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tegn(0, 1, 0);
    window.addEventListener('resize', () => tegn(0, 1, 0));
    return;
  }
  let forrige = performance.now(), kornTid = 0;
  const start = forrige;
  const tick = (nu) => {
    const tid = Math.max(nu - start, 0) / 1000;
    tegn((START + tid) % LOOP, Math.max(nu - forrige, 0) / 1000, tid);
    if (nu - kornTid > 90) {
      kornTid = nu;
      el('skate-korn').style.transform = 'translate(' + Math.round(Math.random() * 120 - 60) + 'px, ' + Math.round(Math.random() * 120 - 60) + 'px)';
    }
    forrige = nu;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
