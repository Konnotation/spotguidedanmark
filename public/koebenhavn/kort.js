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

  let spots = [], filter = 'alle', kort = null, kortKlar = false, popup = null, rettelser = {}, panorama = null, sidstSlettet = null;
  let bydel = 'alle', bydele = null, billedMarkorer = [];

  const synlige = () => {
    const f = FILTRE.find((x) => x.id === filter);
    const liste = spots.filter((s) => !(rettelser[s.id] && rettelser[s.id].slettet) && (bydel === 'alle' || s.bydel === bydel));
    return f.niveauer ? liste.filter((s) => f.niveauer.includes(s.niveau)) : liste;
  };

  const geo = (liste) => ({
    type: 'FeatureCollection',
    features: liste.map((s) => ({
      type: 'Feature',
      properties: { id: s.id, ikon: 'pin-' + s.niveau, navn: s.navn },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    })),
  });

  const visning = (s) => rettelser[s.id] || s.sv || null;

  // Rettetilstand: et Street View, man kan styre, så vinklen kan aflæses og gemmes.
  function styrbartBillede(s) {
    const boks = ny('div', 'popup-billede');
    const sv = visning(s);
    const start = () => {
      panorama = new google.maps.StreetViewPanorama(boks, {
        position: sv ? { lat: sv.lat, lng: sv.lng } : { lat: s.lat, lng: s.lng },
        pano: sv && sv.pano ? sv.pano : undefined,
        pov: sv ? { heading: sv.heading, pitch: sv.pitch } : { heading: 0, pitch: 0 },
        zoom: sv ? Math.log2(180 / sv.fov) : 1,
        fullscreenControl: false,
        addressControl: false,
      });
    };
    if (window.google && google.maps && google.maps.StreetViewPanorama) start();
    else boks.textContent = 'Street View kunne ikke indlæses.';
    return boks;
  }

  function aflaes() {
    const pov = panorama.getPov(), sted = panorama.getPosition();
    return {
      lat: Number(sted.lat().toFixed(6)),
      lng: Number(sted.lng().toFixed(6)),
      fov: Math.max(10, Math.min(100, Math.round(180 / Math.pow(2, panorama.getZoom())))),
      heading: Number(pov.heading.toFixed(1)),
      pitch: Number(pov.pitch.toFixed(1)),
      pano: panorama.getPano(),
    };
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
        lukSpot();
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
    el('panel-antal').textContent = synlige().length + ' spots' + (bydel === 'alle' ? '' : ' i ' + bydel);
    if (kortKlar) {
      kort.getSource('spots').setData(geo(synlige()));
      visBilledMarkorer();
    }
  }

  function billede(s) {
    if (!s.billede) return streetView(s);
    const boks = ny('div', 'popup-billede');
    const i = ny('img');
    i.src = s.billede;
    i.alt = s.navn;
    const skift = ny('button', 'popup-skift', 'Se Street View');
    skift.type = 'button';
    skift.addEventListener('click', () => boks.replaceWith(streetView(s)));
    boks.append(i, skift);
    return boks;
  }

  function streetView(s) {
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
    const r = Object.values(rettelser), slettet = r.filter((x) => x.slettet).length;
    el('ret-antal').textContent = (r.length - slettet) + ' framet, ' + slettet + ' slettet i denne browser';
    el('ret-fortryd').hidden = !sidstSlettet;
  }

  function naeste(s) {
    const liste = synlige(), i = liste.findIndex((x) => x.id === s.id);
    const n = liste[i + 1];
    visListe();
    if (n) {
      visPopup(n);
      const k = el('liste').children[i + 1];
      if (k) k.scrollIntoView({ block: 'center' });
    } else {
      lukSpot();
    }
  }

  function retBoks(s) {
    const boks = ny('div', 'ret-boks');
    const gem = ny('button', 'ret-gem', 'Gem og næste spot');
    gem.type = 'button';
    gem.addEventListener('click', () => {
      if (!panorama || !panorama.getPosition()) return;
      rettelser[s.id] = aflaes();
      gemRettelser();
      naeste(s);
    });
    const spring = ny('button', 'ret-spring', 'Spring over');
    spring.type = 'button';
    spring.addEventListener('click', () => naeste(s));
    const slet = ny('button', 'ret-spring ret-slet', 'Slet');
    slet.type = 'button';
    slet.addEventListener('click', () => {
      const liste = synlige(), n = liste[liste.findIndex((x) => x.id === s.id) + 1];
      rettelser[s.id] = { slettet: true };
      sidstSlettet = s.id;
      gemRettelser();
      lukSpot();
      opdater();
      if (n) visPopup(n);
    });
    boks.append(gem, spring, slet);
    if (rettelser[s.id]) {
      const nulstil = ny('button', 'ret-spring', 'Fortryd');
      nulstil.type = 'button';
      nulstil.addEventListener('click', () => {
        delete rettelser[s.id];
        gemRettelser();
        visListe();
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
    luk.addEventListener('click', () => { lukSpot(); });
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

  function lukSpot() {
    if (popup) popup.remove();
    const ark = el('ark');
    if (!ark.hidden) {
      ark.hidden = true;
      ark.textContent = '';
      if (kortKlar) {
        kort.getSource('valgt').setData(geo([]));
        kort.easeTo({ padding: { bottom: 0 }, duration: 300 });
      }
    }
  }

  function visPopup(s) {
    lukSpot();
    if (!kortKlar) return;
    kort.getSource('valgt').setData(geo([s]));

    const inde = ny('div');
    inde.append(RET_TILSTAND ? styrbartBillede(s) : billede(s), info(s));
    if (window.innerWidth < 900) {
      const ark = el('ark');
      ark.append(inde);
      ark.hidden = false;
      ark.scrollTop = 0;
      el('panel').classList.remove('aaben');
      kort.easeTo({ center: [s.lng, s.lat], zoom: Math.max(kort.getZoom(), 14), padding: { bottom: ark.offsetHeight }, duration: 500 });
      return;
    }
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

  function visBydele() {
    const boks = el('bydele-valg');
    boks.textContent = '';
    const foerst = ['Indre By', 'Nørrebro', 'Vesterbro', 'Østerbro', 'Nordvest', 'Sydhavnen'];
    const resten = bydele.features.map((f) => f.properties.navn).filter((n) => !foerst.includes(n));
    const navne = ['alle'].concat(foerst, resten);
    navne.forEach((n) => {
      const k = ny('button', 'bydel-knap', n === 'alle' ? 'Hele byen' : n);
      k.type = 'button';
      k.setAttribute('aria-pressed', String(n === bydel));
      k.addEventListener('click', () => vaelgBydel(n));
      boks.append(k);
    });
  }

  function vaelgBydel(n) {
    bydel = n;
    lukSpot();
    visBydele();
    opdater();
    if (!kortKlar) return;
    kort.setFilter('bydel-valgt', ['==', ['get', 'navn'], n]);
    if (n === 'alle') {
      kort.easeTo({ center: [12.56, 55.68], zoom: 11, duration: 500 });
    } else {
      const k = bydele.features.find((f) => f.properties.navn === n).properties.kasse;
      kort.fitBounds([[k[0], k[1]], [k[2], k[3]]], { padding: 40, duration: 500 });
    }
  }

  // Egne billeder bliver til små fotos på kortet, når man zoomer ind.
  function visBilledMarkorer() {
    billedMarkorer.forEach((m) => m.remove());
    billedMarkorer = synlige().filter((s) => s.billede).map((s) => {
      const k = ny('button', 'billed-markor');
      k.type = 'button';
      k.setAttribute('aria-label', s.navn);
      const i = ny('img');
      i.src = s.billede;
      i.alt = '';
      k.append(i);
      k.addEventListener('click', (e) => { e.stopPropagation(); visPopup(s); });
      return new maplibregl.Marker({ element: k }).setLngLat([s.lng, s.lat]).addTo(kort);
    });
    skiftBilledMarkorer();
  }

  function skiftBilledMarkorer() {
    const vis = kort.getZoom() >= 14;
    billedMarkorer.forEach((m) => { m.getElement().style.display = vis ? '' : 'none'; });
  }

  function tilfoejBydelsLag() {
    const punkter = { type: 'FeatureCollection', features: bydele.features.map((f) => ({ type: 'Feature', properties: { navn: f.properties.navn }, geometry: { type: 'Point', coordinates: f.properties.midt } })) };
    kort.addSource('bydele', { type: 'geojson', data: bydele });
    kort.addSource('bydel-punkter', { type: 'geojson', data: punkter });
    kort.addLayer({ id: 'bydel-klik', type: 'fill', source: 'bydele', paint: { 'fill-color': '#000', 'fill-opacity': 0 } });
    kort.addLayer({ id: 'bydel-valgt', type: 'fill', source: 'bydele', filter: ['==', ['get', 'navn'], ''], paint: { 'fill-color': '#C8674A', 'fill-opacity': 0.18 } });
    kort.addLayer({ id: 'bydel-linje', type: 'line', source: 'bydele', paint: { 'line-color': '#15191C', 'line-width': 2, 'line-opacity': 0.7 } });
    kort.addLayer({ id: 'bydel-navne', type: 'symbol', source: 'bydel-punkter', maxzoom: 14, layout: { 'text-field': ['get', 'navn'], 'text-font': ['Noto Sans Bold'], 'text-size': 14, 'text-transform': 'uppercase', 'text-letter-spacing': 0.04 }, paint: { 'text-color': '#15191C', 'text-halo-color': '#ECEAE5', 'text-halo-width': 2 } });
    kort.on('click', 'bydel-klik', (e) => {
      if (kort.getZoom() >= 12.5 || kort.queryRenderedFeatures(e.point, { layers: ['spots'] }).length) return;
      vaelgBydel(e.features[0].properties.navn);
    });
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
      if (bydele) tilfoejBydelsLag();
      kort.addSource('spots', { type: 'geojson', data: geo(synlige()) });
      kort.addSource('valgt', { type: 'geojson', data: geo([]) });
      kort.addLayer({ id: 'spots', type: 'symbol', source: 'spots', layout: { 'icon-image': ['get', 'ikon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 1.7], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
      kort.addLayer({ id: 'spot-navne', type: 'symbol', source: 'spots', minzoom: 14, layout: { 'text-field': ['get', 'navn'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-anchor': 'top', 'text-offset': [0, 1.1], 'text-max-width': 9 }, paint: { 'text-color': '#15191C', 'text-halo-color': '#ECEAE5', 'text-halo-width': 2 } });
      kort.addLayer({ id: 'valgt', type: 'symbol', source: 'valgt', layout: { 'icon-image': 'pin-valgt', 'icon-allow-overlap': true, 'icon-ignore-placement': true } });
      kort.on('click', 'spots', (e) => {
        const s = spots.find((x) => x.id === e.features[0].properties.id);
        if (s) visPopup(s);
      });
      kort.on('mouseenter', 'spots', () => { kort.getCanvas().style.cursor = 'pointer'; });
      kort.on('mouseleave', 'spots', () => { kort.getCanvas().style.cursor = ''; });
      kort.on('zoom', skiftBilledMarkorer);
      kortKlar = true;
      visBilledMarkorer();
    });
  }

  function startRetTilstand() {
    try { rettelser = JSON.parse(localStorage.getItem(RET_NOEGLE)) || {}; } catch (e) { rettelser = {}; }
    el('ret-baand').hidden = false;
    gemRettelser();
    const google = ny('script');
    google.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_NOEGLE + '&v=weekly';
    google.async = true;
    document.head.append(google);
    el('ret-fortryd').addEventListener('click', () => {
      const s = spots.find((x) => x.id === sidstSlettet);
      delete rettelser[sidstSlettet];
      sidstSlettet = null;
      gemRettelser();
      opdater();
      if (s) visPopup(s);
    });
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
  el('panel-greb').addEventListener('click', () => el('panel').classList.toggle('aaben'));
  Promise.all([
    fetch('/data/koebenhavn.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }),
    fetch('/data/koebenhavn-bydele.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
    .then(([data, omraader]) => {
      spots = data;
      bydele = omraader;
      if (bydele) visBydele();
      el('antal').textContent = spots.length + ' spots, ingen bekræftet på stedet';
      opdater();
      startKort();
    })
    .catch(() => { el('antal').textContent = 'Spots kunne ikke indlæses. Prøv at genindlæse siden.'; });

  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') lukSpot(); });
})();
