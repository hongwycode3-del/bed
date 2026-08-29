import React from 'react';
import { GameSettings, TeamId } from '../../types/game';

interface LobbyModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onStartGame: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  if (!isOpen) return null;

  const teams: Array<{ id: TeamId; name: string; nameKo: string; color: string; bg: string; border: string }> = [
    { id: 'red', name: 'Red', nameKo: '레드 팀', color: 'text-red-400', bg: 'bg-red-950/60', border: 'border-red-500' },
    { id: 'blue', name: 'Blue', nameKo: '블루 팀', color: 'text-blue-400', bg: 'bg-blue-950/60', border: 'border-blue-500' },
    { id: 'green', name: 'Green', nameKo: '그린 팀', color: 'text-green-400', bg: 'bg-green-950/60', border: 'border-green-500' },
    { id: 'yellow', name: 'Yellow', nameKo: '옐로우 팀', color: 'text-yellow-400', bg: 'bg-yellow-950/60', border: 'border-yellow-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Banner Title */}
        <div className="bg-gradient-to-r from-red-950/80 via-zinc-900 to-amber-950/80 p-6 text-center border-b border-white/10 relative">
          <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-mono font-bold mb-2">
            3D VOXEL BATTLEGROUND
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            BED WARS 3D
          </h1>
          <p className="text-sm text-zinc-300 mt-1">
            자원을 모으고, 방어벽을 쌓고, 적의 침대를 파괴하여 최후의 승자가 되세요!
          </p>
        </div>

        {/* Configuration Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* 1. Game Mode Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-2">
              1. 게임 모드 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="mode-classic"
                onClick={() => onUpdateSettings({ gameMode: 'classic_4teams' })}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  settings.gameMode === 'classic_4teams'
                    ? 'bg-amber-500/20 border-amber-400 border-2 text-amber-300 shadow-md'
                    : 'bg-zinc-800/60 border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏰</span>
                  <div className="font-extrabold text-sm text-white">4팀 클래식 배틀</div>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Red, Blue, Green, Yellow 4개 팀이 맞붙는 정통 BedWars (다이아몬드 & 에메랄드 섬)
                </div>
              </button>

              <button
                id="mode-duel"
                onClick={() => onUpdateSettings({ gameMode: 'duel_1v1', playerTeam: 'red' })}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  settings.gameMode === 'duel_1v1'
                    ? 'bg-red-500/20 border-red-400 border-2 text-red-300 shadow-md'
                    : 'bg-zinc-800/60 border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚔️</span>
                  <div className="font-extrabold text-sm text-white">1v1 듀얼 결투 (Duels)</div>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Red vs Blue 단독 1대1 초고속 템포 아레나! 빠른 자원 생성 및 즉각 교전
                </div>
              </button>
            </div>
          </div>

          {/* 2. Team Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-2">
              2. 팀 선택 (플레이어 팀)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {teams.filter(t => settings.gameMode === 'classic_4teams' || t.id === 'red' || t.id === 'blue').map(t => {
                const isSelected = settings.playerTeam === t.id;
                return (
                  <button
                    key={t.id}
                    id={`select-team-${t.id}`}
                    onClick={() => onUpdateSettings({ playerTeam: t.id })}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? `${t.bg} ${t.border} border-2 scale-105 shadow-lg`
                        : 'bg-zinc-800/60 border-white/10 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-2xl">🛏️</span>
                    <span className={`text-sm font-bold ${t.color}`}>{t.nameKo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Bot Difficulty */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-2">
              3. AI 봇 난이도
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'easy', label: '쉬움 (캐주얼)', desc: '느린 다리 건설, 낮은 공격성' },
                { id: 'normal', label: '보통 (일반전)', desc: '적절한 방어 & 다이아 파밍' },
                { id: 'hard', label: '어려움 (프로/랭크)', desc: '빠른 러쉬, 화염구 & TNT 공략' },
              ].map(diff => (
                <button
                  key={diff.id}
                  id={`select-diff-${diff.id}`}
                  onClick={() => onUpdateSettings({ botDifficulty: diff.id as typeof settings.botDifficulty })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    settings.botDifficulty === diff.id
                      ? 'bg-amber-500/20 border-amber-400 border-2 text-amber-300 shadow-md'
                      : 'bg-zinc-800/60 border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{diff.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{diff.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Controls & Keybinds Help */}
          <div className="bg-zinc-950/70 rounded-2xl p-4 border border-white/10">
            <h4 className="text-xs font-mono font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">
              <span>🎮</span> 조작 방법 가이드
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-300 font-medium">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">WASD</kbd>
                <span>이동</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">좌클릭</kbd>
                <span>공격 / 블록 채굴</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">우클릭</kbd>
                <span>블록 설치 / 아이템 사용</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">Space</kbd>
                <span>점프</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">Shift / C</kbd>
                <span>스닉 (낙하 방지)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">E</kbd>
                <span>상점 / 업그레이드</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">1 ~ 9</kbd>
                <span>핫바 슬롯 선택</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/20 rounded font-mono text-white">F5</kbd>
                <span>1인칭 / 3인칭 시점 전환</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Game Action */}
        <div className="p-4 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between">
          <div className="text-xs text-zinc-400 hidden sm:block">
            마우스 화면 클릭 시 3D 시점 제어(Pointer Lock)가 시작됩니다.
          </div>

          <button
            id="btn-start-game"
            onClick={onStartGame}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer font-mono tracking-wider ml-auto flex items-center justify-center gap-2"
          >
            <span>⚔️</span> 게임 시작하기 (START GAME)
          </button>
        </div>
      </div>
    </div>
  );
};
