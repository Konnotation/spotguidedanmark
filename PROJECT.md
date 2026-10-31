# Spotguide Danmark

Projektets hukommelse. Opdateres, når vi afslutter en større milepæl.

## Formål

Danmarks bedste digitale spotguide for street-skatere og filmere: et kort over danske spots med billeder, status fra community, vind og vejr samt skatevideoer. Autentisk skatekultur, ikke turistguide eller kommunalt katalog.

## Teknologi (forslag, ikke bygget endnu)

| Del | Valg | Hvorfor |
| --- | --- | --- |
| Hjemmeside | Next.js, TypeScript, Tailwind CSS | Standardvalg, spiller direkte sammen med Vercel |
| Kort | MapLibre GL JS | Gratis og åben. Kortudbyder vælges i Fase 1 ud fra vilkår og grænser |
| Database og billeder | Supabase (fra Fase 2) | Samlet løsning med gratis startniveau |
| Hosting | Vercel | Allerede sat op |
| Vejr | Open-Meteo (fra Fase 3) | Kræver ingen nøgle. Vilkår tjekkes før brug |

## Nuværende status

- **Fase:** 0, afklaring og design.
- **Repository:** tomt, ingen commits endnu. Forbundet til `Konnotation/spotguidedanmark` på GitHub.
- **Computer:** Git findes. Node.js mangler og skal installeres, før vi kan køre hjemmesiden lokalt.
- **Vercel:** forbindelsen er ikke kontrolleret endnu.
- **Design:** Bylisten (udkast 3) er favoritten. Version 3B med "Hvor skal vi hen?", et stort spørgsmålstegn og svævende, fritlagte fotos af VX1000 og HPX ligger til vurdering. Fotoene er fundet på nettet og må ikke bruges på den rigtige side, før rettighederne er på plads.

## Sådan ligger siden nu

Live på https://spotguidedanmark.vercel.app. Vercel deployer automatisk, når der pushes til `main`. Push sker fra GitHub Desktop, fordi login ligger der.

Forsiden (3B) er en simpel statisk side i mappen `public/`: `index.html`, `style.css`, `skate.js` og `billeder/`. `vercel.json` fortæller Vercel, at kun `public/` skal online. Den kræver ikke Node.js eller byggetrin. Den bliver skiftet ud med Next.js, når kortet bygges i Fase 1.

`public/koebenhavn/` er by-siden med kort (MapLibre og OpenFreeMap, begge uden nøgle) og liste. Dens 96 spots ligger i `public/data/koebenhavn.json`, som er et udtræk af den samlede spotliste.

Repositoriet er offentligt. `data/` med den samlede spotliste og research-noter er bevidst ikke lagt på GitHub.

## Køreplan

Vi tager ét trin ad gangen, og hver fase slutter med noget, du kan se og teste.

### Fase 0: Afklaring og design (nu)
1. Vælg forsidedesign.
2. Installér Node.js.
3. Kontrollér, at GitHub og Vercel hænger sammen.

**Færdig når:** vi har valgt retning, og din computer er klar.

### Fase 1: Første version med testdata
1. Opret projektet, og se en tom side på din egen computer.
2. Send siden online via GitHub og Vercel.
3. Byg designsystemet: farver, skrift og knapper.
4. Byg forsiden.
5. Byg kortet med markører for tydeligt mærkede testspots.
6. Byg spotvisningen: tryk på en markør, og se spottet.
7. Tilføj søgning og filtre.

**Færdig når:** siden ligger online og virker på din telefon.

### Fase 2: Rigtige spots
1. Opret Supabase, og design datamodellen.
2. Læg de første rigtige spots og billeder ind.
3. Giv hvert spot sin egen side.

**Færdig når:** kortet viser rigtige spots fra databasen, med dig som eneste, der kan skrive.

### Fase 3: Vejr og vind
1. Hent vejrdata for hvert spot.
2. Vis vindretning, vindstyrke og prognose.
3. Registrér skateretning, og vis medvind, modvind eller sidevind, når retningen kendes.

**Færdig når:** hvert spot viser vejr, og medvind/modvind kun vises, hvor skateretningen er registreret.

### Fase 4: Community
1. Statusrapporter, så flere uafhængige rapporter kan gøre et spot "usikkert".
2. Administratorside til godkendelse og arkiv.
3. Indsendelse af nye spots med beskyttelse mod spam og dubletter.

**Færdig når:** brugere kan bidrage, og intet bliver offentligt eller fjernet uden kontrol.

### Fase 5: Udvidelser
Skatevideoer, gemte spots, bedre søgning, spothistorik og flere community-funktioner.

## Centrale beslutninger

- **Vejr før community.** Rækkefølgen er byttet i forhold til masterprompten. Vejr er mere værdi for mindre risiko: ingen brugerdata, ingen moderation. Community kræver login, spambeskyttelse og persondata, og den funktion har mest værdi, når der allerede ligger rigtige spots på kortet.
- **Billeder uploades manuelt først.** Instagram bruges kun via officielle links eller embeds, aldrig scraping.

## Bør afklares inden Fase 4

- Regler for persondata (GDPR), når brugere indsender rapporter og billeder.
- Hvordan vi håndterer spots på privat grund, og hvem der ejer indsendte billeder.

## Kendte problemer

- Kamerafotoene i `public/billeder/` er fundet på nettet og skal skiftes til egne fotos eller bruges med tilladelse.
- Kun København har en side. Aarhus, Odense og Aalborg står som "Kommer".
- Spottene på København-siden er ikke bekræftet på stedet.
- Billed-popuppen viser Street View via Google Maps Embed API (projekt `spotguide-danmark` på Jeppes private Google-konto). Nøglen ligger i `public/koebenhavn/kort.js` og virker kun på spotguidedanmark.vercel.app. Får siden eget domæne, skal det tilføjes til nøglen hos Google.
- Google-kontoen er på en prøveperiode på 90 dage fra 31. oktober 2026 (slutter cirka 29. januar 2027). Afklar før den tid, om der skal opgraderes, for at Street View bliver ved med at virke.

## Næste opgave

Godkend forsidedesign (3B), og installér Node.js.
