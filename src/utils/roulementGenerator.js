// Générateur de Feuilles de Route (Roulements) pour Seine-Sud-Est
// Tous les enchaînements et changements de ligne se font impérativement aux terminus exacts.

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Identifie le terminus exact pour garantir que les changements de ligne
 * se fassent uniquement au même terminus.
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

export function generateRandomRoulement(busData, options = {}) {
  const {
    durationType = 'moyenne', // 'courte' (2 étapes), 'moyenne' (4 étapes), 'longue' (6 étapes)
    startLineName = null,
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

  let firstLine = lines.find(l => l.name === startLineName);
  if (!firstLine) {
    const linesWithSharedTerminus = lines.filter(l =>
      l.directions.some(d => {
        const hub = getTerminusHub(d.origin || sheets[d.sheetKey]?.fullOrigin);
        return (departuresByHub.get(hub) || []).some(item => item.line.name !== l.name);
      })
    );
    const pool = linesWithSharedTerminus.length > 0 ? linesWithSharedTerminus : lines;
    firstLine = pool[Math.floor(Math.random() * pool.length)];
  }

  let currentMinutes = parseTimeToMinutes(startTime);
  // Si l'heure actuelle est en fin de nuit ou très tard pour une ligne de jour, caler sur une plage de service fluide
  if (firstLine.name !== 'N76' && (currentMinutes < 360 || currentMinutes > 1230)) {
    currentMinutes = 420 + Math.floor(Math.random() * 600); // entre 07:00 et 17:00
  }

  const steps = [];

  const d0 = firstLine.directions[0];
  const d1 = firstLine.directions[1] || firstLine.directions[0];

  const d0OrigHub = getTerminusHub(d0.origin || sheets[d0.sheetKey]?.fullOrigin);
  const d1OrigHub = getTerminusHub(d1.origin || sheets[d1.sheetKey]?.fullOrigin);

  const d0HasTransfer = (departuresByHub.get(d0OrigHub) || []).some(item => item.line.name !== firstLine.name);
  const d1HasTransfer = (departuresByHub.get(d1OrigHub) || []).some(item => item.line.name !== firstLine.name);

  // Après 1 AR (dirA puis dirB), le conducteur termine au terminus d'origine de dirA.
  let dirA = d0;
  let dirB = d1;
  if (!d0HasTransfer && d1HasTransfer) {
    dirA = d1;
    dirB = d0;
  } else if (d0HasTransfer && d1HasTransfer && Math.random() > 0.5) {
    dirA = d1;
    dirB = d0;
  }

  const addTripStep = (line, dir, label) => {
    const sheet = sheets[dir.sheetKey];
    const trip = findNextFullTripAfter(sheet, currentMinutes);
    if (!trip) return null;

    const originName = dir.origin || sheet?.fullOrigin || trip.originStop;
    const destName = dir.destination || sheet?.fullDestination || trip.destinationStop;

    steps.push({
      stepNumber: steps.length + 1,
      type: 'service',
      label,
      lineName: line.name,
      logoUrl: line.logoUrl,
      dirId: dir.dirId,
      code: dir.code,
      sheetKey: dir.sheetKey,
      origin: originName,
      destination: destName,
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      isLimited: false,
      isCompleted: false
    });

    currentMinutes = parseTimeToMinutes(trip.arrivalTime) + 4;
    return getTerminusHub(destName);
  };

  // Étape 1 : Aller Ligne 1 (Terminus A -> Terminus B)
  let currentHub = addTripStep(firstLine, dirA, 'Prise de service • Aller');

  // Étape 2 : Retour Ligne 1 (Terminus B -> Terminus A)
  currentHub = addTripStep(firstLine, dirB, 'Continuité • Retour');

  if (durationType === 'courte') {
    const summaryText = `Ligne ${firstLine.name} : 1 AR (${steps[0]?.origin} ⥋ ${steps[0]?.destination})`;
    return {
      id: `ROUL-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      durationType,
      summary: summaryText,
      totalSteps: steps.length,
      completedSteps: 0,
      estimatedDuration: `${Math.max(25, steps.length * 20)} min`,
      steps
    };
  }

  // Changement de ligne impérativement au même terminus (currentHub)
  let transferCandidates = (departuresByHub.get(currentHub) || []).filter(
    item => item.line.name !== firstLine.name && item.line.name !== 'N76'
  );
  if (!transferCandidates.length) {
    transferCandidates = (departuresByHub.get(currentHub) || []).filter(
      item => item.line.name !== firstLine.name
    );
  }

  let secondLine = firstLine;
  let dir2A = dirA;
  let dir2B = dirB;

  if (transferCandidates.length > 0) {
    const chosen = transferCandidates[Math.floor(Math.random() * transferCandidates.length)];
    secondLine = chosen.line;
    dir2A = chosen.dir; // Départ au même terminus où le service précédent s'est terminé
    dir2B = secondLine.directions.find(d => d.dirId !== dir2A.dirId) || dir2A;
  }

  const transferTerminusName = steps[steps.length - 1]?.destination || dir2A.origin;
  currentMinutes += 3;

  // Étape 3 : Aller sur la Ligne 2 depuis ce terminus
  currentHub = addTripStep(
    secondLine,
    dir2A,
    secondLine.name !== firstLine.name
      ? `Changement au terminus ${transferTerminusName} ➔ Ligne ${secondLine.name}`
      : `2e Tour • Aller`
  );

  // Étape 4 : Retour sur la Ligne 2
  currentHub = addTripStep(secondLine, dir2B, `Ligne ${secondLine.name} • Retour`);

  if (durationType === 'longue') {
    currentHub = addTripStep(secondLine, dir2A, `Ligne ${secondLine.name} • 2e Aller`);
    currentHub = addTripStep(secondLine, dir2B, `Fin de service • 2e Retour`);
  }

  const secondPartCount = durationType === 'longue' ? '2 AR' : '1 AR';
  const summaryText = secondLine.name !== firstLine.name
    ? `${firstLine.name} (1 AR) puis à ${transferTerminusName} prendre la ${secondLine.name} dir. ${dir2A.destination} (${secondPartCount})`
    : `Ligne ${firstLine.name} : ${durationType === 'longue' ? '3 AR' : '2 AR'} complets`;

  return {
    id: `ROUL-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    durationType,
    summary: summaryText,
    totalSteps: steps.length,
    completedSteps: 0,
    estimatedDuration: `${Math.max(35, steps.length * 20)} min`,
    steps
  };
}
