import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        {label && <span className="font-medium text-neutral-400">{label}</span>}
        <span className="font-mono text-neutral-200 tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none transition-all ${className}`}
        {...props}
      />
    </div>
  );
};
