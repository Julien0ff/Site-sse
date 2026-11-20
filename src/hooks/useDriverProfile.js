import { useEffect, useState } from 'react';
import { fetchDiscordUserProfile, exchangeDiscordCodeForToken } from '../utils/discordAuth.js';
import { syncUserWithCloud, syncCompletedServiceToFirebase } from '../cloud.js';
import {
  getStoredUser, setStoredUser,
  getDriverStats, recordCompletedService,
  getServiceHistory, clearServiceHistory,
  getStoredActiveRoster, setStoredActiveRoster,
  markRosterCleared
} from '../utils/storageUtils.js';
import { IN_GAME_ROUTES } from '../data/inGameRoutes.js';

// Profil conducteur : compte Discord, statistiques, historique, feuille de
// route active, et synchronisation cloud entre appareils.
export function useDriverProfile({ isProfileOpen }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [stats, setStats] = useState(() => getDriverStats());
  const [history, setHistory] = useState(() => getServiceHistory());
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeRoster, setActiveRosterState] = useState(() => getStoredActiveRoster());

  // Synchronisation cloud multi-appareils (fusion additive PC + téléphone)
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
        if (res.activeRoster !== undefined) setActiveRosterState(res.activeRoster);
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  // Au démarrage et au retour sur l'onglet
  useEffect(() => {
    if (!user?.id) return;
    performCloudSync(user);

    const onFocus = () => performCloudSync(user);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  // À l'ouverture du profil
  useEffect(() => {
    if (isProfileOpen && user?.id) performCloudSync(user);
  }, [isProfileOpen]);

  const loginWith = (discordUser) => {
    if (!discordUser?.id) return;
    setUser(discordUser);
    setStoredUser(discordUser);
    performCloudSync(discordUser, { forceMerge: true });
  };

  // Retour OAuth Discord (?code=... ou #access_token=...)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    const accessToken = window.location.hash.includes('access_token=')
      ? new URLSearchParams(window.location.hash.substring(1)).get('access_token')
      : null;
    if (!code && !accessToken) return;

    const tokenPromise = code ? exchangeDiscordCodeForToken(code) : Promise.resolve(accessToken);
    tokenPromise
      .then(token => fetchDiscordUserProfile(token))
      .then(loginWith)
      .catch(e => console.error('Erreur OAuth Discord:', e))
      .finally(() => window.history.replaceState(null, '', window.location.pathname));
  }, []);

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

  // Mise à jour de la feuille de route depuis la vue Feuille de route
  const setActiveRoster = (nextRoster) => {
    // Suppression volontaire : mémorisée pour que le cloud ne la renvoie pas
    if (!nextRoster) markRosterCleared();
    setActiveRosterState(nextRoster);
    if (user?.id) performCloudSync(user, { activeRoster: nextRoster });
  };

  // Feuille générée avant le découpage des parcours en jeu (format < 4) sur une
  // ligne à terminus provisoire : ses horaires sont faux, on la retire partout
  useEffect(() => {
    const version = activeRoster?.version || 0;
    if (activeRoster && version < 4 && activeRoster.steps?.some(st => IN_GAME_ROUTES[st.dirId])) {
      setActiveRoster(null);
      setStoredActiveRoster(null);
    }
  }, [activeRoster]);

  // Enregistre un service terminé et coche la course correspondante sur la
  // feuille de route. Renvoie le n° de course cochée (ou null).
  const recordService = (servicePayload, { dirId, rosterStep }) => {
    recordCompletedService(servicePayload);
    const updatedStats = getDriverStats();
    const updatedHistory = getServiceHistory();
    setStats(updatedStats);
    setHistory(updatedHistory);

    let nextRoster = activeRoster;
    let checkedStep = null;
    if (activeRoster && activeRoster.steps?.length) {
      const launched = activeRoster.steps.find(s => s.stepNumber === rosterStep && s.dirId === dirId);
      const targetStep = launched || activeRoster.steps.find(s => !s.isCompleted && s.dirId === dirId);

      if (targetStep && !targetStep.isCompleted) {
        const now = Date.now();
        const updatedSteps = activeRoster.steps.map(s =>
          s.stepNumber === targetStep.stepNumber
            ? { ...s, isCompleted: true, justCompletedAt: now }
            : s
        );
        nextRoster = {
          ...activeRoster,
          steps: updatedSteps,
          completedSteps: updatedSteps.filter(s => s.isCompleted).length
        };
        setActiveRosterState(nextRoster);
        setStoredActiveRoster(nextRoster);
        checkedStep = targetStep.stepNumber;
      }
    }

    syncCompletedServiceToFirebase(servicePayload);
    if (user?.id) {
      performCloudSync(user, {
        stats: updatedStats,
        history: updatedHistory,
        activeRoster: nextRoster,
        forceMerge: true
      });
    }
    return checkedStep;
  };

  return {
    user, stats, history, isSyncing, activeRoster,
    setActiveRoster, performCloudSync,
    handleUserLogin, handleUserLogout, handleClearStats,
    recordService
  };
}
