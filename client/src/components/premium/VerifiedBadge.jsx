import { BadgeCheck, ShieldCheck } from 'lucide-react';

const badgeLabels = {
  'verified-farmer': 'Verified Farmer',
  'verified-buyer': 'Verified Buyer',
  verified: 'Verified',
};

export default function VerifiedBadge({ user, className = '' }) {
  const status = user?.verification_status;
  const badge = user?.verification_badge;

  if (status !== 'verified' && badge !== 'verified') {
    return null;
  }

  const label = badgeLabels[badge] || 'Verified';
  const Icon = badge === 'verified-farmer' ? ShieldCheck : BadgeCheck;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200 ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
