// « 1 min 05 s », « 42 s », « 1 h 12 »
export function formatSeconds(total) {
  const s = Math.max(0, Math.round(total));
  if (s < 60) return `${s} s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m} min ${String(r).padStart(2, '0')} s` : `${m} min`;
  }
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}
