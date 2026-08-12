import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  ArrowRight,
  Handshake,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  Tractor
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const MARKET_ROWS = [
  { crop: 'MAIZE', unit: '90KG BAG', price: 'KES 4,250', delta: '+3.2%', up: true },
  { crop: 'TOMATOES', unit: 'CRATE', price: 'KES 1,800', delta: '-1.4%', up: false },
  { crop: 'BEANS', unit: '90KG BAG', price: 'KES 8,900', delta: '+5.6%', up: true },
  { crop: 'AVOCADO', unit: 'CRATE', price: 'KES 2,150', delta: '+0.8%', up: true },
  { crop: 'ONIONS', unit: '50KG BAG', price: 'KES 3,400', delta: '-2.1%', up: false },
  { crop: 'COFFEE', unit: 'KG (AA)', price: 'KES 620', delta: '+1.9%', up: true },
];

const STEPS = [
  {
    n: '01',
    title: 'List what you grow',
    body: 'Add crops, quantities and harvest windows to your ledger in minutes — no spreadsheets, no middlemen calls.',
    highlights: ['Instant cataloging', 'Flexible batch pricing', 'Zero phone tag']
  },
  {
    n: '02',
    title: 'Match with buyers',
    body: 'Verified buyers browse live listings and place orders directly. You set the price, you accept the order.',
    highlights: ['Vetted merchants', 'Automated trade logs', 'Direct negotiations']
  },
  {
    n: '03',
    title: 'Settle & track',
    body: 'Every sale, payout and crop activity lands in one dashboard — so your season is never a guessing game.',
    highlights: ['Real-time settlement', 'Historical trends', 'Full audit trail']
  },
];

