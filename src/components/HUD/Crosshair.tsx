import React from 'react';

export const Crosshair: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Horizontal bar */}
        <div className="absolute w-4 h-[2px] bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        {/* Vertical bar */}
        <div className="absolute h-4 w-[2px] bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
        {/* Center dot */}
        <div className="w-1 h-1 bg-black/40 rounded-full" />
      </div>
    </div>
  );
};
