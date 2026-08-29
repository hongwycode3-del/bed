import React from 'react';
import { KillFeedEntry } from '../../types/game';

interface KillFeedProps {
  entries: KillFeedEntry[];
}

export const KillFeed: React.FC<KillFeedProps> = ({ entries }) => {
  const teamColors: Record<string, string> = {
    red: 'text-red-400 font-bold',
    blue: 'text-blue-400 font-bold',
    green: 'text-green-400 font-bold',
    yellow: 'text-yellow-400 font-bold',
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'sword': return '⚔️ 처치함';
      case 'void': return '🌌 보이드로 떨어뜨림';
      case 'fireball': return '🔥 화염구로 폭사시킴';
      case 'bow': return '🏹 저격함';
      case 'tnt': return '🧨 TNT로 폭파함';
      default: return '처치함';
    }
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-20 pointer-events-none max-w-sm">
      {entries.slice(-5).map(entry => (
        <div
          key={entry.id}
          className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 shadow-lg text-xs flex items-center gap-1.5 animate-fadeIn"
        >
          <span className={teamColors[entry.killerTeam] || 'text-white'}>
            {entry.killerName}
          </span>
          <span className="text-zinc-400 text-[11px]">
            {getReasonText(entry.reason)}
          </span>
          <span className={teamColors[entry.victimTeam] || 'text-white'}>
            {entry.victimName}
          </span>
          {entry.isFinalKill && (
            <span className="ml-1 text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded">
              최종 처치!
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
