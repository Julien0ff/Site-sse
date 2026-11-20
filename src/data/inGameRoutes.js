// Parcours réellement joués en jeu.
//
// Les fiches horaires décrivent les lignes officielles complètes, mais en jeu
// certaines lignes s'arrêtent à un terminus provisoire. Cette table coupe chaque
// course sur la portion jouée, pour que le pupitre, l'accueil, les feuilles de
// route et les horaires voyageurs affichent tous les mêmes terminus que la page
// Conduite (« En jeu : … »).
//
//   from / to     : arrêts de début et de fin, avec le nom exact de la fiche
//   rename        : nom à afficher pour un arrêt de la fiche (libellé provisoire)
//   serviceStart  : arrêt où l'on prend son service en sortant du dépôt, s'il
//                   diffère du terminus de départ
//   prepend       : terminus absent de la fiche, ajouté avant `from`
export const IN_GAME_ROUTES = {
  // 149 : terminus provisoire Pasteur
  '149_CHAI': { from: 'Pasteur', to: 'Chaillot-Batignolles RER' },
  '149_PASS': { from: 'Chaillot-Batignolles RER', to: 'Pasteur' },

  // 316 : Rue de Cherbourg ⥋ Hôtel de Ville de Denfert-la-Roche,
  // première prise de service à Cramain - Université RER
  '316_DAMP': {
    from: 'Hôtel de Ville de Denfert-la-Roche',
    to: 'Soufflot - TERMINUS PROVISOIRE/RUE DE CHERBOURG',
    rename: { 'Soufflot - TERMINUS PROVISOIRE/RUE DE CHERBOURG': 'Rue de Cherbourg' },
    serviceStart: 'Cramain - Université RER'
  },
  '316_CRET': {
    from: 'Rue de Cherbourg',
    to: 'Hôtel de Ville de Denfert-la-Roche',
    serviceStart: 'Cramain - Université RER'
  },

  // 433 : Clémenceau ⥋ Narbérale
  '433_NARB': { from: 'Clemenceau', to: 'Narbérale RER' },
  '433_SARA': { from: 'Narbérale RER', to: 'Clemenceau' },

  // N76 : Chaillot ⥋ Berthée - Rosenberg
  '786_BOIS': {
    from: 'Chaillot-Batignolles RER',
    to: 'Rosenberg',
    rename: { Rosenberg: 'Berthée - Rosenberg' }
  },
  // La fiche retour ne contient pas Berthée - Rosenberg : on l'ajoute en tête,
  // 1 min avant Cramain - Université - République (écart constant à l'aller).
  '786_PLES': {
    from: 'Cramain - Université - République',
    to: 'Chaillot-Batignolles RER',
    prepend: { stop: 'Berthée - Rosenberg', minutesBefore: 1 }
  }
};

const fmt = (min) => {
  const n = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function clipSheet(sheet, route) {
  const names = sheet.allStops || [];
  const a = names.indexOf(route.from);
  const b = names.indexOf(route.to);
  if (a < 0 || b < 0 || b <= a) {
    console.warn(`[inGameRoutes] arrêts introuvables pour ${sheet.sheetKey}`, route);
    return sheet;
  }

  const display = (name) => route.rename?.[name] || name;
  const indexOf = new Map(names.map((n, i) => [n, i]));
  const segmentStops = [...(route.prepend ? [route.prepend.stop] : []), ...names.slice(a, b + 1)];

  const trips = [];
  for (const trip of sheet.trips) {
    const kept = trip.stops.filter(s => {
      const i = indexOf.get(s.stop);
      return i !== undefined && i >= a && i <= b;
    });
    if (kept.length < 2) continue; // la course ne roule pas sur la partie jouée

    const stops = kept.map(s => ({ ...s, stop: display(s.stop) }));
    // Terminus absent de la fiche : ajouté devant les courses qui partent de `from`
    if (route.prepend && indexOf.get(kept[0].stop) === a) {
      stops.unshift({ stop: route.prepend.stop, time: fmt(toMin(kept[0].time) - route.prepend.minutesBefore) });
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    let duration = toMin(last.time) - toMin(first.time);
    if (duration < 0) duration += 1440;

    const startsAtTerminus = indexOf.get(kept[0].stop) === a;
    const endsAtTerminus = indexOf.get(kept[kept.length - 1].stop) === b;
    const isLimitedService = !(startsAtTerminus && endsAtTerminus);

    trips.push({
      ...trip,
      stops,
      departureTime: first.time,
      arrivalTime: last.time,
      originStop: first.stop,
      destinationStop: last.stop,
      durationMinutes: duration,
      stopCount: stops.length,
      totalRouteStops: segmentStops.length,
      isLimitedService,
      serviceNote: isLimitedService
        ? (!startsAtTerminus ? `Départ partiel : ${first.stop}` : `Terminus partiel : ${last.stop}`)
        : 'Service complet'
    });
  }
  trips.sort((x, y) => toMin(x.departureTime) - toMin(y.departureTime));

  return {
    ...sheet,
    allStops: segmentStops.map(display),
    fullOrigin: route.prepend ? route.prepend.stop : display(route.from),
    fullDestination: display(route.to),
    totalStops: segmentStops.length,
    totalTrips: trips.length,
    limitedTripsCount: trips.filter(t => t.isLimitedService).length,
    trips
  };
}

// Applique les parcours en jeu à toutes les fiches concernées
export function applyInGameRoutes(busData) {
  const sheets = { ...busData.sheets };
  const lines = busData.lines.map(line => ({
    ...line,
    directions: line.directions.map(dir => {
      const route = IN_GAME_ROUTES[dir.dirId];
      if (!route || !sheets[dir.sheetKey]) return dir;
      sheets[dir.sheetKey] = clipSheet(sheets[dir.sheetKey], route);
      return route.serviceStart ? { ...dir, serviceStart: route.serviceStart } : dir;
    })
  }));
  return { ...busData, lines, sheets };
}
