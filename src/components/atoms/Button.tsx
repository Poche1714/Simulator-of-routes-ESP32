import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer whitespace-nowrap shrink-0 rounded-lg';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-amber-500 text-neutral-950 font-semibold hover:bg-amber-400 active:bg-amber-600 shadow-sm shadow-amber-500/20',
    accent:
      'bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700 shadow-sm shadow-cyan-600/20',
    secondary:
      'bg-neutral-800 text-neutral-200 border border-neutral-700/80 hover:bg-neutral-750 hover:text-white active:bg-neutral-700',
    outline:
      'bg-transparent text-neutral-300 border border-neutral-700 hover:border-neutral-500 hover:text-white active:bg-neutral-800/40',
    danger:
      'bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900 active:bg-rose-950',
    ghost:
      'bg-transparent text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 active:bg-neutral-800',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
