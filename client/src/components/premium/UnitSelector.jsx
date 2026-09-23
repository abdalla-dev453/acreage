const units = [
  { value: 'kg', label: 'Kilogram', short: 'kg', kg: 1 },
  { value: 'debe', label: 'Debe', short: 'debe', kg: 18 },
  { value: 'gunia', label: 'Gunia', short: 'gunia', kg: 90 },
  { value: 'bag', label: 'Bag', short: 'bag', kg: 50 },
  { value: 'crate', label: 'Crate', short: 'crate', kg: 10 },
  { value: 'piece', label: 'Piece', short: 'piece', kg: 1 },
];

export function supportedUnits() {
  return units;
}

export function unitLabel(value) {
  return units.find((unit) => unit.value === value)?.label || value;
}

export function unitWeightKg(value, override) {
  if (override && Number.isFinite(Number(override))) return Number(override);
  return units.find((unit) => unit.value === value)?.kg || 1;
}

export default function UnitSelector({ value, onChange, label = 'Selling unit', showConversion = true, disabled = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-950/30 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800"
      >
        {units.map((unit) => (
          <option key={unit.value} value={unit.value} className="dark:bg-slate-900">{unit.label} ({unit.short})</option>
        ))}
      </select>
      {showConversion && (
        <p className="mt-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500" aria-live="polite">
          1 {unitLabel(value)} ≈ {unitWeightKg(value)} kg
        </p>
      )}
    </div>
  );
}
