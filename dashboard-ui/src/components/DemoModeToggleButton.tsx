/**
 * Demo Mode Toggle Button
 * Button to enable/disable demo mode from dashboard header
 */

import React from 'react';

interface DemoModeToggleButtonProps {
  isEnabled: boolean;
  isRunning?: boolean;
  onClick: () => void;
}

export function DemoModeToggleButton({
  isEnabled,
  isRunning = false,
  onClick,
}: DemoModeToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 transition-all ${
        isEnabled
          ? isRunning
            ? 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30 hover:bg-cyan-500/30 animate-pulse'
            : 'bg-cyan-500/20 text-cyan-300 ring-cyan-400/30 hover:bg-cyan-500/30'
          : 'bg-slate-700/50 text-slate-400 ring-slate-600/30 hover:bg-slate-700'
      }`}
      title={isEnabled ? 'Demo mode enabled' : 'Click to enable demo mode'}
    >
      <span className="text-lg">{isEnabled ? '🎬' : '▶'}</span>
      <span className="hidden sm:inline">
        {isEnabled ? 'Demo' : 'Demo Mode'}
      </span>
    </button>
  );
}
