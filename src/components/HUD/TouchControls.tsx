import React, { useState } from 'react';

interface TouchControlsProps {
  onMoveChange: (x: number, y: number) => void;
  onAttack: () => void;
  onPlaceOrUse: () => void;
  onJump: () => void;
  onToggleSneak: () => void;
  isSneaking: boolean;
  onOpenShop: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onAttack,
  onPlaceOrUse,
  onJump,
  onToggleSneak,
  isSneaking,
  onOpenShop,
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleJoystickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setTouchStart({ x: centerX, y: centerY });
  };

  const handleJoystickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const maxDist = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(maxDist, dist);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;
    setStickOffset({ x: stickX, y: stickY });

    onMoveChange(stickX / maxDist, stickY / maxDist);
  };

  const handleJoystickEnd = () => {
    setTouchStart(null);
    setStickOffset({ x: 0, y: 0 });
    onMoveChange(0, 0);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none md:hidden">
      {/* Left Virtual Joystick */}
      <div
        className="absolute bottom-20 left-6 w-32 h-32 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        <div
          className="w-14 h-14 rounded-full bg-white/40 border border-white/60 shadow-lg pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div className="absolute bottom-20 right-6 flex flex-col items-end gap-3 pointer-events-auto">
        <div className="flex gap-2">
          {/* Sneak Button */}
          <button
            onClick={onToggleSneak}
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border shadow-lg transition active:scale-90 ${
              isSneaking
                ? 'bg-amber-500 text-black border-white'
                : 'bg-black/60 text-white border-white/20'
            }`}
          >
            스닉
          </button>

          {/* Jump Button */}
          <button
            onClick={onJump}
            className="w-14 h-14 rounded-full bg-cyan-600/80 border border-cyan-400 text-white font-black text-lg shadow-lg flex items-center justify-center active:scale-90"
          >
            점프
          </button>
        </div>

        <div className="flex gap-2">
          {/* Place / Use Button */}
          <button
            onClick={onPlaceOrUse}
            className="w-14 h-14 rounded-full bg-emerald-600/80 border border-emerald-400 text-white font-black text-sm shadow-lg flex items-center justify-center active:scale-90"
          >
            설치/사용
          </button>

          {/* Attack Button */}
          <button
            onClick={onAttack}
            className="w-16 h-16 rounded-full bg-rose-600/90 border border-rose-400 text-white font-black text-xl shadow-xl flex items-center justify-center active:scale-90"
          >
            공격
          </button>
        </div>
      </div>
    </div>
  );
};
