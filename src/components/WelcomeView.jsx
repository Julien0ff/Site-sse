import React from 'react';
import { Bus, User, List, ArrowRight } from '@getpapillon/papicons';

export default function WelcomeView({ onSelectMode, activeRoster, user, onOpenProfile }) {
  return (
    <div className="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-slide-up">
      <div className="space-y-6">
        {/* En-tête minimaliste */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Seine-Sud-Est
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Choisissez votre espace
            </p>
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center space-x-2.5 bg-[#100A38] hover:bg-[#180E4F] border border-white/10 hover:border-[#DAE44E]/40 px-3.5 py-2 rounded-2xl transition-all"
            >
              <img
                src={user?.avatarUrl || '/discord-logo.gif'}
                alt="Discord"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-xs font-bold text-white">
                {user ? user.username : 'Connexion Discord'}
              </span>
            </button>
          )}
        </div>

        {/* Cartes principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Conducteurs */}
          <button
            type="button"
            onClick={() => onSelectMode('conducteur')}
            className="group text-left bg-[#100A38] hover:bg-[#150D46] border border-white/10 hover:border-[#DAE44E] rounded-3xl p-6 transition-all flex flex-col justify-between min-h-[190px] shadow-xl"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-11 h-11 rounded-2xl bg-[#DAE44E] text-[#080226] flex items-center justify-center">
                <Bus size={22} />
              </div>
              <ArrowRight size={18} className="text-zinc-500 group-hover:text-[#DAE44E] group-hover:translate-x-1 transition-all" />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-black text-white">
                Conducteurs
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Pupitre SAEIV, horaires, Haut-le-Pied et codes girouettes.
              </p>
            </div>
          </button>

          {/* Passagers */}
          <button
            type="button"
            onClick={() => onSelectMode('passager')}
            className="group text-left bg-[#100A38] hover:bg-[#150D46] border border-white/10 hover:border-[#DAE44E] rounded-3xl p-6 transition-all flex flex-col justify-between min-h-[190px] shadow-xl"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-11 h-11 rounded-2xl bg-white/10 text-[#DAE44E] border border-white/10 flex items-center justify-center group-hover:bg-[#DAE44E] group-hover:text-[#080226] transition-colors">
                <User size={22} />
              </div>
              <ArrowRight size={18} className="text-zinc-500 group-hover:text-[#DAE44E] group-hover:translate-x-1 transition-all" />
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-black text-white">
                Passagers
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Tous les arrêts du réseau, correspondances et prochains départs.
              </p>
            </div>
          </button>
        </div>

        {/* Feuille de route */}
        <button
          type="button"
          onClick={() => onSelectMode('roulement')}
          className="w-full group text-left bg-[#100A38] hover:bg-[#150D46] border border-white/10 hover:border-[#DAE44E]/60 rounded-3xl p-5 transition-all flex items-center justify-between gap-4 shadow-lg"
        >
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#DAE44E]/15 border border-[#DAE44E]/30 text-[#DAE44E] flex items-center justify-center shrink-0">
              <List size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {activeRoster ? `Feuille en cours : ${activeRoster.summary}` : 'Feuilles de route aléatoires'}
              </h3>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {activeRoster
                  ? `${activeRoster.completedSteps}/${activeRoster.totalSteps} services effectués`
                  : 'Générer un service complet avec changements aux terminus'}
              </p>
            </div>
          </div>

          <span className="px-3.5 py-2 rounded-xl bg-[#DAE44E] text-[#080226] font-black text-xs uppercase shrink-0 flex items-center space-x-1.5">
            <span>{activeRoster ? 'Reprendre' : 'Ouvrir'}</span>
            <ArrowRight size={14} />
          </span>
        </button>
      </div>
    </div>
  );
}
