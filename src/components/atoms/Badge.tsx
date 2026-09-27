import React from 'react';

export interface BadgeProps {
  status: 'connected' | 'disconnected' | 'scanning' | 'idle' | 'warning' | 'error';
  label: string;
  detail?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  detail,
  className = '',
}) => {
  const dotColor = {
    connected: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
    disconnected: 'bg-neutral-600',
    scanning: 'bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50',
    idle: 'bg-neutral-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
  }[status];

  return (
    <div className={`inline-flex items-center gap-2 text-xs text-neutral-300 font-medium ${className}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
      {detail && (
        <>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <span className="text-neutral-400 font-mono text-[11px]">{detail}</span>
        </>
      )}
    </div>
  );
};
