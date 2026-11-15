import { put, list } from '@vercel/blob';

function getServiceKey(s) {
  if (!s) return '';
  if (s.syncId) return String(s.syncId);
  if (s.id) {
    return `id_${s.id}_${s.lineName || ''}_${s.departureTime || ''}`;
  }
  return `sig_${s.date || ''}_${s.lineName || ''}_${s.code || s.directionCode || ''}_${s.departureTime || ''}_${s.destination || ''}`;
}

function normalizeServiceEntry(s) {
  const stopsCount = Number(s.stopsCount || s.stopCount || 15);
  const durationMinutes = Number(s.durationMinutes || 22);
  const delayMinutes = Number(s.delayMinutes || 0);
  const id = s.id ? String(s.id) : `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const syncId = s.syncId || getServiceKey({ ...s, id });

  return {
    id,
    syncId,
    date: s.date && s.date.includes('T') ? s.date : (s.isoDate || new Date().toISOString()),
    lineName: s.lineName || 'Ligne',
    logoUrl: s.logoUrl || `/logos/${s.lineName || '134'}.png`,
    code: s.code || s.directionCode || '',
    origin: s.origin || '',
    destination: s.destination || '',
    departureTime: s.departureTime || '',
    arrivalTime: s.arrivalTime || '',
    durationMinutes,
    delayMinutes,
    stopsCount,
    stopCount: stopsCount,
    deviceId: s.deviceId || ''
  };
}

function computeStatsFromHistory(historyList) {
  const stats = {
    tripsCompleted: 0,
    totalMinutesDriven: 0,
    stopsValidated: 0,
    onTimeCount: 0,
    linesDriven: {}
  };

  for (const item of historyList) {
    stats.tripsCompleted += 1;
    stats.totalMinutesDriven += Number(item.durationMinutes || 22);
    stats.stopsValidated += Number(item.stopsCount || item.stopCount || 15);
    if (Number(item.delayMinutes || 0) === 0) {
      stats.onTimeCount += 1;
    }
    const lineKey = item.lineName || 'Autre';
    stats.linesDriven[lineKey] = (stats.linesDriven[lineKey] || 0) + 1;
  }

  return stats;
}

function mergeRosters(cloudRoster, clientRoster) {
  if (!cloudRoster && !clientRoster) return null;
  if (!cloudRoster) return clientRoster;
  if (!clientRoster) return cloudRoster;

  // Même feuille de route : fusionner l'état de complétion étape par étape
  if (cloudRoster.id && cloudRoster.id === clientRoster.id) {
    const clientStepsByNum = new Map(
      (clientRoster.steps || []).map(s => [s.stepNumber, s])
    );
    const mergedSteps = (cloudRoster.steps || []).map(cs => {
      const ls = clientStepsByNum.get(cs.stepNumber);
      if (!ls) return cs;
      const isCompleted = Boolean(cs.isCompleted || ls.isCompleted);
      return {
        ...cs,
        ...ls,
        isCompleted,
        justCompletedAt: Math.max(cs.justCompletedAt || 0, ls.justCompletedAt || 0) || undefined
      };
    });
    const completedSteps = mergedSteps.filter(s => s.isCompleted).length;
    return {
      ...cloudRoster,
      ...clientRoster,
      steps: mergedSteps,
      completedSteps,
      updatedAt: new Date().toISOString()
    };
  }

  // Feuilles différentes : conserver la plus récente
  const cloudTime = new Date(cloudRoster.updatedAt || cloudRoster.createdAt || 0).getTime();
  const clientTime = new Date(clientRoster.updatedAt || clientRoster.createdAt || 0).getTime();
  return clientTime >= cloudTime ? clientRoster : cloudRoster;
}

async function readCloudDriverDoc(userId, token) {
  const pathname = `drivers/${userId}.json`;
  const { blobs } = await list({ prefix: pathname, limit: 5, token });
  const match = blobs.find(b => b.pathname === pathname) || blobs[0];
  if (!match || !match.url) return null;

  const res = await fetch(`${match.url}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function processUserSyncRequest({ method, query, body, token }) {
  if (!token) {
    return { status: 503, data: { error: 'Cloud storage token not configured' } };
  }

  // Classement des conducteurs
  if (method === 'GET' && query?.leaderboard) {
    const { blobs } = await list({ prefix: 'drivers/', limit: 50, token });
    const docs = await Promise.all(
      blobs
        .filter(b => b.pathname.endsWith('.json') && !b.pathname.includes('_test'))
        .map(async b => {
          try {
            const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: 'no-store' });
            return r.ok ? await r.json() : null;
          } catch {
            return null;
          }
        })
    );
    const valid = docs
      .filter(d => d && d.profile?.id)
      .map(d => ({
        id: d.profile.id,
        username: d.profile.username,
        avatarUrl: d.profile.avatarUrl,
        tripsCompleted: d.stats?.tripsCompleted || 0,
        totalMinutesDriven: d.stats?.totalMinutesDriven || 0,
        stopsValidated: d.stats?.stopsValidated || 0,
        onTimeCount: d.stats?.onTimeCount || 0
      }))
      .sort((a, b) => b.tripsCompleted - a.tripsCompleted)
      .slice(0, 15);

    return { status: 200, data: { leaderboard: valid } };
  }

  if (method !== 'POST') {
    return { status: 405, data: { error: 'Method not allowed' } };
  }

  const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
  const userId = String(payload.userId || payload.userProfile?.id || '').trim();
  if (!userId || userId === 'guest') {
    return { status: 400, data: { error: 'Missing valid Discord userId' } };
  }

  const pathname = `drivers/${userId}.json`;

  // Réinitialisation volontaire des statistiques
  if (payload.action === 'reset') {
    const emptyStats = {
      tripsCompleted: 0,
      totalMinutesDriven: 0,
      stopsValidated: 0,
      onTimeCount: 0,
      linesDriven: {}
    };
    const resetDoc = {
      profile: payload.userProfile || { id: userId },
      stats: emptyStats,
      history: [],
      activeRoster: payload.activeRoster || null,
      resetAt: Date.now(),
      updatedAt: new Date().toISOString()
    };
    await put(pathname, JSON.stringify(resetDoc), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
      token
    });
    return { status: 200, data: { ok: true, ...resetDoc } };
  }

  const existingDoc = await readCloudDriverDoc(userId, token);
  const cloudResetAt = existingDoc?.resetAt || 0;

  // Fusionner additivement l'historique Cloud + l'historique Local de l'appareil
  const cloudHistory = Array.isArray(existingDoc?.history) ? existingDoc.history : [];
  const clientHistory = Array.isArray(payload.history) ? payload.history : [];

  const mergedMap = new Map();

  for (const raw of cloudHistory) {
    const norm = normalizeServiceEntry(raw);
    const key = getServiceKey(norm);
    if (key) mergedMap.set(key, norm);
  }

  for (const raw of clientHistory) {
    const norm = normalizeServiceEntry(raw);
    // Si l'utilisateur a réinitialisé son compte récemment, ignorer les très vieux services antérieurs au reset
    const itemTs = new Date(norm.date).getTime();
    if (cloudResetAt && itemTs && itemTs < cloudResetAt - 5000 && !payload.forceMerge) {
      continue;
    }
    const key = getServiceKey(norm);
    if (key && !mergedMap.has(key)) {
      mergedMap.set(key, norm);
    } else if (key && mergedMap.has(key)) {
      // Enrichir si l'entrée locale a plus de détails (ex: stopsCount ou logoUrl)
      const prev = mergedMap.get(key);
      mergedMap.set(key, {
        ...prev,
        ...norm,
        stopsCount: Math.max(prev.stopsCount || 0, norm.stopsCount || 0),
        stopCount: Math.max(prev.stopCount || 0, norm.stopCount || 0),
        durationMinutes: Math.max(prev.durationMinutes || 0, norm.durationMinutes || 0)
      });
    }
  }

  const mergedHistory = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 200);

  const mergedStats = computeStatsFromHistory(mergedHistory);
  const mergedRoster = mergeRosters(existingDoc?.activeRoster || null, payload.activeRoster || null);

  const mergedProfile = {
    ...(existingDoc?.profile || {}),
    ...(payload.userProfile || {}),
    id: userId
  };

  const finalDoc = {
    profile: mergedProfile,
    stats: mergedStats,
    history: mergedHistory,
    activeRoster: mergedRoster,
    resetAt: cloudResetAt,
    updatedAt: new Date().toISOString()
  };

  await put(pathname, JSON.stringify(finalDoc), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
    token
  });

  return {
    status: 200,
    data: {
      ok: true,
      ...finalDoc,
      syncedAt: Date.now()
    }
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const result = await processUserSyncRequest({
      method: req.method,
      query: req.query,
      body: req.body,
      token
    });
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
