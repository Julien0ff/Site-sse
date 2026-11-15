// Utilitaires pour le Mode Passagers : Indexation des arrêts, correspondances et prochains départs

/**
 * Récupère tous les arrêts uniques du réseau avec leurs lignes en correspondance
 */
export function getAllNetworkStops(busData) {
  if (!busData || !busData.lines) return [];

  const stopsMap = new Map();

  busData.lines.forEach(line => {
    line.directions.forEach(dir => {
      const sheet = busData.sheets?.[dir.sheetKey];
      if (!sheet || !sheet.allStops) return;

      sheet.allStops.forEach(stopName => {
        const cleanName = stopName.trim();
        if (!cleanName) return;

        if (!stopsMap.has(cleanName)) {
          stopsMap.set(cleanName, {
            name: cleanName,
            lines: new Map(),
            destinations: new Set()
          });
        }

        const stopEntry = stopsMap.get(cleanName);
        if (!stopEntry.lines.has(line.name)) {
          stopEntry.lines.set(line.name, {
            name: line.name,
            lineId: line.lineId,
            logoUrl: line.logoUrl
          });
        }
        stopEntry.destinations.add(dir.destination);
      });
    });
  });

  return Array.from(stopsMap.values()).map(s => ({
    name: s.name,
    lines: Array.from(s.lines.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    destinations: Array.from(s.destinations)
  })).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

/**
 * Calcule tous les prochains passages à un arrêt donné selon l'heure active
 * @param {string} stopName Nom de l'arrêt
 * @param {object} busData Données réseau
 * @param {Date} currentTime Date/heure courante (Roblox ou PC)
 * @param {number} limit Nombre maximum de passages à retourner
 */
export function getUpcomingDeparturesForStop(stopName, busData, currentTime, limit = 15) {
  if (!stopName || !busData || !busData.lines) return [];

  const cleanQuery = stopName.toLowerCase().trim();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const departures = [];

  busData.lines.forEach(line => {
    line.directions.forEach(dir => {
      const sheet = busData.sheets?.[dir.sheetKey];
      if (!sheet || !sheet.trips) return;

      sheet.trips.forEach(trip => {
        if (!trip.stops || trip.stops.length < 2) return;
        const stopIdx = trip.stops.findIndex(s => s.stop.toLowerCase().trim() === cleanQuery);
        // Ignorer si absent ou si c'est le terminus d'arrivée final
        if (stopIdx < 0 || stopIdx === trip.stops.length - 1) return;
        const stopObj = trip.stops[stopIdx];
        if (!stopObj || !stopObj.time) return;

        const [h, m] = stopObj.time.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;

        const stopMinutes = h * 60 + m;
        let diff = stopMinutes - currentMinutes;
        // Si l'horaire est passé, considérer le lendemain (+24h)
        if (diff < 0) {
          diff += 1440;
        }

        departures.push({
          lineName: line.name,
          logoUrl: line.logoUrl,
          code: dir.code,
          destination: trip.destinationStop || dir.destination,
          origin: trip.originStop || dir.origin,
          time: stopObj.time,
          diffMinutes: diff,
          isLimited: trip.isLimitedService,
          serviceNote: trip.serviceNote
        });
      });
    });
  });

  // Trier par imminence (dans X min)
  departures.sort((a, b) => a.diffMinutes - b.diffMinutes);

  return departures.slice(0, limit);
}
