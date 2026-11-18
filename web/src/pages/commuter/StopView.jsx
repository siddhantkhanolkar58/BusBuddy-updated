import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useMeta } from '../../lib/meta.jsx';
import { useFetch, useLiveStop } from '../../lib/useLive.js';
import { clockTime, plural } from '../../lib/format.js';
import EtaCard from '../../components/EtaCard.jsx';
import IssueReportForm from '../../components/IssueReportForm.jsx';
import { Crumb, EmptyState, ErrorNote, Loading, Section } from '../../components/ui.jsx';

export function StopView() {
  const { stopId } = useParams();
  const [params, setParams] = useSearchParams();
  const routeFilter = params.get('routeId');
  const { user } = useAuth();
  const { arrivalAlertMinutes } = useMeta();

  const { data, error, loading, connected, reload } = useLiveStop(stopId, routeFilter);
  const favourites = useFetch('/api/favourites', { enabled: Boolean(user) });
  const alerts = useFetch('/api/alerts', { enabled: Boolean(user) });

  const [pending, setPending] = useState(null);
  const [actionError, setActionError] = useState(null);

  const targetRouteId = useMemo(() => {
    if (routeFilter) return Number(routeFilter);
    return data?.routes?.length === 1 ? data.routes[0].id : null;
  }, [routeFilter, data]);

  const favourite = favourites.data?.favourites?.find(
    (entry) => entry.stopId === Number(stopId) && entry.routeId === targetRouteId,
  );
  const alert = alerts.data?.alerts?.find(
    (entry) => entry.stopId === Number(stopId) && entry.routeId === targetRouteId,
  );

  const run = async (label, work, refresh) => {
    setPending(label);
    setActionError(null);
    try {
      await work();
      await refresh();
    } catch (err) {
      setActionError(err);
    } finally {
      setPending(null);
    }
  };

  if (loading && !data) return <Loading label="Loading arrival board" />;
  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  const { stop, routes, arrivals } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Crumb to="/">All stops</Crumb>

      {/* Terminal Style Stop Board Header */}
      <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-brand-900 text-white p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-amber-500 text-slate-950 font-mono font-black text-xs px-2.5 py-1">
                {stop.code}
              </span>
              <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">Live Arrivals Board</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">{stop.name}</h1>
          </div>

          <button
            type="button"
            className="btn-ghost py-2 px-3 text-xs font-bold rounded-xl bg-white/10 text-white hover:bg-white/20 border-white/20"
            onClick={reload}
          >
            ↻ Refresh Board
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300">
          {routes.length === 0
            ? 'No active bus service serves this stop.'
            : `Served by ${plural(routes.length, 'corridor route')}`}
          {data.generatedAt ? ` · Live as of ${clockTime(data.generatedAt)}` : ''}
          {connected ? ' · Live sync active' : ' · Reconnecting'}
        </p>

        {/* Route Filter Pills */}
        {routes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-[11px] uppercase font-bold text-slate-400">Filter:</span>
            <button
              type="button"
              className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer ${
                !routeFilter
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              onClick={() => {
                params.delete('routeId');
                setParams(params, { replace: true });
              }}
            >
              All Routes
            </button>
            {routes.map((route) => (
              <button
                key={route.id}
                type="button"
                className={`rounded-xl px-3 py-1 text-xs font-bold transition cursor-pointer font-mono ${
                  Number(routeFilter) === route.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                onClick={() => {
                  params.set('routeId', String(route.id));
                  setParams(params, { replace: true });
                }}
              >
                {route.code}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Action Buttons: Save & Alert */}
      {user && targetRouteId ? (
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl bg-brand-50 border border-brand-200 text-xs">
          <button
            type="button"
            className="btn-ghost py-2 px-3 text-xs font-bold rounded-xl bg-white"
            disabled={pending === 'favourite'}
            onClick={() =>
              run(
                'favourite',
                () =>
                  favourite
                    ? api.del(`/api/favourites/${favourite.id}`)
                    : api.post('/api/favourites', { routeId: targetRouteId, stopId: Number(stopId) }),
                favourites.reload,
              )
            }
          >
            {favourite ? '★ Stop Saved' : '☆ Pin this Stop'}
          </button>

          <button
            type="button"
            className="btn-ghost py-2 px-3 text-xs font-bold rounded-xl bg-white"
            disabled={pending === 'alert'}
            onClick={() =>
              run(
                'alert',
                () =>
                  alert
                    ? api.del(`/api/alerts/${alert.id}`)
                    : api.post('/api/alerts', {
                        routeId: targetRouteId,
                        stopId: Number(stopId),
                        minutesBefore: arrivalAlertMinutes,
                      }),
                alerts.reload,
              )
            }
          >
            {alert
              ? `🔔 Alerting ~${alert.minutesBefore}m ahead (Tap to turn off)`
              : `🔔 Alert me ~${arrivalAlertMinutes}m before bus arrives`}
          </button>
        </div>
      ) : null}

      <ErrorNote error={actionError} />

      {/* Next Arrivals List */}
      <Section
        title="Live Approaching Buses"
        subtitle="Computed from driver check-ins along the line — real progress, not a static timetable"
      >
        {arrivals.length === 0 ? (
          <EmptyState title="No approaching buses on this route right now">
            Vehicles appear here once a driver starts a trip and logs a departure.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {arrivals.map((arrival) => (
              <li key={`${arrival.tripId}-${arrival.routeId}`}>
                <EtaCard arrival={arrival} showRoute={!routeFilter} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Issue Report */}
      <Section title="Something Look Off?" subtitle="Report an arrival discrepancy or crowding inaccuracy">
        <IssueReportForm stopId={stopId} routeId={targetRouteId} />
      </Section>
    </div>
  );
}

export default StopView;
