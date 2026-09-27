import React from 'react';

export interface MetricItemProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  hint?: string;
}

export const MetricItem: React.FC<MetricItemProps> = ({
  label,
  value,
  unit,
  trend,
  hint,
}) => {
  return (
    <div className="flex flex-col gap-0.5 min-w-[70px]">
      <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-semibold text-neutral-100 font-mono tabular-nums tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-neutral-400 font-mono">{unit}</span>}
        {trend && <span className="text-[10px] text-emerald-400 ml-1">{trend}</span>}
      </div>
      {hint && <span className="text-[10px] text-neutral-400">{hint}</span>}
    </div>
  );
};
