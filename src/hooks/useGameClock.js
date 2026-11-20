import { useEffect, useMemo, useState } from 'react';

// Heure affichée : heure du jeu par défaut. Roblox Seine-Sud-Est n'est pas
// passé à l'heure d'hiver, le jeu a donc 1 h d'avance sur l'heure française.
export function useGameClock() {
  const [useGameSummerTime, setUseGameSummerTime] = useState(true);
  const [realClock, setRealClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setRealClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  return { effectiveClock, timeString, useGameSummerTime, setUseGameSummerTime };
}
