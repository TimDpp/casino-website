import React from 'react';
import { Volume2, VolumeX, Briefcase, Sparkles } from 'lucide-react';
import { getIsMuted, toggleMute } from '../utils/audio';

interface TopBarProps {
  currentTab: 'floor' | 'office' | 'ledger' | 'rules';
  setCurrentTab: (tab: 'floor' | 'office' | 'ledger' | 'rules') => void;
  balance: number;
  isBankrupt: boolean;
  isBanned: boolean;
  onOpenCashierOrBail: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  setCurrentTab,
  balance,
  isBankrupt,
  isBanned,
  onOpenCashierOrBail,
}) => {
  const [muted, setMuted] = React.useState(getIsMuted());

  const handleToggleMute = () => {
    const next = toggleMute();
    setMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sm:gap-8">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCurrentTab('floor')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="font-serif text-lg sm:text-xl font-bold tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors uppercase">
            The Velvet Ledger
          </span>
          <span className="hidden md:inline-block ml-2 text-xs text-neutral-400 font-sans tracking-normal">
            No-Deposit Free Play
          </span>
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-medium text-neutral-300 overflow-x-auto max-w-[50vw] sm:max-w-none scrollbar-none py-1">
        <button
          onClick={() => setCurrentTab('floor')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
            currentTab === 'floor'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'hover:text-white'
          }`}
        >
          Casino Floor
        </button>
        <button
          onClick={() => setCurrentTab('office')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 cursor-pointer ${
            currentTab === 'office'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
          <span>9-to-5 Cubicle</span>
          {isBankrupt && (
            <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-mono">
              Debt Relief
            </span>
          )}
        </button>
        <button
          onClick={() => setCurrentTab('ledger')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
            currentTab === 'ledger'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'hover:text-white'
          }`}
        >
          Ledger & Stats
        </button>
        <button
          onClick={() => setCurrentTab('rules')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
            currentTab === 'rules'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'hover:text-white'
          }`}
        >
          Rules
        </button>
      </nav>

      {/* Zone 3: Balance Display & Audio Control */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          onClick={onOpenCashierOrBail}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
            isBankrupt || balance <= 0
              ? 'bg-red-950/60 border-red-800 text-red-300 hover:bg-red-900/60 animate-pulse'
              : 'bg-neutral-900 border-neutral-700/80 text-neutral-100 hover:border-amber-500/50'
          }`}
          title={isBankrupt ? 'Bankrupt! Click to view penalty & 9-to-5' : 'Bankroll Vault'}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
              {isBanned ? 'EXILED' : isBankrupt ? 'BANKRUPT' : 'CHIPS'}
            </span>
            <span className="font-mono text-sm sm:text-base font-bold tabular-nums text-amber-300">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          onClick={handleToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer border border-neutral-800"
          title={`Audio: ${muted ? 'Muted' : 'Sound On'} (Press M)`}
        >
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
