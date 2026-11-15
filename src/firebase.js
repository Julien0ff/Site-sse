import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import {
  getStoredUser,
  getDriverStats,
  setDriverStats,
  getServiceHistory,
  setServiceHistory,
  getStoredActiveRoster,
  setStoredActiveRoster,
  getDeviceId
} from './utils/storageUtils.js';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const PROD_SYNC_FALLBACK_URL = 'https://site-sse.vercel.app/api/user-sync';

let firebaseApp = null;
let firestoreDb = null;

export function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
    return { app: null, db: null, isReady: false };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
    return { app: firebaseApp, db: firestoreDb, isReady: true };
  } catch (err) {
    return { app: null, db: null, isReady: false, error: err.message };
  }
}

export function isFirebaseReady() {
  return true;
}

async function callSyncApi(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Sync status ${res.status}`);
  }
  return await res.json();
}

/**
 * Synchronise et fusionne additivement les services, statistiques et feuille de route
 * entre tous les appareils connectés au même compte (PC + Téléphone).
 */
export async function syncUserWithCloud({
  user = null,
  stats = null,
  history = null,
  activeRoster = undefined,
  action = 'sync',
  forceMerge = false
} = {}) {
  const activeUser = user || getStoredUser();
  if (!activeUser || !activeUser.id || String(activeUser.id).startsWith('local_') || activeUser.id === 'guest') {
    return null;
  }

  const payload = {
    userId: String(activeUser.id),
    userProfile: activeUser,
    stats: stats || getDriverStats(),
    history: history || getServiceHistory(),
    activeRoster: activeRoster !== undefined ? activeRoster : getStoredActiveRoster(),
    deviceId: getDeviceId(),
    action,
    forceMerge
  };

  const fetchOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };

  let data = null;
  try {
    data = await callSyncApi('/api/user-sync', fetchOpts);
  } catch {
    try {
      data = await callSyncApi(PROD_SYNC_FALLBACK_URL, fetchOpts);
    } catch {
      return null;
    }
  }

  if (data && data.ok) {
    if (data.stats) setDriverStats(data.stats);
    if (Array.isArray(data.history)) setServiceHistory(data.history);
    if (data.activeRoster !== undefined) setStoredActiveRoster(data.activeRoster);
  }

  // Synchronisation Firestore additionnelle si configurée
  const { db, isReady } = initFirebase();
  if (isReady && db && data?.stats) {
    try {
      const driverRef = doc(db, 'drivers', String(activeUser.id));
      await setDoc(driverRef, {
        id: String(activeUser.id),
        username: activeUser.username || 'Conducteur',
        avatarUrl: activeUser.avatarUrl || '',
        joinedAt: activeUser.joinedAt || new Date().toISOString(),
        tripsCompleted: data.stats.tripsCompleted || 0,
        totalMinutesDriven: data.stats.totalMinutesDriven || 0,
        totalStopsCompleted: data.stats.stopsValidated || 0,
        onTimeCount: data.stats.onTimeCount || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch {
      // Ignore optional firestore error
    }
  }

  return data;
}

export async function syncDriverProfileToFirebase(driver) {
  if (!driver || !driver.id) return null;
  return await syncUserWithCloud({ user: driver });
}

export async function syncCompletedServiceToFirebase(service) {
  const user = getStoredUser();
  if (user && user.id) {
    await syncUserWithCloud({ user });
  }

  const { db, isReady } = initFirebase();
  if (!isReady || !db) return true;

  try {
    const servicesRef = collection(db, 'services');
    await addDoc(servicesRef, {
      ...service,
      createdAt: serverTimestamp()
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchLeaderboardFromFirebase(limitCount = 10) {
  try {
    let data = null;
    try {
      data = await callSyncApi('/api/user-sync?leaderboard=1', { method: 'GET' });
    } catch {
      data = await callSyncApi(`${PROD_SYNC_FALLBACK_URL}?leaderboard=1`, { method: 'GET' });
    }
    if (data && Array.isArray(data.leaderboard)) {
      return data.leaderboard.slice(0, limitCount);
    }
  } catch {
    // Fallback to Firestore if configured
  }

  const { db, isReady } = initFirebase();
  if (!isReady || !db) return [];

  try {
    const driversRef = collection(db, 'drivers');
    const q = query(driversRef, orderBy('tripsCompleted', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    const leaderboard = [];
    snapshot.forEach(docSnap => {
      leaderboard.push(docSnap.data());
    });
    return leaderboard;
  } catch {
    return [];
  }
}
