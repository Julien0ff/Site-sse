// Générateur de feuilles de route Seine-Sud-Est.
// Règles :
//  - Les horaires sont strictement chronologiques (temps absolu, passage de minuit géré).
//  - Chaque course part du terminus où la précédente s'est arrêtée (changements uniquement aux terminus).
//  - Sortie de dépôt en Haut-le-Pied (GIR 61), retour centre bus (GIR 65) ou fin au terminus.

const DAY = 1440;
const MAX_WAIT = 120;        // au-delà, on arrête la feuille plutôt que d'attendre des heures
const HLP_MINUTES = 8;
const MIN_TURNAROUND = 4;    // battement minimum au terminus

function toMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmt(abs) {
  const n = ((abs % DAY) + DAY) % DAY;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

// Terminus normalisé : deux noms qui renvoient le même hub = même terminus physique
export function getTerminusHub(stopName) {
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

const CHAILLOT_HUBS = ['chaillot_rer', 'hdv_chaillot'];
const BERTHEE_HUBS = ['chaillot_rer', 'hdv_chaillot', 'narberale_rer', 'rue_de_cherbourg', 'cramain_univ', 'berthee_rosenberg'];

function depotHubs(depotFilter) {
  if (depotFilter === 'courcelles') return CHAILLOT_HUBS;
  return BERTHEE_HUBS;
}

// Prochaine course complète partant à partir du temps absolu `after`
function nextTrip(sheet, after) {
  if (!sheet?.trips?.length) return null;
  const full = sheet.trips.filter(t => !t.isLimitedService);
  const pool = full.length ? full : sheet.trips;
  const base = Math.floor(after / DAY) * DAY;

  for (let d = 0; d <= 1; d++) {
    for (const trip of pool) {
      const dep = base + d * DAY + toMin(trip.departureTime);
      if (dep < after) continue;
      let dur = toMin(trip.arrivalTime) - toMin(trip.departureTime);
      if (dur <= 0) dur += DAY;
      return { trip, dep, arr: dep + dur, dur };
    }
  }
  return null;
}

function viaStops(trip) {
  const list = (trip?.stops || []).map(s => s.stop);
  if (list.length < 5) return [];
  return [list[Math.floor(list.length / 3)], list[Math.floor((list.length * 2) / 3)]];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomRoulement(busData, options = {}) {
  const {
    durationType = 'moyenne',
    startLineName = null,
    depotFilter = 'all',
    serviceMode = 'interligne',
    endMode = 'depot',
    includePause = true,
    startTime = '14:00'
  } = options;

  const sheets = busData?.sheets || {};
  const lines = (busData?.lines || []).filter(l => l.directions?.length >= 2);
  if (!lines.length) return null;

  const tripCount = durationType === 'courte' ? 2 : durationType === 'longue' ? 6 : 4;

  // Index : départs par terminus
  const byHub = new Map();
  for (const line of lines) {
    for (const dir of line.directions) {
      const hub = getTerminusHub(dir.origin || sheets[dir.sheetKey]?.fullOrigin);
      if (!byHub.has(hub)) byHub.set(hub, []);
      byHub.get(hub).push({ line, dir });
    }
  }

  const originHub = (dir) => getTerminusHub(dir.origin || sheets[dir.sheetKey]?.fullOrigin);
  const destHub = (dir) => getTerminusHub(dir.destination || sheets[dir.sheetKey]?.fullDestination);
  const opposite = (line, dir) => line.directions.find(d => d.dirId !== dir.dirId) || dir;

  const now = toMin(startTime);
  const firstAfter = now + HLP_MINUTES + 2;
  const allowedHubs = depotHubs(depotFilter);

  // --- 1. Choix de la ligne et de la direction de départ ---
  const startCandidates = [];
  for (const line of lines) {
    if (startLineName && line.name !== startLineName) continue;
    for (const dir of line.directions) {
      // Ligne avec prise de service en ligne (ex. 316) : c'est cet arrêt que dessert le dépôt
      const hub = dir.serviceStart ? getTerminusHub(dir.serviceStart) : originHub(dir);
      const fromDepot = allowedHubs.includes(hub);
      if (depotFilter === 'courcelles' && !fromDepot) continue;
      const nt = nextTrip(sheets[dir.sheetKey], firstAfter);
      if (!nt) continue;
      const transferable = (byHub.get(hub) || []).some(x => x.line.name !== line.name);
      startCandidates.push({ line, dir, nt, fromDepot, transferable, wait: nt.dep - firstAfter });
    }
  }
  if (!startCandidates.length) return null;

  // Priorité : départ desservi par le dépôt, course dans les 45 min, terminus avec correspondance (inter-lignes)
  const score = (c) =>
    (c.fromDepot ? 0 : 1000) +
    (c.wait <= 45 ? 0 : 300 + c.wait) +
    (serviceMode === 'interligne' && !c.transferable ? 50 : 0);
  startCandidates.sort((a, b) => score(a) - score(b));
  const bestScore = score(startCandidates[0]);
  const top = startCandidates.filter(c => score(c) <= bestScore + 40);
  const start = pickRandom(top);

  // --- 2. Construction chronologique ---
  const steps = [];
  let lastGir = '61';
  let hub = originHub(start.dir);
  let time = firstAfter;
  const firstDirByLine = { [start.line.name]: start.dir.dirId };
  let currentLine = start.line;
  let currentDir = start.dir;
  let lineChangedAt = null;

  const pushStep = (line, dir, nt, label, extra = {}) => {
    const prev = steps[steps.length - 1];
    let pauseBefore = null;
    if (prev) {
      const wait = nt.dep - prev.arrAbs;
      if (extra.isMainPause || wait >= 10) {
        pauseBefore = {
          type: extra.isMainPause ? 'pause' : 'battement',
          label: extra.isMainPause ? 'Pause' : 'Battement',
          location: dir.origin,
          startTime: fmt(prev.arrAbs),
          endTime: fmt(nt.dep),
          durationMinutes: wait
        };
      }
    }

    steps.push({
      stepNumber: steps.length + 1,
      type: 'service',
      label,
      lineName: line.name,
      lineColor: line.color || '#DAE44E',
      logoUrl: line.logoUrl,
      dirId: dir.dirId,
      code: dir.code,
      previousGirCode: lastGir,
      isLineChange: Boolean(extra.isLineChange),
      transferTerminus: extra.transferTerminus || null,
      pauseBefore,
      sheetKey: dir.sheetKey,
      origin: dir.origin,
      destination: dir.destination,
      departureTime: nt.trip.departureTime,
      arrivalTime: nt.trip.arrivalTime,
      depAbs: nt.dep,
      arrAbs: nt.arr,
      dayOffset: Math.floor(nt.dep / DAY),
      durationMinutes: nt.dur,
      stopsCount: nt.trip.stops?.length || 0,
      viaStops: viaStops(nt.trip),
      isCompleted: false,
      justCompletedAt: null
    });

    lastGir = dir.code;
    hub = destHub(dir);
    time = nt.arr + MIN_TURNAROUND;
  };

  // Course 1
  pushStep(start.line, start.dir, start.nt, 'Aller');

  for (let i = 1; i < tripCount; i++) {
    const wantsTransfer = serviceMode === 'interligne' && i === 2;
    let isMainPause = includePause && i === Math.floor(tripCount / 2);
    let searchFrom = time + (isMainPause ? 15 : 0);

    let chosen = null;

    if (wantsTransfer) {
      const options = (byHub.get(hub) || [])
        .filter(x => x.line.name !== currentLine.name)
        .map(x => ({ ...x, nt: nextTrip(sheets[x.dir.sheetKey], searchFrom) }))
        .filter(x => x.nt && x.nt.dep - searchFrom <= MAX_WAIT)
        .sort((a, b) => a.nt.dep - b.nt.dep);
      if (options.length) {
        const earliest = options[0].nt.dep;
        chosen = pickRandom(options.filter(o => o.nt.dep - earliest <= 25));
      }
    }

    if (!chosen) {
      // Retour sur la même ligne, depuis le terminus actuel
      const dir = opposite(currentLine, currentDir);
      if (originHub(dir) !== hub) break; // sécurité : pas de départ depuis ce terminus
      const nt = nextTrip(sheets[dir.sheetKey], searchFrom);
      if (!nt || nt.dep - searchFrom > MAX_WAIT) break;
      chosen = { line: currentLine, dir, nt };
    }

    const isLineChange = chosen.line.name !== currentLine.name;
    if (isLineChange) lineChangedAt = chosen.dir.origin;
    if (!firstDirByLine[chosen.line.name]) firstDirByLine[chosen.line.name] = chosen.dir.dirId;
    const label = firstDirByLine[chosen.line.name] === chosen.dir.dirId ? 'Aller' : 'Retour';

    pushStep(chosen.line, chosen.dir, chosen.nt, label, {
      isLineChange,
      transferTerminus: isLineChange ? chosen.dir.origin : null,
      isMainPause
    });
    currentLine = chosen.line;
    currentDir = chosen.dir;
  }

  // Première course prise en ligne (ex. 316 : Cramain - Université RER) :
  // on démarre à cet arrêt, à son heure de passage
  if (start.dir.serviceStart) {
    const trip = start.nt.trip;
    const i = trip.stops.findIndex(st => st.stop === start.dir.serviceStart);
    if (i > 0 && i < trip.stops.length - 1) {
      let offset = toMin(trip.stops[i].time) - toMin(trip.departureTime);
      if (offset < 0) offset += DAY;
      Object.assign(steps[0], {
        origin: start.dir.serviceStart,
        spawnStop: start.dir.serviceStart,
        departureTime: trip.stops[i].time,
        depAbs: steps[0].depAbs + offset,
        durationMinutes: steps[0].durationMinutes - offset,
        stopsCount: trip.stops.length - i,
        viaStops: viaStops({ stops: trip.stops.slice(i) })
      });
    }
  }

  const first = steps[0];
  const last = steps[steps.length - 1];

  // --- 3. Dépôts ---
  const firstHub = originHub(start.dir);
  let depotStart = 'Dépôt de Berthée';
  if (depotFilter === 'courcelles') depotStart = 'Dépôt de Courcelles';
  else if (depotFilter === 'all' && CHAILLOT_HUBS.includes(firstHub) && Math.random() < 0.5) depotStart = 'Dépôt de Courcelles';
  if (!allowedHubs.includes(firstHub) && depotFilter !== 'courcelles') depotStart = 'Dépôt de Berthée';

  const lastHub = destHub({ destination: last.destination });
  const depotEnd = depotStart === 'Dépôt de Courcelles' && !CHAILLOT_HUBS.includes(lastHub)
    ? 'Dépôt de Berthée'
    : depotStart;

  const hlpStart = {
    type: 'hlp_start',
    depotName: depotStart,
    targetStop: first.origin,
    girCode: '61',
    girLabel: 'Sans Voyageur',
    departureTime: fmt(first.depAbs - HLP_MINUTES),
    arrivalTime: fmt(first.depAbs),
    durationMinutes: HLP_MINUTES
  };

  const hlpEnd = endMode === 'depot'
    ? {
        type: 'retour_depot',
        fromStop: last.destination,
        depotName: depotEnd,
        previousGirCode: last.code,
        girCode: '65',
        girLabel: 'Retour Dépôt',
        departureTime: fmt(last.arrAbs + 2),
        arrivalTime: fmt(last.arrAbs + 2 + HLP_MINUTES),
        durationMinutes: HLP_MINUTES
      }
    : {
        type: 'fin_terminus',
        fromStop: last.destination,
        depotName: null,
        previousGirCode: last.code,
        girCode: '61',
        girLabel: 'Sans Voyageur',
        departureTime: fmt(last.arrAbs),
        arrivalTime: fmt(last.arrAbs),
        durationMinutes: 0
      };

  const startAbs = first.depAbs - HLP_MINUTES;
  const endAbs = endMode === 'depot' ? last.arrAbs + 2 + HLP_MINUTES : last.arrAbs;
  const drivingMin = steps.reduce((acc, s) => acc + s.durationMinutes, 0);

  const linesUsed = [...new Set(steps.map(s => s.lineName))];
  const summary = linesUsed.length > 1
    ? `${linesUsed[0]} puis ${linesUsed.slice(1).join(', ')} à ${lineChangedAt}`
    : `Ligne ${linesUsed[0]} • ${Math.ceil(steps.length / 2)} AR`;

  return {
    id: `FDR-${first.lineName}-${Math.floor(100 + Math.random() * 900)}`,
    version: 3,
    createdAt: new Date().toISOString(),
    durationType,
    serviceMode,
    endMode,
    includePause,
    depotStart,
    depotEnd: endMode === 'depot' ? depotEnd : null,
    hlpStart,
    hlpEnd,
    summary,
    linesUsed,
    startTime: fmt(startAbs),
    endTime: fmt(endAbs),
    startsTomorrow: startAbs >= DAY,
    totalSteps: steps.length,
    completedSteps: 0,
    estimatedDuration: formatDuration(endAbs - startAbs),
    drivingDuration: formatDuration(drivingMin),
    truncated: steps.length < tripCount,
    steps
  };
}
