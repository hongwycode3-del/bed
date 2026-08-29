import React from 'react';
import { HotbarSlot, InventoryResources } from '../../types/game';

interface HotbarProps {
  slots: (HotbarSlot | null)[];
  selectedIndex: number;
  onSelectSlot: (idx: number) => void;
  health: number;
  maxHealth: number;
  absorptionHp: number;
  resources: InventoryResources;
  onOpenShop: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  slots,
  selectedIndex,
  onSelectSlot,
  health,
  maxHealth,
  absorptionHp,
  resources,
  onOpenShop,
}) => {
  // Render 10 hearts
  const totalHearts = 10;
  const hearts = [];
  const hpPerHeart = maxHealth / totalHearts;

  for (let i = 0; i < totalHearts; i++) {
    const heartVal = health - i * hpPerHeart;
    if (heartVal >= hpPerHeart) {
      hearts.push('full');
    } else if (heartVal >= hpPerHeart / 2) {
      hearts.push('half');
    } else {
      hearts.push('empty');
    }
  }

  // Absorption hearts
  const absorptionHearts = Math.ceil(absorptionHp / 2);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 pointer-events-auto">
      {/* Resources Quick Bar & Shop Button */}
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-xs font-semibold">
        <div className="flex items-center gap-1 text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block shadow-sm" />
          <span>철: <strong className="text-white text-sm">{resources.iron}</strong></span>
        </div>
        <div className="w-[1px] h-3.5 bg-white/20" />
        <div className="flex items-center gap-1 text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
          <span>금: <strong className="text-white text-sm">{resources.gold}</strong></span>
        </div>
        <div className="w-[1px] h-3.5 bg-white/20" />
        <div className="flex items-center gap-1 text-cyan-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm" />
          <span>다이아: <strong className="text-white text-sm">{resources.diamond}</strong></span>
        </div>
        <div className="w-[1px] h-3.5 bg-white/20" />
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
          <span>에메랄드: <strong className="text-white text-sm">{resources.emerald}</strong></span>
        </div>

        <button
          id="btn-open-shop-quick"
          onClick={onOpenShop}
          className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition cursor-pointer shadow-md active:scale-95"
        >
          🛒 상점 (E)
        </button>
      </div>

      {/* Health & Absorption Bar */}
      <div className="flex items-center gap-1 select-none">
        {hearts.map((h, idx) => (
          <span
            key={`hp-${idx}`}
            className="text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-transform"
          >
            {h === 'full' ? '❤️' : h === 'half' ? '💔' : '🖤'}
          </span>
        ))}
        {absorptionHearts > 0 && (
          <div className="flex items-center gap-0.5 ml-1">
            {Array.from({ length: absorptionHearts }).map((_, idx) => (
              <span key={`abs-${idx}`} className="text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                💛
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 9 Hotbar Slots */}
      <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-2xl">
        {slots.map((slot, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              id={`hotbar-slot-${idx}`}
              key={`slot-${idx}`}
              onClick={() => onSelectSlot(idx)}
              className={`relative w-12 h-12 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-zinc-700/90 border-2 border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-zinc-800/80 border border-white/10 hover:bg-zinc-700/50'
              }`}
            >
              {/* Number tag */}
              <span className="absolute top-0.5 left-1 text-[10px] font-mono text-zinc-400 font-bold">
                {idx + 1}
              </span>

              {/* Item Icon */}
              {slot && (
                <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                  {slot.icon}
                </span>
              )}

              {/* Stack Count */}
              {slot && slot.count > 1 && (
                <span className="absolute bottom-0.5 right-1 text-xs font-mono font-black text-white bg-black/70 px-1 rounded shadow">
                  {slot.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
