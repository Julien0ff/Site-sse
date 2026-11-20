import React, { useState } from 'react';
import { ChevronLeft, Home, Bus, User, List } from '@getpapillon/papicons';

import WelcomeView from './components/WelcomeView.jsx';
import PassengerView from './components/PassengerView.jsx';
import RoulementView from './components/RoulementView.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import DriverView from './components/driver/DriverView.jsx';
import { useBusData } from './data/loadBusData.js';
import { useGameClock } from './hooks/useGameClock.js';
import { useDriverProfile } from './hooks/useDriverProfile.js';
import { useDriverSession } from './hooks/useDriverSession.js';
import { useDriverService } from './hooks/useDriverService.js';
import { getStoredAppMode, setStoredAppMode } from './utils/storageUtils.js';

const NAV_ITEMS = [
  { id: 'conducteur', label: 'Conduite', icon: Bus },
  { id: 'passager', label: 'Voyageurs', icon: User },
  { id: 'roulement', label: 'Feuille de route', shortLabel: 'Feuille', icon: List }
];

function DataStatus({ error, onRetry }) {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" aria-live="polite">
      {error ? (
        <>
          <p className="text-white font-semibold">Les horaires n’ont pas pu être chargés.</p>
          <p className="text-sm text-zinc-400 mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 px-4 py-2 rounded-md border border-white/20 hover:border-white text-sm font-semibold"
          >
            Réessayer
          </button>
        </>
      ) : (
        <p className="text-sm text-zinc-400">Chargement des horaires…</p>
      )}
    </main>
  );
}

