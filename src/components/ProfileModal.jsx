import React, { useState, useEffect } from 'react';
import { User, Cross, Check, Clock, Bus, Logout } from '@getpapillon/papicons';
import { getDriverRank } from '../utils/storageUtils.js';
import { getDiscordLoginUrl } from '../utils/discordAuth.js';
import { isFirebaseReady, fetchLeaderboardFromFirebase } from '../cloud.js';

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  stats,
  history = [],
  onClearStats,
  onSync,
  isSyncing = false
}) {
  const [usernameInput, setUsernameInput] = useState('');
  const [discordTagInput, setDiscordTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('stats');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const firebaseActive = isFirebaseReady();

  useEffect(() => {
    if (isOpen && activeTab === 'leaderboard' && firebaseActive) {
      setLoadingBoard(true);
      fetchLeaderboardFromFirebase(10)
        .then(data => setLeaderboard(data || []))
        .finally(() => setLoadingBoard(false));
    }
  }, [isOpen, activeTab, firebaseActive]);

  if (!isOpen) return null;

  const handleRealDiscordOAuth = () => {
    const url = getDiscordLoginUrl();
    if (!url) return;
    window.location.href = url;
  };

  const handleQuickLogin = (e) => {
    e.preventDefault();
    const cleanName = usernameInput.trim() || 'Conducteur';
    const cleanTag = discordTagInput.trim() || `#${Math.floor(1000 + Math.random() * 9000)}`;

    const newProfile = {
      id: `local_${Date.now()}`,
      username: cleanName,
      discordTag: cleanTag.startsWith('#') || cleanTag.startsWith('@') ? cleanTag : `@${cleanTag}`,
      avatarUrl: '/discord-logo.gif',
      joinedAt: new Date().toLocaleDateString('fr-FR')
    };

    if (onLogin) onLogin(newProfile);
  };

  const totalTrips = stats?.tripsCompleted || 0;
  const totalMins = stats?.totalMinutesDriven || 0;
  const totalStops = stats?.stopsValidated || 0;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const rank = getDriverRank(totalTrips);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-sse-panel border border-white/15 rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div className="p-5 sm:p-6 bg-sse-raised border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sse-yellow/15 border border-sse-yellow/30 flex items-center justify-center text-sse-yellow">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Profil conducteur
              </h3>
              <p className="text-xs text-zinc-400">
                Statistiques et historique de services
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all"
          >
            <Cross size={18} />
          </button>
        </div>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {!user ? (
            <div className="space-y-5">
              <div className="bg-[#5865F2]/15 border border-[#5865F2]/40 rounded-xl p-5 sm:p-6 text-center space-y-4">
                <img src="/discord-logo.gif" alt="Discord" className="w-12 h-12 rounded-lg mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    Connexion Discord
                  </h4>
                  <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                    Connectez votre compte Discord pour synchroniser vos statistiques et votre historique.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRealDiscordOAuth}
                  className="w-full max-w-sm mx-auto bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.99] text-white font-bold text-sm py-3 px-6 rounded-lg transition-all flex items-center justify-center space-x-2.5"
                >
                  <img src="/discord-logo.gif" alt="" className="w-5 h-5 rounded-full" />
                  <span>Se connecter avec Discord</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[10px] font-mono text-zinc-500">ou profil local</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <form onSubmit={handleQuickLogin} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Pseudo (ex: Foxy)"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-sse-raised border border-white/10 rounded-md px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sse-yellow"
                  />
                  <input
                    type="text"
                    placeholder="Tag optionnel (ex: @foxy)"
                    value={discordTagInput}
                    onChange={(e) => setDiscordTagInput(e.target.value)}
                    className="w-full bg-sse-raised border border-white/10 rounded-md px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sse-yellow"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-sse-yellow hover:bg-sse-yellow-hi text-sse-night font-bold text-xs py-2.5 rounded-md transition-all"
                >
                  Continuer en mode local
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-sse-raised border border-sse-yellow/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={user.avatarUrl || '/discord-logo.gif'}
                    alt="Avatar"
                    className="w-14 h-14 rounded-lg object-cover bg-[#5865F2] p-0.5 border border-sse-yellow/40"
                  />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-sse-raised absolute -bottom-1 -right-1" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-bold text-white">{user.username}</h4>
                    <span className="text-xs font-mono text-zinc-400">{user.discordTag}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold bg-sse-yellow text-sse-night px-2.5 py-0.5 rounded-full">
                      {rank.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                      {isSyncing ? 'Synchronisation...' : 'Cloud Sync Actif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                {onSync && !String(user.id).startsWith('local_') && (
                  <button
                    type="button"
                    onClick={onSync}
                    disabled={isSyncing}
                    className="px-3 py-2 rounded-md bg-sse-yellow/15 hover:bg-sse-yellow/25 text-sse-yellow border border-sse-yellow/30 text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    {isSyncing ? 'Sync...' : 'Synchroniser'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Logout size={14} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}

          {/* ONGLETS */}
          {firebaseActive && (
            <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all ${
                  activeTab === 'stats'
                    ? 'bg-sse-yellow text-sse-night font-bold' : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Mes Statistiques
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'leaderboard'
                    ? 'bg-sse-yellow text-sse-night font-bold' : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Classement</span>
              </button>
            </div>
          )}

          {activeTab === 'stats' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono">
                    <Bus size={13} color="#DAE44E" />
                    <span>Services</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {totalTrips}
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono">
                    <Clock size={13} color="#DAE44E" />
                    <span>Temps</span>
                  </div>
                  <div className="text-2xl font-bold text-sse-yellow font-mono mt-1">
                    {hours > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins}m`}
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono">
                    <Check size={13} color="#DAE44E" />
                    <span>Arrêts</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {totalStops}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-zinc-400">
                    Historique ({history.length})
                  </h4>
                  {history.length > 0 && onClearStats && (
                    <button
                      type="button"
                      onClick={onClearStats}
                      className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="p-6 rounded-lg bg-white/[0.02] border border-white/5 text-center text-xs text-zinc-400">
                    Aucun service terminé pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          {item.logoUrl && (
                            <img
                              src={item.logoUrl}
                              alt={item.lineName}
                              className="h-7 w-14 object-contain rounded bg-black/30 p-0.5 shrink-0"
                            />
                          )}
                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate">
                              ➔ {item.destination}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400">
                              {item.departureTime} ➔ {item.arrivalTime} • GIR {item.code}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold bg-sse-yellow/15 text-sse-yellow px-2 py-0.5 rounded shrink-0">
                          Terminé
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              {loadingBoard ? (
                <div className="p-8 text-center text-xs font-mono text-zinc-400">
                  Chargement...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-6 rounded-lg bg-white/[0.02] border border-white/5 text-center text-xs text-zinc-400">
                  Aucun conducteur enregistré.
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((driver, idx) => (
                    <div
                      key={driver.id || idx}
                      className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                          idx === 0 ? 'bg-sse-yellow text-sse-night' : 'bg-white/10 text-zinc-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <img
                          src={driver.avatarUrl || '/discord-logo.gif'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{driver.username}</div>
                          <div className="text-[10px] font-mono text-zinc-400">{driver.rankTitle || 'Conducteur'}</div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-sse-yellow">{driver.tripsCompleted || 0} services</div>
                        <div className="text-[10px] text-zinc-400">{driver.totalStopsCompleted || 0} arrêts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
