import React from 'react';

// Interrupteur du défilement automatique des arrêts
export default function AutoAdvanceToggle({ svc, compact = false }) {
  const { autoAdvance, setAutoAdvance } = svc;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={autoAdvance}
      onClick={() => setAutoAdvance(!autoAdvance)}
      className="w-full flex items-center justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">Défilement automatique</span>
        {!compact && (
          <span className="block text-xs text-zinc-400 mt-0.5">
            Les arrêts passent tout seuls selon la fiche horaire, régulation comprise.
          </span>
        )}
      </span>
      <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${autoAdvance ? 'bg-sse-yellow' : 'bg-white/15'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-sse-night transition-all ${autoAdvance ? 'left-5' : 'left-1'}`} />
      </span>
    </button>
  );
}
