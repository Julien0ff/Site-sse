// Utilitaires de gestion du stockage local (Profil, Stats, Historique, Feuilles de route)

const STORAGE_KEYS = {
  USER: 'sse_user_profile',
  STATS: 'sse_driver_stats',
  HISTORY: 'sse_driver_history',
  ACTIVE_ROUTER: 'sse_active_roulement',
  SAVED_ROUTERS: 'sse_saved_roulements',
  APP_MODE: 'sse_app_mode',
  DEVICE_ID: 'sse_device_id'
};

export function getDeviceId() {
  try {
    let devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!devId) {
      devId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    }
    return devId;
  } catch {
    return 'dev_default';
  }
}

export function getServiceSyncKey(s, fallbackIndex = 0) {
  if (!s) return '';
  if (s.syncId) return String(s.syncId);
  if (s.id) {
    return `id_${s.id}_${s.lineName || ''}_${s.departureTime || ''}`;
  }
  return `sig_${s.date || fallbackIndex}_${s.lineName || ''}_${s.code || s.directionCode || ''}_${s.departureTime || ''}_${s.destination || ''}`;
}

// --- PROFIL UTILISATEUR & DISCORD ---

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
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
    const parsed = JSON.parse(raw);
    return {
      tripsCompleted: Number(parsed.tripsCompleted || 0),
      totalMinutesDriven: Number(parsed.totalMinutesDriven || 0),
      stopsValidated: Number(parsed.stopsValidated || 0),
      onTimeCount: Number(parsed.onTimeCount || 0),
      linesDriven: parsed.linesDriven || {}
    };
  } catch {
    return {
      tripsCompleted: 0,
      totalMinutesDriven: 0,
      stopsValidated: 0,
      onTimeCount: 0,
      linesDriven: {}
    };
  }
}

export function setDriverStats(stats) {
  try {
    if (!stats) return;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Erreur setDriverStats:', e);
  }
}

export function getServiceHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const list = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(list)
      ? list.map((item, idx) => ({
          ...item,
          id: item.id ? String(item.id) : `hist_${idx}`,
          syncId: getServiceSyncKey(item, idx),
          stopsCount: Number(item.stopsCount || item.stopCount || 15),
          stopCount: Number(item.stopsCount || item.stopCount || 15),
          durationMinutes: Number(item.durationMinutes || 22)
        }))
      : [];

    // Si le compteur local tripsCompleted dépasse la taille de l'historique local,
    // générer des entrées déterministes liées à cet appareil pour ne perdre aucun service lors de la fusion multi-appareils
    const stats = getDriverStats();
    if (stats.tripsCompleted > normalized.length) {
      const devId = getDeviceId();
      const missingCount = stats.tripsCompleted - normalized.length;
      const avgDuration = Math.max(
        15,
        Math.round((stats.totalMinutesDriven || stats.tripsCompleted * 22) / Math.max(1, stats.tripsCompleted))
      );
      const avgStops = Math.max(
        10,
        Math.round((stats.stopsValidated || stats.tripsCompleted * 15) / Math.max(1, stats.tripsCompleted))
      );

      for (let i = 0; i < missingCount; i++) {
        const legacyId = `legacy_${devId}_${i + 1}`;
        normalized.push({
          id: legacyId,
          syncId: `id_${legacyId}_SSE_00:00`,
          date: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
          lineName: '134',
          logoUrl: '/logos/134.png',
          code: '134BR',
          destination: 'Service enregistré',
          departureTime: '--:--',
          arrivalTime: '--:--',
          durationMinutes: avgDuration,
          delayMinutes: 0,
          stopsCount: avgStops,
          stopCount: avgStops,
          deviceId: devId
        });
      }
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

export function setServiceHistory(history) {
  try {
    if (!Array.isArray(history)) return;
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 200)));
  } catch (e) {
    console.error('Erreur setServiceHistory:', e);
  }
}

export function recordCompletedService(service) {
  try {
    const devId = getDeviceId();
    const nowId = `${Date.now()}_${devId.slice(-4)}`;
    const stopsCount = Number(service.stopCount || service.stopsCount || 15);
    const durationMinutes = Number(service.durationMinutes || 22);

    // Lire l'historique AVANT d'incrémenter les stats : sinon getServiceHistory()
    // voit plus de services comptés que d'entrées et ajoute une entrée fantôme.
    const history = getServiceHistory();

    // 1. Mettre à jour les stats locales
    const stats = getDriverStats();
    stats.tripsCompleted += 1;
    stats.totalMinutesDriven += durationMinutes;
    stats.stopsValidated += stopsCount;
    if (Number(service.delayMinutes || 0) === 0) {
      stats.onTimeCount += 1;
    }
    const lineKey = service.lineName || 'Autre';
    stats.linesDriven[lineKey] = (stats.linesDriven[lineKey] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));

    // 2. Ajouter à l'historique avec identifiant unique de synchronisation multi-appareils
    const newEntry = {
      id: nowId,
      syncId: `id_${nowId}_${service.lineName || ''}_${service.departureTime || ''}`,
      date: new Date().toISOString(),
      lineName: service.lineName || 'Ligne',
      logoUrl: service.logoUrl || `/logos/${service.lineName || '134'}.png`,
      code: service.code || service.directionCode || '',
      origin: service.origin || '',
      destination: service.destination || '',
      departureTime: service.departureTime || '',
      arrivalTime: service.arrivalTime || '',
      durationMinutes,
      delayMinutes: Number(service.delayMinutes || 0),
      stopsCount,
      stopCount: stopsCount,
      deviceId: devId
    };
    history.unshift(newEntry);
    const trimmedHistory = history.slice(0, 200);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory));

    return { stats, history: trimmedHistory, newEntry };
  } catch (e) {
    console.error('Erreur recordCompletedService:', e);
    return null;
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
  } catch {
    return null;
  }
}

export function setStoredActiveRoster(roster) {
  try {
    if (!roster) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUTER);
    } else {
      const withTimestamp = {
        ...roster,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROUTER, JSON.stringify(withTimestamp));
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
