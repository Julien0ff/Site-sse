import React, { useState, useEffect, useMemo } from 'react';
import busData from './data/busData.json';
import { 
  ChevronLeft, ChevronRight, Search, Check, 
  MapPin, ArrowRight, ArrowRightDown, Home, 
  Bus, Clock, Cross, AlertCircle, User, List, Sparkles
} from '@getpapillon/papicons';

import WelcomeView from './components/WelcomeView.jsx';
import PassengerView from './components/PassengerView.jsx';
import RoulementView from './components/RoulementView.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import { fetchDiscordUserProfile, exchangeDiscordCodeForToken } from './utils/discordAuth.js';
import { syncUserWithCloud, syncCompletedServiceToFirebase } from './firebase.js';
import { 
  getStoredUser, setStoredUser, 
  getDriverStats, recordCompletedService, 
  getServiceHistory, clearServiceHistory,
  getStoredActiveRoster, setStoredActiveRoster,
  getStoredAppMode, setStoredAppMode,
  getDriverRank
} from './utils/storageUtils.js';

export default function App() {
  // --- MODE PRINCIPAL DU SITE ---
  // 'welcome' | 'conducteur' | 'passager' | 'roulement'
  const [appMode, setAppMode] = useState(() => getStoredAppMode());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Utilisateur Discord & Statistiques
  const [user, setUser] = useState(() => getStoredUser());
  const [stats, setStats] = useState(() => getDriverStats());
  const [history, setHistory] = useState(() => getServiceHistory());
  const [isSyncing, setIsSyncing] = useState(false);

  // Roulement actif (Feuille de route)
  const [activeRoster, setActiveRoster] = useState(() => getStoredActiveRoster());
  const [activeRosterStep, setActiveRosterStep] = useState(null);
  const [lastAutoCheckedStep, setLastAutoCheckedStep] = useState(null);

  // --- NAVIGATION WIZARD CONDUCTEUR ---
  // 'select-line' | 'select-time' | 'service'
  const [step, setStep] = useState('select-line');

  // Sélections actives
  const [selectedDirection, setSelectedDirection] = useState(busData.lines[0].directions[0]);
  const [departureTime, setDepartureTime] = useState('');
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState(0); // Régulation conducteur
  const [serviceTab, setServiceTab] = useState('conduite'); // 'conduite' | 'arrets' | 'grille' | 'speciaux'
  const [serviceFilter, setServiceFilter] = useState('all'); // 'all' | 'full' | 'limited'
  const [isForceDeparted, setIsForceDeparted] = useState(false); // Départ forcé ("Partir maintenant")
  const [serviceCompleted, setServiceCompleted] = useState(false); // Service terminé

  // Point de départ / Insertion Haut-le-Pied (Spawn Dépôt)
  const [selectedSpawnStop, setSelectedSpawnStop] = useState('');

  // Recherche rapide
  const [searchQuery, setSearchQuery] = useState('');

  // HEURE DU JEU: Roblox Seine-Sud-Est n'est pas encore à l'heure d'hiver (donc Heure d'été = UTC+2 = +1h par rapport à l'heure d'hiver)
  const [useGameSummerTime, setUseGameSummerTime] = useState(true);
  const [realClock, setRealClock] = useState(new Date());

  // Horloge
  useEffect(() => {
    const timer = setInterval(() => {
      setRealClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronisation Cloud multi-appareils (fusion additive PC + Téléphone)
  const performCloudSync = async (targetUser = user, extra = {}) => {
    const u = targetUser || getStoredUser();
    if (!u || !u.id || String(u.id).startsWith('local_') || u.id === 'guest') return null;

    setIsSyncing(true);
    try {
      const res = await syncUserWithCloud({
        user: u,
        stats: extra.stats || getDriverStats(),
        history: extra.history || getServiceHistory(),
        activeRoster: extra.activeRoster !== undefined ? extra.activeRoster : getStoredActiveRoster(),
        action: extra.action || 'sync',
        forceMerge: Boolean(extra.forceMerge)
      });
      if (res && res.ok) {
        if (res.stats) setStats(res.stats);
        if (Array.isArray(res.history)) setHistory(res.history);
        if (res.activeRoster !== undefined) setActiveRoster(res.activeRoster);
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  // Synchronisation automatique au démarrage, à l'ouverture du profil et au retour sur l'onglet
  useEffect(() => {
    if (!user?.id) return;
    performCloudSync(user);

    const onFocus = () => performCloudSync(user);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  useEffect(() => {
    if (isProfileOpen && user?.id) {
      performCloudSync(user);
    }
  }, [isProfileOpen]);

  // Détection OAuth Discord (?code=... ou #access_token=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (code) {
      exchangeDiscordCodeForToken(code)
        .then(token => fetchDiscordUserProfile(token))
        .then(discordUser => {
          if (discordUser && discordUser.id) {
            setUser(discordUser);
            setStoredUser(discordUser);
            performCloudSync(discordUser, { forceMerge: true });
          }
        })
        .catch(e => console.error('Erreur OAuth Discord:', e))
        .finally(() => {
          window.history.replaceState(null, '', window.location.pathname);
        });
      return;
    }

    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        fetchDiscordUserProfile(accessToken)
          .then(discordUser => {
            if (discordUser && discordUser.id) {
              setUser(discordUser);
              setStoredUser(discordUser);
              performCloudSync(discordUser, { forceMerge: true });
            }
          })
          .catch(e => console.error('Erreur OAuth Discord:', e))
          .finally(() => {
            window.history.replaceState(null, '', window.location.pathname);
          });
      }
    }
  }, []);

  const changeAppMode = (mode) => {
    setAppMode(mode);
    setStoredAppMode(mode);
  };

  const handleUserLogin = (newUser) => {
    setUser(newUser);
    setStoredUser(newUser);
    performCloudSync(newUser, { forceMerge: true });
  };

  const handleUserLogout = () => {
    setUser(null);
    setStoredUser(null);
  };

  const handleClearStats = () => {
    clearServiceHistory();
    const emptyStats = getDriverStats();
    setStats(emptyStats);
    setHistory([]);
    if (user?.id) {
      performCloudSync(user, { stats: emptyStats, history: [], action: 'reset' });
    }
  };

  // Lancement d'un service depuis une feuille de route
  const handleLaunchServiceFromRoster = ({ lineName, dirId, departureTime: depTime, rosterStepNumber = null }) => {
    const targetLine = busData.lines.find(l => l.name === lineName);
    if (!targetLine) return;
    const targetDir = targetLine.directions.find(d => d.dirId === dirId) || targetLine.directions[0];
    const targetSheet = busData.sheets?.[targetDir.sheetKey];

    setSelectedDirection(targetDir);
    setSelectedSpawnStop(targetSheet?.fullOrigin || '');
    setDepartureTime(depTime);
    setCurrentStopIndex(0);
    setDelayMinutes(0);
    setIsForceDeparted(false);
    setServiceCompleted(false);
    setLastAutoCheckedStep(null);
    setActiveRosterStep(rosterStepNumber);
    setServiceTab('conduite');
    setStep('service');
    changeAppMode('conducteur');
  };

  // Heure effective (Jeu vs PC)
  const effectiveClock = useMemo(() => {
    if (!useGameSummerTime) return realClock;
    return new Date(realClock.getTime() + 3600 * 1000);
  }, [realClock, useGameSummerTime]);

  const timeString = useMemo(() => {
    const h = String(effectiveClock.getHours()).padStart(2, '0');
    const m = String(effectiveClock.getMinutes()).padStart(2, '0');
    const s = String(effectiveClock.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [effectiveClock]);

  // Fiche horaire
  const activeSheet = useMemo(() => {
    if (!selectedDirection?.sheetKey || !busData.sheets[selectedDirection.sheetKey]) return null;
    return busData.sheets[selectedDirection.sheetKey];
  }, [selectedDirection]);

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

  // Réinitialiser le spawn stop quand on change de direction
  useEffect(() => {
    if (activeSheet?.fullOrigin) {
      setSelectedSpawnStop(activeSheet.fullOrigin);
    }
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

  // Départs filtrés (Complets vs Limités)
  const filteredTrips = useMemo(() => {
    if (serviceFilter === 'full') {
      return availableTrips.filter(t => !t.isLimitedService);
    }
    if (serviceFilter === 'limited') {
      return availableTrips.filter(t => t.isLimitedService);
    }
    return availableTrips;
  }, [availableTrips, serviceFilter]);

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

  // Réinitialiser le départ forcé quand on change d'horaire, de direction ou de spawn
  useEffect(() => {
    setIsForceDeparted(false);
  }, [departureTime, selectedDirection, selectedSpawnStop]);

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
      return { text: "À L'ARRÊT", status: "arret" };
    }
    if (diff < -45) {
      return { text: "DÉPASSÉ", status: "retard" };
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
    if (appMode !== 'conducteur' || step !== 'service' || serviceTab !== 'conduite' || !isInService) return;
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
  }, [appMode, step, serviceTab, isInService, activeTripStops.length]);

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

  // Filtrage des lignes pour l'étape 1
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return busData.lines;
    const q = searchQuery.toLowerCase().trim();
    return busData.lines.filter(l => 
      l.name.toLowerCase().includes(q) ||
      l.lineId.includes(q) ||
      l.directions.some(d => d.code.toLowerCase().includes(q) || d.destination.toLowerCase().includes(q) || d.origin.toLowerCase().includes(q)) ||
      (l.girCodes && l.girCodes.some(g => g.code.toLowerCase().includes(q) || g.destination.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  const activeLine = useMemo(() => {
    return busData.lines.find(l => l.directions.some(d => d.dirId === selectedDirection?.dirId)) || busData.lines[0];
  }, [selectedDirection]);

  // Validation et clôture de service conducteur
  const handleFinishService = () => {
    const depT = selectedTrip?.effectiveDepartureTime || departureTime;
    const arrT = selectedTrip?.arrivalTime || '';
    const servicePayload = {
      lineName: activeLine?.name || 'Ligne',
      lineId: activeLine?.lineId,
      logoUrl: activeLine?.logoUrl,
      code: selectedDirection?.code,
      directionCode: selectedDirection?.code,
      origin: selectedTrip?.effectiveOriginStop || selectedDirection?.origin,
      destination: selectedTrip?.destinationStop || selectedDirection?.destination,
      departureTime: depT,
      arrivalTime: arrT,
      durationMinutes: selectedTrip?.effectiveDurationMinutes || 20,
      delayMinutes: delayMinutes,
      stopCount: activeTripStops?.length || 0,
      stopsCount: activeTripStops?.length || 0,
      driverId: user?.id || 'guest',
      driverName: user?.username || 'Conducteur',
      date: new Date().toLocaleDateString('fr-FR')
    };

    recordCompletedService(servicePayload);
    const updatedStats = getDriverStats();
    const updatedHistory = getServiceHistory();
    setStats(updatedStats);
    setHistory(updatedHistory);
    setServiceCompleted(true);

    // Cochage automatique de l'étape correspondante sur la feuille de route active
    let nextRoster = activeRoster;
    if (activeRoster && activeRoster.steps?.length) {
      const launched = activeRoster.steps.find(s => s.stepNumber === activeRosterStep && s.dirId === selectedDirection?.dirId);
      const targetStep = launched || activeRoster.steps.find(s => !s.isCompleted && s.dirId === selectedDirection?.dirId);

      if (targetStep && !targetStep.isCompleted) {
        const now = Date.now();
        const updatedSteps = activeRoster.steps.map(s =>
          s.stepNumber === targetStep.stepNumber
            ? { ...s, isCompleted: true, justCompletedAt: now }
            : s
        );
        const completedCount = updatedSteps.filter(s => s.isCompleted).length;
        nextRoster = {
          ...activeRoster,
          steps: updatedSteps,
          completedSteps: completedCount
        };
        setActiveRoster(nextRoster);
        setStoredActiveRoster(nextRoster);
        setLastAutoCheckedStep(targetStep.stepNumber);
      }
    }

    // Synchronisation Cloud multi-appareils (fusion additive PC + Téléphone)
    syncCompletedServiceToFirebase(servicePayload);
    if (user?.id) {
      performCloudSync(user, {
        stats: updatedStats,
        history: updatedHistory,
        activeRoster: nextRoster,
        forceMerge: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#080226] text-white flex flex-col w-full font-sans select-none antialiased">
      
      {/* ================= HEADER CHARTE SEINE-SUD-EST (PLEINE LARGEUR AVEC DA JAUNE) ================= */}
      <header className="sticky top-0 z-40 bg-[#0C0438]/95 backdrop-blur-xl border-b-2 border-[#DAE44E]/40 w-full shadow-[0_4px_30px_rgba(218,228,78,0.12)]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2">
          
          {/* Navigation Gauche / Logo SSE */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {appMode === 'conducteur' && step !== 'select-line' ? (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    if (step === 'service') setStep('select-time');
                    else setStep('select-line');
                  }}
                  className="flex items-center space-x-1 text-[#080226] bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-95 px-2.5 py-1.5 rounded-full text-xs font-black transition-all shadow-md"
                  title="Étape précédente"
                >
                  <ChevronLeft size={16} className="shrink-0" />
                  <span className="hidden sm:inline">{step === 'service' ? "Horaires" : "Lignes"}</span>
                </button>

                <button
                  onClick={() => {
                    setStep('select-line');
                    changeAppMode('welcome');
                  }}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-[#DAE44E] hover:text-[#080226] text-zinc-300 active:scale-95 transition-all border border-white/10"
                  title="Retour au portail d'accueil"
                >
                  <Home size={15} className="shrink-0" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => changeAppMode('welcome')}
                className="flex items-center space-x-2.5 text-left group transition-all"
                title="Retour au portail d'accueil"
              >
                <img 
                  src="/discord-logo.gif" 
                  alt="Discord Seine-Sud-Est" 
                  className="w-9 h-9 rounded-full border-2 border-[#DAE44E] object-cover shadow-[0_0_15px_rgba(218,228,78,0.3)] ring-2 ring-[#DAE44E]/30 group-hover:scale-105 transition-transform"
                />
                <div className="hidden sm:block">
                  <h1 className="text-sm font-black tracking-tight text-white leading-none">Prise de Service</h1>
                  <p className="text-[10px] text-[#DAE44E] font-black mt-0.5 tracking-wider uppercase flex items-center space-x-1">
                    <span>Seine-Sud-Est</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DAE44E] inline-block animate-pulse" />
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Mode Switcher Central - Tout en Jaune SSE DA (#DAE44E) */}
          <div className="flex items-center bg-[#100A38] p-1 rounded-full border-2 border-[#DAE44E]/40 shadow-[0_0_15px_rgba(218,228,78,0.15)]">
            <button
              onClick={() => changeAppMode('conducteur')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                appMode === 'conducteur'
                  ? 'bg-[#DAE44E] text-[#080226] shadow-[0_0_15px_rgba(218,228,78,0.4)]'
                  : 'text-zinc-200 hover:text-[#DAE44E] hover:bg-[#DAE44E]/15'
              }`}
            >
              <Bus size={14} className="shrink-0" />
              <span className="hidden md:inline">Conducteurs</span>
            </button>

            <button
              onClick={() => changeAppMode('passager')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                appMode === 'passager'
                  ? 'bg-[#DAE44E] text-[#080226] shadow-[0_0_15px_rgba(218,228,78,0.4)]'
                  : 'text-zinc-200 hover:text-[#DAE44E] hover:bg-[#DAE44E]/15'
              }`}
            >
              <User size={14} className="shrink-0" />
              <span className="hidden md:inline">Passagers</span>
            </button>

            <button
              onClick={() => changeAppMode('roulement')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                appMode === 'roulement'
                  ? 'bg-[#DAE44E] text-[#080226] shadow-[0_0_15px_rgba(218,228,78,0.4)]'
                  : 'text-zinc-200 hover:text-[#DAE44E] hover:bg-[#DAE44E]/15'
              }`}
            >
              <List size={14} className="shrink-0" />
              <span className="hidden md:inline">Feuille de Route</span>
            </button>
          </div>

          {/* Heure, Roblox & Bouton Profil Discord Droite */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setUseGameSummerTime(!useGameSummerTime)}
              className={`hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-black transition-all border shadow-sm ${
                useGameSummerTime 
                  ? 'bg-[#DAE44E] text-[#080226] border-[#DAE44E] shadow-[0_0_10px_rgba(218,228,78,0.3)]' 
                  : 'bg-[#DAE44E]/10 text-[#DAE44E] border-[#DAE44E]/30 hover:bg-[#DAE44E]/20'
              }`}
              title="Le jeu Roblox n'est pas encore passé à l'heure d'hiver (+1h)"
            >
              {useGameSummerTime ? "Roblox (+1h)" : "Heure PC"}
            </button>

            <div className="bg-[#12074D] border-2 border-[#DAE44E]/50 px-3 py-1 rounded-full font-mono font-black text-xs sm:text-sm tracking-wider text-[#DAE44E] shadow-[0_0_15px_rgba(218,228,78,0.2)]">
              {timeString}
            </div>

            {/* Bouton Profil Conducteur / Discord */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center space-x-2 bg-[#DAE44E]/10 hover:bg-[#DAE44E]/20 border-2 border-[#DAE44E]/40 hover:border-[#DAE44E] rounded-full px-3 py-1 transition-all active:scale-95 group shadow-sm"
              title="Ouvrir mon profil conducteur & statistiques"
            >
              {user ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-5 h-5 rounded-full border border-[#DAE44E] object-cover shrink-0" 
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#DAE44E]/20 flex items-center justify-center text-[#DAE44E] group-hover:scale-110 transition-transform">
                  <User size={12} />
                </div>
              )}
              <span className="text-xs font-black text-zinc-100 group-hover:text-[#DAE44E] max-w-[80px] sm:max-w-[110px] truncate hidden xs:inline">
                {user ? user.username : 'Profil'}
              </span>
              {stats?.tripsCompleted > 0 && (
                <span className="bg-[#DAE44E] text-[#080226] text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full shadow-sm">
                  {stats.tripsCompleted}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* VUE ACCUEIL : CHOIX DU MODE (CONDUCTEURS / PASSAGERS / ROULEMENT)         */}
      {/* ========================================================================= */}
      {appMode === 'welcome' && (
        <WelcomeView 
          onSelectMode={changeAppMode} 
          activeRoster={activeRoster}
          user={user}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* VUE PASSAGERS : ARRÊTS, CORRESPONDANCES & PROCHAINS DÉPARTS               */}
      {/* ========================================================================= */}
      {appMode === 'passager' && (
        <PassengerView 
          busData={busData} 
          effectiveClock={effectiveClock} 
          timeString={timeString} 
        />
      )}

      {/* ========================================================================= */}
      {/* VUE ROULEMENT : FEUILLES DE ROUTE ALÉATOIRES                              */}
      {/* ========================================================================= */}
      {appMode === 'roulement' && (
        <RoulementView 
          busData={busData} 
          activeRoster={activeRoster} 
          setActiveRoster={(nextRoster) => {
            setActiveRoster(nextRoster);
            if (user?.id) {
              performCloudSync(user, { activeRoster: nextRoster });
            }
          }} 
          onLaunchService={handleLaunchServiceFromRoster} 
          timeString={timeString} 
        />
      )}

      {/* ========================================================================= */}
      {/* VUE CONDUCTEURS : ÉTAPES 1, 2, 3 (SAEIV ACTUEL)                           */}
      {/* ========================================================================= */}
      {appMode === 'conducteur' && (
        <>
          {step === 'select-line' && (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#DAE44E] bg-[#DAE44E]/10 px-2.5 py-0.5 rounded-full border border-[#DAE44E]/20">
                Étape 1 sur 3
              </span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1.5">Choisir une ligne</h2>
              <p className="text-xs lg:text-sm text-zinc-300 mt-0.5">Lignes actuellement en service sur Seine-Sud-Est.</p>
            </div>

            {/* Barre de Recherche Responsive */}
            <div className="w-full sm:w-80 lg:w-96">
              <div className="flex items-center bg-[#100A38] border border-[#DAE44E]/20 rounded-2xl px-3.5 py-2.5 focus-within:border-[#DAE44E]/60 transition-all shadow-md">
                <Search size={16} color="#DAE44E" className="shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher code GIR, arrêt ou ligne..."
                  className="bg-transparent text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-white p-1">
                    <Cross size={12} className="shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grille Responsive des Lignes (1 col mobile, 2 col tablette, 3 col desktop, 4 col grand écran) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
            {filteredLines.map(line => (
              <div 
                key={line.lineId}
                className="bg-[#100A38] border border-white/10 hover:border-[#DAE44E]/30 rounded-3xl p-4 transition-all shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* En-tête Ligne avec Logo uniforme */}
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={line.logoUrl} 
                      alt={`Ligne ${line.name}`} 
                      className="h-8 w-16 object-contain rounded-md shadow-sm shrink-0 bg-black/30 p-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-zinc-300">Ligne {line.name}</span>
                      <div className="text-sm font-extrabold text-white">
                        {line.directions.length} directions disponibles
                      </div>
                    </div>
                  </div>

                  {/* Directions */}
                  <div className="space-y-2">
                    {line.directions.map(dir => (
                      <button
                        key={dir.dirId}
                        onClick={() => {
                          setSelectedDirection(dir);
                          setDepartureTime('');
                          setCurrentStopIndex(0);
                          setDelayMinutes(0);
                          setServiceFilter('all');
                          setStep('select-time');
                        }}
                        className="w-full text-left bg-white/[0.04] hover:bg-[#DAE44E]/10 active:scale-[0.98] border border-white/5 hover:border-[#DAE44E]/30 p-3 rounded-2xl flex items-center justify-between transition-all group"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30">
                              GIR {dir.code}
                            </span>
                            <span className="text-[10px] text-zinc-400">{dir.status}</span>
                          </div>
                          <div className="text-sm font-bold text-white truncate group-hover:translate-x-0.5 transition-transform">
                            {dir.destination}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            Départ : {dir.origin}
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#DAE44E] group-hover:text-[#080226] transition-colors">
                          <ChevronRight size={16} className="text-white group-hover:text-[#080226]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}


      {/* ========================================================================= */}
      {/* ÉTAPE 2 : CHOIX DE L'HEURE & POINT D'INSERTION (SPAWN DÉPÔT / HAUT-LE-PIED) */}
      {/* ========================================================================= */}
      {step === 'select-time' && (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Colonne Gauche : Ligne, Haut-le-Pied & Prochain départ recommandé */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              
              {/* Ligne sélectionnée */}
              <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 flex items-center space-x-4 shadow-xl">
                <img 
                  src={activeLine.logoUrl} 
                  alt={`Ligne ${activeLine.name}`} 
                  className="h-10 w-20 object-contain rounded-md shadow-sm shrink-0 bg-black/30 p-0.5"
                />
                <div className="flex-1 truncate">
                  <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30">
                    GIR {selectedDirection.code}
                  </span>
                  <h2 className="text-base lg:text-lg font-black text-white truncate mt-1">
                    {selectedDirection.destination}
                  </h2>
                  <p className="text-[11px] text-zinc-300 truncate">
                    {selectedDirection.status}
                  </p>
                </div>
              </div>

              {/* SÉLECTEUR DU POINT D'INSERTION (HAUT-LE-PIED) */}
              <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center space-x-1.5">
                  <MapPin size={15} color="#DAE44E" className="shrink-0" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-[#DAE44E]">
                    Haut-le-Pied
                  </span>
                </div>

                <select
                  value={selectedSpawnStop}
                  onChange={(e) => {
                    setSelectedSpawnStop(e.target.value);
                    setDepartureTime('');
                    setCurrentStopIndex(0);
                  }}
                  className="w-full bg-[#180E4F] border border-white/10 text-white text-xs font-semibold rounded-2xl p-3.5 focus:outline-none focus:border-[#DAE44E] transition-all"
                >
                  <option value={activeSheet?.fullOrigin} className="bg-[#100A38]">
                    Terminus de départ : {activeSheet?.fullOrigin}
                  </option>
                  {lineSpawnStops.filter(s => s !== activeSheet?.fullOrigin).map(stop => (
                    <option key={stop} value={stop} className="bg-[#100A38]">
                      {stop}
                    </option>
                  ))}
                </select>

                {selectedSpawnStop && selectedSpawnStop !== activeSheet?.fullOrigin && (
                  <div className="text-[11px] text-[#DAE44E] bg-[#DAE44E]/10 p-3 rounded-xl border border-[#DAE44E]/20 flex items-center space-x-1.5">
                    <ArrowRightDown size={14} color="#DAE44E" className="shrink-0" />
                    <span>Prise de service à <strong>{selectedSpawnStop}</strong>. Les horaires sont calés sur le passage à cet arrêt.</span>
                  </div>
                )}
              </div>

              {/* CARTE HIGHLIGHT : PROCHAIN DÉPART RECOMMANDÉ */}
              {nextScheduledTrip && (
                <div className="bg-gradient-to-br from-[#180E4F] to-[#100A38] border border-[#DAE44E]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#080226] bg-[#DAE44E] px-2.5 py-0.5 rounded-full font-black">
                        Prochain Départ
                      </span>
                      {nextScheduledTrip.isLimitedService && (
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                          Service Limité
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 font-medium font-mono">
                      {availableTrips.length} départs
                    </span>
                  </div>

                  <div className="my-3 flex items-baseline space-x-3">
                    <span className="text-5xl font-mono font-black tracking-tight text-white">
                      {nextScheduledTrip.effectiveDepartureTime}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium">
                      (Arrivée {nextScheduledTrip.arrivalTime})
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 mb-5 space-y-1">
                    <div>Durée : <strong className="text-white">{nextScheduledTrip.effectiveDurationMinutes} min</strong> • {nextScheduledTrip.effectiveStopCount} arrêts</div>
                    <div>Origine : <strong className="text-white">{nextScheduledTrip.effectiveOriginStop}</strong></div>
                  </div>

                  <button
                    onClick={() => {
                      setDepartureTime(nextScheduledTrip.effectiveDepartureTime);
                      setCurrentStopIndex(0);
                      setDelayMinutes(0);
                      setStep('service');
                    }}
                    className="w-full bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-[0.98] text-[#080226] font-black text-sm uppercase py-4 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl"
                  >
                    <span>Prendre le service de {nextScheduledTrip.effectiveDepartureTime}</span>
                    <ArrowRight size={16} className="shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* Colonne Droite : Grille de tous les départs disponibles */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="bg-[#100A38] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase text-white">
                      Tous les Départs Disponibles
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Sélectionnez l'heure pour démarrer le service
                    </p>
                  </div>

                  {/* Filtre complet vs partiel */}
                  <div className="flex items-center bg-white/5 p-1 rounded-xl text-[11px] font-bold font-mono self-start sm:self-auto">
                    <button
                      onClick={() => setServiceFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'all' ? 'bg-[#DAE44E] text-[#080226]' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Tous ({availableTrips.length})
                    </button>
                    <button
                      onClick={() => setServiceFilter('full')}
                      className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'full' ? 'bg-[#DAE44E] text-[#080226]' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Complets
                    </button>
                    <button
                      onClick={() => setServiceFilter('limited')}
                      className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'limited' ? 'bg-[#DAE44E] text-[#080226]' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Limités
                    </button>
                  </div>
                </div>

                {/* Grille des départs responsive */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-[540px] overflow-y-auto pr-1 pt-1">
                  {filteredTrips.map(trip => {
                    const isSelected = trip.effectiveDepartureTime === departureTime;
                    return (
                      <button
                        key={trip.tripId}
                        onClick={() => {
                          setDepartureTime(trip.effectiveDepartureTime);
                          setCurrentStopIndex(0);
                          setDelayMinutes(0);
                          setStep('service');
                        }}
                        className={`p-3 rounded-2xl text-center border transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-[#DAE44E] text-[#080226] border-[#DAE44E] font-black shadow-lg scale-[1.02]'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#DAE44E]/30 border-white/5 text-white'
                        }`}
                      >
                        <div className="font-mono text-base font-bold leading-tight">
                          {trip.effectiveDepartureTime}
                        </div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-[#080226]' : 'text-zinc-400'}`}>
                          arr. {trip.arrivalTime}
                        </div>
                        {trip.isLimitedService && (
                          <span className={`text-[8px] font-mono uppercase px-1 rounded block mt-0.5 truncate ${
                            isSelected ? 'bg-black/20 text-[#080226]' : 'bg-amber-400/20 text-amber-300'
                          }`}>
                            Partiel
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </main>
      )}


      {/* ========================================================================= */}
      {/* ÉTAPE 3 : EN SERVICE / PUPITRE DE BORD ACTIF                              */}
      {/* ========================================================================= */}
      {step === 'service' && (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
          
          {/* BANDEAU HAUT SERVICE EN COURS */}
          <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-4 truncate">
              <img 
                src={activeLine.logoUrl} 
                alt={`Ligne ${activeLine.name}`} 
                className="h-10 w-20 object-contain rounded-md shadow-sm shrink-0 bg-black/30 p-0.5"
              />
              <div className="truncate">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-black bg-[#DAE44E]/20 text-[#DAE44E] border border-[#DAE44E]/30 px-2.5 py-0.5 rounded-full">
                    GIR {selectedDirection.code}
                  </span>
                  <span className="text-xs text-zinc-300 font-mono font-bold">
                    Départ {departureTime}
                  </span>
                  {selectedTrip?.isLimitedService && (
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded">
                      Limité
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white truncate mt-0.5">
                  Terminus : <strong className="text-white">{selectedTrip?.destinationStop || selectedDirection.destination}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('select-line')}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-bold text-white border border-white/10 shrink-0 active:scale-95 transition-all self-end sm:self-auto"
            >
              Changer de Ligne
            </button>
          </div>

          {/* ONGLET DE NAVIGATION CONDUCTEUR */}
          <div className="bg-[#100A38] border border-white/10 p-1.5 rounded-2xl grid grid-cols-4 gap-1.5 text-xs font-bold shadow-md max-w-xl mx-auto w-full">
            {[
              { id: 'conduite', label: 'Conduite' },
              { id: 'arrets', label: 'Arrêts' },
              { id: 'grille', label: 'Grille' },
              { id: 'speciaux', label: 'Girouettes' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setServiceTab(tab.id)}
                className={`py-2.5 rounded-xl transition-all text-center ${
                  serviceTab === tab.id
                    ? 'bg-[#DAE44E] text-[#080226] shadow-md font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* --- SOUS-ONGLET 1 : CONDUITE --- */}
          {serviceTab === 'conduite' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Colonne Principale Cockpit (7 colonnes sur PC) */}
              <div className="lg:col-span-7 space-y-4">
                
                {!isInService ? (
                  /* AVANT DÉPART : COMPTE À REBOURS & APERÇU PREMIERS ARRÊTS */
                  <div className="space-y-4">
                    <div className="bg-[#100A38] border border-[#DAE44E]/30 rounded-3xl p-6 lg:p-8 text-center shadow-2xl relative overflow-hidden">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#080226] bg-[#DAE44E] px-3 py-1 rounded-full font-black">
                        Départ dans
                      </span>
                      <div className="text-5xl sm:text-6xl lg:text-7xl font-mono font-black my-5 text-white tracking-tight flex items-center justify-center space-x-0.5 select-none">
                        {departureAnalysis.hours > 0 && (
                          <>
                            <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center">
                              <span key={`ht-${Math.floor(departureAnalysis.hours / 10)}`} className="animate-digit-roll inline-block">
                                {Math.floor(departureAnalysis.hours / 10)}
                              </span>
                            </span>
                            <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center">
                              <span key={`hu-${departureAnalysis.hours % 10}`} className="animate-digit-roll inline-block">
                                {departureAnalysis.hours % 10}
                              </span>
                            </span>
                            <span className="opacity-40 animate-pulse px-0.5">:</span>
                          </>
                        )}

                        {/* Minutes (00 à 59) */}
                        <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center">
                          <span key={`mt-${Math.floor(departureAnalysis.minutes / 10)}`} className="animate-digit-roll inline-block">
                            {Math.floor(departureAnalysis.minutes / 10)}
                          </span>
                        </span>
                        <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center">
                          <span key={`mu-${departureAnalysis.minutes % 10}`} className="animate-digit-roll inline-block">
                            {departureAnalysis.minutes % 10}
                          </span>
                        </span>

                        <span className="opacity-40 animate-pulse px-0.5">:</span>

                        {/* Secondes (00 à 59) */}
                        <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center text-[#DAE44E]">
                          <span key={`st-${Math.floor(departureAnalysis.seconds / 10)}`} className="animate-digit-roll inline-block">
                            {Math.floor(departureAnalysis.seconds / 10)}
                          </span>
                        </span>
                        <span className="inline-block relative overflow-hidden h-[1.12em] w-[0.62em] text-center text-[#DAE44E]">
                          <span key={`su-${departureAnalysis.seconds % 10}`} className="animate-digit-roll inline-block">
                            {departureAnalysis.seconds % 10}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300">
                        Départ prévu à <span className="font-mono font-bold text-[#DAE44E]">{departureTime}:00</span>
                      </div>

                      {selectedTrip?.isLimitedService && (
                        <div className="mt-3 text-xs text-amber-300 bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                          ⚠️ {selectedTrip.serviceNote}
                        </div>
                      )}

                      <div className="mt-5 pt-4 border-t border-white/5 text-left flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Départ de :</span>
                          <span className="font-bold text-white text-sm">{selectedTrip?.effectiveOriginStop || selectedTrip?.originStop}</span>
                        </div>
                        <button
                          onClick={() => {
                            setIsForceDeparted(true);
                            setCurrentStopIndex(0);
                            setDelayMinutes(0);
                          }}
                          className="bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-95 text-[#080226] font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md"
                        >
                          Partir maintenant
                        </button>
                      </div>
                    </div>

                    {/* PROCHAIN ARRÊT PRÉVU AU DÉPART DU TERMINUS */}
                    <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#DAE44E] flex items-center space-x-1.5">
                          <Bus size={14} color="#DAE44E" className="shrink-0" />
                          <span>Prochain Arrêt</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {getAdjustedStopTime(terminusNextStop?.time)}
                        </span>
                      </div>

                      <div className="pt-2.5 pb-1">
                        <h4 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight">
                          {terminusNextStop?.stop || "Départ en ligne"}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          Arrivée estimée {getMinutesFromNow(terminusNextStop?.time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EN SERVICE : PROCHAIN ARRÊT ACTIF */
                  <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 lg:p-6 shadow-2xl space-y-4">
                    <div className="space-y-2 border-b border-white/5 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-[#DAE44E] flex items-center space-x-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DAE44E] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DAE44E]"></span>
                          </span>
                          <span>EN SERVICE</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-300">
                          Arrêt {currentStopIndex + 1} / {activeTripStops.length} ({activeTripStops.length > 0 ? Math.round(((currentStopIndex + 1) / activeTripStops.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-[#DAE44E] rounded-full transition-all duration-300"
                          style={{ width: `${activeTripStops.length > 0 ? Math.round(((currentStopIndex + 1) / activeTripStops.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>

                    <div
                      key={`prochain-arret-${currentStopIndex}-${currentStop?.stop || ''}`}
                      className="text-center py-3 animate-stop-change"
                    >
                      <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                        {currentStop?.isLast ? "TERMINUS DU SERVICE" : "PROCHAIN ARRÊT"}
                      </span>
                      <h3 className="text-3xl lg:text-4xl font-black text-white mt-1.5 leading-tight tracking-tight uppercase">
                        {currentStop?.stop || "Terminus"}
                      </h3>

                      <div className="mt-3.5 inline-flex items-center space-x-2 bg-black/60 border border-white/10 px-4 py-2 rounded-full font-mono">
                        <span className="text-xs text-zinc-400 font-sans">Arrivée prévue :</span>
                        <span className="font-black text-sm text-[#DAE44E]">
                          {currentStop?.time ? getAdjustedStopTime(currentStop.time) : "--:--"}
                        </span>
                        {nextStopCountdown && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            nextStopCountdown.status === 'arret' 
                              ? 'bg-amber-400/20 text-amber-300' 
                              : 'bg-[#DAE44E]/20 text-[#DAE44E]'
                          }`}>
                            {nextStopCountdown.text}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center space-x-3">
                      <button
                        onClick={() => setCurrentStopIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentStopIndex === 0}
                        className="bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white p-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
                        title="Arrêt précédent (Flèche gauche)"
                      >
                        <ChevronLeft size={22} className="shrink-0" />
                      </button>

                      {currentStop?.isLast ? (
                        serviceCompleted ? (
                          <div className="flex-1 py-4 px-5 rounded-2xl bg-[#DAE44E]/20 text-[#DAE44E] border border-[#DAE44E]/40 font-black text-sm uppercase tracking-wider text-center flex items-center justify-center space-x-2">
                            <Check size={20} className="shrink-0" />
                            <span>Service Validé & Enregistré</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleFinishService}
                            className="flex-1 py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-wider bg-[#DAE44E] hover:bg-[#E5EE60] text-[#080226] shadow-xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all animate-pulse"
                          >
                            <Check size={20} className="shrink-0" />
                            <span>Valider & Terminer le Service</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setCurrentStopIndex(prev => Math.min(activeTripStops.length - 1, prev + 1))}
                          className="flex-1 py-4 px-5 rounded-2xl font-black text-sm uppercase tracking-wider bg-[#DAE44E] hover:bg-[#E5EE60] text-[#080226] shadow-xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
                          title="Arrêt suivant (Flèche droite)"
                        >
                          <Check size={20} className="shrink-0" />
                          <span>Valider Arrêt Suivant</span>
                        </button>
                      )}
                    </div>

                    {/* Félicitations et actions après clôture de service */}
                    {serviceCompleted && (
                      <div className="bg-[#DAE44E]/10 border border-[#DAE44E]/30 rounded-2xl p-4 text-center space-y-2.5 mt-3 animate-autocheck-pop">
                        <div className="flex items-center justify-center space-x-1.5 text-xs font-mono font-bold text-[#DAE44E]">
                          <Sparkles size={14} className="shrink-0" />
                          <span>SERVICE VALIDÉ & ENREGISTRÉ</span>
                        </div>
                        {lastAutoCheckedStep && (
                          <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded-full animate-check-bounce">
                            <Check size={14} />
                            <span>Course #{lastAutoCheckedStep} cochée sur votre feuille de route</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {(() => {
                            const nextRosterStep = activeRoster?.steps?.find(s => !s.isCompleted);
                            if (nextRosterStep) {
                              return (
                                <button
                                  onClick={() =>
                                    handleLaunchServiceFromRoster({
                                      lineName: nextRosterStep.lineName,
                                      dirId: nextRosterStep.dirId,
                                      departureTime: nextRosterStep.departureTime,
                                      rosterStepNumber: nextRosterStep.stepNumber
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-[#DAE44E] text-[#080226] hover:bg-[#E5EE60] text-xs font-black transition-all flex items-center space-x-1.5 shadow-md"
                                >
                                  <span>Course #{nextRosterStep.stepNumber} ({nextRosterStep.lineName} • {nextRosterStep.departureTime})</span>
                                  <ArrowRight size={13} />
                                </button>
                              );
                            }
                            return null;
                          })()}
                          {activeRoster && (
                            <button
                              onClick={() => changeAppMode('roulement')}
                              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex items-center space-x-1.5 border border-white/10"
                            >
                              <span>Voir l'itinéraire</span>
                              <ArrowRight size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setStep('select-line');
                              setServiceCompleted(false);
                              setCurrentStopIndex(0);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                          >
                            Autre service
                          </button>
                          <button
                            onClick={() => setIsProfileOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex items-center space-x-1"
                          >
                            <User size={13} />
                            <span>Profil</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RÉGULATION CONDUCTEUR */}
                <div className="bg-[#100A38] border border-white/5 rounded-3xl p-4 flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Régulation Horaire</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        delayMinutes === 0
                          ? 'bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30'
                          : delayMinutes > 0
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        {delayMinutes === 0 ? "À L'HEURE" : delayMinutes > 0 ? `+${delayMinutes} MIN RETARD` : `${delayMinutes} MIN AVANCE`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 font-mono">
                    <button
                      onClick={() => setDelayMinutes(d => d - 1)}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-3 py-1.5 rounded-xl text-xs active:scale-95"
                      title="-1 min (Avance)"
                    >
                      -1m
                    </button>
                    <button
                      onClick={() => setDelayMinutes(0)}
                      className="bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10 font-bold px-3 py-1.5 rounded-xl text-xs active:scale-95"
                      title="Remise à zéro"
                    >
                      0
                    </button>
                    <button
                      onClick={() => setDelayMinutes(d => d + 1)}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-3 py-1.5 rounded-xl text-xs active:scale-95"
                      title="+1 min (Retard)"
                    >
                      +1m
                    </button>
                  </div>
                </div>

              </div>

              {/* Colonne Latérale (5 colonnes sur PC : Arrêts Suivants + Synthèse) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* LES 2 ARRÊTS SUIVANTS (STYLE TRANSIT / TCL) */}
                {upcomingStops.length > 0 && (
                  <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DAE44E] flex items-center space-x-1.5">
                        <Bus size={14} color="#DAE44E" className="shrink-0" />
                        <span>Arrêts Suivants</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Ligne {activeLine.name}
                      </span>
                    </div>

                    <div className="relative pl-7 py-1 space-y-3.5">
                      {/* Ligne verticale continue (Transit / TCL) */}
                      <div className="absolute left-[7px] top-3 bottom-2.5 w-[5px] bg-[#DAE44E] rounded-full" />

                      {upcomingStops.map((stop, i) => {
                        const isFirst = i === 0;

                        return (
                          <div 
                            key={`upcoming-${currentStopIndex}-${isInService ? 'srv' : 'wait'}-${i}-${stop.stop}`} 
                            style={{ animationDelay: `${i * 65}ms` }}
                            className={`relative flex items-center justify-between group animate-upcoming-stop ${isFirst ? 'min-h-[32px]' : 'min-h-[26px]'}`}
                          >
                            {/* Point de station aligné sur la ligne */}
                            <div className="absolute -left-7 flex items-center justify-center w-[19px] h-[19px] z-10">
                              {isFirst ? (
                                <div className="w-[15px] h-[15px] rounded-full border-[3.5px] border-[#DAE44E] bg-[#080226] shadow-sm ring-2 ring-[#DAE44E]/20" />
                              ) : (
                                <div className="w-[10px] h-[10px] rounded-full border-[2px] border-[#DAE44E] bg-white shadow-sm" />
                              )}
                            </div>

                            <div className="truncate pr-2 pl-1">
                              <div className={`uppercase tracking-tight truncate group-hover:text-[#DAE44E] transition-colors ${
                                isFirst 
                                  ? 'text-[15px] font-black text-white' 
                                  : 'text-xs font-bold text-zinc-300'
                              }`}>
                                {stop.stop}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className={`font-mono font-bold ${
                                isFirst ? 'text-sm text-white' : 'text-xs text-zinc-300'
                              }`}>
                                {getAdjustedStopTime(stop.time)}
                              </div>
                              <div className={`font-mono ${
                                isFirst ? 'text-xs font-bold text-[#DAE44E]' : 'text-[10px] text-[#DAE44E]/80'
                              }`}>
                                {getMinutesFromNow(stop.time)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Synthèse du Service visible sur grand écran */}
                <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 shadow-xl space-y-3 hidden lg:block">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DAE44E] block border-b border-white/5 pb-2">
                    Fiche Récapitulative
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-zinc-400">Origine</span>
                      <span className="font-bold text-white text-right">{selectedTrip?.effectiveOriginStop || selectedTrip?.originStop}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-zinc-400">Terminus</span>
                      <span className="font-bold text-[#DAE44E] text-right">{selectedTrip?.destinationStop || selectedDirection.destination}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-zinc-400">Arrêts au service</span>
                      <span className="font-mono font-bold text-white">{activeTripStops.length} arrêts</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Arrivée prévue</span>
                      <span className="font-mono font-bold text-white">{selectedTrip?.arrivalTime}:00</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- SOUS-ONGLET 2 : THERMOMÈTRE DES ARRÊTS (STYLE TRANSIT / TCL) --- */}
          {serviceTab === 'arrets' && (
            <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 lg:p-6 shadow-xl flex flex-col h-[calc(100vh-270px)] min-h-[480px] max-w-2xl mx-auto w-full">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
                <span className="text-xs font-mono font-bold uppercase text-[#DAE44E] flex items-center space-x-1.5">
                  <Bus size={14} color="#DAE44E" className="shrink-0" />
                  <span>Arrêts du Service ({activeTripStops.length})</span>
                </span>
                <span className="text-[11px] text-zinc-300 font-mono">
                  {selectedTrip?.isLimitedService ? "⚠️ Service Limité" : "Complet"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 pt-2">
                <div className="relative pl-7 py-2 space-y-3.5">
                  {/* Ligne thermomètre continue solide (Transit / TCL) */}
                  <div 
                    className="absolute left-[7px] top-[26px] bottom-[26px] w-[5px] bg-[#DAE44E] rounded-full pointer-events-none" 
                  />

                  {activeTripStops.map((s, idx) => {
                    const isPassed = isInService && idx < currentStopIndex;
                    const isCurrent = isInService && idx === currentStopIndex;
                    const isFirst = idx === 0;
                    const isLast = idx === activeTripStops.length - 1;
                    const isTerminus = isFirst || isLast;

                    return (
                      <div 
                        key={idx}
                        className="relative flex items-center justify-between min-h-[36px] group transition-all"
                      >
                        {/* Point de station centré exactement sur la ligne */}
                        <div className="absolute -left-7 w-[19px] h-[19px] flex items-center justify-center z-10">
                          {isCurrent ? (
                            <div className="w-[20px] h-[20px] rounded-full border-[3.5px] border-[#DAE44E] bg-[#080226] ring-4 ring-[#DAE44E]/30 animate-pulse shadow-lg flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#DAE44E]" />
                            </div>
                          ) : isTerminus ? (
                            <div className={`w-[17px] h-[17px] rounded-full border-[3.5px] border-[#DAE44E] shadow-md flex items-center justify-center ${
                              isLast ? 'bg-[#DAE44E]' : 'bg-[#100A38]'
                            }`}>
                              {isFirst && <div className="w-1.5 h-1.5 rounded-full bg-[#DAE44E]" />}
                            </div>
                          ) : isPassed ? (
                            <div className="w-[9px] h-[9px] rounded-full bg-zinc-600 border border-[#100A38]" />
                          ) : (
                            <div className="w-[11px] h-[11px] rounded-full border-[2.5px] border-[#DAE44E] bg-white shadow-sm" />
                          )}
                        </div>

                        {/* Libellé & Horaire */}
                        <div className="flex-1 flex items-center justify-between pl-1 pr-1 truncate">
                          <div className="truncate pr-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs uppercase tracking-tight truncate block ${
                                isCurrent
                                  ? 'font-black text-[#DAE44E] text-sm'
                                  : isTerminus
                                  ? 'font-black text-white'
                                  : isPassed
                                  ? 'font-medium text-zinc-500 line-through'
                                  : 'font-bold text-white'
                              }`}>
                                {s.stop}
                              </span>
                              {isFirst && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-bold shrink-0">
                                  Départ
                                </span>
                              )}
                              {isLast && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#DAE44E]/20 text-[#DAE44E] font-bold shrink-0">
                                  Terminus
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`shrink-0 font-mono text-xs ${
                            isCurrent
                              ? 'font-black text-[#DAE44E]'
                              : isPassed
                              ? 'text-zinc-600'
                              : 'text-zinc-300'
                          }`}>
                            {getAdjustedStopTime(s.time)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}



          {/* --- SOUS-ONGLET 3 : GRILLE COMPLETE --- */}
          {serviceTab === 'grille' && (
            <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col h-[calc(100vh-270px)] min-h-[440px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
                <span className="text-xs font-mono font-bold uppercase text-[#DAE44E]">
                  Grille des Départs • Ligne {activeLine.name}
                </span>
                <span className="text-[10px] text-zinc-300 font-mono">
                  {availableTrips.length} départs
                </span>
              </div>

              <div className="flex-1 overflow-auto border border-white/10 rounded-2xl mt-2">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-[#0C0438] sticky top-0 border-b border-white/10 z-20">
                    <tr>
                      <th className="p-2.5 text-left font-bold text-[#DAE44E] sticky left-0 bg-[#0C0438] z-30 whitespace-nowrap">
                        Arrêt
                      </th>
                      {availableTrips.map(t => (
                        <th 
                          key={t.tripId} 
                          className={`p-2.5 text-center whitespace-nowrap ${
                            t.effectiveDepartureTime === departureTime ? 'bg-[#DAE44E] text-[#080226] font-black' : 'text-zinc-300'
                          }`}
                        >
                          {t.effectiveDepartureTime}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allLineStops.map(stopName => (
                      <tr key={stopName} className="hover:bg-white/[0.03]">
                        <td className="p-2.5 font-sans font-medium text-white sticky left-0 bg-[#100A38] z-10 whitespace-nowrap border-r border-white/5">
                          {stopName}
                        </td>
                        {availableTrips.map(t => {
                          const stopData = t.effectiveStops.find(s => s.stop.toLowerCase() === stopName.toLowerCase());
                          return (
                            <td key={t.tripId} className="p-2.5 text-center text-zinc-400 whitespace-nowrap">
                              {stopData?.time || '|'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- SOUS-ONGLET 4 : GIROUETTES & CODES SPÉCIAUX --- */}
          {serviceTab === 'speciaux' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Colonne Gauche : Girouette en cours & Codes officiels de la ligne */}
              <div className="lg:col-span-6 space-y-4">
                {/* Girouette en cours */}
                <div className="bg-[#100A38] border border-[#DAE44E]/30 rounded-3xl p-5 shadow-xl">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DAE44E] block mb-2.5">
                    Girouette Actuelle en Service
                  </span>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-zinc-400 font-mono block">Code Pupitre</span>
                      <span className="text-2xl font-mono font-black text-[#DAE44E]">{selectedDirection.code}</span>
                      <div className="text-sm font-bold text-white truncate mt-0.5">
                        {selectedDirection.destination}
                      </div>
                    </div>
                    <div className="shrink-0 bg-[#DAE44E]/20 text-[#DAE44E] border border-[#DAE44E]/40 px-3 py-1 rounded-full text-[10px] font-mono font-black">
                      ACTIF
                    </div>
                  </div>
                </div>

                {/* Codes Girouettes Officiels de la Ligne */}
                {activeLine.girCodes && activeLine.girCodes.length > 0 && (
                  <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <span className="text-xs font-mono font-bold uppercase text-white">
                        Codes GIR Ligne {activeLine.name}
                      </span>
                      <span className="text-[10px] text-[#DAE44E] font-mono font-bold">
                        {activeLine.girCodes.length} codes
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {activeLine.girCodes.map((g, idx) => {
                        const isCurrent = g.code.toUpperCase() === selectedDirection.code.toUpperCase();
                        return (
                          <div 
                            key={idx}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                              isCurrent
                                ? 'bg-[#DAE44E]/15 border-[#DAE44E]/40 shadow-sm'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="text-xs font-bold text-white truncate">
                                {g.destination}
                              </div>
                              {g.city && (
                                <div className="text-[10px] text-zinc-400 font-mono uppercase truncate">
                                  {g.city}
                                </div>
                              )}
                            </div>
                            <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl shrink-0 ${
                              isCurrent
                                ? 'bg-[#DAE44E] text-[#080226]'
                                : 'bg-white/10 text-white border border-white/10'
                            }`}>
                              {g.code}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne Droite : Codes Girouettes Spéciaux (HLP) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-xs font-mono font-bold uppercase text-[#DAE44E]">
                      Codes Spéciaux Girouette
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {busData.specialCodes.length} codes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
                    {busData.specialCodes.map(sc => (
                      <div key={sc.code} className="bg-white/[0.03] hover:bg-white/[0.07] p-3 rounded-2xl flex items-center justify-between border border-white/5 transition-all">
                        <span className="text-xs font-bold text-white tracking-wide truncate pr-2">{sc.name}</span>
                        <span className="font-mono font-black text-xs bg-[#DAE44E]/15 text-[#DAE44E] px-2.5 py-1 rounded-xl border border-[#DAE44E]/30 shrink-0">
                          {sc.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>
      )}
    </>
  )}

      {/* FOOTER ÉPURÉ */}
      <footer className="mt-auto py-6 border-t border-white/5 text-center text-xs text-zinc-400 font-mono flex items-center justify-center space-x-2">
        <img 
          src="/discord-logo.gif" 
          alt="Discord Seine-Sud-Est" 
          className="w-4 h-4 rounded-full opacity-80 inline object-cover ring-1 ring-[#DAE44E]/30" 
        />
        <span>Prise de Service • Données officielles Seine-Sud-Est</span>
      </footer>

      {/* MODALE DU PROFIL CONDUCTEUR & DISCORD */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogin={handleUserLogin}
        onLogout={handleUserLogout}
        stats={stats}
        history={history}
        onClearStats={handleClearStats}
        onSync={() => performCloudSync(user, { forceMerge: true })}
        isSyncing={isSyncing}
      />

    </div>
  );
}
