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

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

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
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export async function syncDriverProfileToFirebase(driver) {
  if (!driver || !driver.id) return false;
  const { db, isReady } = initFirebase();
  if (!isReady || !db) return false;

  try {
    const driverRef = doc(db, 'drivers', String(driver.id));
    await setDoc(driverRef, {
      id: String(driver.id),
      username: driver.username || 'Conducteur',
      avatarUrl: driver.avatarUrl || '',
      joinedAt: driver.joinedAt || new Date().toISOString(),
      tripsCompleted: driver.tripsCompleted || 0,
      totalMinutesDriven: driver.totalMinutesDriven || 0,
      totalStopsCompleted: driver.totalStopsCompleted || 0,
      onTimeCount: driver.onTimeCount || 0,
      rankTitle: driver.rankTitle || 'Stagiaire',
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch {
    return false;
  }
}

export async function syncCompletedServiceToFirebase(service) {
  const { db, isReady } = initFirebase();
  if (!isReady || !db) return false;

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
