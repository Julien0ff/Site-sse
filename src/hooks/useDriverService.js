import { useEffect, useMemo } from 'react';

const EMPTY_DATA = { lines: [], sheets: {}, specialCodes: [] };

// Tous les calculs du pupitre (départs, arrêts, comptes à rebours) à partir de
// la session sauvegardée. Renvoie les valeurs et les setters sous les mêmes
// noms qu'avant le découpage, pour que les écrans restent lisibles.
export function useDriverService({ busData, session, patch, effectiveClock, keyboardEnabled }) {
  const data = busData || EMPTY_DATA;

  // --- Session -> valeurs ---
  const step = session.step;
  const departureTime = session.departureTime;
  const currentStopIndex = session.stopIndex;
  const delayMinutes = session.delay;
  const serviceTab = session.tab;
  const isForceDeparted = session.forceDeparted;
  const serviceCompleted = session.completed;
  const lastAutoCheckedStep = session.lastAutoChecked;

  const selectedDirection = useMemo(() => {
    for (const line of data.lines) {
      const dir = line.directions.find(d => d.dirId === session.dirId);
      if (dir) return dir;
    }
    return data.lines[0]?.directions[0] || null;
  }, [data, session.dirId]);

  // --- Setters ---
  // Accepte une valeur ou une fonction (prev => next), comme useState
  const field = (key) => (value) =>
    patch(s => ({ [key]: typeof value === 'function' ? value(s[key]) : value }));

  const setStep = (value) => patch({ step: value });
  const setCurrentStopIndex = field('stopIndex');
  const setDelayMinutes = field('delay');
  const setServiceTab = (value) => patch({ tab: value });
  const setIsForceDeparted = (value) => patch({ forceDeparted: value });
  const setServiceCompleted = (value) => patch({ completed: value });

  // Changer de direction repart du terminus d'origine, sans départ forcé
  const setSelectedDirection = (dir) => patch({
    dirId: dir.dirId,
    spawnStop: data.sheets?.[dir.sheetKey]?.fullOrigin || '',
    forceDeparted: false,
    completed: false,
    lastAutoChecked: null,
    rosterStep: null
  });

  // Un autre horaire = un nouveau service
  const setDepartureTime = (value) => patch(s => (value === s.departureTime ? null : {
    departureTime: value,
    forceDeparted: false,
    completed: false,
    lastAutoChecked: null
  }));

  const setSelectedSpawnStop = (value) => patch(s => (value === s.spawnStop ? null : {
    spawnStop: value,
    forceDeparted: false
  }));

  // Lancer directement un service (accueil, feuille de route)
  const launchService = ({ dirId, departureTime: depTime, rosterStepNumber = null }) => {
    const dir = data.lines.flatMap(l => l.directions).find(d => d.dirId === dirId);
    if (!dir) return false;
    patch({
      step: 'service',
      tab: 'conduite',
      dirId: dir.dirId,
      spawnStop: data.sheets?.[dir.sheetKey]?.fullOrigin || '',
      departureTime: depTime,
      stopIndex: 0,
      delay: 0,
      forceDeparted: false,
      completed: false,
      lastAutoChecked: null,
      rosterStep: rosterStepNumber
    });
    return true;
  };

  const activeSheet = useMemo(() => {
    if (!selectedDirection?.sheetKey || !data.sheets[selectedDirection.sheetKey]) return null;
    return data.sheets[selectedDirection.sheetKey];
  }, [selectedDirection]);

  // Arrêt de prise de service ; vide = terminus d'origine de la fiche
  const selectedSpawnStop = session.spawnStop || activeSheet?.fullOrigin || '';

  // Tous les départs pour cette direction
  const rawTrips = useMemo(() => {
    return activeSheet?.trips || [];
  }, [activeSheet]);

  // Liste des arrêts disponibles pour cette ligne
  const allLineStops = useMemo(() => {
    return activeSheet?.allStops || [];
  }, [activeSheet]);

  // Points de spawn Haut-le-Pied disponibles selon les dépôts officiels :
  // - Dépôt de Berthée : La Vallée (Uniquement vers Chaillot), Narbérale, Bd National-Mac Mahon, Cramain Université RER, Fédération (Uniquement vers Les Hauts d'Arlande), Chaillot
  // - Dépôt de Courcelles : Chaillot
  const lineSpawnStops = useMemo(() => {
    if (!selectedDirection || !activeSheet) return [];

    const destName = (activeSheet.fullDestination || selectedDirection.destination || '').toLowerCase().trim();

    return activeSheet.allStops.filter((stop, idx) => {
      // Impossible de spawn au terminus de la destination
      if (idx === activeSheet.allStops.length - 1) return false;
      const s = stop.toLowerCase().trim();
      if (s === destName) return false;

      // 1. La Vallée (Uniquement vers Chaillot)
      if (s === 'la vallée') {
        return destName.includes('chaillot');
      }
      // 2. Fédération (Uniquement vers Les Hauts d'Arlande)
      if (s === 'fédération') {
        return destName.includes('arlande');
      }
      // 3. Bd National-Mac Mahon
      if (s.includes('mac mahon')) {
        return true;
      }
      // 4. Cramain Université RER
      if (s.includes('cramain') && s.includes('université')) {
        return true;
      }
      // 5. Narbérale
      if (s.includes('narbérale') || s === 'rue de cherbourg') {
        return true;
      }
      // 6. Chaillot (Berthée & Courcelles)
      if (s.includes('chaillot-batignolles')) {
        return true;
      }

      return false;
    });
  }, [selectedDirection, activeSheet]);

  // Départs ajustés au point d'insertion choisi (Spawn Haut-le-Pied)
  const availableTrips = useMemo(() => {
    if (!rawTrips.length) return [];

    const mapped = [];
    for (const t of rawTrips) {
      let effectiveStops = t.stops;
      let effectiveDepTime = t.departureTime;
      let effectiveOrig = t.originStop;

      if (selectedSpawnStop && selectedSpawnStop !== activeSheet?.fullOrigin && selectedSpawnStop !== t.originStop) {
        const spawnIdx = t.stops.findIndex(s => s.stop.toLowerCase() === selectedSpawnStop.toLowerCase());
        // Ignorer les courses partielles qui ne passent pas par ce spawn ou qui y terminent
        if (spawnIdx < 0 || spawnIdx >= t.stops.length - 1 || !t.stops[spawnIdx].time) {
          continue;
        }
        effectiveStops = t.stops.slice(spawnIdx);
        effectiveDepTime = t.stops[spawnIdx].time;
        effectiveOrig = t.stops[spawnIdx].stop;
      }

      const depH = parseInt(effectiveDepTime.split(':')[0], 10);
      const depM = parseInt(effectiveDepTime.split(':')[1], 10);
      const arrH = parseInt(t.arrivalTime.split(':')[0], 10);
      const arrM = parseInt(t.arrivalTime.split(':')[1], 10);
      let depTotal = depH * 60 + depM;
      let arrTotal = arrH * 60 + arrM;
      if (arrTotal < depTotal) arrTotal += 1440;
      const durationMin = arrTotal - depTotal;

      mapped.push({
        ...t,
        effectiveDepartureTime: effectiveDepTime,
        effectiveOriginStop: effectiveOrig,
        effectiveDurationMinutes: durationMin,
        effectiveStops: effectiveStops,
        effectiveStopCount: effectiveStops.length
      });
    }
    return mapped;
  }, [rawTrips, selectedSpawnStop, activeSheet]);

  // Détection du prochain départ immédiat selon l'heure active
  const nextScheduledTrip = useMemo(() => {
    if (!availableTrips.length) return null;
    const parseToMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const nowMin = effectiveClock.getHours() * 60 + effectiveClock.getMinutes();
    const found = availableTrips.find(t => parseToMin(t.effectiveDepartureTime) >= nowMin);
    return found || availableTrips[0];
  }, [availableTrips, effectiveClock]);

  useEffect(() => {
    if (nextScheduledTrip && !departureTime) {
      setDepartureTime(nextScheduledTrip.effectiveDepartureTime);
    }
  }, [nextScheduledTrip]);

  // Voyage actif sélectionné
  const selectedTrip = useMemo(() => {
    if (!availableTrips.length) return null;
    return availableTrips.find(t => t.effectiveDepartureTime === departureTime) || nextScheduledTrip || availableTrips[0];
  }, [availableTrips, departureTime, nextScheduledTrip]);

  // Arrêts du voyage actif
  const activeTripStops = useMemo(() => {
    if (!selectedTrip) return [];
    return selectedTrip.effectiveStops || selectedTrip.stops || [];
  }, [selectedTrip]);

  // Compte à rebours avant départ
  const departureAnalysis = useMemo(() => {
    if (!selectedTrip || !departureTime) {
      return { diffSeconds: 0, isPast: true, hours: 0, minutes: 0, seconds: 0, countdownText: "00:00" };
    }

    const [depH, depM] = departureTime.split(':').map(Number);
    const totalDepSec = depH * 3600 + depM * 60 + delayMinutes * 60;
    const nowSec = effectiveClock.getHours() * 3600 + effectiveClock.getMinutes() * 60 + effectiveClock.getSeconds();
    let diff = totalDepSec - nowSec;

    // Si l'horaire choisi est au lendemain matin (ex: il est 23h30 et départ à 06h00)
    if (diff < -43200) diff += 86400;

    const isPast = diff <= 0;
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    const countdownText = h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return { 
      diffSeconds: diff, 
      isPast, 
      countdownText,
      hours: h,
      minutes: m, 
      seconds: s, 
      totalDepSec 
    };
  }, [departureTime, delayMinutes, effectiveClock, selectedTrip]);

  // En service si l'heure de départ est passée OU si le conducteur a cliqué sur "Partir maintenant"
  const isInService = isForceDeparted || departureAnalysis.isPast;

  // Arrêt actuel
  const currentStop = useMemo(() => {
    if (!activeTripStops.length) return null;
    const idx = Math.min(currentStopIndex, activeTripStops.length - 1);
    return {
      ...activeTripStops[idx],
      index: idx,
      isLast: idx === activeTripStops.length - 1,
      isFirst: idx === 0
    };
  }, [activeTripStops, currentStopIndex]);

  // Compte à rebours prochain arrêt
  const nextStopCountdown = useMemo(() => {
    if (!currentStop || !currentStop.time) return null;
    const [h, m] = currentStop.time.split(':').map(Number);
    const targetSec = h * 3600 + m * 60 + delayMinutes * 60;
    const nowSec = effectiveClock.getHours() * 3600 + effectiveClock.getMinutes() * 60 + effectiveClock.getSeconds();
    let diff = targetSec - nowSec;

    if (diff < -43200) diff += 86400;

    if (diff <= 10 && diff >= -45) {
      return { text: "à l'arrêt", status: "arret" };
    }
    if (diff < -45) {
      return { text: "dépassé", status: "retard" };
    }
    const hRem = Math.floor(diff / 3600);
    const mRem = Math.floor((diff % 3600) / 60);
    const sRem = diff % 60;
    return {
      text: hRem > 0 ? `${hRem}h ${mRem}m` : `${mRem > 0 ? `${mRem}m ` : ''}${sRem}s`,
      status: "en_cours"
    };
  }, [currentStop, delayMinutes, effectiveClock]);

  // Heure ajustée avec le retard / régulation conducteur
  const getAdjustedStopTime = (stopTime) => {
    if (!stopTime) return "--:--";
    const [h, m] = stopTime.split(':').map(Number);
    const totalMin = (h * 60 + m + delayMinutes + 1440) % 1440;
    const adjH = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const adjM = String(totalMin % 60).padStart(2, '0');
    return `${adjH}:${adjM}`;
  };

  // Temps relatif restant avant un arrêt
  const getMinutesFromNow = (stopTime) => {
    if (!stopTime) return null;
    const [h, m] = stopTime.split(':').map(Number);
    const targetSec = h * 3600 + m * 60 + delayMinutes * 60;
    const nowSec = effectiveClock.getHours() * 3600 + effectiveClock.getMinutes() * 60 + effectiveClock.getSeconds();
    let diffSec = targetSec - nowSec;
    if (diffSec < -43200) diffSec += 86400;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin <= 0) return "Imminent";
    if (diffMin >= 60) {
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `dans ${hrs}h${String(mins).padStart(2, '0')}`;
    }
    return `dans ${diffMin} min`;
  };

  // Prochain arrêt réel quand on est au terminus avant le départ
  const terminusNextStop = useMemo(() => {
    if (!activeTripStops.length) return null;
    return activeTripStops[1] || activeTripStops[0];
  }, [activeTripStops]);

  // Raccourcis clavier (Flèche Droite / Gauche) au pupitre en conduite
  useEffect(() => {
    if (!keyboardEnabled || step !== 'service' || serviceTab !== 'conduite' || !isInService) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStopIndex(prev => Math.min(activeTripStops.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStopIndex(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, step, serviceTab, isInService, activeTripStops.length]);

  // Les 2 arrêts suivants (en conduite ou au terminus)
  const upcomingStops = useMemo(() => {
    if (!activeTripStops.length) return [];
    
    // Si on est avant départ au terminus : le prochain est arrêt 1, les 2 suivants sont arrêt 2 et arrêt 3
    // Si on est en conduite : le prochain est currentStopIndex, les 2 suivants sont currentStopIndex + 1 et currentStopIndex + 2
    const baseIndex = (!isInService) ? 1 : currentStopIndex;
    
    const list = [];
    if (activeTripStops[baseIndex + 1]) {
      list.push({ ...activeTripStops[baseIndex + 1], offset: 1 });
    }
    if (activeTripStops[baseIndex + 2]) {
      list.push({ ...activeTripStops[baseIndex + 2], offset: 2 });
    }
    return list;
  }, [activeTripStops, currentStopIndex, isInService]);

  const activeLine = useMemo(() => {
    return data.lines.find(l => l.directions.some(d => d.dirId === selectedDirection?.dirId)) || data.lines[0];
  }, [data, selectedDirection]);

  return {
    session, patch, launchService,
    step, setStep,
    selectedDirection, setSelectedDirection,
    departureTime, setDepartureTime,
    currentStopIndex, setCurrentStopIndex,
    delayMinutes, setDelayMinutes,
    serviceTab, setServiceTab,
    isForceDeparted, setIsForceDeparted,
    serviceCompleted, setServiceCompleted,
    selectedSpawnStop, setSelectedSpawnStop,
    lastAutoCheckedStep,
    activeSheet, rawTrips, allLineStops, lineSpawnStops,
    availableTrips, nextScheduledTrip, selectedTrip, activeTripStops,
    departureAnalysis, isInService, currentStop, nextStopCountdown,
    getAdjustedStopTime, getMinutesFromNow, terminusNextStop, upcomingStops,
    activeLine
  };
}