export default function App() {
  // 'welcome' | 'conducteur' | 'passager' | 'roulement'
  const [appMode, setAppMode] = useState(() => getStoredAppMode());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { busData, error: dataError, retry: retryData } = useBusData();
  const { effectiveClock, timeString, useGameSummerTime, setUseGameSummerTime } = useGameClock();
  const profile = useDriverProfile({ isProfileOpen });
  const { user, stats, activeRoster } = profile;

  const { session, patch } = useDriverSession();
  const svc = useDriverService({
    busData,
    session,
    patch,
    effectiveClock,
    keyboardEnabled: appMode === 'conducteur'
  });
  const { step, setStep } = svc;

  const changeAppMode = (mode) => {
    setAppMode(mode);
    setStoredAppMode(mode);
  };

  // Lancement d'un service depuis l'accueil ou la feuille de route
  const handleLaunchServiceFromRoster = ({ dirId, departureTime, rosterStepNumber = null }) => {
    if (svc.launchService({ dirId, departureTime, rosterStepNumber })) {
      changeAppMode('conducteur');
    }
  };

  return (
    <div className="min-h-screen bg-sse-night text-white flex flex-col w-full font-sans antialiased pb-16 md:pb-0">


      {/* ================= EN-TÊTE ================= */}
      <header className="sticky top-0 z-40 bg-sse-deep border-b border-sse-line w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-stretch justify-between gap-3">

          {/* Gauche : retour ou identité */}
          <div className="flex items-center shrink-0">
            {appMode === 'conducteur' && step !== 'select-line' ? (
              <button
                onClick={() => {
                  if (step === 'service') setStep('select-time');
                  else setStep('select-line');
                }}
                className="flex items-center gap-1 -ml-2 pl-1 pr-3 py-1.5 rounded-md text-sm font-semibold text-zinc-200 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ChevronLeft size={18} className="shrink-0" />
                <span>{step === 'service' ? 'Horaires' : 'Lignes'}</span>
              </button>
            ) : (
              <button
                onClick={() => changeAppMode('welcome')}
                className="flex items-center gap-2.5 text-left"
                aria-label="Accueil"
              >
                <img
                  src="/discord-logo.gif"
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="hidden sm:block leading-tight">
                  <span className="block text-[15px] font-bold text-white">Prise de service</span>
                  <span className="block text-xs text-zinc-400">Seine-Sud-Est</span>
                </span>
              </button>
            )}
          </div>

          {/* Centre : navigation (bureau). Sur mobile elle passe en barre du bas. */}
          <nav className="hidden md:flex items-stretch gap-1" aria-label="Espaces">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = appMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => changeAppMode(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 text-sm font-semibold border-b-[3px] -mb-px transition-colors ${
                    active
                      ? 'border-sse-yellow text-white'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Droite : horloge (touchez pour basculer jeu / PC) et profil */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setUseGameSummerTime(!useGameSummerTime)}
              className="flex items-baseline gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
              title={useGameSummerTime
                ? "Heure du jeu (Roblox n'est pas passé à l'heure d'hiver, +1 h). Touchez pour l'heure PC."
                : "Heure de votre PC. Touchez pour l'heure du jeu."}
            >
              <span className="font-sign font-bold text-lg text-white tabular-nums leading-none">{timeString}</span>
              <span className={`text-[11px] font-semibold ${useGameSummerTime ? 'text-sse-yellow' : 'text-zinc-400'}`}>
                {useGameSummerTime ? 'jeu' : 'PC'}
              </span>
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 pl-1 pr-1 xs:pr-2.5 py-1 rounded-full border border-sse-line hover:border-zinc-400 transition-colors"
              title="Mon profil conducteur"
            >
              {user ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-sse-raised flex items-center justify-center text-zinc-300">
                  <User size={14} />
                </span>
              )}
              <span className="text-sm font-semibold text-zinc-100 max-w-[110px] truncate hidden xs:inline">
                {user ? user.username : 'Profil'}
              </span>
              {stats?.tripsCompleted > 0 && (
                <span className="hidden sm:inline text-xs font-mono font-semibold text-zinc-400" title="Services effectués">
                  {stats.tripsCompleted}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Navigation mobile : en bas, à portée de pouce */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sse-deep border-t border-sse-line grid grid-cols-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Espaces"
      >
        {[{ id: 'welcome', label: 'Accueil', icon: Home }, ...NAV_ITEMS].map(item => {
          const Icon = item.icon;
          const active = appMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => changeAppMode(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-semibold border-t-[3px] -mt-px ${
                active ? 'border-sse-yellow text-white' : 'border-transparent text-zinc-400'
              }`}
            >
              <Icon size={20} />
              <span>{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>

      {!busData && appMode !== 'welcome' && <DataStatus error={dataError} onRetry={retryData} />}

      {appMode === 'welcome' && (busData ? (
        <WelcomeView
          busData={busData}
          effectiveClock={effectiveClock}
          onLaunchService={handleLaunchServiceFromRoster}
          onSelectMode={changeAppMode}
          activeRoster={activeRoster}
          user={user}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      ) : <DataStatus error={dataError} onRetry={retryData} />)}

      {busData && appMode === 'passager' && (
        <PassengerView
          busData={busData}
          effectiveClock={effectiveClock}
          timeString={timeString}
        />
      )}

      {busData && appMode === 'roulement' && (
        <RoulementView
          busData={busData}
          activeRoster={activeRoster}
          setActiveRoster={profile.setActiveRoster}
          onLaunchService={handleLaunchServiceFromRoster}
          timeString={timeString}
        />
      )}

      {busData && appMode === 'conducteur' && (
        <DriverView
          busData={busData}
          svc={svc}
          activeRoster={activeRoster}
          user={user}
          onRecordService={profile.recordService}
          onLaunchService={handleLaunchServiceFromRoster}
          onOpenRoster={() => changeAppMode('roulement')}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      )}

      <footer className="mt-auto py-6 border-t border-sse-line text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
        <img
          src="/discord-logo.gif"
          alt=""
          className="w-4 h-4 rounded-full opacity-80 inline object-cover"
        />
        <span>Horaires issus des fiches officielles Seine-Sud-Est</span>
      </footer>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onLogin={profile.handleUserLogin}
        onLogout={profile.handleUserLogout}
        stats={stats}
        history={profile.history}
        onClearStats={profile.handleClearStats}
        onSync={() => profile.performCloudSync(user, { forceMerge: true })}
        isSyncing={profile.isSyncing}
      />
    </div>
  );
}
