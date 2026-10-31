// København: kort og liste over spots. Data ligger i /data/koebenhavn.json.
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
  const el = (id) => document.getElementById(id);
  const ny =(tag, klasse, tekst) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  };

  let spots = [], filter = 'alle', kort = null, kortKlar = false, valgt = null, popup = null;

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
      tekst.append(ny('strong', '', s.navn), ny('small', '', s.omrade + ' · ' + s.typer.join(', ')));
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

  function luk() {
    el('detalje').hidden = true;
  }

  function billede(s) {
    const boks = ny('div', 'popup-billede');
    if (GOOGLE_NOEGLE) {
      const f = ny('iframe');
      f.title = 'Street View ved ' + s.navn;
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.allowFullscreen = true;
      f.src = 'https://www.google.com/maps/embed/v1/streetview?key=' + GOOGLE_NOEGLE + '&location=' + s.lat + ',' + s.lng + '&fov=90';
      boks.append(f);
    } else if (s.foto) {
      const i = ny('img');
      i.src = s.foto.url;
      i.alt = 'Gadefoto ved ' + s.navn;
      i.addEventListener('error', () => { boks.textContent = 'Billedet kunne ikke hentes'; });
      boks.append(i);
    } else {
      boks.classList.add('tom');
      boks.textContent = 'Billede på vej';
    }
    return boks;
  }

  function visPopup(s) {
    if (popup) popup.remove();
    if (!kortKlar) { vaelg(s); return; }
    valgt = s;
    kort.getSource('valgt').setData(geo([s]));

    const inde = ny('div');
    inde.append(billede(s));
    const tekst = ny('div', 'popup-tekst');
    tekst.append(ny('strong', '', s.navn), ny('small', '', NAVNE[s.niveau] + ' · ' + (s.typer.join(', ') || s.omrade)));
    if (s.foto && !GOOGLE_NOEGLE) {
      const a = ny('a', 'popup-kredit', 'Foto: ' + s.foto.af + ', ' + s.foto.licens + ' (' + s.foto.dato.slice(0, 4) + ')');
      a.href = s.foto.side;
      a.target = '_blank';
      a.rel = 'noopener nofollow';
      tekst.append(a);
    }
    const mere = ny('button', 'popup-mere', 'Se mere');
    mere.type = 'button';
    mere.addEventListener('click', () => vaelg(s));
    tekst.append(mere);
    inde.append(tekst);

    const denne = new maplibregl.Popup({ anchor: 'bottom', offset: 14, maxWidth: 'none', className: 'spot-popup', focusAfterOpen: false })
      .setLngLat([s.lng, s.lat])
      .setDOMContent(inde)
      .addTo(kort);
    popup = denne;
    denne.on('close', () => {
      if (popup !== denne) return;
      popup = null;
      valgt = null;
      kort.getSource('valgt').setData(geo([]));
    });
    kort.easeTo({ center: [s.lng, s.lat], zoom: Math.max(kort.getZoom(), 13), offset: [0, window.innerWidth < 900 ? 165 : 130], duration: 500 });
  }

  function vaelg(s) {
    const d = el('detalje');
    d.textContent = '';
    const lukKnap = ny('button', 'luk', '×');
    lukKnap.type = 'button';
    lukKnap.setAttribute('aria-label', 'Luk');
    lukKnap.addEventListener('click', luk);
    d.append(lukKnap, ny('h2', '', s.navn));
    d.append(ny('p', 'meta', s.omrade + ' · ' + NAVNE[s.niveau] + (s.typer.length ? ' · ' + s.typer.join(', ') : '')));
    d.append(ny('span', 'ubekraeftet', 'Ikke bekræftet'));
    if (s.beskrivelse) d.append(ny('p', '', s.beskrivelse));
    if (s.filmet) d.append(ny('p', '', 'Filmet: ' + s.filmet));
    if (s.sidst_omtalt) d.append(ny('p', 'meta', 'Sidst omtalt: ' + s.sidst_omtalt));
    if (s.pin === 'område') d.append(ny('p', 'spot-advarsel', 'Placeringen er kun omtrentlig.'));
    s.advarsler.forEach((a) => d.append(ny('p', 'spot-advarsel', a)));
    const rute = ny('a', 'rute', 'Rute hertil');
    rute.href = 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
    rute.target = '_blank';
    rute.rel = 'noopener';
    d.append(rute);
    if (s.kilder.length) {
      d.append(ny('p', 'meta', 'Kilder'));
      const ul = ny('ul', 'kilder');
      s.kilder.forEach((url) => {
        const li = ny('li'), a = ny('a', '', url.replace(/^https?:\/\/(www\.)?/, ''));
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener nofollow';
        li.append(a);
        ul.append(li);
      });
      d.append(ul);
    }
    d.hidden = false;
    d.scrollTop = 0;
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
      kort.addSource('valgt', { type: 'geojson', data: geo(valgt ? [valgt] : []) });
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
  fetch('/data/koebenhavn.json')
    .then((r) => { if (!r.ok) throw new Error('data'); return r.json(); })
    .then((data) => {
      spots = data;
      el('antal').textContent = spots.length + ' spots, ingen bekræftet på stedet';
      opdater();
      startKort();
    })
    .catch(() => { el('antal').textContent = 'Spots kunne ikke indlæses. Prøv at genindlæse siden.'; });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el('detalje').hidden) luk();
    else if (popup) popup.remove();
  });
})();
