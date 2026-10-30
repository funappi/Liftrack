import React from 'react';
import { X } from 'lucide-react';
import { Exercise } from '../../types';

// Shared look of every workout sheet (creation, detail, scheduling), based on the
// "Créer ma séance de A à Z" design: bottom sheet, gradient badge header, cards, sticky actions.

interface SheetShellProps {
  isLight: boolean;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const SheetShell: React.FC<SheetShellProps> = ({ isLight, icon, eyebrow, title, onClose, footer, children }) => (
  <div
    className={`fixed inset-0 z-50 flex flex-col justify-end max-w-lg mx-auto overflow-hidden animate-in fade-in duration-200 ${
      isLight ? 'bg-[#3d2317]/65 backdrop-blur-xl' : 'bg-black/85 backdrop-blur-md'
    }`}
    onClick={onClose}
  >
    <div
      className={`relative w-full h-[94vh] rounded-t-3xl border-t flex flex-col overflow-hidden shadow-2xl transition-colors duration-200 ${
        isLight ? 'bg-[#faebe0] border-[#7d5a47]/20 text-[#3d2317]' : 'bg-[#0E0E0E] border-white/10 text-white'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0 transition-colors ${
          isLight ? 'bg-[#f5e3d4] border-[#7d5a47]/15' : 'bg-[#121212] border-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#EC4899] block">{eyebrow}</span>
            <h2 className="text-base font-black text-white uppercase tracking-tight truncate">{title}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border shrink-0 cursor-pointer ${
            isLight
              ? 'bg-[#f3dfcb] hover:bg-[#fff3ea] text-[#7d5a47] hover:text-[#3d2317] border-[#7d5a47]/20'
              : 'bg-white/10 hover:bg-white/20 text-[#A7A7A7] hover:text-white border-transparent'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar ${footer ? 'pb-32' : 'pb-8'}`}>{children}</div>

      {footer && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#0E0E0E] via-[#0E0E0E]/95 to-transparent border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  </div>
);

interface SheetCardProps {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

// Section card ("1. Informations de la séance" style)
export const SheetCard: React.FC<SheetCardProps> = ({ icon, title, subtitle, action, children }) => (
  <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 space-y-4">
    {(title || action) && (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {title && (
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </h3>
          )}
          {subtitle && <p className="text-[10px] text-[#A7A7A7] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const SheetLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-bold text-[#A7A7A7] uppercase block">{children}</label>
);

export const sheetInputClass =
  'w-full bg-[#0A0A0A] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#EC4899]';

interface SheetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

// Sticky footer buttons: secondary (outlined) and primary (blue gradient)
export const SheetButton: React.FC<SheetButtonProps> = ({ variant = 'secondary', className = '', children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 ${
      variant === 'primary'
        ? 'bg-gradient-to-r from-[#0088FF] to-[#0055CC] hover:brightness-110 active:scale-[0.98] text-white shadow-lg shadow-[#0088FF]/30'
        : 'bg-[#1E1E1E] hover:bg-[#282828] border border-white/15 text-white'
    } ${className}`}
  >
    {children}
  </button>
);

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

// "- value +" control used for sets / reps / load
export const Stepper: React.FC<StepperProps> = ({ label, value, onChange, min = 0, max = 999, step = 1, suffix }) => (
  <div className="space-y-1 min-w-0">
    <span className="text-[10px] font-bold text-[#A7A7A7] uppercase block truncate">{label}</span>
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 rounded-lg bg-[#202020] text-white font-bold flex items-center justify-center hover:bg-white/10 shrink-0 cursor-pointer"
      >
        -
      </button>
      <span className="font-mono font-bold text-white text-sm min-w-[2rem] text-center">
        {value}
        {suffix && <span className="text-[9px] text-[#A7A7A7] ml-0.5">{suffix}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 rounded-lg bg-[#202020] text-white font-bold flex items-center justify-center hover:bg-white/10 shrink-0 cursor-pointer"
      >
        +
      </button>
    </div>
  </div>
);

interface ExerciseCardProps {
  index: number;
  name: React.ReactNode;
  targetMuscles: string[];
  controls?: React.ReactNode;
  children?: React.ReactNode;
  highlighted?: boolean;
}

// Exercise card: number badge, name, targets, then parameters
export const ExerciseCard: React.FC<ExerciseCardProps> = ({ index, name, targetMuscles, controls, children, highlighted }) => (
  <div
    className={`p-3.5 rounded-2xl bg-[#161616] border space-y-3 relative transition-colors ${
      highlighted ? 'border-emerald-500/50' : 'border-white/10'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-6 h-6 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-xs font-black text-[#EC4899] shrink-0 font-mono">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">{name}</div>
      </div>
      {controls && <div className="flex items-center gap-1 shrink-0">{controls}</div>}
    </div>

    {targetMuscles.length > 0 && (
      <div className="text-[10px] text-[#A7A7A7] flex items-center gap-1.5 flex-wrap">
        <span className="text-[#EC4899] font-bold">Cibles:</span>
        {targetMuscles.map((m, i) => (
          <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
            {m}
          </span>
        ))}
      </div>
    )}

    {children && <div className="pt-1 border-t border-white/5">{children}</div>}
  </div>
);

// Read-only summary of an exercise (detail shown under the schedule picker)
export const ExerciseSummary: React.FC<{ exercise: Exercise; index: number }> = ({ exercise, index }) => (
  <ExerciseCard
    index={index}
    name={<span className="text-sm font-black text-white truncate block">{exercise.name}</span>}
    targetMuscles={exercise.targetMuscles || []}
  >
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        ['Séries', exercise.sets],
        ['Reps', exercise.reps || '—'],
        ['Repos', exercise.restSeconds ? `${exercise.restSeconds}s` : '—'],
      ].map(([label, value]) => (
        <div key={label as string} className="rounded-lg bg-[#0A0A0A] border border-white/10 py-1.5">
          <span className="text-[9px] font-bold text-[#A7A7A7] uppercase block">{label}</span>
          <span className="text-xs font-mono font-bold text-white">{value}</span>
        </div>
      ))}
    </div>
    {exercise.notes && <p className="text-[11px] text-[#A7A7A7] mt-2 italic">{exercise.notes}</p>}
  </ExerciseCard>
);
