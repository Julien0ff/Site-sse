import { useCallback, useEffect, useState } from 'react';

// Session du pupitre conducteur, sauvegardée en local pour survivre à un
// rechargement de page (ligne, horaire, arrêt en cours, régulation, onglet).

const STORAGE_KEY = 'sse_driver_session';
// Au-delà, on considère que le service est abandonné et on repart du choix de ligne
const MAX_AGE_MS = 4 * 60 * 60 * 1000;

export const EMPTY_SESSION = {
  step: 'select-line',     // 'select-line' | 'select-time' | 'service'
  dirId: null,
  spawnStop: '',
  departureTime: '',
  stopIndex: 0,
  delay: 0,
  forceDeparted: false,
  completed: false,
  lastAutoChecked: null,   // n° de course cochée automatiquement sur la feuille de route
  rosterStep: null,        // n° de course lancée depuis la feuille de route
  tab: 'conduite'          // 'conduite' | 'arrets' | 'grille' | 'speciaux'
};

function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!raw?.session || Date.now() - (raw.savedAt || 0) > MAX_AGE_MS) return EMPTY_SESSION;
    return { ...EMPTY_SESSION, ...raw.session };
  } catch {
    return EMPTY_SESSION;
  }
}

export function useDriverSession() {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), session }));
    } catch {
      // stockage indisponible (navigation privée) : la session reste en mémoire
    }
  }, [session]);

  // patch(objet) ou patch(session => objet) : fusionne dans la session
  const patch = useCallback((update) => {
    setSession(s => {
      const next = typeof update === 'function' ? update(s) : update;
      if (!next || Object.keys(next).every(k => next[k] === s[k])) return s;
      return { ...s, ...next };
    });
  }, []);

  return { session, patch, setSession };
}
