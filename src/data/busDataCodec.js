// Encodage compact des fiches horaires.
//
// busData.json répète le nom complet de chaque arrêt pour chaque course
// (~2 Mo). Comme les arrêts d'une course suivent toujours l'ordre de
// `sheet.allStops`, on stocke à la place l'indice de l'arrêt et l'heure en
// minutes. `expandBusData` reconstruit exactement la structure d'origine, donc
// le reste de l'application n'a pas à changer.
//
// `compactBusData` tourne à la compilation (plugin Vite), `expandBusData` dans
// le navigateur.

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function compactBusData(data) {
  const sheets = {};
  for (const [key, sheet] of Object.entries(data.sheets || {})) {
    const names = sheet.allStops || [];
    const trips = sheet.trips.map(trip => {
      const { stops, ...rest } = trip;
      const idx = [];
      const times = [];
      let from = 0;
      for (const s of stops) {
        const i = names.indexOf(s.stop, from);
        if (i < 0 || !/^\d{1,2}:\d{2}$/.test(s.time || '')) {
          // Cas non prévu : on garde la course telle quelle plutôt que de la corrompre
          return { ...trip, _raw: true };
        }
        idx.push(i);
        times.push(toMinutes(s.time));
        from = i + 1;
      }
      return { ...rest, _i: idx, _t: times };
    });
    sheets[key] = { ...sheet, trips };
  }
  return { ...data, sheets, _compact: 1 };
}

export function expandBusData(data) {
  if (!data?._compact) return data;
  const sheets = {};
  for (const [key, sheet] of Object.entries(data.sheets)) {
    const names = sheet.allStops || [];
    const trips = sheet.trips.map(trip => {
      if (trip._raw) {
        const { _raw, ...original } = trip;
        return original;
      }
      const { _i, _t, ...rest } = trip;
      return { ...rest, stops: _i.map((i, n) => ({ stop: names[i], time: toHHMM(_t[n]) })) };
    });
    sheets[key] = { ...sheet, trips };
  }
  const { _compact, ...rest } = data;
  return { ...rest, sheets };
}
