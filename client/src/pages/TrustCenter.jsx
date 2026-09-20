import { useContext } from 'react';
import { ShieldCheck, UsersRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import SEO from '../components/common/SEO';
import VerificationPanel from '../components/premium/VerificationPanel';

export default function TrustCenter() {
  const { user } = useContext(AuthContext);
  return (
    <div className="space-y-6 w-full pb-16">
      <SEO title="Trust Center | Acreage" description="Verify your identity, farm, photos, and videos with evidence-backed trust checks." />
      <Navbar title="Trust & Verification Center" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h1 className="text-xl font-black text-slate-900">Proof before trade</h1></div><p className="mt-1 text-xs font-bold text-slate-500">Build a verifiable reputation with reviewable evidence.</p></div>
        {user?.role === 'admin' && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white"><UsersRound className="h-3.5 w-3.5" /> Review queue enabled</span>}
      </div>
      <VerificationPanel user={user} showAdminQueue={user?.role === 'admin'} />
    </div>
  );
}
