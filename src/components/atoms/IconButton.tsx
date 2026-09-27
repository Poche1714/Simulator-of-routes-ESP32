import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'active' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeMap = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-8 h-8 p-1.5 text-sm',
    lg: 'w-10 h-10 p-2 text-base',
  };

  const variantMap = {
    default: 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800',
    active: 'bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20',
    ghost: 'bg-transparent text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60',
    danger: 'bg-rose-950/40 border border-rose-900/40 text-rose-400 hover:bg-rose-900/60',
  };

  return (
    <button
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
