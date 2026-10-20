import React from 'react';
import { ShieldCheck, AlertTriangle, Briefcase, Sparkles, Scale, Ban } from 'lucide-react';

export const HouseRules: React.FC = () => {
  return (
    <div className="w-full bg-neutral-900/90 rounded-2xl border border-neutral-800 p-6 sm:p-8 shadow-2xl space-y-8">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-amber-400 tracking-wide flex items-center gap-2">
          <Scale className="w-7 h-7 text-amber-400" />
          The Velvet Ledger House Rules & Terms
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Everything you need to know about our zero-deposit high-stakes simulation and debt recovery laws.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-600/60 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white">1. $1,000 Starter Bankroll</h3>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Every guest enters with complimentary $1,000 in virtual casino chips. No credit card, no deposit, and no real-money transactions are ever permitted or required.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-600/60 flex items-center justify-center text-red-400">
            <Ban className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white">2. Bankruptcy & 1-Week Ban</h3>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            If your balance reaches $0.00 and you have no active bets on the tables, the House declares bankruptcy. You are escorted to the curb and barred from casino floor games for 7 days (1 week).
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600/60 flex items-center justify-center text-emerald-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white">3. The 9-to-5 Exemption</h3>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Don't want to sit out 7 days? Clock in at Cubicle 4B in the Back Office. Complete an 8-hour shift auditing receipts and dodging the Pit Director to instantly expunge your exile and earn cash!
          </p>
        </div>
      </div>

      {/* Detailed FAQ */}
      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
        <h3 className="font-serif text-lg font-bold text-white">Frequently Asked Inquiries</h3>

        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <h4 className="font-semibold text-amber-300">Can I work a 9-to-5 shift even if I'm not bankrupt?</h4>
            <p className="text-neutral-400 mt-0.5">
              Yes! You can clock in anytime to pad your bankroll with guaranteed wages if you want to avoid gambling risk or build up a war chest.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-amber-300">What happens during the 7-day ban?</h4>
            <p className="text-neutral-400 mt-0.5">
              The casino tables and slots are locked with a real-time countdown timer. You can either wait for the timer to tick down or click &quot;Clock In for 9-to-5&quot; to work off your penalty immediately.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-amber-300">Are odds fair and standard?</h4>
            <p className="text-neutral-400 mt-0.5">
              Yes. Roulette uses single-zero European layout (2.7% house edge). Blackjack uses authentic Vegas rules with 3:2 natural payouts. Coin Flip is pure 50/50.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
