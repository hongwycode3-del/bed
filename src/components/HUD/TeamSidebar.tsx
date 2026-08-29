import React from 'react';
import { GameMode, TeamId, TeamInfo } from '../../types/game';

interface TeamSidebarProps {
  teams: Record<TeamId, TeamInfo>;
  playerTeam: TeamId;
  gameTime: number;
  nextEventName: string;
  nextEventTime: number;
  playerKills: number;
  playerBedBreaks: number;
  gameMode?: GameMode;
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
  teams,
  playerTeam,
  gameTime,
  nextEventName,
  nextEventTime,
  playerKills,
  playerBedBreaks,
  gameMode = 'classic_4teams',
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const teamOrder: TeamId[] = gameMode === 'duel_1v1' ? ['red', 'blue'] : ['red', 'blue', 'green', 'yellow'];

  return (
    <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shadow-2xl z-20 w-56 select-none font-sans text-xs">
      {/* Header */}
      <div className="text-center pb-2 border-b border-white/10">
        <h3 className="font-extrabold text-sm tracking-wider text-amber-400 font-mono flex items-center justify-center gap-1.5">
          {gameMode === 'duel_1v1' ? '⚔️ 1v1 DUEL' : '🏰 BED WARS'}
        </h3>
        <p className="text-[10px] text-zinc-400 mt-0.5">
          {formatTime(gameTime)}
        </p>
      </div>

      {/* Next Event Countdown */}
      <div className="my-2.5 bg-zinc-900/90 rounded-lg p-2 border border-white/5 flex items-center justify-between">
        <span className="text-zinc-300 font-medium text-[11px] truncate max-w-[120px]">
          {nextEventName}
        </span>
        <span className="text-amber-400 font-mono font-bold text-xs">
          {formatTime(nextEventTime)}
        </span>
      </div>

      {/* Teams Status List */}
      <div className="space-y-1.5 my-2">
        {teamOrder.map(tid => {
          const t = teams[tid];
          if (!t) return null;
          const isMe = tid === playerTeam;
          return (
            <div
              key={tid}
              className={`flex items-center justify-between px-2 py-1 rounded-md transition ${
                isMe ? 'bg-white/10 font-bold' : 'text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${t.bgBadge}`} />
                <span className={t.textColor}>
                  {t.nameKo} {isMe && '(나)'}
                </span>
              </div>
              <div className="font-mono text-[11px]">
                {t.hasBed ? (
                  <span className="text-emerald-400 font-bold">🟢 침대</span>
                ) : !t.isEliminated ? (
                  <span className="text-amber-400 font-bold">⚠️ 파괴됨</span>
                ) : (
                  <span className="text-rose-500 font-bold">❌ 전멸</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Personal Stats */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
        <div>
          처치: <strong className="text-white">{playerKills}</strong>
        </div>
        <div>
          침대 파괴: <strong className="text-white">{playerBedBreaks}</strong>
        </div>
      </div>
    </div>
  );
};
