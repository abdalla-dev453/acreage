import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Handshake,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  Tractor
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import PremiumSiteNav from '../components/common/PremiumSiteNav';
import PremiumFooter from '../components/common/PremiumFooter';

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
    <div className="site-shell home-page">
      <SEO
        title="Acreage | Digital Agriculture Marketplace"
        description="Connect with verified farmers and buyers. List crops, take orders, track sales, and settle via M-Pesa — all in one platform built for modern agriculture."
      />

      {/* The landing page shares the global bar so the product reads as one
          site, not a marketing page bolted in front of the app. */}
      <PremiumSiteNav />

      <main className="site-main home-main">
      <style>{`
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
      `}</style>

      {/* ================================ HERO =============================== */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 sm:gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-stone border border-brand-sand mb-5 sm:mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-forest" />
              <p className="font-mono-label text-[11px] uppercase tracking-[0.2em] text-brand-forest font-bold">
                Field to buyer — direct trade
              </p>
            </div>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-[3.8rem] leading-[1.1] tracking-tight text-brand-charcoal">
              The ledger for your{' '}
              <span className="italic font-bold text-brand-forest">
                whole harvest.
              </span>
            </h1>

            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-brand-muted font-medium max-w-md leading-relaxed">
              List crops, take orders from verified buyers, and track every sale —
              in one dashboard built for how modern agriculture runs.
            </p>

            <div className="mt-8 sm:mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="group inline-flex items-center gap-2 bg-brand-amber hover:bg-brand-amber-deep text-white px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl shadow-cta hover:shadow-cta-hover font-mono-label text-xs uppercase tracking-widest font-bold transition-all"
              >
                <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="font-mono-label text-xs uppercase tracking-widest font-bold text-brand-charcoal hover:text-brand-forest px-4 py-3 sm:py-3.5 border border-brand-sand hover:border-brand-forest/40 rounded-xl transition-all bg-white"
                >
                  I already trade here
                </Link>
              )}
            </div>
          </div>

          {/* Framed Field Photo */}
          <div className="relative mx-auto lg:mx-0 max-w-sm w-full">
            <div className="p-3.5 bg-white border border-brand-sand rounded-xl shadow-premium-lg">
              <img
                src="https://img.magnific.com/free-photo/happy-cheerful-african-american-farm-worker-holding-crate-full-local-eco-friendly-ripe-leafy-greens-from-sustainable-crop-harvest-entrepreneurial-bio-permaculture-greenhouse-farm_482257-64585.jpg?semt=ais_test_b&w=740&q=80"
                alt="Crops ready for trade on Acreage"
                className="w-full h-72 sm:h-80 object-cover rounded-lg"
              />
              <div className="pt-3.5 pb-1 flex items-center justify-between px-1">
                <p className="font-mono-label text-[11px] uppercase tracking-widest text-brand-charcoal font-bold">
                  Acreage Field — vol. 04
                </p>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-forest" />
              </div>
            </div>
            <div className="absolute -bottom-3 -left-3 px-4 py-2 bg-brand-olive text-white rounded-lg shadow-premium-lg border border-white/20">
              <p className="font-mono-label text-[10px] uppercase tracking-widest font-bold">Verified Seller</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ MARKET TICKER =========================== */}
      <section className="relative border-y border-brand-sand bg-brand-stone overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2 shrink-0 font-mono-label text-[11px] font-bold uppercase tracking-widest text-brand-forest bg-white px-3 sm:px-3.5 py-1.5 rounded-md border border-brand-sand shadow-sm">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-olive/70" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-brand-forest" />
            </span>
            Market board
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="flex w-max ticker-track">
              {[...MARKET_ROWS, ...MARKET_ROWS].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 font-mono-label text-xs px-6 border-r border-brand-sand shrink-0"
                >
                  <span className="text-brand-charcoal font-bold tracking-wide">{row.crop}</span>
                  <span className="text-brand-muted font-bold text-[10px]">{row.unit}</span>
                  <span className="text-brand-charcoal font-bold">{row.price}</span>
                  <span className={`font-bold ${row.up ? 'text-brand-olive' : 'text-brand-brick'}`}>
                    {row.up ? '▲' : '▼'} {row.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== STEPS ================================ */}
      <section className="bg-white text-brand-charcoal py-16 sm:py-24 relative border-b border-brand-sand transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl mb-12 sm:mb-16">
            <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-brand-forest font-bold mb-2">
              Simple Workflow
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-charcoal">
              How a season moves through Acreage
            </h2>
            <p className="text-brand-muted font-medium mt-3 text-sm sm:text-base">
              Three seamless steps, from what's in the ground to money in your account.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="group relative bg-brand-stone p-6 sm:p-8 rounded-2xl border border-brand-sand hover:shadow-premium-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <span className="font-mono-label text-xs font-bold text-brand-forest bg-brand-forest/8 px-3.5 py-1 rounded-full border border-brand-forest/15">
                      STEP {step.n}
                    </span>
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-olive/40 group-hover:bg-brand-forest transition-colors" />
                  </div>

                  <h3 className="font-display font-bold text-xl sm:text-2xl mb-2 sm:mb-3 text-brand-charcoal">
                    {step.title}
                  </h3>
                  <p className="text-brand-muted font-medium text-xs sm:text-sm leading-relaxed mb-6">
                    {step.body}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-sand space-y-2.5">
                  {step.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs font-mono-label font-bold text-brand-charcoal">
                      <CheckCircle2 className="w-4 h-4 text-brand-olive shrink-0" />
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
      <section className="bg-brand-stone py-16 sm:py-20 border-b border-brand-sand transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden shadow-premium-lg border border-brand-sand group">
            <img
              src="https://as2.ftcdn.net/v2/jpg/20/35/00/49/1000_F_2035004950_iUoTAxq2iWjDHU07RKd1vp6MWpkxRJ3e.jpg"
              alt="Tractor working green field"
              className="w-full h-72 sm:h-96 object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-brand-charcoal/45 flex items-end p-6">
              <div className="text-white">
                <div className="flex items-center gap-2 font-mono-label text-xs text-brand-sand font-bold uppercase tracking-widest mb-1">
                  <Tractor className="w-4 h-4" /> Operations Management
                </div>
                <p className="font-display font-bold text-lg sm:text-xl">Powering Large Scale Produce</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <span className="font-mono-label text-xs uppercase tracking-[0.2em] text-brand-forest font-bold">
              Field Machinery & Production
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-charcoal leading-tight">
              Built for commercial farms and regional supply chains
            </h2>
            <p className="text-brand-muted font-medium leading-relaxed text-sm sm:text-base">
              Whether you manage small outgrower networks or tractor-plowed commercial acres, Acreage scales with your operational throughput.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="p-4 bg-white rounded-xl border border-brand-sand shadow-sm">
                <p className="font-mono-label text-xs font-bold text-brand-forest uppercase">Bulk Orders</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">Direct enterprise purchase contracts</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-brand-sand shadow-sm">
                <p className="font-mono-label text-xs font-bold text-brand-forest uppercase">Yield Schedules</p>
                <p className="text-sm font-semibold text-brand-charcoal mt-1">Predictive seasonal harvest planning</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== FEATURES =============================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-brand-forest font-bold mb-2">
            Built For Scale
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-charcoal">
            Everything the trade needs, nothing it doesn't
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {FEATURES.map(({ icon: Icon, title, body, tag }) => (
            <div
              key={title}
              className="group relative bg-white p-6 sm:p-8 rounded-2xl border border-brand-sand hover:shadow-premium-lg transition-all"
            >
              <div className="flex items-center justify-between mb-5 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-forest text-white flex items-center justify-center shadow-forest">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
                <span className="font-mono-label text-[10px] font-bold uppercase tracking-wider text-brand-forest bg-brand-stone px-3 py-1 rounded-full border border-brand-sand">
                  {tag}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg sm:text-xl mb-2 text-brand-charcoal">{title}</h3>
              <p className="text-brand-muted font-medium text-xs sm:text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================ CTA ================================== */}
      <section className="relative mx-4 sm:mx-6 my-10 sm:my-12 max-w-6xl lg:mx-auto rounded-3xl overflow-hidden bg-brand-forest text-white shadow-premium-xl">
        <div className="px-6 py-12 sm:px-12 sm:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8 relative z-10">
          <div className="max-w-xl">
            <p className="font-mono-label text-xs uppercase tracking-[0.2em] text-brand-sand mb-2 sm:mb-3 font-bold">
              Get Started Today
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl leading-tight">
              Bring your harvest to the ledger.
            </h2>
            <p className="mt-2.5 sm:mt-3 text-white/85 text-xs sm:text-base font-medium leading-relaxed">
              Join local merchants and verified buyers organizing modern agriculture.
            </p>
          </div>
          <Link
            to={user ? '/dashboard' : '/register'}
            className="group inline-flex items-center gap-2 bg-brand-amber hover:bg-brand-amber-deep text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-mono-label text-xs uppercase tracking-widest font-bold transition-all shrink-0 shadow-cta hover:shadow-cta-hover"
          >
            <span>{user ? 'Open your dashboard' : 'Create merchant account'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* =============================== FOOTER ================================ */}
      </main>

      <PremiumFooter />
    </div>
  );
}
