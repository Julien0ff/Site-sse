// Utilitaires de gestion du stockage local (Profil, Stats, Historique, Feuilles de route)

const STORAGE_KEYS = {
  USER: 'sse_user_profile',
  STATS: 'sse_driver_stats',
  HISTORY: 'sse_driver_history',
  ACTIVE_ROUTER: 'sse_active_roulement',
  SAVED_ROUTERS: 'sse_saved_roulements',
  APP_MODE: 'sse_app_mode'
};

// --- PROFIL UTILISATEUR & DISCORD ---

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Erreur setStoredUser:', e);
  }
}

// --- STATISTIQUES CONDUCTEUR ---

export function getDriverStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) {
      return {
        tripsCompleted: 0,
        totalMinutesDriven: 0,
        stopsValidated: 0,
        onTimeCount: 0,
        linesDriven: {}
      };
    }
    return JSON.parse(raw);
  } catch (e) {
    return {
      tripsCompleted: 0,
      totalMinutesDriven: 0,
      stopsValidated: 0,
      onTimeCount: 0,
      linesDriven: {}
    };
  }
}

export function recordCompletedService(service) {
  try {
    // 1. Mettre à jour les stats
    const stats = getDriverStats();
    stats.tripsCompleted += 1;
    stats.totalMinutesDriven += (service.durationMinutes || 25);
    stats.stopsValidated += (service.stopCount || 10);
    if (service.delayMinutes === 0) {
      stats.onTimeCount += 1;
    }
    const lineKey = service.lineName || 'Autre';
    stats.linesDriven[lineKey] = (stats.linesDriven[lineKey] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

    // 2. Ajouter à l'historique
    const history = getServiceHistory();
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      lineName: service.lineName,
      logoUrl: service.logoUrl,
      code: service.code,
      destination: service.destination,
      departureTime: service.departureTime,
      arrivalTime: service.arrivalTime,
      delayMinutes: service.delayMinutes || 0,
      stopsCount: service.stopCount || 0
    };
    history.unshift(newEntry);
    // Conserver les 50 derniers services
    const trimmedHistory = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory));

    return { stats, history: trimmedHistory };
  } catch (e) {
    console.error('Erreur recordCompletedService:', e);
    return null;
  }
}

export function getServiceHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function clearServiceHistory() {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.STATS);
}

// Calcul du grade conducteur SSE selon les stats
export function getDriverRank(tripsCount) {
  if (tripsCount >= 50) return { title: 'Chef de Régulation', color: '#DAE44E', level: 5, badge: '🌟 Expert Suprême' };
  if (tripsCount >= 25) return { title: 'Machiniste Principal', color: '#FCD34D', level: 4, badge: '🏆 Conducteur Émérite' };
  if (tripsCount >= 10) return { title: 'Conducteur Titulaire', color: '#60A5FA', level: 3, badge: '🎯 Titulaire SSE' };
  if (tripsCount >= 3) return { title: 'Machiniste Receveur', color: '#34D399', level: 2, badge: '🚌 Confirmé' };
  return { title: 'Conducteur Stagiaire', color: '#9CA3AF', level: 1, badge: '🔰 Débutant' };
}

// --- FEUILLE DE ROUTE (ROULEMENTS) ---

export function getStoredActiveRoster() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROUTER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setStoredActiveRoster(roster) {
  try {
    if (!roster) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUTER);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROUTER, JSON.stringify(roster));
    }
  } catch (e) {
    console.error('Erreur setStoredActiveRoster:', e);
  }
}

export function getStoredAppMode() {
  return localStorage.getItem(STORAGE_KEYS.APP_MODE) || 'welcome';
}

export function setStoredAppMode(mode) {
  localStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
}
