// Accès au cloud (Firebase + API de synchro) chargé à la demande :
// le SDK Firebase pèse lourd et n'est utile qu'une fois connecté ou au
// premier service terminé.
const loadFirebase = () => import('./firebase.js');

export const syncUserWithCloud = (...args) =>
  loadFirebase().then(m => m.syncUserWithCloud(...args));

export const syncCompletedServiceToFirebase = (...args) =>
  loadFirebase().then(m => m.syncCompletedServiceToFirebase(...args));

export const fetchLeaderboardFromFirebase = (...args) =>
  loadFirebase().then(m => m.fetchLeaderboardFromFirebase(...args));

// Identique à firebase.js : la synchro passe par l'API, toujours disponible
export const isFirebaseReady = () => true;
