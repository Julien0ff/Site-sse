// Générateur d'Itinéraire & Feuilles de Route pour Seine-Sud-Est
// Inclut : Sortie de dépôt (HLP GIR 61), Changements de girouette, Pauses/Battements aux terminus,
// Changements de ligne strictement aux terminus, et Retour Centre Bus (GIR 65) ou Fin de service.

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(totalMin) {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDurationBetween(depTime, arrTime) {
  let dep = parseTimeToMinutes(depTime);
  let arr = parseTimeToMinutes(arrTime);
  if (arr < dep) arr += 1440;
  return Math.max(1, arr - dep);
}

/**
 * Identifie le terminus exact pour garantir que les changements de ligne
 * se fassent impérativement au même terminus.
 */
function getTerminusHub(stopName) {
  if (!stopName) return null;
  const s = stopName.toLowerCase().trim();

  if (s.includes('hôtel de ville de chaillot')) return 'hdv_chaillot';
  if (s.includes('chaillot-batignolles')) return 'chaillot_rer';
  if (s.includes('narbérale rer') || s === 'gare de narbérale') return 'narberale_rer';
  if (s.includes('cherbourg')) return 'rue_de_cherbourg';
  if (s.includes('port-perret')) return 'port_perret';
  if (s.includes('rosenberg')) return 'berthee_rosenberg';
  if (s.includes('gare de cramain') || s.includes('cramain - université') || s.includes('cramain – université')) return 'cramain_univ';
  if (s.includes('clémenceau') || s.includes('clemenceau')) return 'clemenceau_cramain';
  if (s.includes('sous-préfecture')) return 'sous_prefecture';
  if (s.includes('bismarck')) return 'bismarck';
  if (s.includes('petit-passy') || s.includes('pasteur')) return 'petit_passy';
  if (s.includes('arlande')) return 'hauts_arlande';
  if (s.includes('houssaye')) return 'houssaye';
  if (s.includes('denfert') || s.includes('créteil')) return 'denfert';

  return s;
}

/**
 * Détermine le dépôt le plus cohérent selon le terminus
 */
function resolveBestDepotForTerminus(stopName, preferredDepotFilter = 'all') {
  if (preferredDepotFilter === 'berthee') return 'Dépôt de Berthée';
  if (preferredDepotFilter === 'courcelles') return 'Dépôt de Courcelles';

  const hub = getTerminusHub(stopName);
  if (hub === 'chaillot_rer' || hub === 'hdv_chaillot') {
    return Math.random() > 0.45 ? 'Dépôt de Courcelles' : 'Dépôt de Berthée';
  }
  return 'Dépôt de Berthée';
}

/**
 * Trouve le prochain départ complet (terminus à terminus) sur une feuille après minMinutes.
 */
function findNextFullTripAfter(sheet, minMinutes) {
  if (!sheet || !sheet.trips || !sheet.trips.length) return null;

  const fullTrips = sheet.trips.filter(t => !t.isLimitedService);
  const pool = fullTrips.length > 0 ? fullTrips : sheet.trips;

  for (const trip of pool) {
    const depMin = parseTimeToMinutes(trip.departureTime);
    if (depMin >= minMinutes) {
      return trip;
    }
  }
  return pool[0];
}

/**
 * Extrait 2 à 3 arrêts intermédiaires clés pour l'aperçu d'itinéraire
 */
function extractViaStops(sheet, trip) {
  const stopsList = (trip?.stops || []).map(s => s.stop);
  const source = stopsList.length >= 4 ? stopsList : (sheet?.allStops || []);
  if (source.length <= 3) return [];
  const p1 = source[Math.floor(source.length * 0.33)];
  const p2 = source[Math.floor(source.length * 0.66)];
  return [p1, p2].filter(Boolean);
}

export function generateRandomRoulement(busData, options = {}) {
  const {
    durationType = 'moyenne',     // 'courte' (1 AR), 'moyenne' (2 AR), 'longue' (3 AR)
    startLineName = null,         // null / 'all' ou nom de ligne
    depotFilter = 'all',          // 'all' | 'berthee' | 'courcelles'
    serviceMode = 'interligne',   // 'interligne' (avec changement) | 'mono' (ligne unique)
    endMode = 'depot',            // 'depot' (Retour Centre Bus GIR 65) | 'terminus' (Fin sur place)
    includePause = true,          // Pause coupure au terminus à mi-service
    startTime = '14:00'
  } = options;

  const lines = (busData?.lines || []).filter(l => l.directions && l.directions.length >= 2);
  const sheets = busData?.sheets || {};

  if (!lines.length) return null;

  // Map des départs par terminus exact : hub -> [{ line, dir, originHub, destHub }]
  const departuresByHub = new Map();
  for (const line of lines) {
    for (const dir of line.directions) {
      const sheet = sheets[dir.sheetKey];
      const origName = dir.origin || sheet?.fullOrigin;
      const destName = dir.destination || sheet?.fullDestination;
      const originHub = getTerminusHub(origName);
      const destHub = getTerminusHub(destName);

      if (!departuresByHub.has(originHub)) {
        departuresByHub.set(originHub, []);
      }
      departuresByHub.get(originHub).push({ line, dir, originHub, destHub });
    }
  }

  // Choix de la première ligne (filtrée par dépôt si Dépôt de Courcelles est imposé -> Chaillot)
  let firstLine = lines.find(l => l.name === startLineName && startLineName !== 'all');
  if (!firstLine) {
    let candidateLines = lines;
    if (depotFilter === 'courcelles') {
      const chaillotLines = lines.filter(l =>
        l.directions.some(d => {
          const h = getTerminusHub(d.origin || sheets[d.sheetKey]?.fullOrigin);
          return h === 'chaillot_rer' || h === 'hdv_chaillot';
        })
      );
      if (chaillotLines.length) candidateLines = chaillotLines;
    } else if (serviceMode === 'interligne') {
      const sharedLines = lines.filter(l =>
        l.directions.some(d => {
          const h = getTerminusHub(d.origin || sheets[d.sheetKey]?.fullOrigin);
          return (departuresByHub.get(h) || []).some(item => item.line.name !== l.name);
        })
      );
      if (sharedLines.length) candidateLines = sharedLines;
    }
    firstLine = candidateLines[Math.floor(Math.random() * candidateLines.length)];
  }

  let currentMinutes = parseTimeToMinutes(startTime);
  if (firstLine.name !== 'N76' && (currentMinutes < 360 || currentMinutes > 1200)) {
    currentMinutes = 450 + Math.floor(Math.random() * 540); // Plage 07:30 - 16:30
  }

  const d0 = firstLine.directions[0];
  const d1 = firstLine.directions[1] || firstLine.directions[0];

  const d0OrigHub = getTerminusHub(d0.origin || sheets[d0.sheetKey]?.fullOrigin);
  const d1OrigHub = getTerminusHub(d1.origin || sheets[d1.sheetKey]?.fullOrigin);

  const isDepotHub = (hub) => {
    if (depotFilter === 'courcelles') {
      return hub === 'chaillot_rer' || hub === 'hdv_chaillot';
    }
    return [
      'chaillot_rer',
      'hdv_chaillot',
      'narberale_rer',
      'rue_de_cherbourg',
      'cramain_univ',
      'clemenceau_cramain',
      'berthee_rosenberg'
    ].includes(hub);
  };

  const d0IsDepot = isDepotHub(d0OrigHub);
  const d1IsDepot = isDepotHub(d1OrigHub);
  const d0HasTransfer = (departuresByHub.get(d0OrigHub) || []).some(item => item.line.name !== firstLine.name);
  const d1HasTransfer = (departuresByHub.get(d1OrigHub) || []).some(item => item.line.name !== firstLine.name);

  let dirA = d0;
  let dirB = d1;

  if (!d0IsDepot && d1IsDepot) {
    dirA = d1;
    dirB = d0;
  } else if (d0IsDepot && d1IsDepot) {
    if (!d0HasTransfer && d1HasTransfer) {
      dirA = d1;
      dirB = d0;
    } else if (d0HasTransfer && d1HasTransfer && Math.random() > 0.5) {
      dirA = d1;
      dirB = d0;
    }
  }

  const steps = [];
  let lastGirCode = '61';

  const addTripStep = (line, dir, label, extra = {}) => {
    const sheet = sheets[dir.sheetKey];
    const trip = findNextFullTripAfter(sheet, currentMinutes);
    if (!trip) return null;

    const originName = dir.origin || sheet?.fullOrigin || trip.originStop;
    const destName = dir.destination || sheet?.fullDestination || trip.destinationStop;
    const depMin = parseTimeToMinutes(trip.departureTime);
    const arrMin = parseTimeToMinutes(trip.arrivalTime);
    const durationMin = getDurationBetween(trip.departureTime, trip.arrivalTime);

    let pauseBefore = null;
    if (steps.length > 0) {
      const prevStep = steps[steps.length - 1];
      const prevArrMin = parseTimeToMinutes(prevStep.arrivalTime);
      let waitMin = depMin - prevArrMin;
      if (waitMin < 0) waitMin += 1440;

      if (extra.isMainPause || waitMin >= 10) {
        pauseBefore = {
          type: extra.isMainPause ? 'pause' : 'battement',
          label: extra.isMainPause ? 'Pause coupure conducteur' : 'Battement régulation au terminus',
          location: originName,
          startTime: prevStep.arrivalTime,
          endTime: trip.departureTime,
          durationMinutes: Math.max(waitMin, extra.isMainPause ? 12 : 4)
        };
      }
    }

    const stepObj = {
      stepNumber: steps.length + 1,
      type: 'service',
      label,
      lineName: line.name,
      lineColor: line.color || '#DAE44E',
      logoUrl: line.logoUrl,
      dirId: dir.dirId,
      code: dir.code,
      previousGirCode: lastGirCode,
      girChangeText: `${lastGirCode} ➔ ${dir.code}`,
      isLineChange: Boolean(extra.isLineChange),
      transferTerminus: extra.transferTerminus || null,
      pauseBefore,
      sheetKey: dir.sheetKey,
      origin: originName,
      destination: destName,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      durationMinutes: durationMin,
      stopsCount: trip.stops?.length || sheet?.allStops?.length || 0,
      viaStops: extractViaStops(sheet, trip),
      isLimited: false,
      isCompleted: false,
      justCompletedAt: null
    };

    steps.push(stepObj);
    lastGirCode = dir.code;
    currentMinutes = arrMin + 4;
    return getTerminusHub(destName);
  };

  // Étape 1 : 1er Aller
  let currentHub = addTripStep(firstLine, dirA, `1er Aller • Ligne ${firstLine.name}`);

  // Étape 2 : 1er Retour
  currentHub = addTripStep(firstLine, dirB, `1er Retour • Ligne ${firstLine.name}`);

  // Si durée moyenne ou longue : 2e partie de service
  let secondLine = firstLine;
  let dir2A = dirA;
  let dir2B = dirB;

  if (durationType !== 'courte') {
    if (serviceMode !== 'mono') {
      let transferCandidates = (departuresByHub.get(currentHub) || []).filter(
        item => item.line.name !== firstLine.name && item.line.name !== 'N76'
      );
      if (!transferCandidates.length) {
        transferCandidates = (departuresByHub.get(currentHub) || []).filter(
          item => item.line.name !== firstLine.name
        );
      }

      if (transferCandidates.length > 0) {
        const chosen = transferCandidates[Math.floor(Math.random() * transferCandidates.length)];
        secondLine = chosen.line;
        dir2A = chosen.dir;
        dir2B = secondLine.directions.find(d => d.dirId !== dir2A.dirId) || dir2A;
      }
    }

    const transferTerminusName = steps[steps.length - 1]?.destination || dir2A.origin;
    if (includePause) {
      currentMinutes += 12; // Pause coupure au terminus avant la 2e partie
    } else {
      currentMinutes += 3;
    }

    const isLineChanged = secondLine.name !== firstLine.name;

    // Étape 3 : Aller 2e partie
    currentHub = addTripStep(
      secondLine,
      dir2A,
      isLineChanged
        ? `Changement à ${transferTerminusName} ➔ Ligne ${secondLine.name}`
        : `2e Aller • Ligne ${secondLine.name}`,
      {
        isLineChange: isLineChanged,
        transferTerminus: transferTerminusName,
        isMainPause: includePause
      }
    );

    // Étape 4 : Retour 2e partie
    currentHub = addTripStep(secondLine, dir2B, `Retour • Ligne ${secondLine.name}`);

    // Si durée longue : 3e AR
    if (durationType === 'longue') {
      currentMinutes += 5;
      currentHub = addTripStep(secondLine, dir2A, `2e Aller • Ligne ${secondLine.name}`);
      currentHub = addTripStep(secondLine, dir2B, `Dernier Retour • Ligne ${secondLine.name}`);
    }
  }

  // Sortie de Dépôt (Haut-le-Pied GIR 61)
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const depotStart = resolveBestDepotForTerminus(firstStep?.origin, depotFilter);
  const depotEnd = depotStart;

  const firstDepMin = parseTimeToMinutes(firstStep?.departureTime || '08:00');
  const hlpStartDepTime = formatMinutesToTime(firstDepMin - 8);

  const hlpStart = {
    type: 'hlp_start',
    depotName: depotStart,
    targetStop: firstStep?.origin || 'Terminus',
    girCode: '61',
    girLabel: 'Sans Voyageur',
    departureTime: hlpStartDepTime,
    arrivalTime: firstStep?.departureTime || '08:00',
    durationMinutes: 8
  };

  // Fin de service / Retour Centre Bus (GIR 65 ou Fin au terminus GIR 61)
  const lastArrMin = parseTimeToMinutes(lastStep?.arrivalTime || '10:00');
  const hlpEnd = endMode === 'depot'
    ? {
        type: 'retour_depot',
        title: 'Retour Centre Bus (Haut-le-Pied)',
        fromStop: lastStep?.destination || 'Terminus',
        depotName: depotEnd,
        previousGirCode: lastStep?.code || '61',
        girCode: '65',
        girLabel: 'Retour Dépôt',
        girChangeText: `${lastStep?.code || '61'} ➔ 65`,
        departureTime: formatMinutesToTime(lastArrMin + 2),
        arrivalTime: formatMinutesToTime(lastArrMin + 10),
        durationMinutes: 8
      }
    : {
        type: 'fin_terminus',
        title: 'Fin de service au terminus (Relève sur place)',
        fromStop: lastStep?.destination || 'Terminus',
        depotName: null,
        previousGirCode: lastStep?.code || '61',
        girCode: '61',
        girLabel: 'Sans Voyageur',
        girChangeText: `${lastStep?.code || '61'} ➔ 61`,
        departureTime: lastStep?.arrivalTime || '10:00',
        arrivalTime: lastStep?.arrivalTime || '10:00',
        durationMinutes: 0
      };

  const totalStartMin = parseTimeToMinutes(hlpStart.departureTime);
  const totalEndMin = parseTimeToMinutes(hlpEnd.arrivalTime);
  let totalSpanMin = totalEndMin - totalStartMin;
  if (totalSpanMin <= 0) totalSpanMin += 1440;
  const spanHours = Math.floor(totalSpanMin / 60);
  const spanRemMin = totalSpanMin % 60;
  const estimatedDuration = spanHours > 0
    ? `${spanHours}h${String(spanRemMin).padStart(2, '0')}`
    : `${spanRemMin} min`;

  const transferTerminusName = steps.find(s => s.isLineChange)?.transferTerminus || steps[1]?.destination;
  const secondPartCount = durationType === 'longue' ? '2 AR' : '1 AR';
  const summaryText = durationType === 'courte'
    ? `Ligne ${firstLine.name} • 1 AR (${firstStep?.origin} ⥋ ${firstStep?.destination})`
    : secondLine.name !== firstLine.name
    ? `Ligne ${firstLine.name} (1 AR) ➔ ${transferTerminusName} ➔ Ligne ${secondLine.name} (${secondPartCount})`
    : `Ligne ${firstLine.name} • ${durationType === 'longue' ? '3 AR' : '2 AR'} complets`;

  return {
    id: `FDR-${firstLine.name}-${Math.floor(100 + Math.random() * 900)}`,
    version: 2,
    createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    durationType,
    serviceMode,
    endMode,
    includePause,
    depotStart,
    depotEnd: endMode === 'depot' ? depotEnd : null,
    hlpStart,
    hlpEnd,
    summary: summaryText,
    startTime: hlpStart.departureTime,
    endTime: hlpEnd.arrivalTime,
    totalSteps: steps.length,
    completedSteps: 0,
    estimatedDuration,
    steps
  };
}
