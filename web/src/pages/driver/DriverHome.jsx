import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useFetch } from '../../lib/useLive.js';
import { clockTime, dateTime, percent, plural } from '../../lib/format.js';
import { EmptyState, ErrorNote, Loading, Section } from '../../components/ui.jsx';

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800 font-bold',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function DriverHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const active = useFetch('/api/driver/active-trip');
  const assignments = useFetch('/api/driver/assignments');
  const recent = useFetch('/api/driver/trips', { params: { limit: 8 } });
  const buses = useFetch('/api/driver/buses');

  const [starting, setStarting] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [error, setError] = useState(null);

  const start = async (routeId) => {
    setStarting(routeId);
    setError(null);
    try {
      const payload = { routeId };
      if (selectedBusId) {
        payload.bus_id = Number(selectedBusId);
      }
      const created = await api.post('/api/driver/trips', payload);
      navigate(`/driver/trips/${created.trip.tripId}`);
    } catch (err) {
      setError(err);
      await active.reload();
    } finally {
      setStarting(null);
    }
  };

  const running = active.data?.trip ?? null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Driver Cockpit Header */}
      <header className="rounded-3xl bg-gradient-to-r from-brand-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400">Driver Shift Operations</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hello, {user?.name?.split(' ')[0] || 'Driver'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-md">
            Your stop check-ins broadcast live arrival predictions directly to commuters waiting along the route.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-white/10 backdrop-blur-sm px-3.5 py-2 text-xs font-bold text-amber-300 border border-white/10">
            {running ? '🚨 Trip Active' : '🟢 Ready for Shift'}
          </span>
        </div>
      </header>

      <ErrorNote error={error} />

      {active.loading && !active.data ? <Loading label="Checking shift status" /> : null}

      {/* ── ACTIVE TRIP IN PROGRESS ── */}
      {running ? (
        <Section title="Current Active Trip" subtitle="Resume your ongoing shift with one tap">
          <Link
            to={`/driver/trips/${running.tripId}`}
            className="rounded-3xl border-2 border-brand-500 bg-brand-50/70 hover:bg-brand-50 p-6 block shadow-lg shadow-brand-500/10 transition group"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="size-12 rounded-2xl bg-brand-700 text-white font-mono font-black text-base grid place-items-center shadow-md">
                  {running.routeCode}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-brand-700 transition">
                    {running.routeName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Shift started at <strong>{clockTime(running.startedAt)}</strong> ·{' '}
                    {plural(active.data.checkins.length, 'stop')} logged
                    {active.data.nextStop ? ` · Next stop: ${active.data.nextStop.stopName}` : ''}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-sm shadow-md transition active:scale-95">
                <span>Resume Cockpit</span> →
              </span>
            </div>
          </Link>
        </Section>
      ) : (
        /* ── START A TRIP ── */
        <Section title="Start a New Trip" subtitle="Assign your vehicle and pick an authorized route">
          {assignments.loading && !assignments.data ? <Loading /> : null}
          <ErrorNote error={assignments.error} onRetry={assignments.reload} />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            {/* Bus selector */}
            {buses.data?.buses?.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="bus-select" className="label" style={{ marginBottom: 0 }}>
                  Assigned Bus Vehicle
                </label>
                <select
                  id="bus-select"
                  className="field max-w-md"
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                >
                  <option value="">-- Select fleet bus (Optional) --</option>
                  {buses.data.buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.registrationNo} — {bus.model}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {assignments.data?.routes?.length === 0 ? (
              <EmptyState title="No assigned routes found">
                An administrator assigns your driving routes. Please contact fleet dispatch.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Available Assigned Routes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignments.data?.routes?.map((route) => (
                    <div
                      key={route.id}
                      className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3 hover:border-brand-300 transition bg-slate-50/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-xl bg-brand-700 text-white font-mono font-bold text-xs size-9 grid place-items-center">
                          {route.code}
                        </span>
                        <div>
                          <strong className="block text-sm text-slate-900">{route.name}</strong>
                          <span className="text-xs text-slate-500">{plural(route.stopCount, 'stop')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-primary py-2 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border-0 shadow-sm"
                        disabled={starting !== null}
                        onClick={() => start(route.id)}
                      >
                        {starting === route.id ? 'Starting…' : 'Start Trip'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── RECENT TRIPS ── */}
      <Section title="Recent Shift History" subtitle="Your recent check-in logs and completed runs">
        {recent.data?.trips?.length === 0 ? (
          <EmptyState title="No completed trips recorded yet">
            Your shift logs will accumulate here as you complete trips.
          </EmptyState>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recent.data?.trips?.map((trip) => {
                const completion =
                  trip.stopCount > 0
                    ? percent(Math.min(1, trip.checkinCount / trip.stopCount))
                    : '—';
                return (
                  <div key={trip.tripId} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
                        {trip.routeCode}
                      </span>
                      <div>
                        <strong className="text-sm text-slate-800 block">{trip.routeName}</strong>
                        <span className="text-xs text-slate-400">
                          {dateTime(trip.startedAt)} · {trip.checkinCount}/{trip.stopCount} stops logged ({completion})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[trip.status] ?? 'bg-slate-100'}`}>
                        {trip.status}
                      </span>
                      <Link to={`/trips/${trip.tripId}`} className="text-xs font-bold text-brand-700 hover:underline">
                        Review →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

export default DriverHome;
