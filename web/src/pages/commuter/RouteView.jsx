import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveRoute } from '../../lib/useLive.js';
import { clockTime, plural } from '../../lib/format.js';
import RouteMap from '../../components/RouteMap.jsx';
import { TripSummary } from '../../components/EtaCard.jsx';
import IssueReportForm from '../../components/IssueReportForm.jsx';
import { Crumb, EmptyState, ErrorNote, Loading, Section } from '../../components/ui.jsx';
import { BookingModal } from '../../components/BookingModal.jsx';

export function RouteView() {
  const { routeId } = useParams();
  const { data, error, loading, connected, reload } = useLiveRoute(routeId);
  const [highlight, setHighlight] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  if (loading && !data) return <Loading label="Loading the route" />;
  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  const { route, stops, trips } = data;
  const origin = stops[0]?.name || 'Origin';
  const destination = stops[stops.length - 1]?.name || 'Destination';
  const totalOffsetMinutes = Math.round((stops[stops.length - 1]?.scheduledOffsetSeconds || 0) / 60);

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      <Crumb to="/">All routes</Crumb>

      {/* ── HEADER BANNER ── */}
      <header className="rounded-3xl bg-gradient-to-r from-brand-800 via-brand-700 to-indigo-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-white/20 backdrop-blur-md px-3.5 py-1.5 text-lg font-black font-mono text-white shadow-sm border border-white/10">
                {route.code}
              </span>
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">{route.name}</h1>
                {route.description ? (
                  <p className="text-xs sm:text-sm text-white/80 line-clamp-1">{route.description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer ml-auto"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" d="M5 16V7.5C5 5.57 8.13 4 12 4s7 1.57 7 3.5V16" />
                <path strokeLinecap="round" d="M5 10h14M7 16v2m10-2v2M7.5 19h1m7 0h1" />
                <circle cx="8" cy="14" r="1" /><circle cx="16" cy="14" r="1" />
              </svg>
              <span>Book Seat (₹40)</span>
            </button>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Route Termini</span>
              <strong className="text-white text-xs truncate block">{origin} ➔ {destination}</strong>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Stops & Duration</span>
              <strong className="text-white text-xs">{plural(stops.length, 'stop')} · ~{totalOffsetMinutes || 45} mins</strong>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Live Status</span>
              <strong className="text-white text-xs flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${trips.length > 0 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {trips.length === 0 ? 'No active bus' : `${plural(trips.length, 'bus')} running`}
              </strong>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Feed Quality</span>
              <strong className="text-white text-xs">
                {connected ? 'Live Syncing' : 'Polling'}
                {data.generatedAt ? ` (${clockTime(data.generatedAt)})` : ''}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* ── INTERACTIVE ROUTE MAP ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Interactive Route Map</span>
          <span>Hover a stop below to locate on map</span>
        </div>
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-md">
          <RouteMap stops={stops} trips={trips} highlightStopId={highlight} />
        </div>
      </div>

      {/* ── BUSES ON THIS ROUTE NOW ── */}
      <Section title="Active Buses on Route" subtitle="Real-time vehicles reporting check-ins">
        {trips.length === 0 ? (
          <EmptyState title="No active bus running on this route right now">
            Live buses appear here the moment a driver logs into their shift and starts a trip.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <li key={trip.tripId} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                <TripSummary trip={trip}>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <Link
                      to={`/trips/${trip.tripId}`}
                      className="font-bold text-brand-700 hover:underline flex items-center gap-1"
                    >
                      <span>Track this bus stop-by-stop</span> →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setBookingOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 transition text-[11px]"
                    >
                      Reserve Seat
                    </button>
                  </div>
                </TripSummary>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── TIMELINE STYLE STOPS DISPLAY ── */}
      <Section
        title="Route Itinerary & Stops"
        subtitle="Ordered timeline from origin to destination — tap any stop for its arrivals board"
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-200">
            {stops.map((stop, index) => {
              const inbound = trips.filter((trip) => trip.progress.stopsCompleted < stop.seq).length;
              const isOrigin = index === 0;
              const isDest = index === stops.length - 1;
              const offsetMin = Math.round((stop.scheduledOffsetSeconds || 0) / 60);

              return (
                <div
                  key={stop.stopId}
                  className="relative group"
                  onMouseEnter={() => setHighlight(stop.stopId)}
                  onMouseLeave={() => setHighlight(null)}
                >
                  {/* Timeline dot */}
                  <div className={`absolute -left-6 sm:-left-8 top-1.5 size-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-all ${
                    isOrigin
                      ? 'bg-brand-700 text-white ring-4 ring-brand-100'
                      : isDest
                        ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                        : 'bg-white border-2 border-brand-500 text-brand-700 group-hover:scale-125'
                  }`}>
                    {stop.seq}
                  </div>

                  {/* Stop Card */}
                  <Link
                    to={`/stops/${stop.stopId}?routeId=${route.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/60 hover:bg-brand-50/80 border border-transparent hover:border-brand-200 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm sm:text-base font-bold text-slate-900">{stop.name}</strong>
                        {isOrigin && (
                          <span className="rounded bg-brand-100 text-brand-800 text-[10px] font-bold px-1.5 py-0.5">
                            ORIGIN
                          </span>
                        )}
                        {isDest && (
                          <span className="rounded bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5">
                            TERMINUS
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">Code: {stop.code} · Approx +{offsetMin} min from start</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {inbound > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {inbound} Inbound {inbound === 1 ? 'Bus' : 'Buses'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Scheduled stop</span>
                      )}
                      <span className="text-xs font-bold text-brand-700 group-hover:translate-x-1 transition">
                        View Board →
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── REPORT ISSUE ── */}
      <Section title="Commuter Feedback" subtitle="Report a delay, crowding mismatch or map inaccuracy">
        <IssueReportForm routeId={route.id} />
      </Section>

      {/* ── BOOKING MODAL ── */}
      {bookingOpen && (
        <BookingModal
          route={route}
          initialFrom={origin}
          initialTo={destination}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
}

export default RouteView;
