import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../../lib/useLive.js';
import { clockTime, dateTime, durationText, plural } from '../../lib/format.js';
import CrowdBadge from '../../components/CrowdBadge.jsx';
import IssueReportForm from '../../components/IssueReportForm.jsx';
import { Crumb, EmptyState, ErrorNote, Loading, Section } from '../../components/ui.jsx';

const STATUS_TONE = {
  active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border border-red-200',
};

export function TripView() {
  const { tripId } = useParams();
  const { data, error, loading, reload } = useFetch(`/api/trips/${tripId}`);

  if (loading && !data) return <Loading label="Loading trip telemetry" />;
  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  const { trip, checkins } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Crumb to={`/routes/${trip.routeId}`}>Back to {trip.routeCode}</Crumb>

      {/* Header Banner */}
      <header className="rounded-3xl bg-gradient-to-r from-brand-800 to-indigo-900 text-white p-6 sm:p-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-white/20 backdrop-blur-md px-3 py-1 font-mono text-base font-black text-white">
              {trip.routeCode}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">{trip.routeName}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_TONE[trip.status] ?? 'bg-white/20'}`}>
              {trip.status}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/80">
            Assigned driver: <strong>{trip.driverName}</strong> · Started at {dateTime(trip.startedAt)}
            {trip.endedAt ? ` · Concluded at ${clockTime(trip.endedAt)}` : ''}
          </p>
        </div>

        <Link
          to={`/routes/${trip.routeId}`}
          className="btn-ghost text-xs py-2 px-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          View Full Route Map →
        </Link>
      </header>

      {/* Timeline Check-in History */}
      <Section
        title="Stop-by-Stop Telemetry"
        subtitle={`${plural(checkins.length, 'stop check-in')} recorded by driver`}
      >
        {checkins.length === 0 ? (
          <EmptyState title="No stop check-ins recorded yet">
            The driver has initiated the trip but has not yet reported departure from the first stop.
          </EmptyState>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-brand-200">
              {checkins.map((checkin, index) => {
                const previous = checkins[index - 1];
                const gap = previous
                  ? (new Date(checkin.recordedAt) - new Date(previous.recordedAt)) / 1000
                  : null;
                const isLatest = index === checkins.length - 1;

                return (
                  <div key={`${checkin.seq}-${checkin.recordedAt}`} className="relative">
                    {/* Node */}
                    <div className={`absolute -left-6 sm:-left-8 top-1.5 size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isLatest
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse'
                        : 'bg-brand-700 text-white'
                    }`}>
                      {checkin.seq}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div>
                        <strong className="block text-sm font-bold text-slate-900">{checkin.stopName}</strong>
                        <span className="text-xs text-slate-500 font-medium">
                          {checkin.event === 'arrived' ? 'Arrived' : 'Departed'} at {clockTime(checkin.recordedAt)}
                          {gap !== null ? ` · ${durationText(gap)} leg duration` : ''}
                        </span>
                      </div>
                      <CrowdBadge occupancy={checkin.occupancy} short className="shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Issue Report */}
      <Section title="Report Discrepancy" subtitle="Is the vehicle position or crowd level incorrect?">
        <IssueReportForm tripId={trip.tripId} routeId={trip.routeId} />
      </Section>
    </div>
  );
}

export default TripView;
