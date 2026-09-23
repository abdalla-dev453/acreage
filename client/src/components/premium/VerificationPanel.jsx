import { useEffect, useState } from 'react';
import { CheckCircle2, Camera, Clock3, FileCheck2, ShieldCheck } from 'lucide-react';
import API from '../../services/api';
import MediaUploader from './MediaUploader';
import { EmptyState, ErrorState, LoadingState } from './PageState';

const requestTypeLabels = {
  identity: 'Identity verification',
  farm: 'Farm verification',
  photo: 'Photo verification',
  video: 'Video verification',
};

function RequestCard({ request: item, onReview }) {
  const statusTone = {
    approved: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    verified: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rejected: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  }[item.status] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-800 dark:text-white">{requestTypeLabels[item.request_type] || item.request_type}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
        </div>
        <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${statusTone}`}>{item.status}</span>
      </div>
      {item.farm_location && <p className="mt-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">Farm location: {item.farm_location}</p>}
      {item.id_number_last4 && <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">ID ending in: •••• {item.id_number_last4}</p>}
      {item.evidence && (
        <a href={item.evidence.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline">
          <Camera className="h-3.5 w-3.5" aria-hidden="true" /> View evidence
        </a>
      )}
      {item.status === 'rejected' && item.rejection_reason && (
        <p className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 p-2.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">Reviewer note: {item.rejection_reason}</p>
      )}
      {item.status === 'pending' && onReview && (
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onReview(item, 'approved')} className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2 text-[10px] font-extrabold text-white">Approve</button>
          <button type="button" onClick={() => onReview(item, 'rejected')} className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 px-3 py-2 text-[10px] font-extrabold text-white">Reject</button>
        </div>
      )}
    </article>
  );
}

export default function VerificationPanel({ user, compact = false, showAdminQueue = false }) {
  const [verification, setVerification] = useState(null);
  const [requests, setRequests] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestType, setRequestType] = useState('identity');
  const [idNumberLast4, setIdNumberLast4] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [evidenceMediaId, setEvidenceMediaId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [reviewReason, setReviewReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [verificationResponse, requestsResponse, mediaResponse] = await Promise.all([
        API.get('/trust/me'),
        API.get('/trust/verification-requests'),
        API.get('/trust/media'),
      ]);
      setVerification(verificationResponse.data);
      setRequests(requestsResponse.data?.items || requestsResponse.data || []);
      setMedia(mediaResponse.data?.items || mediaResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load verification workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice('');
    setError('');
    try {
      const response = await API.post('/trust/verification-requests', {
        request_type: requestType,
        id_number_last4: requestType === 'identity' ? idNumberLast4 : undefined,
        farm_location: farmLocation || undefined,
        evidence_media_id: evidenceMediaId ? Number(evidenceMediaId) : undefined,
      });
      setRequests((current) => [response.data, ...current]);
      setNotice('Verification request submitted for review.');
      setFarmLocation('');
      setIdNumberLast4('');
      setEvidenceMediaId('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRequest = async (item, status) => {
    setSubmitting(true);
    setError('');
    try {
      await API.post(`/trust/verification-requests/${item.id}/review`, {
        status,
        verification_badge: status === 'approved' ? 'verified-farmer' : undefined,
        rejection_reason: status === 'rejected' ? reviewReason : undefined,
      });
      setNotice(`Request ${status}.`);
      setReviewReason('');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading trust workspace..." />;
  if (error && !verification) return <ErrorState message={error} onRetry={load} />;

  const currentStatus = verification?.verification_status || user?.verification_status || 'unverified';
  const currentBadge = verification?.verification_badge || user?.verification_badge;
  const isVerified = currentStatus === 'verified';
  const isAdmin = user?.role === 'admin';
  const pendingRequests = requests.filter((item) => item.status === 'pending');

  return (
    <section className={`space-y-5 ${compact ? '' : 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm'}`} aria-labelledby="verification-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h3 id="verification-heading" className="text-sm font-black text-slate-800 dark:text-white">Trust & Verification Center</h3>
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">Evidence-backed identity, farm, photo, and video checks.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${isVerified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}>
          {isVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          {isVerified ? (currentBadge === 'verified-farmer' ? 'Verified Farmer' : 'Verified') : currentStatus}
        </span>
      </div>

      {notice && <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 p-3 text-[11px] font-bold text-emerald-800 dark:text-emerald-300" role="status">{notice}</div>}
      {error && <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800 p-3 text-[11px] font-bold text-rose-700 dark:text-rose-300" role="alert">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <form onSubmit={submitRequest} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h4 className="text-xs font-black text-slate-800 dark:text-white">Start a verification request</h4>
            </div>
             <div className="mt-3 grid gap-3 sm:grid-cols-2">
               <div>
                 <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="verification-type">Request type</label>
                 <select id="verification-type" value={requestType} onChange={(event) => setRequestType(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400">
                   {Object.entries(requestTypeLabels).map(([value, label]) => <option key={value} value={value} className="dark:bg-slate-900">{label}</option>)}
                 </select>
               </div>
               {requestType === 'identity' && (
                 <div>
                   <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="id-last4">ID last four digits</label>
                   <input id="id-last4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={idNumberLast4} onChange={(event) => setIdNumberLast4(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" />
                 </div>
               )}
               {requestType === 'farm' && (
                 <div>
                   <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="farm-location">Farm location</label>
                   <input id="farm-location" value={farmLocation} onChange={(event) => setFarmLocation(event.target.value)} placeholder="County / town" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400" />
                 </div>
               )}
             </div>
             {media.length > 0 && (
               <div className="mt-3">
                 <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="evidence-select">Supporting evidence (optional)</label>
                 <select id="evidence-select" value={evidenceMediaId} onChange={(event) => setEvidenceMediaId(event.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-xs font-bold outline-none focus:border-emerald-400">
                   <option value="" className="dark:bg-slate-900">Select a file from your evidence library</option>
                   {media.map((item) => <option key={item.id} value={item.id} className="dark:bg-slate-900">{item.kind} · {new Date(item.created_at).toLocaleDateString('en-KE')}</option>)}
                 </select>
               </div>
             )}
            <button type="submit" disabled={submitting} className="mt-4 w-full rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2.5 text-[11px] font-extrabold text-white disabled:opacity-50 cursor-pointer">{submitting ? 'Submitting...' : 'Submit request'}</button>
          </form>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-white">Evidence library</h4>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">{media.length} files</span>
            </div>
            {media.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500">Upload evidence to support a verification request.</div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {media.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    {item.kind === 'video' ? <video src={item.url} className="h-20 w-full object-cover group-hover:scale-105 transition" aria-label="Verification video evidence" /> : <img src={item.url} alt="Verification photo evidence" className="h-20 w-full object-cover group-hover:scale-105 transition" />}
                    <p className="truncate px-2 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.kind}</p>
                  </a>
                ))}
              </div>
            )}
            {user?.id && <div className="mt-3 grid gap-2 sm:grid-cols-2"><MediaUploader ownerType="user" ownerId={user.id} kind="photo" onUpload={load} onError={() => setError('Photo evidence upload failed.')} label="Add photo evidence" compact /><MediaUploader ownerType="user" ownerId={user.id} kind="video" onUpload={load} onError={() => setError('Video evidence upload failed.')} label="Add video evidence" compact /></div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-white">Verification history</h4>
            <div className="mt-3 space-y-2">
              {requests.length === 0 ? <EmptyState title="No verification requests" description="Submit a request to begin building your trust profile." /> : requests.slice(0, compact ? 3 : undefined).map((item) => <RequestCard key={item.id} request={item} onReview={showAdminQueue || isAdmin ? reviewRequest : null} />)}
            </div>
          </div>
          {(showAdminQueue || isAdmin) && pendingRequests.length > 0 && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300">Admin review queue</h4>
                <span className="rounded-full bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 text-[9px] font-extrabold text-amber-900 dark:text-amber-300">{pendingRequests.length} pending</span>
              </div>
              <div className="mt-3 space-y-2">{pendingRequests.map((item) => <RequestCard key={item.id} request={item} onReview={reviewRequest} />)}</div>
              <input value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Rejection reason (required for reject)" className="mt-3 w-full rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-2 text-[11px] font-bold outline-none focus:border-amber-400" aria-label="Rejection reason" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
