import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  ArrowRight,
  Handshake,
  BarChart3,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';


// ---------------------------------------------------------------------------
// Sample market data for the ticker. Wire this up to your real pricing feed
// when it's ready — the shape (crop / unit / price / delta / up) is all the
// component needs.
// ---------------------------------------------------------------------------
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
  },
  {
    n: '02',
    title: 'Match with buyers',
    body: 'Verified buyers browse live listings and place orders directly. You set the price, you accept the order.',
  },
  {
    n: '03',
    title: 'Settle & track',
    body: 'Every sale, payout and crop activity lands in one dashboard — so your season is never a guessing game.',
  },
];

const FEATURES = [
  {
    icon: Handshake,
    title: 'Direct trade',
    body: 'Sell straight to buyers. No brokers taking a cut of a season you did the work for.',
  },
  {
    icon: BarChart3,
    title: 'Farm analytics',
    body: 'Yield, revenue and order trends laid out plainly — know what worked before the next planting.',
  },
  {
    icon: ClipboardList,
    title: 'Crop & order ledger',
    body: 'One running record of every activity, order and sale, searchable by crop or season.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified accounts',
    body: 'Every merchant and buyer on Acreage is checked, so a deal made here is a deal you can trust.',
  },
];

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-white text-[#1E1B16] font-[Inter,sans-serif] antialiased">
      {/* Font setup: add these once to your index.html <head> for best performance.
          A fallback @import is included below so this component works either way. */}
      <style>{`
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
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%, #FDBA74, #C2410C);
          box-shadow: 0 2px 3px rgba(0,0,0,0.25);
        }
      `}</style>

      {/* ============================== HEADER ============================== */}
      <header className="relative z-20 border-b border-[#EA580C]/15">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3 select-none">
            <div className="w-9 h-9 rounded-sm bg-[#EA580C] text-white flex items-center justify-center -rotate-6 shadow-[0_2px_0_rgba(0,0,0,0.15)]">
              <Sprout className="w-5 h-5 stroke-[2.4]" />
            </div>
            <span className="font-display font-semibold text-lg tracking-wide">
              Acreage
            </span>
          </div>

          <div className="flex items-center gap-5">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline-block font-mono-label text-[11px] text-[#1E1B16]/50 tracking-wide">
                  @{user.username}
                </span>
                <Link
                  to="/dashboard"
                  className="font-mono-label text-xs uppercase tracking-widest px-4 py-2 border border-[#EA580C] text-[#EA580C] hover:bg-[#EA580C] hover:text-white transition-colors rounded-sm"
                >
                  Workspace
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-mono-label text-xs uppercase tracking-widest text-[#1E1B16]/60 hover:text-[#1E1B16] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="font-mono-label text-xs uppercase tracking-widest px-4 py-2 border border-[#EA580C] text-[#EA580C] hover:bg-[#EA580C] hover:text-white transition-colors rounded-sm"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================ HERO =============================== */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="font-mono-label text-[11px] uppercase tracking-[0.25em] text-[#EA580C] mb-6">
              [ Field to buyer — direct trade ]
            </p>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.05] tracking-tight text-[#1E1B16]">
              The ledger for your
              <br />
              <span className="italic font-medium text-[#EA580C]">whole</span> harvest.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[#1E1B16]/60 max-w-md leading-relaxed">
              List crops, take orders from verified buyers, and track every sale —
              in one place built for how a farm actually runs.
            </p>

            <div className="mt-9 flex items-center gap-5">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="group inline-flex items-center gap-2 bg-[#EA580C] text-white px-6 py-3.5 rounded-sm font-mono-label text-xs uppercase tracking-widest font-medium hover:bg-[#C2410C] transition-colors"
              >
                <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="font-mono-label text-xs uppercase tracking-widest text-[#1E1B16]/50 hover:text-[#1E1B16] transition-colors"
                >
                  I already trade here
                </Link>
              )}
            </div>
          </div>

          {/* Framed field photo */}
          <div className="relative mx-auto lg:mx-0 max-w-sm">
            <div className="relative pin rotate-[3deg]">
              <div className="p-3 bg-white shadow-2xl border border-[#EA580C]/10 rounded-[2px]">
                <img
                  src="https://img.magnific.com/premium-photo/agribusiness-as-agricultural-business-with-food-industry-outline-concept-transparent-background-ma_1041545-42844.jpg?semt=ais_test_b&w=740&q=80"
                  alt="Crops ready for trade on Acreage"
                  className="w-full h-72 object-cover"
                />
                <p className="font-mono-label text-[10px] uppercase tracking-widest text-[#1E1B16]/50 pt-3 pb-1 text-center">
                  Acreage-fields 
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-20 h-8 bg-[#EA580C] -rotate-6 shadow-md" />
          </div>
        </div>
      </section>

      {/* ============================ MARKET TICKER =========================== */}
      <section className="relative border-y border-[#EA580C]/15 bg-[#FFF7ED] overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2 shrink-0 font-mono-label text-[11px] uppercase tracking-widest text-[#EA580C]">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA580C]/50" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[#EA580C]" />
            </span>
            Market board
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max ticker-track">
              {[...MARKET_ROWS, ...MARKET_ROWS].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 font-mono-label text-xs px-6 border-r border-[#1E1B16]/10 shrink-0"
                >
                  <span className="text-[#1E1B16]/70 tracking-wide">{row.crop}</span>
                  <span className="text-[#1E1B16]/35">{row.unit}</span>
                  <span className="text-[#1E1B16]">{row.price}</span>
                  <span className={row.up ? 'text-[#EA580C]' : 'text-[#78716C]'}>
                    {row.up ? '▲' : '▼'} {row.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== STEPS ================================ */}
      <section className="bg-white text-[#1E1B16]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            How a season moves through Acreage
          </h2>
          <p className="text-[#1E1B16]/55 mb-12 max-w-lg">
            Three steps, from what's in the ground to money in your account.
          </p>

          <div className="divide-y divide-[#1E1B16]/10 border-t border-b border-[#1E1B16]/10">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-8 py-8"
              >
                <span className="font-mono-label text-sm text-[#EA580C]">{step.n}</span>
                <div className="grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-8">
                  <h3 className="font-display font-semibold text-xl">{step.title}</h3>
                  <p className="text-[#1E1B16]/60 leading-relaxed max-w-md">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== FEATURES =============================== */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display font-bold text-2xl sm:text-3xl mb-12">
          Everything the trade needs, nothing it doesn't
        </h2>

        <div className="grid sm:grid-cols-2 gap-px bg-[#EA580C]/15">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`bg-white p-8 ${i % 2 === 1 ? 'sm:translate-y-6' : ''}`}
            >
              <Icon className="w-6 h-6 text-[#EA580C] mb-5 stroke-[1.8]" />
              <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
              <p className="text-[#1E1B16]/55 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================ CTA ================================== */}
      <section className="border-t border-[#EA580C]/15 bg-[#FFF7ED]">
        <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <h2 className="font-display font-black text-3xl sm:text-4xl max-w-md leading-tight">
            Bring your harvest to the ledger.
            <span className="block font-bold font-display leading-tight text-orange-600">Be Today, Be Nature</span>
          </h2>
          <Link
            to={user ? '/dashboard' : '/register'}
            className="group inline-flex items-center gap-2 bg-[#EA580C] text-white px-6 py-3.5 rounded-md font-mono-label text-xs uppercase tracking-widest font-medium hover:bg-[#C2410C] transition-colors shrink-0"
          >
            <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* =============================== FOOTER ================================ */}
      <footer className="border-t border-[#EA580C]/15 bg-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono-label text-[11px] text-[#1E1B16]/40 tracking-wide">
            © 2026 Acreage — grown for the local trade.
          </p>
          <div className="flex gap-6 font-mono-label text-[11px] uppercase tracking-widest text-[#1E1B16]/40">
            <a href="#privacy" className="hover:text-[#EA580C] transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-[#EA580C] transition-colors">Terms</a>
            <a href="#support" className="hover:text-[#EA580C] transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}