import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { useFetch } from '../../lib/useLive.js';
import { dateTime } from '../../lib/format.js';
import { EmptyState, ErrorNote, Loading, Section } from '../../components/ui.jsx';

const ISSUE_TONE = {
  open: 'bg-amber-100 text-amber-800 border border-amber-200',
  acknowledged: 'bg-brand-100 text-brand-800 border border-brand-200',
  resolved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  dismissed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function NotificationPrompt() {
  const supported = typeof Notification !== 'undefined';
  const [state, setState] = useState(supported ? Notification.permission : 'unsupported');

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        This browser cannot show system notifications, so alerts appear in the app while it is open.
      </p>
    );
  }

  if (state === 'granted') {
    return (
      <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500" />
        System notifications active. You will be alerted before your bus arrives.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <p className="text-xs text-slate-500">
        Notifications are blocked for this site. Alerts appear on-screen while the app is open.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="btn-ghost py-1.5 px-3 text-xs font-bold rounded-xl"
      onClick={() => Notification.requestPermission().then(setState)}
    >
      Enable Arrival Notifications
    </button>
  );
}

export function Saved() {
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'stops' | 'reports'
  const [bookings, setBookings] = useState([]);
  const favourites = useFetch('/api/favourites');
  const alerts = useFetch('/api/alerts');
  const issues = useFetch('/api/issues/mine');
  const [error, setError] = useState(null);

  // Load bookings from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('busbuddy_bookings') || '[]');
      setBookings(stored);
    } catch {
      setBookings([]);
    }
  }, []);

  const removeBooking = (bookingId) => {
    const updated = bookings.filter((b) => b.id !== bookingId);
    setBookings(updated);
    try {
      localStorage.setItem('busbuddy_bookings', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const remove = async (path, refresh) => {
    setError(null);
    try {
      await api.del(path);
      await refresh();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Saved & Bookings</h1>
        <p className="text-sm text-slate-500">Your digital boarding passes, pinned stops and arrival alerts.</p>
      </div>

      <ErrorNote error={error} />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'bg-brand-700 text-white shadow-md shadow-brand-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🎟️ My Bookings</span>
          <span className="rounded-full bg-white/20 text-current text-[11px] px-1.5 py-0.2">
            {bookings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stops')}
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'stops'
              ? 'bg-brand-700 text-white shadow-md shadow-brand-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>⭐ Saved Stops & Alerts</span>
          <span className="rounded-full bg-slate-200 text-slate-700 text-[11px] px-1.5 py-0.2">
            {(favourites.data?.favourites?.length || 0) + (alerts.data?.alerts?.length || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-brand-700 text-white shadow-md shadow-brand-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>🚩 Reports ({issues.data?.issues?.length || 0})</span>
        </button>
      </div>

      {/* ── TAB 1: MY BOOKINGS ── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <EmptyState
              title="No active bookings found"
              action={
                <Link to="/" className="btn-primary mt-2">
                  Browse Routes & Book a Seat
                </Link>
              }
            >
              Reserve seats for any bus service on BusBuddy to generate digital boarding passes.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50/50 via-white to-white p-5 shadow-md space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-brand-700 text-white font-mono font-bold text-xs px-2.5 py-1">
                        {b.routeCode}
                      </span>
                      <strong className="text-sm font-bold text-slate-900">{b.routeName}</strong>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                      Confirmed
                    </span>
                  </div>

                  {/* Trip Details */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Boarding</span>
                      <strong className="text-slate-800 truncate block">{b.passenger?.pickup || 'Origin'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                      <strong className="text-slate-800 truncate block">{b.passenger?.dropoff || 'Terminus'}</strong>
                    </div>
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger</span>
                      <span className="text-slate-700 font-semibold">{b.passenger?.name}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Seats</span>
                      <span className="text-brand-700 font-mono font-black">{b.seats?.join(', ')}</span>
                    </div>
                  </div>

                  {/* Footer & QR */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">REF: {b.bookingRef}</span>
                      <span className="text-sm font-black text-slate-900">Total: ₹{b.totalFare}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeBooking(b.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-ghost text-xs py-1.5 px-3 rounded-xl"
                      >
                        Print Pass
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SAVED STOPS & ALERTS ── */}
      {activeTab === 'stops' && (
        <div className="space-y-6">
          <Section title="Arrival Alerts" subtitle="Get notified ~5 min before your bus arrives">
            <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4 space-y-2">
              <p className="text-xs text-brand-900">
                Alerts sound a notification when a bus is inside your specified threshold.
              </p>
              <NotificationPrompt />
            </div>

            {alerts.data?.alerts?.length === 0 ? (
              <EmptyState title="No active arrival alerts">
                Open any stop's board, pick a route and tap “Alert me before arrival”.
              </EmptyState>
            ) : (
              <ul className="space-y-2.5">
                {alerts.data?.alerts?.map((entry) => (
                  <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-brand-700 px-2.5 py-1 text-xs font-bold text-white font-mono">
                        {entry.routeCode}
                      </span>
                      <div>
                        <strong className="block text-sm text-slate-800">{entry.stopName}</strong>
                        <span className="block text-xs text-slate-400 font-medium">
                          Alerts {entry.minutesBefore} mins before arrival
                          {entry.notifiedAt ? ` · Last sent ${dateTime(entry.notifiedAt)}` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost py-1 px-3 text-xs rounded-xl"
                      onClick={() => remove(`/api/alerts/${entry.id}`, alerts.reload)}
                    >
                      Turn Off
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Pinned Stops" subtitle="One tap to your frequent departure boards">
            {favourites.data?.favourites?.length === 0 ? (
              <EmptyState title="No stops pinned yet">
                On any stop's live page, tap “Save this stop” for instant access.
              </EmptyState>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favourites.data?.favourites?.map((entry) => (
                  <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3 shadow-sm hover:border-brand-300 transition">
                    <Link
                      to={`/stops/${entry.stopId}?routeId=${entry.routeId}`}
                      className="min-w-0 flex-1 flex items-center gap-3"
                    >
                      <span className="rounded-xl bg-brand-50 text-brand-700 size-9 grid place-items-center font-bold text-xs font-mono">
                        {entry.routeCode}
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-slate-900">{entry.stopName}</strong>
                        <span className="block truncate text-xs text-slate-400">{entry.routeName}</span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-red-600 font-bold p-1"
                      onClick={() => remove(`/api/favourites/${entry.id}`, favourites.reload)}
                      title="Remove from saved"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {/* ── TAB 3: COMMUTER REPORTS ── */}
      {activeTab === 'reports' && (
        <Section title="Your Feedback Reports" subtitle="Reports submitted regarding delays, map errors or crowding">
          {issues.data?.issues?.length === 0 ? (
            <EmptyState title="No reports submitted yet">
              If an arrival estimate or crowding badge seems inaccurate, report it from the route or stop page.
            </EmptyState>
          ) : (
            <ul className="space-y-2.5">
              {issues.data?.issues?.map((entry) => (
                <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ISSUE_TONE[entry.status]}`}>
                        {entry.status}
                      </span>
                      <strong className="text-xs text-slate-800">
                        {entry.routeCode ? `${entry.routeCode} · ` : ''}{entry.stopName ?? 'General Issue'}
                      </strong>
                    </div>
                    {entry.note ? <p className="text-xs text-slate-600 italic">“{entry.note}”</p> : null}
                  </div>
                  <span className="text-[11px] text-slate-400">{dateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

export default Saved;
