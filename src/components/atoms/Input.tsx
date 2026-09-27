import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  prefixElement,
  suffixElement,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-neutral-400">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixElement && (
          <div className="absolute left-2.5 text-neutral-500 pointer-events-none text-xs">
            {prefixElement}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-colors ${
            prefixElement ? 'pl-8' : ''
          } ${suffixElement ? 'pr-8' : ''} ${className}`}
          {...props}
        />
        {suffixElement && (
          <div className="absolute right-2.5 text-neutral-500 pointer-events-none text-xs font-mono">
            {suffixElement}
          </div>
        )}
      </div>
      {helperText && <p className="text-[11px] text-neutral-500">{helperText}</p>}
    </div>
  );
};
