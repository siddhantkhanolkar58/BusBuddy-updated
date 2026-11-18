import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { useFetch } from '../../lib/useLive.js';
import { plural } from '../../lib/format.js';
import { EmptyState, ErrorNote, Loading } from '../../components/ui.jsx';
import { BookingModal } from '../../components/BookingModal.jsx';

function BusGlyph({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" d="M5 16V7.5C5 5.57 8.13 4 12 4s7 1.57 7 3.5V16" />
      <path strokeLinecap="round" d="M5 10h14M7 16v2m10-2v2M7.5 19h1m7 0h1" />
      <circle cx="8" cy="14" r="1" /><circle cx="16" cy="14" r="1" />
    </svg>
  );
}

function ArrowIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function SwapIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function MapPinIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

export function Home() {
  const { user } = useAuth();
  const [fromStop, setFromStop] = useState('');
  const [toStop, setToStop] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [bookingTargetRoute, setBookingTargetRoute] = useState(null);

  // General search query
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('routes');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim()), 200);
    return () => clearTimeout(timer);
  }, [term]);

  const stops = useFetch('/api/stops');
  const routes = useFetch('/api/routes');
  const favourites = useFetch('/api/favourites', { enabled: Boolean(user) });

  const allRoutes = routes.data?.routes || [];
  const allStops = stops.data?.stops || [];

  // Swap From / To
  const handleSwap = () => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setSearchTriggered(true);
    if (fromStop || toStop) {
      setTerm(fromStop || toStop);
      setKind('routes');
    }
  };

  // Filter routes based on search inputs
  const displayedRoutes = allRoutes.filter((r) => {
    if (activeFilter === 'express') return r.code.includes('1') || r.name.toLowerCase().includes('express');
    if (activeFilter === 'city') return r.code.includes('2') || r.name.toLowerCase().includes('cross');
    if (activeFilter === 'airport') return r.code.includes('3') || r.name.toLowerCase().includes('viman');
    if (query) {
      return (
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.code.toLowerCase().includes(query.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(query.toLowerCase()))
      );
    }
    return true;
  });

  return (
    <div className="busbuddy-home space-y-10 pb-16">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-indigo-900 text-white shadow-xl px-5 py-10 sm:p-12 lg:p-16">
        {/* Decorative background grid and ambient lighting */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 size-96 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-20 size-80 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 border border-white/10">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            Smart City Transit · Real-time Tracking
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
            Your journey,<br />
            <span className="text-amber-400">made simpler.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-xl font-normal leading-relaxed">
            Find your bus, reserve seats in advance, and track live arrival estimates at every stop with zero guesswork.
          </p>
        </div>

        {/* ── INTERACTIVE TRAVEL SEARCH CARD ── */}
        <div className="relative z-20 mt-8 rounded-3xl bg-white p-4 sm:p-6 shadow-2xl text-slate-800 border border-slate-100 max-w-4xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* FROM Input */}
              <div className="md:col-span-4 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5" htmlFor="fromStop">
                  <MapPinIcon className="size-3.5 text-brand-600" /> From
                </label>
                <div className="relative">
                  <input
                    id="fromStop"
                    type="text"
                    list="stops-list"
                    value={fromStop}
                    onChange={(e) => setFromStop(e.target.value)}
                    placeholder="Origin stop (e.g. Shivajinagar)"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              {/* SWAP BUTTON */}
              <div className="md:col-span-1 flex justify-center pt-2 md:pt-4">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="size-10 rounded-full border border-slate-200 bg-white hover:bg-brand-50 text-brand-700 shadow-sm flex items-center justify-center transition active:scale-90"
                  title="Swap origin and destination"
                  aria-label="Swap locations"
                >
                  <SwapIcon />
                </button>
              </div>

              {/* TO Input */}
              <div className="md:col-span-4 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5" htmlFor="toStop">
                  <MapPinIcon className="size-3.5 text-amber-500" /> To
                </label>
                <div className="relative">
                  <input
                    id="toStop"
                    type="text"
                    list="stops-list"
                    value={toStop}
                    onChange={(e) => setToStop(e.target.value)}
                    placeholder="Destination (e.g. Hinjawadi)"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              {/* DATE PICKER */}
              <div className="md:col-span-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5" htmlFor="travelDate">
                  <CalendarIcon className="size-3.5 text-brand-600" /> Travel Date
                </label>
                <input
                  id="travelDate"
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm font-semibold text-slate-900 focus:border-brand-600 focus:bg-white focus:outline-none transition shadow-sm"
                />
              </div>
            </div>

            {/* Datalist for autocomplete */}
            <datalist id="stops-list">
              {allStops.map((s) => (
                <option key={s.id} value={s.name}>{s.code} - {s.name}</option>
              ))}
            </datalist>

            {/* ACTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheckIcon className="size-4 text-emerald-600" />
                <span>Instant seat booking · No surge pricing</span>
              </div>

              <div className="flex items-center gap-2">
                {(fromStop || toStop || query) && (
                  <button
                    type="button"
                    onClick={() => { setFromStop(''); setToStop(''); setTerm(''); setQuery(''); setSearchTriggered(false); }}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
                >
                  <BusGlyph className="size-4" />
                  <span>Search Buses</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── 2. FILTER PILLS & CATEGORIES ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'All Bus Routes' },
            { id: 'express', label: '⚡ IT Express' },
            { id: 'city', label: '🏙️ Cross-City Links' },
            { id: 'airport', label: '✈️ Airport Line' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveFilter(tab.id); setQuery(''); }}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-brand-700 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {displayedRoutes.length} active {plural(displayedRoutes.length, 'service')}
        </span>
      </div>

      {/* ── 3. SEARCH RESULTS & AVAILABLE SERVICES ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-brand-700">Available Services</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {searchTriggered ? 'Matching Bus Services' : 'Recommended Buses & Routes'}
            </h2>
          </div>
          <Link to="/admin/network" className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1">
            View Live Network Map <ArrowIcon />
          </Link>
        </div>

        {routes.loading && !routes.data ? (
          <Loading label="Finding available buses" rows={3} />
        ) : displayedRoutes.length === 0 ? (
          <EmptyState
            title="No matching bus routes found"
            action={
              <button
                type="button"
                onClick={() => { setFromStop(''); setToStop(''); setActiveFilter('all'); setQuery(''); }}
                className="btn-primary mt-2"
              >
                Reset Filters
              </button>
            }
          >
            Try searching for Pune corridors like Hinjawadi, Katraj, Kharadi, or Swargate.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedRoutes.map((route) => {
              const originStop = route.name.split('—')?.[0]?.trim() || 'Origin';
              const destStop = route.name.split('—')?.[1]?.trim() || 'Destination';
              const hasActiveBus = route.activeTrips > 0;

              return (
                <div
                  key={route.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all space-y-4 hover:border-brand-300 relative overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-xl bg-brand-700 text-white font-mono font-bold text-sm px-2.5 py-1 shadow-sm">
                        {route.code}
                      </span>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-brand-700 transition">
                          {route.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{route.description || 'City express transit corridor'}</p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      hasActiveBus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`size-1.5 rounded-full ${hasActiveBus ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      {hasActiveBus ? `${route.activeTrips} Live Now` : 'Scheduled'}
                    </span>
                  </div>

                  {/* Journey Visualizer */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Departure</span>
                      <strong className="text-slate-800 text-sm block truncate max-w-[130px]">{originStop}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">Regular intervals</span>
                    </div>

                    <div className="flex-1 px-4 text-center">
                      <span className="text-[10px] font-bold text-brand-700 block uppercase tracking-wider">
                        {plural(route.stopCount, 'stop')}
                      </span>
                      <div className="relative flex items-center justify-center my-1">
                        <div className="h-0.5 w-full bg-slate-200" />
                        <BusGlyph className="size-4 text-brand-600 absolute bg-slate-50 px-0.5" />
                      </div>
                      <span className="text-[10px] text-slate-400">Direct Express</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Arrival</span>
                      <strong className="text-slate-800 text-sm block truncate max-w-[130px]">{destStop}</strong>
                      <span className="text-slate-500 font-mono text-[11px]">End of line</span>
                    </div>
                  </div>

                  {/* Fare & Booking CTAs */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fare from</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">₹40</span>
                        <span className="text-xs text-slate-400 font-medium">/ seat</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/routes/${route.id}`}
                        className="btn-ghost text-xs py-2 px-3 font-bold rounded-xl"
                      >
                        View Stops
                      </Link>
                      <button
                        type="button"
                        onClick={() => setBookingTargetRoute(route)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 text-xs shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                      >
                        <span>Book Seat</span>
                        <ArrowIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. SAVED QUICK ACCESS (For signed-in users) ── */}
      {user && favourites.data?.favourites?.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-brand-700">Quick Access</span>
              <h3 className="text-lg font-bold text-slate-900">Your Favourites & Alerts</h3>
            </div>
            <Link to="/saved" className="text-xs font-bold text-brand-700 hover:underline">
              View All ({favourites.data.favourites.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {favourites.data.favourites.slice(0, 3).map((f) => (
              <Link
                key={f.id}
                to={`/stops/${f.stopId}?routeId=${f.routeId}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-md transition"
              >
                <span className="rounded-xl bg-brand-50 text-brand-700 font-mono font-bold text-xs size-10 grid place-items-center">
                  {f.routeCode}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-slate-900 truncate">{f.stopName}</strong>
                  <span className="text-xs text-slate-400 truncate block">{f.routeName}</span>
                </div>
                <ArrowIcon className="size-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 5. LIVE NETWORK FEATURE CARD ── */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-lg">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider">
            Live Vehicle Tracking
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Know exactly when your bus is pulling in.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            BusBuddy computes arrival estimates from live driver check-ins along each route segment, giving you real arrival times rather than paper timetables.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-white">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" /> Real-time ETA
            </span>
            <span className="flex items-center gap-1.5 text-white">
              <span className="size-2 rounded-full bg-amber-400" /> Crowding Indicator
            </span>
            <span className="flex items-center gap-1.5 text-white">
              <span className="size-2 rounded-full bg-brand-400" /> Mobile Boarding Pass
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <Link
            to="/admin/network"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3.5 text-sm shadow-lg shadow-brand-500/30 transition active:scale-95"
          >
            <BusGlyph className="size-5 text-amber-400" />
            <span>Open Network Map</span>
            <ArrowIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── BOOKING MODAL POPUP ── */}
      {bookingTargetRoute && (
        <BookingModal
          route={bookingTargetRoute}
          initialFrom={fromStop}
          initialTo={toStop}
          onClose={() => setBookingTargetRoute(null)}
          onBooked={() => {}}
        />
      )}
    </div>
  );
}

export default Home;