const FEATURES = [
  {
    icon: Handshake,
    title: 'Direct trade',
    body: 'Sell straight to buyers. No brokers taking a cut of a season you did the work for.',
    tag: 'Disintermediation'
  },
  {
    icon: BarChart3,
    title: 'Farm analytics',
    body: 'Yield, revenue and order trends laid out plainly — know what worked before the next planting.',
    tag: 'Real-time Data'
  },
  {
    icon: ClipboardList,
    title: 'Crop & order ledger',
    body: 'One running record of every activity, order and sale, searchable by crop or season.',
    tag: 'Immutable Logs'
  },
  {
    icon: ShieldCheck,
    title: 'Verified accounts',
    body: 'Every merchant and buyer on Acreage is checked, so a deal made here is a deal you can trust.',
    tag: 'Trust & Safety'
  },
];

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-[Inter,sans-serif] antialiased selection:bg-[#15803D] selection:text-white relative overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;0,9..144,900;1,9..144,600&family=IBM+Plex+Sans:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap');

        .font-display { font-family: 'Fraunces', serif; }
        .font-mono-label { font-family: 'IBM Plex Mono', monospace; }

        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 32s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }

        .pin::before {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, #22c55e, #15803d);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 10;
        }
      `}</style>

      {/* Radial Gradient Backdrops */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-gradient-to-b from-[#166534]/15 via-[#15803D]/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[900px] left-[-200px] w-[500px] h-[500px] bg-gradient-to-tr from-[#166534]/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#F8FAFC]/90 border-b border-[#166534]/15 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#166534] to-[#052E16] text-white flex items-center justify-center -rotate-3 shadow-md shadow-[#166534]/30">
              <Sprout className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-display font-extrabold text-2xl tracking-wide bg-gradient-to-r from-[#020617] via-[#166534] to-[#052E16] bg-clip-text text-transparent">
              Acreage
              <span className='block text-green-400 text-sm mt-2'>Be Today, Be Nature!</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline-block font-mono-label text-[11px] font-bold text-[#0F172A] tracking-wide bg-[#166534]/10 px-3 py-1 rounded border border-[#166534]/20">
                  @{user.username}
                </span>
                <Link
                  to="/dashboard"
                  className="font-mono-label text-xs uppercase tracking-widest font-bold px-4 py-2.5 bg-[#166534] text-white hover:bg-[#14532D] transition-all rounded shadow-md hover:shadow-lg"
                >
                  Workspace
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-mono-label text-xs uppercase tracking-widest font-bold text-[#0F172A] hover:text-[#166534] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="font-mono-label text-xs uppercase tracking-widest font-bold px-5 py-2.5 bg-gradient-to-r from-[#166534] to-[#14532D] text-white hover:opacity-95 transition-all rounded shadow-md hover:shadow-lg"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================ HERO =============================== */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#166534]/10 border border-[#166534]/25 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[#166534] animate-pulse" />
              <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-[#166534] font-bold">
                Field to buyer — direct trade
              </p>
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-[3.8rem] leading-[1.08] tracking-tight text-[#020617]">
              The ledger for your{' '}
              <span className="relative inline-block italic font-bold bg-gradient-to-r from-[#166534] via-[#22C55E] to-[#15803D] bg-clip-text text-transparent drop-shadow-sm">
                whole harvest.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#334155] font-medium max-w-md leading-relaxed">
              List crops, take orders from verified buyers, and track every sale —
              in one dashboard built for how modern agriculture runs.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#166534] via-[#14532D] to-[#052E16] text-white px-7 py-4 rounded shadow-xl shadow-[#166534]/25 font-mono-label text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-all"
              >
                <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="font-mono-label text-xs uppercase tracking-widest font-bold text-[#0F172A] hover:text-[#166534] px-4 py-3.5 border border-[#0F172A]/10 hover:border-[#166534]/30 rounded transition-all bg-white/50"
                >
                  I already trade here
                </Link>
              )}
            </div>
          </div>

          {/* Framed Field Photo */}
          <div className="relative mx-auto lg:mx-0 max-w-sm w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#166534] to-[#22C55E] rounded-2xl rotate-6 blur-xl opacity-35 transform scale-95" />
            <div className="relative pin rotate-[2deg] transition-transform hover:rotate-0 duration-300">
              <div className="p-3.5 bg-white shadow-2xl border border-[#166534]/20 rounded-xl">
                <img
                  src="https://img.magnific.com/free-photo/happy-cheerful-african-american-farm-worker-holding-crate-full-local-eco-friendly-ripe-leafy-greens-from-sustainable-crop-harvest-entrepreneurial-bio-permaculture-greenhouse-farm_482257-64585.jpg?semt=ais_test_b&w=740&q=80"
                  alt="Crops ready for trade on Acreage"
                  className="w-full h-80 object-cover rounded-lg"
                />
                <div className="pt-3.5 pb-1 flex items-center justify-between px-1">
                  <p className="font-mono-label text-[11px] uppercase tracking-widest text-[#0F172A] font-bold">
                    Acreage Field — vol. 04
                  </p>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#166534]" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-3 -left-3 px-4 py-2 bg-gradient-to-r from-[#166534] to-[#052E16] text-white rounded shadow-lg -rotate-3 border border-white/20">
              <p className="font-mono-label text-[10px] uppercase tracking-widest font-bold">Verified Seller</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ MARKET TICKER =========================== */}
      <section className="relative border-y border-[#166534]/20 bg-gradient-to-r from-[#DCFCE7] via-[#E2E8F0] to-[#DCFCE7] overflow-hidden shadow-inner">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center gap-8">
          <div className="flex items-center gap-2 shrink-0 font-mono-label text-[11px] font-bold uppercase tracking-widest text-[#166534] bg-white/90 px-3.5 py-1.5 rounded-md border border-[#166534]/20 shadow-sm">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E]" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[#166534]" />
            </span>
            Market board
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max ticker-track">
              {[...MARKET_ROWS, ...MARKET_ROWS].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 font-mono-label text-xs px-6 border-r border-[#0F172A]/15 shrink-0"
                >
                  <span className="text-[#020617] font-bold tracking-wide">{row.crop}</span>
                  <span className="text-[#475569] font-bold text-[10px]">{row.unit}</span>
                  <span className="text-[#0F172A] font-bold">{row.price}</span>
                  <span className={`font-bold ${row.up ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                    {row.up ? '▲' : '▼'} {row.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== STEPS ================================ */}
      <section className="bg-white text-[#0F172A] py-24 relative border-b border-[#166534]/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-[#166534] font-bold mb-2">
              Simple Workflow
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#020617]">
              How a season moves through Acreage
            </h2>
            <p className="text-[#334155] font-medium mt-3 text-base">
              Three seamless steps, from what's in the ground to money in your account.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="group relative bg-[#F8FAFC] p-8 rounded-xl border-2 border-[#166534]/15 hover:border-[#166534]/50 hover:shadow-2xl hover:shadow-[#166534]/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono-label text-xs font-bold text-[#166534] bg-[#166534]/10 px-3.5 py-1 rounded-full border border-[#166534]/20">
                      STEP {step.n}
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#166534]/30 group-hover:bg-[#166534] transition-colors" />
                  </div>

                  <h3 className="font-display font-bold text-2xl mb-3 text-[#020617]">
                    {step.title}
                  </h3>
                  <p className="text-[#334155] font-medium text-sm leading-relaxed mb-6">
                    {step.body}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#166534]/15 space-y-2.5">
                  {step.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs font-mono-label font-bold text-[#0F172A]">
                      <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FIELD OPERATIONS SHOWCASE ================= */}
      <section className="bg-gradient-to-b from-[#F8FAFC] via-[#F0FDF4] to-[#F8FAFC] py-20 border-b border-[#166534]/10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-[#166534]/20 group">
            <img
              src="https://as2.ftcdn.net/v2/jpg/20/35/00/49/1000_F_2035004950_iUoTAxq2iWjDHU07RKd1vp6MWpkxRJ3e.jpg"
              alt="Tractor working green field"
              className="w-full h-80 sm:h-96 object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/80 via-transparent to-transparent flex items-end p-6">
              <div className="text-white">
                <div className="flex items-center gap-2 font-mono-label text-xs text-[#36c46a] font-bold uppercase tracking-widest mb-1">
                  <Tractor className="w-4 h-4" /> Operations Management
                </div>
                <p className="font-display font-bold text-xl">Powering Large Scale Produce</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-[#166534] font-bold">
              Field Machinery & Production
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#020617] leading-tight">
              Built for commercial farms and regional supply chains
            </h2>
            <p className="text-[#334155] font-medium leading-relaxed">
              Whether you manage small outgrower networks or tractor-plowed commercial acres, Acreage scales with your operational throughput.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white rounded-lg border border-[#166534]/20 shadow-sm">
                <p className="font-mono-label text-xs font-bold text-[#166534] uppercase">Bulk Orders</p>
                <p className="text-sm font-semibold text-[#0F172A] mt-1">Direct enterprise purchase contracts</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-[#166534]/20 shadow-sm">
                <p className="font-mono-label text-xs font-bold text-[#166534] uppercase">Yield Schedules</p>
                <p className="text-sm font-semibold text-[#0F172A] mt-1">Predictive seasonal harvest planning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== FEATURES =============================== */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-[#166534] font-bold mb-2">
            Built For Scale
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#020617]">
            Everything the trade needs, nothing it doesn't
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, body, tag }) => (
            <div
              key={title}
              className="group relative bg-white p-8 rounded-xl border-2 border-[#166534]/15 hover:border-[#166534]/40 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#166534] to-[#052E16] text-white flex items-center justify-center shadow-lg shadow-[#166534]/20">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="font-mono-label text-[10px] font-bold uppercase tracking-wider text-[#166534] bg-[#166534]/10 px-3 py-1 rounded border border-[#166534]/20">
                  {tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-xl mb-2 text-[#020617]">{title}</h3>
              <p className="text-[#334155] font-medium text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================ CTA ================================== */}
      <section className="relative mx-6 my-12 max-w-6xl lg:mx-auto rounded-2xl overflow-hidden bg-gradient-to-r from-[#052E16] via-[#166534] to-[#052E16] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#22C55E]/30 via-transparent to-transparent pointer-events-none" />
        <div className="px-8 py-16 sm:px-12 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="max-w-xl">
            <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-[#4ADE80] mb-3 font-bold">
              Get Started Today
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
              Bring your harvest to the ledger. 
               <span className='block text-green-400 mt-2'>Be Today, Be Nature!</span>
            </h2>
            <p className="mt-3 text-white/90 text-sm sm:text-base font-medium leading-relaxed">
              Join local merchants and verified buyers organizing modern agriculture.
            </p>
          </div>
          <Link
            to={user ? '/dashboard' : '/register'}
            className="group inline-flex items-center gap-2 bg-white text-[#166534] px-8 py-4 rounded font-mono-label text-xs uppercase tracking-widest font-bold hover:bg-[#F0FDF4] transition-all shrink-0 shadow-xl"
          >
            <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* =============================== FOOTER ================================ */}
      <footer className="border-t border-[#166534]/15 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[#166534]" />
            <p className="font-mono-label text-xs text-[#0F172A] font-bold tracking-wide">
              © 2026 Acreage — grown for the local trade.
            </p>
          </div>
          <div className="flex gap-6 font-mono-label text-xs font-bold uppercase tracking-widest text-[#0F172A]/70">
            <a href="#privacy" className="hover:text-[#166534] transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-[#166534] transition-colors">Terms</a>
            <a href="#support" className="hover:text-[#166534] transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}