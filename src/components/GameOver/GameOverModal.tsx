import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MatchStats, TeamId } from '../../types/game';
import { soundManager } from '../../audio/soundManager';

interface GameOverModalProps {
  isOpen: boolean;
  isVictory: boolean;
  winnerTeam: TeamId | null;
  playerTeam: TeamId;
  stats: MatchStats;
  onPlayAgain: () => void;
  onSpectate: () => void;
  canSpectate: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  isVictory,
  winnerTeam,
  playerTeam,
  stats,
  onPlayAgain,
  onSpectate,
  canSpectate,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (isVictory) {
        soundManager.playVictory();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }
  }, [isOpen, isVictory]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}분 ${secs}초`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-white/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-center">
        {/* Header */}
        <div
          className={`p-6 border-b border-white/10 ${
            isVictory
              ? 'bg-gradient-to-b from-amber-500/30 to-zinc-900 text-amber-400'
              : 'bg-gradient-to-b from-rose-950/50 to-zinc-900 text-rose-500'
          }`}
        >
          <div className="text-4xl mb-2">{isVictory ? '🏆' : '💀'}</div>
          <h2 className="text-3xl font-black font-mono tracking-wider">
            {isVictory ? 'VICTORY!' : 'GAME OVER'}
          </h2>
          <p className="text-sm text-zinc-300 mt-1 font-medium">
            {isVictory
              ? '축하합니다! 상대 팀을 모두 격파하고 승리하셨습니다!'
              : `${winnerTeam?.toUpperCase()} 팀이 최종 승리하였습니다.`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
            경기 통계 (MATCH STATS)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">처치 (Kills)</div>
              <div className="text-xl font-bold text-white font-mono mt-0.5">{stats.kills}</div>
            </div>

            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">침대 파괴 (Beds)</div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{stats.bedBreaks}</div>
            </div>

            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">생존 시간</div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-1.5">
                {formatDuration(stats.durationSeconds)}
              </div>
            </div>

            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">블록 설치</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{stats.blocksPlaced}</div>
            </div>

            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">블록 채굴</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{stats.blocksBroken}</div>
            </div>

            <div className="bg-zinc-800/80 rounded-xl p-3 border border-white/5">
              <div className="text-xs text-zinc-400">다이아/에메랄드</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {stats.diamondsCollected + stats.emeraldsCollected}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-zinc-950/80 border-t border-white/10 flex items-center justify-center gap-3">
          {canSpectate && !isVictory && (
            <button
              id="btn-spectate"
              onClick={onSpectate}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition cursor-pointer"
            >
              👁️ 관전하기 (Spectate)
            </button>
          )}

          <button
            id="btn-play-again"
            onClick={onPlayAgain}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer font-mono"
          >
            🔄 다시 플레이하기
          </button>
        </div>
      </div>
    </div>
  );
};
