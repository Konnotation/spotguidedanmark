// København: kort og liste over spots. Data ligger i /data/koebenhavn.json.
// Tilføj ?ret=1 til adressen for at rette, hvad Street View viser for hvert spot.
(function () {
  const FARVER = { filmet: '#C8674A', 'filmet-park': '#C8674A', street: '#2F5670', park: '#5F7F5C', arkiv: '#8A8880' };
  const NAVNE = { filmet: 'Filmet', 'filmet-park': 'Filmet park', street: 'Street', park: 'Park', arkiv: 'Arkiv' };
  const FILTRE = [
    { id: 'alle', navn: 'Alle' },
    { id: 'filmet', navn: 'Filmet', niveauer: ['filmet', 'filmet-park'], farve: FARVER.filmet },
    { id: 'street', navn: 'Street', niveauer: ['street'], farve: FARVER.street },
    { id: 'park', navn: 'Parker', niveauer: ['park'], farve: FARVER.park },
    { id: 'arkiv', navn: 'Arkiv', niveauer: ['arkiv'], farve: FARVER.arkiv },
  ];
  // Nøgle til Google Maps Embed API, så popuppen viser Street View. Den er offentlig af natur
  // og er hos Google begrænset til Maps Embed API og spotguidedanmark.vercel.app.
  const GOOGLE_NOEGLE = 'AIzaSyDgomu5PERi4alr3jDgC9AgqKQjckU7QzI';
  const RET_TILSTAND = new URLSearchParams(location.search).has('ret');
  const RET_NOEGLE = 'spotguide-streetview-rettelser';
  const el = (id) => document.getElementById(id);
  const ny = (tag, klasse, tekst) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };

  let spots = [], filter = 'alle', kort = null, kortKlar = false, popup = null, rettelser = {};

  const synlige = () => {
    const f = FILTRE.find((x) => x.id === filter);
    return f.niveauer ? spots.filter((s) => f.niveauer.includes(s.niveau)) : spots;
  };

  const geo = (liste) => ({
    type: 'FeatureCollection',
    features: liste.map((s) => ({
      type: 'Feature',
      properties: { id: s.id, ikon: 'pin-' + s.niveau },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    })),
  });

  const visning = (s) => rettelser[s.id] || s.sv || null;

  // Læser kameraets position og retning ud af et Street View-link fra Google Maps.
  function laesLink(tekst) {
    const m = String(tekst).match(/@(-?[\d.]+),(-?[\d.]+),3a(?:,([\d.]+)y)?(?:,([\d.]+)h)?(?:,([\d.]+)t)?/);
    if (!m) return null;
    const sv = {
      lat: Number(m[1]),
      lng: Number(m[2]),
      fov: Math.max(10, Math.min(100, Math.round(Number(m[3] || 75)))),
      heading: Number(Number(m[4] || 0).toFixed(1)),
      pitch: Number((Number(m[5] || 90) - 90).toFixed(1)),
    };
    const p = String(tekst).match(/!1s([^!]+)!2e0/);
    if (p) sv.pano = decodeURIComponent(p[1]);
    return sv;
  }

  function streetViewAdresse(s) {
    const sv = visning(s);
    const a = 'https://www.google.com/maps/embed/v1/streetview?key=' + GOOGLE_NOEGLE;
    if (!sv) return a + '&location=' + s.lat + ',' + s.lng + '&fov=90';
    const sted = sv.pano ? '&pano=' + encodeURIComponent(sv.pano) : '&location=' + sv.lat + ',' + sv.lng;
    return a + sted + '&heading=' + sv.heading + '&pitch=' + sv.pitch + '&fov=' + sv.fov;
  }

  function visFiltre() {
    const boks = el('filtre');
    boks.textContent = '';
    FILTRE.forEach((f) => {
      const k = ny('button', 'filter');
      k.type = 'button';
      k.setAttribute('aria-pressed', String(f.id === filter));
      if (f.farve) {
        const p = ny('span', 'prik');
        p.style.background = f.farve;
        k.append(p);
      }
      k.append(f.navn);
      k.addEventListener('click', () => {
        filter = f.id;
        if (popup) popup.remove();
        opdater();
      });
      boks.append(k);
    });
  }

  function visListe() {
    const boks = el('liste');
    boks.textContent = '';
    synlige().forEach((s) => {
      const li = ny('li'), k = ny('button'), tekst = ny('span'), p = ny('span', 'prik');
      k.type = 'button';
      p.style.background = FARVER[s.niveau];
      const under = s.omrade + ' · ' + s.typer.join(', ') + (RET_TILSTAND && visning(s) ? ' · Framet' : '');
      tekst.append(ny('strong', '', s.navn), ny('small', '', under));
      k.append(p, tekst);
      k.addEventListener('click', () => visPopup(s));
      li.append(k);
      boks.append(li);
    });
  }

  function opdater() {
    visFiltre();
    visListe();
    if (kortKlar) kort.getSource('spots').setData(geo(synlige()));
  }

  function billede(s) {
    const boks = ny('div', 'popup-billede');
    const f = ny('iframe');
    f.title = 'Street View ved ' + s.navn;
    f.loading = 'lazy';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    f.src = streetViewAdresse(s);
    boks.append(f);
    return boks;
  }

  function gemRettelser() {
    try { localStorage.setItem(RET_NOEGLE, JSON.stringify(rettelser)); } catch (e) { /* kun til denne visning */ }
    el('ret-antal').textContent = Object.keys(rettelser).length + ' spots framet i denne browser';
  }

  function retBoks(s) {
    const boks = ny('div', 'ret-boks');
    const aabn = ny('a', 'ret-aabn', '1. Åbn i Google Maps');
    aabn.href = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + s.lat + ',' + s.lng;
    aabn.target = '_blank';
    aabn.rel = 'noopener';
    const felt = ny('input');
    felt.type = 'url';
    felt.placeholder = '2. Indsæt linket fra Google Maps her';
    felt.setAttribute('aria-label', 'Link fra Google Maps');
    const besked = ny('p', 'ret-besked', visning(s) ? 'Dette spot er framet.' : 'Dette spot er ikke framet endnu.');
    felt.addEventListener('input', () => {
      const sv = laesLink(felt.value);
      if (!sv) {
        besked.textContent = 'Det ligner ikke et Street View-link. Kopiér hele adressen fra Google Maps.';
        return;
      }
      rettelser[s.id] = sv;
      gemRettelser();
      visPopup(s);
    });
    boks.append(aabn, felt, besked);
    if (rettelser[s.id]) {
      const nulstil = ny('button', 'ret-nulstil', 'Fortryd framing');
      nulstil.type = 'button';
      nulstil.addEventListener('click', () => {
        delete rettelser[s.id];
        gemRettelser();
        visPopup(s);
      });
      boks.append(nulstil);
    }
    return boks;
  }

  function info(s) {
    const tekst = ny('div', 'popup-tekst');
    const top = ny('div', 'popup-top'), titel = ny('div');
    titel.append(ny('strong', '', s.navn), ny('small', '', [NAVNE[s.niveau]].concat(s.typer).join(' · ') + ' · Ikke bekræftet'));
    const luk = ny('button', 'popup-luk', '×');
    luk.type = 'button';
    luk.setAttribute('aria-label', 'Luk');
    luk.addEventListener('click', () => { if (popup) popup.remove(); });
    top.append(titel, luk);
    tekst.append(top);
    if (s.beskrivelse) tekst.append(ny('p', '', s.beskrivelse));
    if (s.filmet) tekst.append(ny('p', '', 'Filmet: ' + s.filmet));
    if (s.pin === 'område') tekst.append(ny('p', 'popup-advarsel', 'Placeringen er kun omtrentlig.'));
    s.advarsler.forEach((a) => tekst.append(ny('p', 'popup-advarsel', a)));
    if (RET_TILSTAND) tekst.append(retBoks(s));
    const rute = ny('a', 'popup-rute', 'Rute hertil');
    rute.href = 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
    rute.target = '_blank';
    rute.rel = 'noopener';
    tekst.append(rute);
    return tekst;
  }

  function visPopup(s) {
    if (popup) popup.remove();
    if (!kortKlar) return;
    kort.getSource('valgt').setData(geo([s]));

    const inde = ny('div');
    inde.append(billede(s), info(s));
    const denne = new maplibregl.Popup({ anchor: 'bottom', offset: 14, maxWidth: 'none', closeButton: false, className: 'spot-popup', focusAfterOpen: false })
      .setLngLat([s.lng, s.lat])
      .setDOMContent(inde)
      .addTo(kort);
    popup = denne;
    denne.on('close', () => {
      if (popup !== denne) return;
      popup = null;
      kort.getSource('valgt').setData(geo([]));
    });
    kort.easeTo({ center: [s.lng, s.lat], zoom: Math.max(kort.getZoom(), 13), offset: [0, (inde.offsetHeight + 26) / 2], duration: 500 });
  }

  function firkant(farve, stoerrelse) {
    const c = ny('canvas');
    c.width = c.height = stoerrelse;
    const x = c.getContext('2d');
    x.fillStyle = '#15191C';
    x.fillRect(0, 0, stoerrelse, stoerrelse);
    x.fillStyle = farve;
    x.fillRect(2, 2, stoerrelse - 4, stoerrelse - 4);
    return x.getImageData(0, 0, stoerrelse, stoerrelse);
  }

  function startKort() {
    if (!window.maplibregl) { el('kort-fejl').hidden = false; return; }
    kort = new maplibregl.Map({
      container: 'kort',
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [12.56, 55.68],
      zoom: 11,
      attributionControl: false,
    });
    kort.addControl(new maplibregl.AttributionControl({
      compact: false,
      customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>',
    }));
    kort.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    kort.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'top-right');
    kort.on('error', (e) => {
      if (!kortKlar && e.error && /style|fetch/i.test(String(e.error.message))) el('kort-fejl').hidden = false;
    });
    kort.on('load', () => {
      const farv = (lag, egenskab, farve) => { if (kort.getLayer(lag)) kort.setPaintProperty(lag, egenskab, farve); };
      farv('background', 'background-color', '#ECEAE5');
      farv('water', 'fill-color', '#6A8FA8');
      farv('park', 'fill-color', '#C5CFBD');
      farv('landcover_wood', 'fill-color', '#C5CFBD');
      farv('building', 'fill-color', '#DDDAD3');

      Object.keys(FARVER).forEach((n) => kort.addImage('pin-' + n, firkant(FARVER[n], 13)));
      kort.addImage('pin-valgt', firkant('#ECEAE5', 21));
      kort.addSource('spots', { type: 'geojson', data: geo(synlige()) });
      kort.addSource('valgt', { type: 'geojson', data: geo([]) });
      kort.addLayer({ id: 'spots', type: 'symbol', source: 'spots', layout: { 'icon-image': ['get', 'ikon'], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
      kort.addLayer({ id: 'valgt', type: 'symbol', source: 'valgt', layout: { 'icon-image': 'pin-valgt', 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
      kort.on('click', 'spots', (e) => {
        const s = spots.find((x) => x.id === e.features[0].properties.id);
        if (s) visPopup(s);
      });
      kort.on('mouseenter', 'spots', () => { kort.getCanvas().style.cursor = 'pointer'; });
      kort.on('mouseleave', 'spots', () => { kort.getCanvas().style.cursor = ''; });
      kortKlar = true;
    });
  }

  function startRetTilstand() {
    try { rettelser = JSON.parse(localStorage.getItem(RET_NOEGLE)) || {}; } catch (e) { rettelser = {}; }
    el('ret-baand').hidden = false;
    gemRettelser();
    el('ret-kopier').addEventListener('click', () => {
      const tekst = JSON.stringify(rettelser);
      const svar = el('ret-kopieret');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tekst)
          .then(() => { svar.hidden = true; el('ret-antal').textContent = 'Kopieret. Sæt det ind i chatten med Claude.'; })
          .catch(() => { svar.hidden = false; svar.value = tekst; });
      } else {
        svar.hidden = false;
        svar.value = tekst;
      }
    });
  }

  function startKorn() {
    const c = ny('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d'), d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.random() * 255;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    el('korn').style.backgroundImage = 'url(' + c.toDataURL() + ')';
  }

  startKorn();
  if (RET_TILSTAND) startRetTilstand();
  fetch('/data/koebenhavn.json')
    .then((r) => { if (!r.ok) throw new Error('data'); return r.json(); })
    .then((data) => {
      spots = data;
      el('antal').textContent = spots.length + ' spots, ingen bekræftet på stedet';
      opdater();
      startKort();
    })
    .catch(() => { el('antal').textContent = 'Spots kunne ikke indlæses. Prøv at genindlæse siden.'; });

  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popup) popup.remove(); });
})();
